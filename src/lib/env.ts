const configuredBoxcraftBase = (
  import.meta.env.VITE_BOXCRAFT_API_BASE_URL as string | undefined
)?.trim();

/**
 * Public read-only BoxCraft API base URL. Production should preferably use a
 * same-origin proxy instead of a temporary public tunnel.
 */
export const BOXCRAFT_API_BASE_URL =
  configuredBoxcraftBase || "https://constrictive-aspen-nonregimental.ngrok-free.dev";

/**
 * Browser-facing administration API base. Empty means same-origin `/api/admin`.
 * Never place an upstream administration token in a VITE_* variable.
 */
export const ADMIN_API_BASE_URL =
  (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined)?.trim() ?? "";

export const IS_BROWSER = typeof window !== "undefined";
