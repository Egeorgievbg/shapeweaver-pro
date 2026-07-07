const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export interface ArtworkValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateArtworkFile(file: File): ArtworkValidationResult {
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, reason: `Unsupported file type "${file.type}"` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: `File exceeds 12 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` };
  }
  return { ok: true };
}

/** Read as base64 data URL. Rejects on failure. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

/** Minimal SVG sanitizer: strips <script>, event handlers, javascript: URLs. */
export function sanitizeSvgString(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
