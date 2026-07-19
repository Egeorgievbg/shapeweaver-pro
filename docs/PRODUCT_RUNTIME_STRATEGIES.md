# Product runtime strategies

ShapeWeaver selects a renderer only from evidence linked to the same `sourceId` and model version/source hash.

## Priority

1. `recorded-animation` — exact source faces plus recorded animation operations.
2. `gltf` — identity-matched local GLB/glTF for the same source/model version.
3. `manual-rig` — exact source faces with a manually validated fold graph.
4. `geometry-only` — exact static geometry and dieline without claiming recorded assembly.
5. `diagnostic-fallback` — procedural diagnostic preview, visibly labelled as approximate.
6. `unsupported` — no safe render strategy.

## Recorded animation

Requirements:

- exact face paths;
- stable layer-prefixed face IDs;
- indexed folds;
- resolved parent/child relationship;
- ordered animation steps;
- concurrent operations within each step;
- supported operations: `rotate`, `translate`, `rotateMesh`.

A fold slider evaluates source operations. It does not rebuild geometries on every input event.

## Geometry-only

Geometry-only is a supported real-data state, not an error.

It supports:

- exact 2D dieline;
- exact static 3D faces;
- materials and artwork mapping;
- current-pose mesh export;
- manual rigging after validation.

It must not be labelled `source-recorded animation`.

## GLB/glTF

A GLB/glTF model is accepted only when its identity is linked to the same product and model version. File existence or category similarity is not sufficient.

The loader must validate:

- HTTP status and MIME;
- glTF structure;
- source identity metadata when available;
- bounding box and units;
- mesh/material presence;
- optional animation clips;
- asset provenance and licensing.

## Diagnostic procedural fallback

Procedural geometry is permitted only when exact geometry cannot be displayed and the UI clearly reports that the model is approximate.

It must never:

- replace an exact geometry-only model;
- be used as production CAD;
- generate approved dielines;
- inherit a real product's source-exact status;
- hide a data or relationship error.

## Unsupported state

The product remains unsupported when identity, geometry, or provenance cannot be established safely. The UI should show diagnostics and remediation actions instead of displaying a different product.
