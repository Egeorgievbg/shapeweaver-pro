import { BOXCRAFT_API_BASE_URL } from "@/lib/env";

/**
 * Resolves asset URLs referenced by the source API. The upstream sometimes
 * returns protocol-relative //cdn.pacdora.com/... paths, sometimes plain
 * relative paths, sometimes full https URLs.
 */
export function resolveAssetUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (s.startsWith("/api/configurator/assets/")) {
    return `${BOXCRAFT_API_BASE_URL}${s}`;
  }
  return `${BOXCRAFT_API_BASE_URL}${s.startsWith("/") ? "" : "/"}${s}`;
}

/**
 * The upstream `details.data.gltf` field is a UUID only. Historically the
 * Pacdora CDN hosts the mesh at:
 *   //cdn.pacdora.com/model/{uuid}.glb
 * We only *attempt* a load; if it 404s we fall back to knife-rig.
 */
export function resolveGltfUrl(uuid: string | undefined | null): string | undefined {
  if (!uuid) return undefined;
  const clean = uuid.trim();
  if (!clean) return undefined;
  if (clean.startsWith("http") || clean.startsWith("//")) return resolveAssetUrl(clean);
  return `https://cdn.pacdora.com/model/${clean}.glb`;
}
