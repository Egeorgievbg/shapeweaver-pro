# SQLite demonstration database

## Purpose

`gptsboxes_demo.sqlite` is a development and review dataset for ShapeWeaver Pro. It proves the application data contract without impersonating the missing production database.

## Verified reference file

```text
File: gptsboxes_demo.sqlite
Size: 40,960 bytes
SHA-256: a9dc82e3b3d106d0ec65dd20f9e8a2ce192fcf06f359ba3866b933379e92609e
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
```

Expected output:

```text
ok
0 foreign-key rows
5 products
5 manifests
```

## Replacement with production data

Do not rename an arbitrary database to `gptsboxes_demo.sqlite`.

A production source must be mounted separately, checked against its documented SHA-256, validated with SQLite integrity and foreign-key checks, inventoried, and exposed through the production read-only API. The demo adapter is not a migration shortcut.
