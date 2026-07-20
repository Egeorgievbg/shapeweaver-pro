import type {
  ApiPayloadPackage,
  RawDetailsBody,
  RawKnifeBody,
  RawPreviewBody,
} from "@/integrations/boxcraft/types";
import type {
  ManifestAnimationSequence,
  ManifestDieline,
  ManifestFace,
  ManifestFold,
  ManifestMaterial,
  ViewerManifestV1,
} from "./types";
import { compileLayerAnimations } from "./legacy/animationTools";
import { compileLayer, getLayerEntries } from "./legacy/layerTools";
import { asRecord, buildFaceDirectionMap, positiveNumber, sha256Json } from "./legacy/pathTools";

function unwrapPayloads(pkg: ApiPayloadPackage) {
  return {
    details: pkg.payloads.details?.payload?.payload as RawDetailsBody | undefined,
    knife: (pkg.payloads.knife?.payload?.data ?? pkg.payloads.knife?.payload?.payload) as
      | RawKnifeBody
      | undefined,
    preview: (pkg.payloads.preview?.payload?.data ?? pkg.payloads.preview?.payload?.payload) as
      | RawPreviewBody
      | undefined,
  };
}

export async function compileLegacyPayloadManifest(
  sourceId: string,
  pkg: ApiPayloadPackage,
): Promise<ViewerManifestV1> {
  const { details, knife, preview } = unwrapPayloads(pkg);
  if (!knife) throw new Error(`Source ${sourceId} has no knife payload.`);

  const directions = buildFaceDirectionMap(preview);
  const faces: ManifestFace[] = [];
  const folds: ManifestFold[] = [];
  const dielines: ManifestDieline[] = [];
  const materials: ManifestMaterial[] = [];
  const animations: ManifestAnimationSequence[] = [];
  const warnings: string[] = [];
  let nextFoldIndex = 0;

  for (const [layerKey, layer] of getLayerEntries(knife)) {
    const compiled = compileLayer(sourceId, layerKey, layer, knife, directions, nextFoldIndex);
    faces.push(...compiled.faces);
    folds.push(...compiled.folds);
    dielines.push(compiled.dieline);
    materials.push(compiled.material);
    warnings.push(...compiled.warnings);
    nextFoldIndex = compiled.nextFoldIndex;
    animations.push(
      ...compileLayerAnimations(layerKey, compiled.rawAnimation, compiled.foldsByName),
    );
  }

  const size = asRecord(knife.size ?? knife.knifeSize);
  const sourceHash = await sha256Json(pkg);
  const hasAnimation = animations.some((sequence) =>
    sequence.steps.some((step) => step.operations.length > 0),
  );
  const hasGeometry = faces.length > 0 && faces.every((face) => Boolean(face.svgPath));

  return {
    schema: "gptsboxes.viewer-manifest/v1",
    generatedAt: new Date().toISOString(),
    sourceHash,
    product: {
      sourceId,
      name: String(details?.nameKey ?? preview?.project_name ?? `Product ${sourceId}`),
      title: preview?.project_name,
      dimensions: {
        length: positiveNumber(size?.L ?? details?.length ?? preview?.length, 100),
        width: positiveNumber(size?.W ?? details?.width ?? preview?.width, 60),
        height: positiveNumber(size?.H ?? details?.height ?? preview?.height, 40),
        thickness: positiveNumber(size?.D ?? knife.thickness, 1.5),
        unit: "mm",
      },
      defaultMaterialId: materials[0]?.id,
      availableMaterialIds: materials.map((material) => material.id),
    },
    model: {
      version: `legacy-${sourceHash.slice(0, 12)}`,
      sourceHash,
      gltfUrl: typeof details?.gltf === "string" ? details.gltf : undefined,
      productionStatus: "unverified",
      geometryQuality: hasGeometry
        ? hasAnimation
          ? "recorded-source"
          : "geometry-only"
        : "invalid",
    },
    faces,
    folds,
    animations,
    dielines,
    materials,
    assets: [],
    runtimeStrategy: hasAnimation
      ? "recorded-animation"
      : hasGeometry
        ? "geometry-only"
        : "unsupported",
    validation: {
      status: hasGeometry ? (warnings.length ? "warning" : "valid") : "invalid",
      warnings,
      errors: hasGeometry ? [] : ["exact_face_geometry_missing"],
      checkedAt: new Date().toISOString(),
    },
    exportCapabilities: {
      json: "native",
      svg: "native",
      png: "native",
      glb: "native",
      gltf: "native",
      obj: "native",
      stl: "native",
      ply: "native",
      pdf: "server-converted",
      dxf: "server-converted",
      mp4: "server-converted",
      step: "unsupported",
      iges: "unsupported",
    },
  };
}
