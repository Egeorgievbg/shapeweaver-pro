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

  // --- Face direction map: preview.otherFaces + mainFace ---
  const faceDirectionMap: Record<string, FaceDirection> = {};
  if (previewRaw?.mainFace?.face) faceDirectionMap[previewRaw.mainFace.face] = "front";
  for (const f of previewRaw?.otherFaces ?? []) {
    if (f.faceName && isFaceDirection(f.direction)) {
      faceDirectionMap[f.faceName] = f.direction;
    }
  }

  // --- Face orientation map: modeCate.faces (JSON string) ---
  const faceOrientationMap: Record<string, number> = {};
  const modeCateFacesRaw = knifeRaw?.modeCate?.faces;
  if (typeof modeCateFacesRaw === "string" && modeCateFacesRaw.trim().startsWith("[")) {
    try {
      const arr = JSON.parse(modeCateFacesRaw) as RawFaceOrientation[];
      for (const f of arr) {
        const angle = typeof f.rotate === "string" ? parseFloat(f.rotate) : f.rotate;
        if (Number.isFinite(angle)) faceOrientationMap[f.value] = angle as number;
      }
    } catch {
      warnings.push("mode_cate_faces_parse_failed");
    }
  }

  // --- Panels ---
  const panels: PackagingPanel[] = (knifeRaw?.facesForSvg ?? []).map((fs, i) => {
    const raw = knifeRaw?.faces?.[i];
    const bboxX = raw?.x ?? 0;
    const bboxY = raw?.y ?? 0;
    const bboxW = raw?.w ?? 0;
    const bboxH = raw?.h ?? 0;
    const dir = faceDirectionMap[fs.name];
    return {
      id: fs.name,
      name: fs.name,
      svgPath: fs.d,
      bbox: { x: bboxX, y: bboxY, w: bboxW, h: bboxH },
      direction: dir,
      orientationRotate: faceOrientationMap[fs.name],
      layer: "traditional",
      isFlap: !dir, // heuristic: if not mapped to a cardinal direction, treat as flap
      centroid: { x: bboxX + bboxW / 2, y: bboxY + bboxH / 2 },
    };
  });

  // --- Folds: parse "PARENT_CHILD" naming convention ---
  const folds: PackagingFold[] = (knifeRaw?.folds ?? []).map((f) => {
    const [parentId, childId] = splitFoldName(f.name);
    // Detect if this fold is *closing* the box: when child is a flap (no direction)
    // it opens 90°; when between two cardinal faces, opens 90° in the box-close direction.
    const closedAngle = Math.PI / 2;
    return {
      id: f.name,
      parentPanelId: parentId ?? "",
      childPanelId: childId ?? f.name,
      from: [f.x1, f.y1],
      to: [f.x2, f.y2],
      direction: f.rotate ? -1 : 1,
      openAngle: 0,
      closedAngle,
    };
  });

  // Backfill parent references on panels
  for (const fold of folds) {
    const child = panels.find((p) => p.id === fold.childPanelId);
    if (child) child.parentId = fold.parentPanelId;
  }

  // --- Dieline ---
  const dieline: NormalizedDieline | undefined = knifeRaw
    ? {
        totalX: knifeRaw.totalX,
        totalY: knifeRaw.totalY,
        cutsPath: knifeRaw.cutsForSvg ?? "",
        bleedsPath: knifeRaw.bleedsForSvg,
        bleedline: knifeRaw.bleedline,
        faces: panels,
        folds,
        holes: (knifeRaw.holesForSvg as { d?: string }[] | undefined)?.map((h) => ({ d: h?.d ?? "" })) ?? [],
        sizeArrows: (knifeRaw.sizeArrowData ?? []).map((s) => ({
          label: s.tpointer?.value ?? s.lineName ?? "",
          length: s.lineLength ?? 0,
          p1: s.p1 ?? { x: 0, y: 0 },
          p2: s.p2 ?? { x: 0, y: 0 },
          tpointer: s.tpointer,
          axis: (s.unit === "length" || s.unit === "width" || s.unit === "height"
            ? s.unit
            : "other") as "length" | "width" | "height" | "other",
        })),
      }
    : undefined;

  // --- Dimensions ---
  const size = knifeRaw?.size ?? knifeRaw?.knifeSize;
  const dimensions: Dimensions = {
    width: size?.L ?? detailsRaw?.length ?? previewRaw?.length ?? 100,
    depth: size?.W ?? detailsRaw?.width ?? previewRaw?.width ?? 60,
    height: size?.H ?? detailsRaw?.height ?? previewRaw?.height ?? 40,
    unit: "mm",
    thickness: (size as { D?: number } | undefined)?.D ?? knifeRaw?.thickness ?? 1.5,
  };

  // --- Limits from modeCate ---
  const parseLimit = (raw: string | undefined): [number?, number?] => {
    if (!raw) return [];
    const [min, max] = raw.split(",").map((n) => parseFloat(n.trim()));
    return [Number.isFinite(min) ? min : undefined, Number.isFinite(max) ? max : undefined];
  };
  const [lengthMin, lengthMax] = parseLimit(knifeRaw?.modeCate?.lengthLimit);
  const [widthMin, widthMax] = parseLimit(knifeRaw?.modeCate?.widthLimit);
  const [heightMin, heightMax] = parseLimit(knifeRaw?.modeCate?.heightLimit);
  const thicknessMin = knifeRaw?.modeCate?.minThickness
    ? parseFloat(knifeRaw.modeCate.minThickness)
    : undefined;

  // --- Materials ---
  const materials: PackagingMaterial[] = deriveMaterials(previewRaw, detailsRaw);

  // --- Preview ---
  const preview: NormalizedPreview | undefined = previewRaw
    ? {
        imageUrl: resolveAssetUrl(detailsRaw?.image ?? previewRaw.preview_3d_img),
        faceMappings: previewRaw.otherFaces ?? [],
        mainFace: previewRaw.mainFace,
      }
    : undefined;

  // --- Geometry strategy selection ---
  const gltfUrl = resolveGltfUrl(detailsRaw?.gltf);
  const strategy: GeometryStrategy = selectStrategy({
    hasGltf: !!gltfUrl,
    hasKnife: !!knifeRaw && (knifeRaw.faces?.length ?? 0) > 0 && (knifeRaw.folds?.length ?? 0) > 0,
    hasPreviewImage: !!(detailsRaw?.image || previewRaw?.preview_3d_img),
  });

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
    limits: { lengthMin, lengthMax, widthMin, widthMax, heightMin, heightMax, thicknessMin },
    warnings,
    raw: { details: detailsRaw, knife: knifeRaw, preview: previewRaw },
  };
}

