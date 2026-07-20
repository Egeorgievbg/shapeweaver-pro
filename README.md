# ShapeWeaver Pro

ShapeWeaver Pro is the GPTSBOXES browser-based packaging studio. It combines a searchable product library, synchronized 2D dielines and Three.js visualization, fold animation, artwork/material controls, BG/EN localization, native exports and a protected administration shell.

## Current release status

This branch is an official **SQLite-backed demonstration release**. It runs with a validated five-product dataset and proves the complete Library → Studio → 3D → Export flow.

The bundled demonstration contract is not the missing production dataset. Every demo model remains marked `unverified` and `qa-fixture`. Production promotion is blocked until the canonical SQLite/JSONL/assets package is mounted and validated.

## Technology

- React 19 and TanStack Start
- TypeScript and Vite
- Three.js, React Three Fiber and Drei
- Zustand and TanStack Query
- Tailwind CSS and Radix UI
- Bun SQLite for the local read-only data service
- Node/Nitro production server

## Quick start

### Requirements

- Bun 1.2 or newer
- Node.js 22 or newer
- `data/demo/gptsboxes_demo.sqlite`

### Install

```bash
bun install --frozen-lockfile
```

### Start the complete SQLite demo

Place the validated database at:

```text
data/demo/gptsboxes_demo.sqlite
```

Then run:

```bash
bun run demo
```

The launcher starts:

- ShapeWeaver application: `http://localhost:5173`
- read-only SQLite API: `http://127.0.0.1:4174`

### Standard development mode

```bash
bun run dev
```

Standard development mode expects `BOXCRAFT_UPSTREAM_URL` to be configured on the server.

### Production build

```bash
bun run build
bun run start
```

## Demo products

| Source ID | Product | Family | Line |
|---|---|---|---|
| `mailer-001` | Mailer Box | Mailer | Basic |
| `tuck-001` | Reverse Tuck Box | Folding carton | Basic |
| `rigid-001` | Rigid Gift Box | Rigid | Premium |
| `display-001` | Counter Display Box | Display | Basic |
| `gable-001` | Gable Box | Carrier | Premium |

## Data architecture

The browser never reads SQLite directly.

```text
SQLite / production data source
        ↓
read-only server API
        ↓
gptsboxes.viewer-manifest/v1
        ↓
2D dieline + Three.js renderer + exporters
```

The local adapter exposes:

```text
GET /api/health
GET /api/v1/visualization/products
GET /api/v1/visualization/relations
GET /api/v1/products/:sourceId/manifest
```

## Runtime strategies

ShapeWeaver chooses a model only through explicit product identity:

1. identity-matched GLB/glTF;
2. recorded source animation and exact faces;
3. exact geometry with a validated manual rig;
4. exact static geometry;
5. clearly labelled diagnostic fallback.

A generic box must never be presented as the real product.

## Export support

Native browser exports:

- GLB and glTF
- OBJ
- binary STL
- ASCII PLY
- PNG
- SVG dieline
- JSON configuration

Server/converter formats such as PDF, DXF, TIFF, MP4, USDZ, 3MF and FBX require a dedicated worker. STEP and IGES remain disabled until a validated BRep/OpenCascade pipeline exists.

## Administration

The administration UI uses a same-origin gateway, signed HttpOnly sessions, CSRF headers and server-side upstream credentials. Demo mode is intentionally read-only and must not be confused with production persistence.

## Quality gates

The official `ShapeWeaver CI` workflow runs:

- frozen dependency installation;
- formatting and ESLint;
- production build;
- viewer-manifest contract validation;
- Python audit compilation;
- SQLite integrity and foreign-key checks;
- API smoke tests.

Heavy Chromium screenshots are available through the manually triggered `ShapeWeaver Visual QA` workflow, preventing notification spam on every commit.

## Documentation

- `docs/DATA_ARCHITECTURE_BG.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/PRODUCT_RUNTIME_STRATEGIES.md`
- `docs/EXPORT_CAPABILITIES.md`
- `docs/ASSET_PROVENANCE.md`
- `docs/PRODUCTION_GATEWAYS.md`
- `docs/DEMO_DATABASE.md`

## Production boundary

A production release requires:

1. canonical database checksum and integrity validation;
2. real identity-matched assets;
3. at least 25 golden-product geometry tests;
4. mobile/desktop visual regression;
5. production Admin persistence;
6. real export workers and preflight where required;
7. backup and rollback verification.

See `SECURITY.md` and `CONTRIBUTING.md` before changing data, gateway or export code.
