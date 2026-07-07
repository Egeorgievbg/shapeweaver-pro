/**
 * Centralized environment access. Never read import.meta.env from components.
 */
export const BOXCRAFT_API_BASE_URL =
  (import.meta.env.VITE_BOXCRAFT_API_BASE_URL as string | undefined)?.trim() ||
  "https://constrictive-aspen-nonregimental.ngrok-free.dev";

export const IS_BROWSER = typeof window !== "undefined";
