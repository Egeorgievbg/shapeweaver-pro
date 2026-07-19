import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { PackagingPanel } from "@/integrations/boxcraft/types";

/** Parse an SVG path into THREE.Shape objects and preserve diagnostic context. */
export function svgPathToShapes(d: string, panelId = "unknown"): THREE.Shape[] {
  if (!d?.trim()) {
    console.warn("[ShapeWeaver] Empty SVG path", { panelId });
    return [];
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${escapeXml(d)}"/></svg>`;
  const loader = new SVGLoader();

  try {
    const parsed = loader.parse(svg);
    const shapes = parsed.paths.flatMap((path) => SVGLoader.createShapes(path));
    if (shapes.length === 0) {
      console.warn("[ShapeWeaver] SVG path produced no closed shapes", {
        panelId,
        pathPreview: d.slice(0, 180),
      });
    }
    return shapes;
  } catch (error) {
    console.error("[ShapeWeaver] SVG panel parsing failed", {
      panelId,
      pathPreview: d.slice(0, 180),
      error,
    });
    return [];
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface PanelGeometryResult {
  geometry: THREE.BufferGeometry;
  bbox: THREE.Box3;
  centroid: THREE.Vector3;
  uvBounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Builds an extruded panel in canonical dieline coordinates. UV coordinates
 * use the complete dieline atlas so artwork stays stable while panels fold.
 */
export function buildPanelGeometry(
  panel: PackagingPanel,
  opts: { thickness: number; dielineWidth: number; dielineHeight: number },
): PanelGeometryResult | null {
  const dielineWidth = positiveNumber(opts.dielineWidth, 1);
  const dielineHeight = positiveNumber(opts.dielineHeight, 1);
  const thickness = positiveNumber(opts.thickness, 1.5);
  const shapes = svgPathToShapes(panel.svgPath, panel.id);

  if (shapes.length === 0) return null;

  const extrude: THREE.ExtrudeGeometryOptions = {
    depth: Math.max(0.05, thickness),
    bevelEnabled: false,
    curveSegments: 8,
  };
  const geometry = new THREE.ExtrudeGeometry(shapes, extrude);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const position = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!position || position.count === 0) {
    console.error("[ShapeWeaver] Panel geometry has no vertices", { panelId: panel.id });
    geometry.dispose();
    return null;
  }

  const uv = new Float32Array(position.count * 2);
  for (let index = 0; index < position.count; index += 1) {
    uv[index * 2] = THREE.MathUtils.clamp(position.getX(index) / dielineWidth, 0, 1);
    uv[index * 2 + 1] = THREE.MathUtils.clamp(1 - position.getY(index) / dielineHeight, 0, 1);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

  const bbox = geometry.boundingBox ?? new THREE.Box3().setFromBufferAttribute(position);
  if (bbox.isEmpty()) {
    console.error("[ShapeWeaver] Panel geometry bounding box is empty", { panelId: panel.id });
    geometry.dispose();
    return null;
  }

  const centroid = bbox.getCenter(new THREE.Vector3());
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

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
