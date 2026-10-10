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
mixed=""

# A file counts as a test when it belongs to a suite, whatever it is named:
# specs, __tests__ and anything under a test/tests/e2e directory.
has_test_file() {
  grep -Eq '(^|/)(test|tests|e2e)/|\.spec\.|\.test\.|__tests__'
}

# A file counts as implementation when it is real source (src/, app/, lib/,
# api/, components/) outside any test directory. Scaffolding — package.json,
# tsconfig.json, jest.config.js, lockfiles — is neither: a red commit that only
# adds the skeleton of a new package is still a red commit, and counting it as
# implementation reported a false violation for every package created this way.
has_source_file() {
  grep -Eiq '^(backend|frontend)/.*/(src|app|lib|api|components)/' && ! has_test_file
}

for sha in "${COMMITS[@]}"; do
  files=$(git show --name-only --pretty="" "$sha")

  if echo "$files" | has_test_file && [ -z "$first_test" ]; then
    first_test="$sha"
  fi
  if echo "$files" | has_source_file && [ -z "$first_impl" ]; then
    first_impl="$sha"
  fi
  if [ "$sha" = "$first_test" ] && [ "$sha" = "$first_impl" ]; then
    mixed="$sha"
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

if [ -n "$mixed" ]; then
  echo "TDD check FAILED: $mixed carries both the specs and the implementation — commit the failing specs first, then the code."
  exit 1
fi

if [ "$test_idx" -lt "$impl_idx" ]; then
  echo "TDD red→green OK: first test $first_test precedes first impl $first_impl"
  exit 0
else
  echo "TDD check FAILED: implementation $first_impl precedes test $first_test — add a red failing test commit first."
  exit 1
fi
