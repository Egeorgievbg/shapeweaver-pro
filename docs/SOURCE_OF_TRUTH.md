# GPTSBOXES / ShapeWeaver source of truth

## Decision policy

The application must not select a data source by filename, timestamp, archive name, or file size alone.

Priority:

1. SQLite database with a successful `PRAGMA integrity_check`, no foreign-key errors, the expected schema, and an approved SHA-256 checksum.
2. Immutable raw payload snapshots with hashes and provenance.
3. A validated source export database.
4. Valid JSONL relational registries plus their complete payload bodies.
5. Normalized staging records.
6. Generated viewer manifests.
7. Large aggregate JSON files only after complete syntax, semantic, provenance, and row-count validation.

## Expected database checksums

```text
gptsboxes_visualization.sqlite
SHA-256 d0476452d25e01070938581f57c17ec0df69fc4605b7f55714366575808432c3

gptsboxes_visualization_runtime.sqlite
SHA-256 fd502ee5b5b495f076b6004389c5d6a38f59ed8a461fb62f45dc3bbc3772b17d
```

A checksum mismatch places the database in quarantine. It must not be promoted automatically.

## Known aggregate risks

The audit runner treats the following paths as source-of-truth risks until they are independently recovered and verified:

- `data/backup/db_backup_latest.json`
- `data/db-export/json/products.json`
- `data/db-export/json/staging_records.json`
- `data/import/unzipped/perfect-products-data-ngrok/api/products.index.json`
- `data/import/unzipped/perfect-products-data-ngrok/catalog.json`
- `data/import/unzipped/perfect-products-data-ngrok/catalog.lite.json`
- `data/import-dry-run/output/db.staged.json`
- `data/reconciliation-output/configurator-catalog.hybrid-preview.json`
- `data/reconciliation-output/configurator-data.hybrid-preview.json`
- `data/reconciliation-output/configurator-dielines.hybrid-preview.json`
- `data/seo_records.json`
- `database/active-configurator-data.json`
- `database/active-dielines.json`

## Runtime boundary

The browser never reads SQLite directly.

```text
read-only source database
  -> protected TypeScript API
  -> gptsboxes.viewer-manifest/v1
  -> Three.js renderer
```

Public identity uses `sourceId`, model version/source hash, layer key, face key, fold index, step index, and operation index. Internal SQLite integer keys are not public permanent identifiers.

## Audit command

```bash
python scripts/data_audit.py . --output data/reports
```

The command is read-only and produces file, hash, database, archive, asset, corruption, truncation, source-candidate, and source-conflict reports.

## Current repository limitation

The application code and audit pipeline can validate and consume the canonical database when it is mounted on the server. The full database binary is intentionally not committed to the public frontend repository and must not be exposed to the browser.
