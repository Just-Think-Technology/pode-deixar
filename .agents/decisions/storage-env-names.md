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

## Deprecated alias (removed)

`StorageService` accepted `MINIO_*` as a fallback while the real
`.env.staging` / `.env.production` files on the hosts still carried the old
names. The fallback is **gone**: `STORAGE_*` is the only name read. Migrating a
host means editing its real env file, which this repo never opens.

## The S3 implementation

The endpoint is a **SeaweedFS S3 gateway** (`chrislusf/seaweedfs`, pinned),
not MinIO. Two consequences worth knowing:

- **SeaweedFS accepts any credentials by default.** The compose generates an
  S3 config at startup out of `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` and
  starts `weed` with `-s3.config`, so the buckets are not open to anything else
  on the compose network. The config is generated, never committed.
- The volume is `seaweedfs_data`. A host still carrying `minio_data` needs the
  data copied across (`docker run` with both volumes mounted, then copy `/data`)
  — a new volume starts empty and hides the existing buckets.