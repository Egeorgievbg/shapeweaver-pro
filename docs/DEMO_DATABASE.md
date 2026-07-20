# SQLite demonstration database

## Purpose

`gptsboxes_demo.sqlite` is a development and review dataset for ShapeWeaver Pro. It proves the application data contract without impersonating the missing production database.

## Verified reference file

```text
File: gptsboxes_demo.sqlite
Dataset version: 2026.07.20-v1
Size: 40,960 bytes
SHA-256: bbd3f1400efd2b06b68717fb52ff1f31b477c844c6f50b333e8b7c947a18a9ad
Tables: products, manifests
Products: 5
Manifests: 5
PRAGMA integrity_check: ok
PRAGMA foreign_key_check: 0 errors
```

## Expected location

```text
data/demo/gptsboxes_demo.sqlite
```

The database is distributed as a CI/release artifact rather than treated as production source data.

## Read-only rules

- The API opens the file with `readonly: true`.
- `PRAGMA query_only=ON` is enabled.
- The application browser never opens SQLite directly.
- Demo records remain `unverified` and `qa-fixture`.
- Demo data must never be promoted to production or used for manufacturing.

## Tables

### `products`

Contains the catalog identity, dimensions, material, product line and validation state used by Library.

### `manifests`

Stores one canonical `gptsboxes.viewer-manifest/v1` JSON document per product.

## Local validation

```bash
sqlite3 data/demo/gptsboxes_demo.sqlite "PRAGMA integrity_check;"
sqlite3 data/demo/gptsboxes_demo.sqlite "PRAGMA foreign_key_check;"
sqlite3 data/demo/gptsboxes_demo.sqlite "SELECT COUNT(*) FROM products;"
sqlite3 data/demo/gptsboxes_demo.sqlite "SELECT COUNT(*) FROM manifests;"
sha256sum data/demo/gptsboxes_demo.sqlite
```

Expected output:

```text
ok
0 foreign-key rows
5 products
5 manifests
bbd3f1400efd2b06b68717fb52ff1f31b477c844c6f50b333e8b7c947a18a9ad
```

## Replacement with production data

Do not rename an arbitrary database to `gptsboxes_demo.sqlite`.

A production source must be mounted separately, checked against its documented SHA-256, validated with SQLite integrity and foreign-key checks, inventoried, and exposed through the production read-only API. The demo adapter is not a migration shortcut.
