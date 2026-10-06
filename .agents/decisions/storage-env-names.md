# Storage environment variable names

> **Status:** accepted (2026-10-05). `STORAGE_*` is the project standard;
> `MINIO_*` is a deprecated alias with a removal condition.

## Decision

Every storage configuration variable is named `STORAGE_*`, and nothing in the
codebase names a storage concept after a vendor:

| what | name |
| --- | --- |
| endpoint, port, credentials | `STORAGE_ENDPOINT`, `STORAGE_PORT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION`, `STORAGE_USE_SSL` |
| buckets | `STORAGE_SERVICE_IMAGES_BUCKET`, `STORAGE_AVATARS_BUCKET`, `STORAGE_ORDER_PHOTOS_BUCKET` |
| public URL for generated links | `STORAGE_PUBLIC_URL` |
| injection token / DI identifiers | `STORAGE_OPTIONS`, `StorageService`, `StorageModule`, `ServiceStorageModule` |
| compose services | `storage` (S3 server), `storage-setup` (bucket bootstrap) |

The code does not talk to any vendor SDK: it uses `@aws-sdk/client-s3` against
an S3 endpoint, so the product behind the endpoint can change without touching
the code.

## Why

Renaming variables to `SEAWEEDFS_*` (PR #118, closed) would have broken
storage everywhere: the services read their configuration exclusively from the
env files, so a name nothing reads means no endpoint and no credentials, and
the service silently falls back to hardcoded defaults. A vendor-neutral name is
what actually makes the S3 implementation swappable — the failed PR used a
vendor name for a vendor-neutral goal.

## Deprecated alias

`StorageService` still reads `MINIO_*` when the `STORAGE_*` variable is absent,
because the real `.env.staging` / `.env.production` files on the hosts still
carry the old names and this repo never opens them. `profiles.service.ts` does
the same for `STORAGE_AVATARS_BUCKET`.

**Removal condition:** drop the alias once every environment's real env file
uses `STORAGE_*`. Then delete `StorageService.read()`'s fallback branch and the
`MINIO_*` line in `profiles.service.ts`, and update the spec that covers the
fallback.

## What is not being renamed

- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` in the compose files: those are the
  variables the MinIO image reads inside the container, fed from
  `${STORAGE_ACCESS_KEY}` / `${STORAGE_SECRET_KEY}`. Renaming them stops the
  storage server from starting.
- The named volume `minio_data`: renaming it creates a new empty volume on the
  hosts and hides the existing buckets. Migrating a volume is its own task
  (`docker cp` or a `docker run` with both volumes mounted).