function selectStrategy(f: {
  hasGltf: boolean;
  hasKnife: boolean;
  hasPreviewImage: boolean;
}): GeometryStrategy {
  // GLB is preferred when the URL exists AND we consider it likely to load.
  // Because Pacdora CDN GLBs are frequently 404 or CORS-blocked from the
  // browser, we prefer knife-rig when available and keep GLB as a lazy attempt
  // that upgrades the strategy on successful load.
  if (f.hasKnife) return "knife-rig";
  if (f.hasGltf) return "gltf";
  if (f.hasPreviewImage) return "preview-only";
  return "unsupported";
}

function splitFoldName(name: string): [string?, string?] {
  const idx = name.indexOf("_");
  if (idx < 0) return [undefined, name];
  return [name.slice(0, idx), name.slice(idx + 1)];
}

function isFaceDirection(v: string | undefined): v is FaceDirection {
  return v === "front" || v === "back" || v === "left" || v === "right" || v === "top" || v === "bottom";
}

function deriveMaterials(
  previewRaw: RawPreviewBody | undefined,
  _detailsRaw: RawDetailsBody | undefined,
): PackagingMaterial[] {
  const results: PackagingMaterial[] = [];
  const layers = (previewRaw?.layer ?? {}) as Record<string, { science_name?: string; thickness?: number; def_line_color?: string }>;
  for (const [key, layer] of Object.entries(layers)) {
    results.push({
      id: key,
      name: layer.science_name ?? key,
      layer: key,
      thickness: layer.thickness ?? 1.5,
      color: layer.def_line_color && layer.def_line_color.startsWith("#") ? layer.def_line_color : "#ffffff",
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
