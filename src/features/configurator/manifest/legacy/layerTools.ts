import type {
  RawKnifeBody,
  RawKnifeFace,
} from "@/integrations/boxcraft/types";
import type {
  ManifestDieline,
  ManifestFace,
  ManifestFold,
  ManifestMaterial,
} from "../types";
import {
  asRecord,
  commandsToSvgPath,
  finiteNumber,
  positiveNumber,
  resolveFoldFaces,
  type UnknownRecord,
} from "./pathTools";

export interface CompiledLayer {
  faces: ManifestFace[];
  folds: ManifestFold[];
  dieline: ManifestDieline;
  material: ManifestMaterial;
  foldsByName: Map<string, ManifestFold>;
  warnings: string[];
  nextFoldIndex: number;
  rawAnimation: unknown;
}

export function getLayerEntries(knife: RawKnifeBody): [string, UnknownRecord][] {
  const layers = asRecord((knife as unknown as UnknownRecord).layer);
  if (!layers || !Object.keys(layers).length) {
    return [["traditional", knife as unknown as UnknownRecord]];
  }
  return Object.entries(layers)
    .map(([key, value]) => [key, asRecord(value)] as const)
    .filter((entry): entry is [string, UnknownRecord] => Boolean(entry[1]));
}

export function compileLayer(
  sourceId: string,
  layerKey: string,
  layer: UnknownRecord,
  knife: RawKnifeBody,
  directions: Record<string, "front" | "back" | "left" | "right" | "top" | "bottom">,
  firstFoldIndex: number,
): CompiledLayer {
  const warnings: string[] = [];
  const rawFaces = (Array.isArray(layer.faces) ? layer.faces : knife.faces ?? []) as RawKnifeFace[];
  const svgFaces = Array.isArray(layer.facesForSvg)
    ? (layer.facesForSvg as { name?: string; d?: string }[])
    : knife.facesForSvg ?? [];
  const svgByName = new Map(
    svgFaces.map((face) => [String(face.name ?? ""), String(face.d ?? "")]),
  );
  const faceNames = rawFaces.map((face) => face.name).filter(Boolean);

  const faces: ManifestFace[] = rawFaces.map((rawFace) => {
    const faceKey = `${layerKey}:${rawFace.name}`;
    const path = svgByName.get(rawFace.name) || commandsToSvgPath(rawFace.dlist);
    if (!path) warnings.push(`face_path_missing:${faceKey}`);
    return {
      id: faceKey,
      faceKey,
      name: rawFace.name,
      layerKey,
      svgPath: path,
      holes: (rawFace.holes ?? []).map(commandsToSvgPath).filter(Boolean),
      bbox: {
        x: finiteNumber(rawFace.x),
        y: finiteNumber(rawFace.y),
        width: positiveNumber(rawFace.w, 1),
        height: positiveNumber(rawFace.h, 1),
      },
      centroid: {
        x: finiteNumber(rawFace.x) + positiveNumber(rawFace.w, 1) / 2,
        y: finiteNumber(rawFace.y) + positiveNumber(rawFace.h, 1) / 2,
      },
      direction: directions[rawFace.name],
    };
  });

  const folds: ManifestFold[] = [];
  const foldsByName = new Map<string, ManifestFold>();
  let nextFoldIndex = firstFoldIndex;
  const rawFolds = (Array.isArray(layer.folds) ? layer.folds : knife.folds ?? []) as UnknownRecord[];
  for (const rawFold of rawFolds) {
    const name = String(rawFold.name ?? "");
    const [parent, child] = resolveFoldFaces(name, faceNames);
    if (!parent || !child) {
      warnings.push(`fold_relationship_unresolved:${layerKey}:${name}`);
      continue;
    }
    const fold: ManifestFold = {
      id: `${layerKey}:${nextFoldIndex}:${name}`,
      foldIndex: nextFoldIndex,
      parentFaceKey: `${layerKey}:${parent}`,
      childFaceKey: `${layerKey}:${child}`,
      from: [finiteNumber(rawFold.x1), finiteNumber(rawFold.y1)],
      to: [finiteNumber(rawFold.x2), finiteNumber(rawFold.y2)],
      direction: rawFold.rotate ? -1 : 1,
      openAngle: 0,
      closedAngle: Math.PI / 2,
    };
    nextFoldIndex += 1;
    folds.push(fold);
    foldsByName.set(name, fold);
  }

  const totalX = positiveNumber(layer.totalX, positiveNumber(knife.totalX, 1));
  const totalY = positiveNumber(layer.totalY, positiveNumber(knife.totalY, 1));
  const bleedline = finiteNumber(layer.bleedline ?? knife.bleedline, Number.NaN);
  const dieline: ManifestDieline = {
    id: `${sourceId}:${layerKey}:dieline`,
    layerKey,
    totalX,
    totalY,
    cutsPath: String(layer.cutsForSvg ?? knife.cutsForSvg ?? ""),
    bleedsPath: String(layer.bleedsForSvg ?? knife.bleedsForSvg ?? "") || undefined,
    productionStatus: "unverified",
  };
  if (Number.isFinite(bleedline)) dieline.bleedline = bleedline;

  const science = asRecord(layer.science ?? knife.science);
  const color = String(layer.def_line_color ?? "#ffffff");
  const material: ManifestMaterial = {
    id: String(science?.id ?? `${sourceId}:${layerKey}`),
    name: String(layer.science_name ?? science?.name ?? layerKey),
    layerKey,
    thickness: positiveNumber(layer.thickness, positiveNumber(knife.thickness, 1.5)),
    color: color.startsWith("#") ? color : "#ffffff",
    roughness: 0.82,
    metalness: 0,
  };

  return {
    faces,
    folds,
    dieline,
    material,
    foldsByName,
    warnings,
    nextFoldIndex,
    rawAnimation:
      layer.animation ??
      layer.animate ??
      knife.animation ??
      (knife as unknown as UnknownRecord).animate,
  };
}
