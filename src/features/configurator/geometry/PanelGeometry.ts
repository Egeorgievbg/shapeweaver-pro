import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { PackagingPanel } from "@/integrations/boxcraft/types";

/**
 * Parse an SVG "d" attribute into a THREE.Shape via SVGLoader.
 * Returns null if parsing yields nothing usable.
 */
export function svgPathToShapes(d: string): THREE.Shape[] {
  if (!d?.trim()) return [];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${escapeXml(d)}"/></svg>`;
  const loader = new SVGLoader();
  try {
    const parsed = loader.parse(svg);
    const shapes: THREE.Shape[] = [];
    for (const p of parsed.paths) {
      const s = SVGLoader.createShapes(p);
      shapes.push(...s);
    }
    return shapes;
  } catch {
    return [];
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export interface PanelGeometryResult {
  geometry: THREE.BufferGeometry;
  bbox: THREE.Box3;
  centroid: THREE.Vector3;
  uvBounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Build extruded 3D geometry for a single panel, in dieline coordinate space
 * (mm units, X right, Y down as SVG). We flip Y so THREE Y points up.
 * UVs are computed in the ORIGINAL dieline space so artwork applied to the
 * flat sheet maps 1:1 to every folded face.
 */
export function buildPanelGeometry(
  panel: PackagingPanel,
  opts: { thickness: number; dielineWidth: number; dielineHeight: number },
): PanelGeometryResult | null {
  const shapes = svgPathToShapes(panel.svgPath);
  if (shapes.length === 0) return null;

  // SVGLoader keeps Y pointing down. We build the geometry in dieline space
  // (positive Y down), then flip Y at the mesh transform level so it looks
  // right in a Y-up scene.
  const extrude: THREE.ExtrudeGeometryOptions = {
    depth: Math.max(0.05, opts.thickness),
    bevelEnabled: false,
    curveSegments: 12,
  };
  const geometry = new THREE.ExtrudeGeometry(shapes, extrude);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  // UVs: rewrite so u=x/dielineWidth, v=1 - y/dielineHeight (SVG y is down).
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uv = new Float32Array(posAttr.count * 2);
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    uv[i * 2] = x / opts.dielineWidth;
    uv[i * 2 + 1] = 1 - y / opts.dielineHeight;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

  const bbox = geometry.boundingBox ?? new THREE.Box3();
  const centroid = new THREE.Vector3(
    (bbox.min.x + bbox.max.x) / 2,
    (bbox.min.y + bbox.max.y) / 2,
    (bbox.min.z + bbox.max.z) / 2,
  );

  return {
    geometry,
    bbox,
    centroid,
    uvBounds: {
      minX: bbox.min.x,
      minY: bbox.min.y,
      maxX: bbox.max.x,
      maxY: bbox.max.y,
    },
  };
}
