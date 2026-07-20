# Contributing to ShapeWeaver Pro

## Branch policy

- Keep `main` deployable.
- Work in focused feature or fix branches.
- Submit changes through pull requests.
- Keep data, renderer and UI changes separable when practical.

## Required checks

```bash
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run build
bun scripts/qa/manifest-contract.ts
```

For local SQLite review:

```bash
bun run demo
```

## Data rules

- Do not present test products as production data.
- Do not use known truncated aggregate files as source of truth.
- Preserve product identity, model version and source hash.
- Keep demo records visibly marked as unverified.

## Three.js rules

- Prefer exact source geometry.
- Use procedural geometry only as a labelled diagnostic fallback.
- Dispose geometries, materials, textures and environments.
- Do not recreate geometry on every fold-slider update.
- Validate mobile performance and WebGL recovery.

## Export rules

- Validate generated files before exposing downloads.
- Do not claim CAD-solid formats without a real CAD kernel.
- Watermark unapproved dielines.
- Keep native and server-converted formats distinct.

## Pull request checklist

Describe the problem, root cause, changed behavior, validation, screenshots, known limitations and rollback path.
