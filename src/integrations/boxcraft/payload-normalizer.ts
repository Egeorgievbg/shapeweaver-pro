import type {
  ApiPayloadPackage,
  Dimensions,
  FaceDirection,
  GeometryStrategy,
  NormalizedDieline,
  NormalizedPackagingModel,
  NormalizedPreview,
  PackagingFold,
  PackagingMaterial,
  PackagingPanel,
  RawDetailsBody,
  RawFaceOrientation,
  RawKnifeBody,
  RawPreviewBody,
} from "./types";
import { resolveAssetUrl, resolveGltfUrl } from "./asset-resolver";

/**
 * Adapts a raw API payload package into the app's normalized model.
 * NEVER throws on missing fields — surface warnings, keep going.
 */
export function normalizePayloadPackage(
  sourceId: string,
  pkg: ApiPayloadPackage,
): NormalizedPackagingModel {
  const warnings: string[] = [];

  const detailsRaw = pkg.payloads.details?.payload?.payload as RawDetailsBody | undefined;
  const knifeRaw = (pkg.payloads.knife?.payload?.data ?? pkg.payloads.knife?.payload?.payload) as
    | RawKnifeBody
    | undefined;
  const previewRaw = (pkg.payloads.preview?.payload?.data ?? pkg.payloads.preview?.payload?.payload) as
    | RawPreviewBody
    | undefined;

  if (!detailsRaw) warnings.push("details_missing");
  if (!knifeRaw) warnings.push("knife_missing");
  if (!previewRaw) warnings.push("preview_missing");

  const faceDirectionMap: Record<string, FaceDirection> = {};
  if (previewRaw?.mainFace?.face) faceDirectionMap[previewRaw.mainFace.face] = "front";
  for (const face of previewRaw?.otherFaces ?? []) {
    if (face.faceName && isFaceDirection(face.direction)) {
      faceDirectionMap[face.faceName] = face.direction;
    }
  }

  const faceOrientationMap: Record<string, number> = {};
  const modeCateFacesRaw = knifeRaw?.modeCate?.faces;
  if (typeof modeCateFacesRaw === "string" && modeCateFacesRaw.trim().startsWith("[")) {
    try {
      const values = JSON.parse(modeCateFacesRaw) as RawFaceOrientation[];
      for (const face of values) {
        const angle = typeof face.rotate === "string" ? parseFloat(face.rotate) : face.rotate;
        if (Number.isFinite(angle)) faceOrientationMap[face.value] = angle as number;
      }
    } catch {
      warnings.push("mode_cate_faces_parse_failed");
    }
  }

  const panels: PackagingPanel[] = (knifeRaw?.facesForSvg ?? [])
    .filter((face) => Boolean(face?.name && face?.d?.trim()))
    .map((face, index) => {
      const raw = knifeRaw?.faces?.[index];
      const bboxX = finiteNumber(raw?.x, 0);
      const bboxY = finiteNumber(raw?.y, 0);
      const bboxW = positiveNumber(raw?.w, 1);
      const bboxH = positiveNumber(raw?.h, 1);
      const direction = faceDirectionMap[face.name];

      return {
        id: face.name,
        name: face.name,
        svgPath: face.d,
        bbox: { x: bboxX, y: bboxY, w: bboxW, h: bboxH },
        direction,
        orientationRotate: faceOrientationMap[face.name],
        layer: "traditional",
        isFlap: !direction,
        centroid: { x: bboxX + bboxW / 2, y: bboxY + bboxH / 2 },
      };
    });

  const panelIds = panels.map((panel) => panel.id);
  let unresolvedFoldCount = 0;
  const folds: PackagingFold[] = (knifeRaw?.folds ?? []).flatMap((fold) => {
    const [parentPanelId, childPanelId] = resolveFoldPanels(fold.name, panelIds);
    if (!parentPanelId || !childPanelId) {
      unresolvedFoldCount += 1;
      return [];
    }

    return [
      {
        id: fold.name,
        parentPanelId,
        childPanelId,
        from: [finiteNumber(fold.x1, 0), finiteNumber(fold.y1, 0)],
        to: [finiteNumber(fold.x2, 0), finiteNumber(fold.y2, 0)],
        direction: fold.rotate ? -1 : 1,
        openAngle: 0,
        closedAngle: Math.PI / 2,
      },
    ];
  });

  if (unresolvedFoldCount > 0) {
    warnings.push(`fold_relationships_unresolved:${unresolvedFoldCount}`);
  }

  for (const fold of folds) {
    const child = panels.find((panel) => panel.id === fold.childPanelId);
    if (child) child.parentId = fold.parentPanelId;
  }

  const totalX = positiveNumber(knifeRaw?.totalX, 0);
  const totalY = positiveNumber(knifeRaw?.totalY, 0);
  const hasDielineSize = totalX > 0 && totalY > 0;

  const dieline: NormalizedDieline | undefined = knifeRaw && hasDielineSize
    ? {
        totalX,
        totalY,
        cutsPath: knifeRaw.cutsForSvg ?? "",
        bleedsPath: knifeRaw.bleedsForSvg,
        bleedline: knifeRaw.bleedline,
        faces: panels,
        folds,
        holes:
          (knifeRaw.holesForSvg as { d?: string }[] | undefined)?.map((hole) => ({
            d: hole?.d ?? "",
          })) ?? [],
        sizeArrows: (knifeRaw.sizeArrowData ?? []).map((sizeArrow) => ({
          label: sizeArrow.tpointer?.value ?? sizeArrow.lineName ?? "",
          length: finiteNumber(sizeArrow.lineLength, 0),
          p1: sizeArrow.p1 ?? { x: 0, y: 0 },
          p2: sizeArrow.p2 ?? { x: 0, y: 0 },
          tpointer: sizeArrow.tpointer,
          axis: (sizeArrow.unit === "length" ||
          sizeArrow.unit === "width" ||
          sizeArrow.unit === "height"
            ? sizeArrow.unit
            : "other") as "length" | "width" | "height" | "other",
        })),
      }
    : undefined;

  if (knifeRaw && !hasDielineSize) warnings.push("dieline_size_invalid");

  const size = knifeRaw?.size ?? knifeRaw?.knifeSize;
  const dimensions: Dimensions = {
    width: positiveNumber(size?.L ?? detailsRaw?.length ?? previewRaw?.length, 100),
    depth: positiveNumber(size?.W ?? detailsRaw?.width ?? previewRaw?.width, 60),
    height: positiveNumber(size?.H ?? detailsRaw?.height ?? previewRaw?.height, 40),
    unit: "mm",
    thickness: positiveNumber(
      (size as { D?: number } | undefined)?.D ?? knifeRaw?.thickness,
      1.5,
    ),
  };

  const parseLimit = (raw: string | undefined): [number?, number?] => {
    if (!raw) return [];
    const [minimum, maximum] = raw.split(",").map((value) => parseFloat(value.trim()));
    return [
      Number.isFinite(minimum) ? minimum : undefined,
      Number.isFinite(maximum) ? maximum : undefined,
    ];
  };
  const [lengthMin, lengthMax] = parseLimit(knifeRaw?.modeCate?.lengthLimit);
  const [widthMin, widthMax] = parseLimit(knifeRaw?.modeCate?.widthLimit);
  const [heightMin, heightMax] = parseLimit(knifeRaw?.modeCate?.heightLimit);
  const thicknessMin = knifeRaw?.modeCate?.minThickness
    ? parseFloat(knifeRaw.modeCate.minThickness)
    : undefined;

  const materials: PackagingMaterial[] = deriveMaterials(previewRaw, detailsRaw);

  const preview: NormalizedPreview | undefined = previewRaw
    ? {
        imageUrl: resolveAssetUrl(detailsRaw?.image ?? previewRaw.preview_3d_img),
        faceMappings: previewRaw.otherFaces ?? [],
        mainFace: previewRaw.mainFace,
      }
    : undefined;

  const gltfUrl = resolveGltfUrl(detailsRaw?.gltf);
  const hasUsableKnife =
    Boolean(dieline) &&
    panels.length > 0 &&
    folds.length > 0 &&
    panels.every((panel) => Boolean(panel.svgPath.trim()));
  const strategy: GeometryStrategy = selectStrategy({
    hasGltf: Boolean(gltfUrl),
    hasKnife: hasUsableKnife,
    hasPreviewImage: Boolean(detailsRaw?.image || previewRaw?.preview_3d_img),
  });

  if (knifeRaw && !hasUsableKnife) warnings.push("knife_geometry_incomplete");

  return {
    id: `source-${sourceId}`,
    sourceId,
    name: (detailsRaw?.nameKey as string) ?? previewRaw?.project_name ?? `Product ${sourceId}`,
    title: previewRaw?.project_name,
    thumbnailUrl: resolveAssetUrl(detailsRaw?.image),
    units: "mm",
    dimensions,
    board: { thickness: dimensions.thickness, materialId: materials[0]?.id },
    geometryStrategy: strategy,
    gltf: gltfUrl ? { url: gltfUrl, draco: true, ktx2: true } : undefined,
    panels,
    folds,
    dieline,
    preview,
    materials,
    openParams: (knifeRaw?.openParams ?? []).flat(),
    faceDirectionMap,
    faceOrientationMap,
    limits: {
      lengthMin,
      lengthMax,
      widthMin,
      widthMax,
      heightMin,
      heightMax,
      thicknessMin,
    },
    warnings,
    raw: { details: detailsRaw, knife: knifeRaw, preview: previewRaw },
  };
}

