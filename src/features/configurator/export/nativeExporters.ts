import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { getExportableViewport } from "./viewportRegistry";

export type Native3DFormat = "glb" | "gltf" | "obj" | "stl" | "ply";

export interface ExportCapability {
  id: string;
  group: "project" | "3d" | "2d" | "image" | "video" | "cad";
  support: "native" | "server-converted" | "conditional" | "unsupported";
  note: string;
}

export const EXPORT_CAPABILITIES: ExportCapability[] = [
  { id: "json", group: "project", support: "native", note: "Configuration and manifest data." },
  {
    id: "zip",
    group: "project",
    support: "conditional",
    note: "Requires a project-package builder and asset collection.",
  },
  {
    id: "glb",
    group: "3d",
    support: "native",
    note: "Current exact viewport pose, materials and artwork textures.",
  },
  {
    id: "gltf",
    group: "3d",
    support: "native",
    note: "JSON glTF with embedded data URIs where supported by Three.js.",
  },
  {
    id: "obj",
    group: "3d",
    support: "native",
    note: "Current mesh pose. Material textures are not embedded.",
  },
  {
    id: "stl",
    group: "3d",
    support: "native",
    note: "Current mesh pose only; no colors, materials or artwork.",
  },
  { id: "ply", group: "3d", support: "native", note: "ASCII triangle mesh in the current pose." },
  {
    id: "3mf",
    group: "3d",
    support: "server-converted",
    note: "Requires a verified unit/material conversion worker.",
  },
  {
    id: "usdz",
    group: "3d",
    support: "server-converted",
    note: "Requires an Apple-compatible USD conversion worker.",
  },
  {
    id: "fbx",
    group: "3d",
    support: "server-converted",
    note: "Requires a validated server converter.",
  },
  {
    id: "svg",
    group: "2d",
    support: "native",
    note: "Dieline preview with source cut and fold paths.",
  },
  {
    id: "pdf",
    group: "2d",
    support: "server-converted",
    note: "Requires layered PDF/preflight generation.",
  },
  {
    id: "dxf",
    group: "2d",
    support: "server-converted",
    note: "Requires a verified layer- and unit-aware converter.",
  },
  { id: "png", group: "image", support: "native", note: "Current viewport render." },
  {
    id: "tiff",
    group: "image",
    support: "server-converted",
    note: "Requires a high-resolution image worker.",
  },
  {
    id: "webm",
    group: "video",
    support: "conditional",
    note: "Requires deterministic frame capture and codec support.",
  },
  { id: "mp4", group: "video", support: "server-converted", note: "Requires an FFmpeg worker." },
  {
    id: "step",
    group: "cad",
    support: "unsupported",
    note: "Disabled until a validated BRep/OpenCascade pipeline exists.",
  },
  {
    id: "iges",
    group: "cad",
    support: "unsupported",
    note: "Disabled until a validated BRep/OpenCascade pipeline exists.",
  },
];

function gltfBlob(binary: boolean): Promise<Blob> {
  const { root } = getExportableViewport();
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      root,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: "model/gltf-binary" }));
          return;
        }
        resolve(
          new Blob([JSON.stringify(result, null, 2)], {
            type: "model/gltf+json",
          }),
        );
      },
      reject,
      {
        binary,
        onlyVisible: true,
        trs: false,
        includeCustomExtensions: true,
      },
    );
  });
}

function exportObj(): Blob {
  const { root } = getExportableViewport();
  return new Blob([new OBJExporter().parse(root)], { type: "text/plain" });
}

function exportStl(): Blob {
  const { root } = getExportableViewport();
  const value = new STLExporter().parse(root, { binary: true });
  return new Blob([value], { type: "model/stl" });
}

function exportPly(): Blob {
  const { root } = getExportableViewport();
  const vertices: string[] = [];
  const faces: string[] = [];
  let vertexOffset = 0;

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible) return;
    const source = object.geometry;
    const geometry = source.index ? source.toNonIndexed() : source;
    const position = geometry.getAttribute("position");
    if (!position || position.count < 3) {
      if (geometry !== source) geometry.dispose();
      return;
    }
    const point = new THREE.Vector3();
    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
      vertices.push(`${point.x} ${point.y} ${point.z}`);
    }
    for (let index = 0; index + 2 < position.count; index += 3) {
      faces.push(
        `3 ${vertexOffset + index} ${vertexOffset + index + 1} ${vertexOffset + index + 2}`,
      );
    }
    vertexOffset += position.count;
    if (geometry !== source) geometry.dispose();
  });

  const header = [
    "ply",
    "format ascii 1.0",
    "comment Exported by GPTSBOXES ShapeWeaver",
    `element vertex ${vertices.length}`,
    "property float x",
    "property float y",
    "property float z",
    `element face ${faces.length}`,
    "property list uchar int vertex_indices",
    "end_header",
  ].join("\n");
  return new Blob([`${header}\n${vertices.join("\n")}\n${faces.join("\n")}\n`], {
    type: "application/octet-stream",
  });
}

export async function exportNative3D(format: Native3DFormat): Promise<Blob> {
  if (format === "glb") return gltfBlob(true);
  if (format === "gltf") return gltfBlob(false);
  if (format === "obj") return exportObj();
  if (format === "stl") return exportStl();
  return exportPly();
}
