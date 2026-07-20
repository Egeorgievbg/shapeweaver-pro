# ShapeWeaver export capability matrix

ShapeWeaver must distinguish real native exports from formats that require a server worker or a CAD kernel.

| Format | Status | Current guarantee |
|---|---|---|
| JSON | Native | Current configuration and available manifest data |
| SVG | Native | Dieline preview; unapproved constructions are watermarked |
| PNG | Native | Current viewport render |
| GLB | Native | Current visible Three.js pose, meshes, materials and artwork textures |
| glTF | Native | Current visible Three.js pose as glTF JSON |
| OBJ | Native | Current visible mesh pose; textures are not embedded |
| STL | Native | Current visible triangle mesh; no materials or artwork |
| PLY | Native | Current visible ASCII triangle mesh |
| PDF | Server converted | Requires layered PDF generation and preflight |
| DXF | Server converted | Requires unit- and layer-aware conversion and validation |
| TIFF | Server converted | Requires a high-resolution image worker |
| WebM | Conditional | Requires deterministic frame capture and codec support |
| MP4/H.264 | Server converted | Requires FFmpeg worker infrastructure |
| 3MF | Server converted | Requires a unit/material-aware model worker |
| USDZ | Server converted | Requires a validated USD conversion worker |
| FBX/DAE/Alembic | Server converted | Requires a validated converter |
| STEP/IGES | Unsupported | Disabled until a real BRep/OpenCascade pipeline is implemented |

## Important limitations

- Native 3D exports currently contain the exact current viewport pose. Source animation clips must be baked separately before they can be advertised as animated GLB exports.
- SVG dielines are not production-approved unless the model/dieline production status is `approved`.
- A triangle mesh must never be renamed to STEP or IGES and presented as a CAD solid.
- Server-converted formats must not be enabled until the resulting files pass parser, unit, layer, and checksum validation.
