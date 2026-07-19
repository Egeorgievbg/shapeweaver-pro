# Asset provenance and security policy

Every model, texture, preview, dieline, artwork and export must carry provenance metadata before it can be published.

## Required metadata

- stable asset ID;
- asset kind;
- source product and model version;
- original source reference;
- SHA-256;
- MIME type and magic-byte result;
- byte size and image dimensions where applicable;
- licensing status;
- ingestion timestamp;
- validation status;
- storage path;
- references from manifests/configurations.

## Storage

Use content-addressed paths based on verified hashes:

```text
object-storage/
  products/
  models/
  textures/
  renders/
  dielines/
  artwork/
  exports/
```

Duplicate content should reuse the same immutable object. Product manifests reference the object by asset ID and checksum rather than trusting an arbitrary remote URL.

## Remote ingestion

A remote asset fetcher must:

- use an explicit host allowlist;
- permit only HTTP/HTTPS;
- block localhost, link-local and private/internal networks;
- validate redirects and cap their count;
- enforce time and size limits;
- validate MIME and magic bytes;
- sanitize SVG;
- reject executable or active content;
- scan uploads for malware;
- record the final resolved URL server-side;
- never expose upstream credentials to the browser.

## Publication rules

An asset cannot be published when:

- the checksum is absent or changes unexpectedly;
- provenance is unknown;
- licensing is unresolved;
- format validation fails;
- the file is missing;
- a remote host is not approved;
- the asset belongs to a different source product/model version.

Missing or rejected assets must produce a visible validation warning. The renderer must not silently substitute an unrelated third-party file.

## User artwork

Artwork uploads are stored separately from immutable source geometry and require:

- authenticated ownership;
- MIME/magic-byte validation;
- size and decompression limits;
- sanitized SVG and PDF handling;
- content hash;
- signed access URLs;
- retention and deletion policy;
- configuration/audit references.

## Export outputs

Every completed export records:

- immutable configuration snapshot;
- source/model hash;
- exporter version;
- requested format and options;
- output SHA-256;
- validation results;
- creator and timestamps;
- storage expiry and deletion status.