function selectStrategy(flags: {
  hasGltf: boolean;
  hasKnife: boolean;
  hasPreviewImage: boolean;
}): GeometryStrategy {
  if (flags.hasKnife) return "knife-rig";
  if (flags.hasGltf) return "gltf";
  if (flags.hasPreviewImage) return "preview-only";
  return "unsupported";
}

function resolveFoldPanels(
  foldName: string,
  panelIds: string[],
): [string | undefined, string | undefined] {
  const sortedIds = [...panelIds].sort((left, right) => right.length - left.length);
  const separators = ["_", "-", "|", ":", "/"];

  for (const parentId of sortedIds) {
    for (const separator of separators) {
      const prefix = `${parentId}${separator}`;
      if (!foldName.startsWith(prefix)) continue;
      const childCandidate = foldName.slice(prefix.length);
      const childId = sortedIds.find((candidate) => candidate === childCandidate);
      if (childId) return [parentId, childId];
    }
  }

  for (const childId of sortedIds) {
    for (const separator of separators) {
      const suffix = `${separator}${childId}`;
      if (!foldName.endsWith(suffix)) continue;
      const parentCandidate = foldName.slice(0, -suffix.length);
      const parentId = sortedIds.find((candidate) => candidate === parentCandidate);
      if (parentId) return [parentId, childId];
    }
  }

  return [undefined, undefined];
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isFaceDirection(value: string | undefined): value is FaceDirection {
  return (
    value === "front" ||
    value === "back" ||
    value === "left" ||
    value === "right" ||
    value === "top" ||
    value === "bottom"
  );
}

function deriveMaterials(
  previewRaw: RawPreviewBody | undefined,
  _detailsRaw: RawDetailsBody | undefined,
): PackagingMaterial[] {
  const results: PackagingMaterial[] = [];
  const layers = (previewRaw?.layer ?? {}) as Record<
    string,
    { science_name?: string; thickness?: number; def_line_color?: string }
  >;

  for (const [key, layer] of Object.entries(layers)) {
    results.push({
      id: key,
      name: layer.science_name ?? key,
      layer: key,
      thickness: positiveNumber(layer.thickness, 1.5),
      color:
        layer.def_line_color && layer.def_line_color.startsWith("#")
          ? layer.def_line_color
          : "#ffffff",
      roughness: 0.85,
      metalness: 0,
    });
  }

  if (results.length === 0) {
    results.push({
      id: "traditional",
      name: "Coated paperboard",
      layer: "traditional",
      thickness: 1.5,
      color: "#ffffff",
      roughness: 0.85,
      metalness: 0,
    });
  }

  return results;
}
