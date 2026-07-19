import type {
  GeometryStrategy,
  NormalizedPackagingModel,
  PackagingAnimationSequence,
  PackagingFold,
  PackagingMaterial,
  PackagingPanel,
} from "@/integrations/boxcraft/types";
import type { ViewerManifestV1, ViewerRuntimeStrategy } from "./types";

function strategyFor(manifest: ViewerManifestV1): GeometryStrategy {
  if (manifest.runtimeStrategy === "gltf" && manifest.model.gltfUrl) return "gltf";
  if (
    manifest.runtimeStrategy === "recorded-animation" ||
    manifest.runtimeStrategy === "geometry-only" ||
    manifest.runtimeStrategy === "manual-rig"
  ) {
    return "knife-rig";
  }
  if (manifest.runtimeStrategy === "diagnostic-fallback") return "procedural";
  return "unsupported";
}

function normalizeRuntimeStrategy(value: ViewerRuntimeStrategy): ViewerRuntimeStrategy {
  return value;
}

export function normalizeViewerManifest(manifest: ViewerManifestV1): NormalizedPackagingModel {
  const panels: PackagingPanel[] = manifest.faces.map((face) => ({
    id: face.faceKey,
    name: face.name || face.faceKey,
    svgPath: face.svgPath,
    bbox: {
      x: face.bbox.x,
      y: face.bbox.y,
      w: face.bbox.width,
      h: face.bbox.height,
    },
    direction: face.direction,
    orientationRotate: face.orientationRotate,
    layer: face.layerKey,
    isFlap: !face.direction,
    centroid: face.centroid ?? {
      x: face.bbox.x + face.bbox.width / 2,
      y: face.bbox.y + face.bbox.height / 2,
    },
  }));

  const folds: PackagingFold[] = manifest.folds.map((fold) => ({
    id: fold.id,
    foldIndex: fold.foldIndex,
    parentPanelId: fold.parentFaceKey,
    childPanelId: fold.childFaceKey,
    from: fold.from,
    to: fold.to,
    direction: fold.direction ?? 1,
    openAngle: fold.openAngle ?? 0,
    closedAngle: fold.closedAngle ?? Math.PI / 2,
    axis: fold.axis,
  }));

  for (const fold of folds) {
    const child = panels.find((panel) => panel.id === fold.childPanelId);
    if (child) child.parentId = fold.parentPanelId;
  }

  const materials: PackagingMaterial[] = manifest.materials.map((material) => ({
    id: material.id,
    name: material.nameBg ?? material.nameEn ?? material.name,
    layer: material.layerKey,
    thickness: material.thickness,
    color: material.color,
    insideColor: material.insideColor,
    edgeColor: material.edgeColor,
    roughness: material.roughness,
    metalness: material.metalness,
    clearcoat: material.clearcoat,
    transmission: material.transmission,
    maps: material.maps,
  }));

  const animations: PackagingAnimationSequence[] = manifest.animations.map((sequence) => ({
    id: sequence.id,
    name: sequence.name,
    isDefault: sequence.isDefault,
    steps: sequence.steps.map((step) => ({
      stepIndex: step.stepIndex,
      duration: step.duration,
      operations: step.operations.map((operation) => ({ ...operation })),
    })),
  }));

  const dieline = manifest.dielines[0];
  const warnings = [...manifest.validation.warnings];
  if (manifest.validation.status === "invalid" || manifest.validation.status === "quarantined") {
    warnings.push(`manifest_validation:${manifest.validation.status}`);
  }
  if (manifest.model.productionStatus !== "approved") {
    warnings.push(`production_status:${manifest.model.productionStatus}`);
  }

  return {
    id: `source-${manifest.product.sourceId}`,
    sourceId: manifest.product.sourceId,
    sourceHash: manifest.sourceHash,
    modelVersion: manifest.model.version,
    productionStatus: manifest.model.productionStatus,
    runtimeStrategy: normalizeRuntimeStrategy(manifest.runtimeStrategy),
    name: manifest.product.name,
    title: manifest.product.title,
    family: manifest.product.family,
    category: manifest.product.category,
    units: manifest.product.dimensions.unit,
    dimensions: {
      width: manifest.product.dimensions.length,
      depth: manifest.product.dimensions.width,
      height: manifest.product.dimensions.height,
      thickness: manifest.product.dimensions.thickness,
      unit: manifest.product.dimensions.unit,
    },
    board: {
      thickness: manifest.product.dimensions.thickness,
      materialId: manifest.product.defaultMaterialId ?? materials[0]?.id,
    },
    geometryStrategy: strategyFor(manifest),
    gltf: manifest.model.gltfUrl
      ? { url: manifest.model.gltfUrl, draco: true, ktx2: true }
      : undefined,
    panels,
    folds,
    dieline: dieline
      ? {
          totalX: dieline.totalX,
          totalY: dieline.totalY,
          cutsPath: dieline.cutsPath,
          bleedsPath: dieline.bleedsPath,
          bleedline: dieline.bleedline,
          faces: panels,
          folds,
          holes: manifest.faces.flatMap((face) =>
            (face.holes ?? []).map((path) => ({ d: path })),
          ),
          sizeArrows: [],
        }
      : undefined,
    materials,
    animations,
    assets: manifest.assets,
    exportCapabilities: manifest.exportCapabilities,
    validation: manifest.validation,
    openParams: [],
    faceDirectionMap: Object.fromEntries(
      panels.filter((panel) => panel.direction).map((panel) => [panel.id, panel.direction!]),
    ),
    faceOrientationMap: Object.fromEntries(
      panels
        .filter((panel) => panel.orientationRotate != null)
        .map((panel) => [panel.id, panel.orientationRotate!]),
    ),
    warnings,
    raw: { details: null, knife: null, preview: null, manifest },
  };
}
