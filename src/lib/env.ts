const configuredBoxcraftBase = (
  import.meta.env.VITE_BOXCRAFT_API_BASE_URL as string | undefined
)?.trim();

/**
 * Browser-facing read-only BoxCraft gateway. Production defaults to the
 * same-origin server proxy so temporary tunnels and upstream infrastructure
 * never leak into client bundles.
 */
export const BOXCRAFT_API_BASE_URL = configuredBoxcraftBase || "/api/boxcraft";

/**
 * Browser-facing administration API base. Empty means same-origin `/api/admin`.
 * Never place an upstream administration token in a VITE_* variable.
 */
export const ADMIN_API_BASE_URL =
  (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined)?.trim() ?? "";

export const IS_BROWSER = typeof window !== "undefined";
