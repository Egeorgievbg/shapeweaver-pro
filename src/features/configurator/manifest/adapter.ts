import type {
  GeometryStrategy,
  NormalizedPackagingModel,
  PackagingFold,
  PackagingMaterial,
  PackagingPanel,
} from "@/integrations/boxcraft/types";
import type {
  ExportSupport,
  ManifestAnimationSequence,
  ManifestAsset,
  ManifestValidation,
  ProductionStatus,
  ViewerManifestV1,
  ViewerRuntimeStrategy,
} from "./types";

export type ManifestFoldModel = PackagingFold & {
  foldIndex: number;
  axis?: [number, number, number];
};

export type ManifestMaterialModel = PackagingMaterial & {
  insideColor?: string;
  edgeColor?: string;
  clearcoat?: number;
  transmission?: number;
  maps?: Record<string, string | undefined>;
};

export type ManifestBackedPackagingModel = NormalizedPackagingModel & {
  sourceHash: string;
  modelVersion: string;
  productionStatus: ProductionStatus;
  runtimeStrategy: ViewerRuntimeStrategy;
  animations: ManifestAnimationSequence[];
  assets: ManifestAsset[];
  exportCapabilities?: Record<string, ExportSupport>;
  validation: ManifestValidation;
  raw: NormalizedPackagingModel["raw"] & { manifest: ViewerManifestV1 };
};

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

export function normalizeViewerManifest(manifest: ViewerManifestV1): ManifestBackedPackagingModel {
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

  const folds: ManifestFoldModel[] = manifest.folds.map((fold) => ({
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

  const materials: ManifestMaterialModel[] = manifest.materials.map((material) => ({
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

  const dieline = manifest.dielines[0];
  const warnings = [...manifest.validation.warnings];
  if (manifest.validation.status === "invalid" || manifest.validation.status === "quarantined") {
    warnings.push(`manifest_validation:${manifest.validation.status}`);
  }
  if (manifest.model.productionStatus !== "approved") {
    warnings.push(`production_status:${manifest.model.productionStatus}`);
  }

  const normalized: NormalizedPackagingModel = {
    id: `source-${manifest.product.sourceId}`,
    sourceId: manifest.product.sourceId,
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
    raw: { details: null, knife: null, preview: null },
  };

  return Object.assign(normalized, {
    sourceHash: manifest.sourceHash,
    modelVersion: manifest.model.version,
    productionStatus: manifest.model.productionStatus,
    runtimeStrategy: manifest.runtimeStrategy,
    animations: manifest.animations,
    assets: manifest.assets,
    exportCapabilities: manifest.exportCapabilities,
    validation: manifest.validation,
    raw: { ...normalized.raw, manifest },
  }) as ManifestBackedPackagingModel;
}
