export function detectWebGL(): { ok: true } | { ok: false; reason: string } {
  if (typeof window === "undefined") return { ok: false, reason: "SSR" };
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return { ok: false, reason: "no-context" };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `error:${(err as Error).message}` };
  }
}
