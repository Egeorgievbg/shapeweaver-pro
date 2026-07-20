import { makeDemoGeometry } from "./demo-geometry";
import type { DemoProduct } from "./demo-products";

export function makeDemoManifest(product: DemoProduct) {
  const now = new Date().toISOString();
  const geometry = makeDemoGeometry(product);
  return {
    schema: "gptsboxes.viewer-manifest/v1",
    generatedAt: now,
    sourceHash: `demo-sqlite-${product.sourceId}`,
    product: {
      sourceId: product.sourceId,
      name: product.name,
      title: product.name,
      family: product.family,
      category: product.category,
      productLine: product.productLine,
      dimensions: { length: product.length, width: product.width, height: product.height, thickness: 1.5, unit: "mm" },
      defaultMaterialId: `material:${product.sourceId}`,
      availableMaterialIds: [`material:${product.sourceId}`],
    },
    model: {
      version: "demo-sqlite-v1",
      sourceHash: `demo-sqlite-${product.sourceId}`,
      productionStatus: "unverified",
      geometryQuality: "qa-fixture",
    },
    faces: geometry.faces,
    folds: geometry.folds,
    animations: [{
      id: "assembly",
      name: "Assembly",
      isDefault: true,
      steps: geometry.folds.map((fold, stepIndex) => ({
        stepIndex,
        duration: 1,
        operations: [{
          type: "rotate",
          operationIndex: 0,
          foldId: fold.id,
          foldIndex: fold.foldIndex,
          angleRadians: fold.closedAngle * fold.direction,
        }],
      })),
    }],
    dielines: [{
      id: `dieline:${product.sourceId}`,
      layerKey: "board",
      totalX: geometry.totalX,
      totalY: geometry.totalY,
      cutsPath: geometry.faces.map((face) => face.svgPath).join(" "),
      bleedline: 3,
      productionStatus: "unverified",
    }],
    materials: [{
      id: `material:${product.sourceId}`,
      name: product.material,
      nameBg: product.material,
      nameEn: product.material,
      layerKey: "board",
      thickness: 1.5,
      color: product.color,
      insideColor: "#f6f1e8",
      edgeColor: "#8a765d",
      roughness: product.family === "Rigid" ? 0.6 : 0.82,
      metalness: 0,
      clearcoat: product.family === "Rigid" ? 0.08 : 0,
    }],
    assets: [],
    runtimeStrategy: "recorded-animation",
    validation: {
      status: "warning",
      warnings: ["demo_sqlite_not_production_data"],
      errors: [],
      checkedAt: now,
    },
    exportCapabilities: {
      png: "native",
      svg: "native",
      json: "native",
      glb: "native",
      gltf: "native",
      obj: "native",
      stl: "native",
      ply: "native",
      step: "unsupported",
      iges: "unsupported",
    },
  };
}
