#!/usr/bin/env bash
# Checks that a TDD red commit (failing test) precedes the green implementation commit.
# Usage: bash scripts/check-red-commit.sh [base-ref]
# Defaults to origin/main if available, otherwise HEAD~1.
set -euo pipefail

BASE_REF="${1:-origin/main}"
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  BASE_REF="HEAD~1"
fi

# Find first commit touching tests vs first touching implementation after base
mapfile -t COMMITS < <(git log --reverse --pretty=format:"%H" "$BASE_REF"..HEAD)

if [ ${#COMMITS[@]} -eq 0 ]; then
  echo "No commits after $BASE_REF — nothing to check."
  exit 0
fi

first_test=""
first_impl=""

for sha in "${COMMITS[@]}"; do
  files=$(git show --name-only --pretty="" "$sha")
  # Heuristic: test files are under test/**, frontend/test/**, backend/**/test/**, e2e/**
  if echo "$files" | grep -Eq '(\.spec\.|\.test\.|__tests__)' && [ -z "$first_test" ]; then
    first_test="$sha"
  fi
  # Implementation: any src/** outside test
  if echo "$files" | grep -Eq '^(backend|frontend)/(services|shared|api|lib|app|components)' && [ -z "$first_impl" ]; then
    # Ignore commits that only touch tests
    non_test=$(echo "$files" | grep -vE '(\.spec\.|\.test\.)' | grep -E '^(backend|frontend)/' || true)
    if [ -n "$non_test" ]; then
      first_impl="$sha"
    fi
  fi
done

if [ -z "$first_test" ]; then
  echo "WARNING: no test file commit found after $BASE_REF — TDD red commit missing (review will fail)."
  exit 0
fi

if [ -z "$first_impl" ]; then
  echo "No implementation commit found — only tests, red is present."
  exit 0
fi

# Check order
test_idx=-1
impl_idx=-1
for i in "${!COMMITS[@]}"; do
  if [ "${COMMITS[$i]}" = "$first_test" ]; then test_idx=$i; fi
  if [ "${COMMITS[$i]}" = "$first_impl" ]; then impl_idx=$i; fi
done

if [ "$test_idx" -lt "$impl_idx" ]; then
  echo "TDD red→green OK: first test $first_test precedes first impl $first_impl"
  exit 0
else
  echo "TDD check FAILED: implementation $first_impl precedes test $first_test — add a red failing test commit first."
  exit 1
fi
