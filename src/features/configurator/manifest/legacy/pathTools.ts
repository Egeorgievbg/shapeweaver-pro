import type { FaceDirection, RawKnifePoint, RawPreviewBody } from "@/integrations/boxcraft/types";

export interface UnknownRecord {
  [key: string]: unknown;
}

export function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

export function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function vectorTuple(value: unknown): [number, number, number] | undefined {
  const source = asRecord(value);
  if (!source) return undefined;
  const result: [number, number, number] = [
    finiteNumber(source.x),
    finiteNumber(source.y),
    finiteNumber(source.z),
  ];
  return result.some((item) => item !== 0) ? result : undefined;
}

export function commandsToSvgPath(commands: RawKnifePoint[] | undefined): string {
  if (!Array.isArray(commands)) return "";
  return commands
    .map((command) => {
      const method = String(command.mtd ?? "").toUpperCase();
      if (method === "Z") return "Z";
      if (method === "M" || method === "L") {
        return `${method} ${finiteNumber(command.x)} ${finiteNumber(command.y)}`;
      }
      if (method === "Q") {
        return `Q ${finiteNumber(command.x1)} ${finiteNumber(command.y1)} ${finiteNumber(command.x)} ${finiteNumber(command.y)}`;
      }
      if (method === "C") {
        return `C ${finiteNumber(command.x1)} ${finiteNumber(command.y1)} ${finiteNumber(command.x2)} ${finiteNumber(command.y2)} ${finiteNumber(command.x)} ${finiteNumber(command.y)}`;
      }
      if (method === "A") {
        return `A ${positiveNumber(command.rx, 0)} ${positiveNumber(command.ry, 0)} ${finiteNumber(command.rotation)} ${finiteNumber(command.largeArc)} ${finiteNumber(command.sweep)} ${finiteNumber(command.x)} ${finiteNumber(command.y)}`;
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

export function buildFaceDirectionMap(
  preview: RawPreviewBody | undefined,
): Record<string, FaceDirection> {
  const result: Record<string, FaceDirection> = {};
  if (preview?.mainFace?.face) result[preview.mainFace.face] = "front";
  for (const face of preview?.otherFaces ?? []) {
    if (["front", "back", "left", "right", "top", "bottom"].includes(face.direction)) {
      result[face.faceName] = face.direction as FaceDirection;
    }
  }
  return result;
}

export function resolveFoldFaces(
  foldName: string,
  faceNames: string[],
): [string | undefined, string | undefined] {
  const sorted = [...faceNames].sort((left, right) => right.length - left.length);
  for (const parent of sorted) {
    for (const separator of ["_", "-", "|", ":", "/"]) {
      const prefix = `${parent}${separator}`;
      if (!foldName.startsWith(prefix)) continue;
      const child = foldName.slice(prefix.length);
      if (sorted.includes(child)) return [parent, child];
    }
  }
  for (const child of sorted) {
    for (const separator of ["_", "-", "|", ":", "/"]) {
      const suffix = `${separator}${child}`;
      if (!foldName.endsWith(suffix)) continue;
      const parent = foldName.slice(0, -suffix.length);
      if (sorted.includes(parent)) return [parent, child];
    }
  }
  return [undefined, undefined];
}

export async function sha256Json(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
