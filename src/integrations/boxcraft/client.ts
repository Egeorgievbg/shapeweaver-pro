import { BOXCRAFT_API_BASE_URL } from "@/lib/env";
import { ApiUnavailableError, BoxcraftError, NetworkError } from "./errors";

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json, application/x-ndjson, application/zip, */*",
};

export interface RequestOptions {
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  method?: string;
  body?: unknown;
  responseType?: "json" | "blob" | "arrayBuffer" | "text";
  timeoutMs?: number;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = BOXCRAFT_API_BASE_URL.replace(/\/+$/, "");
  const target = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(target, origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function boxcraftFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, opts.query);
  const controller = new AbortController();
  const signal = opts.signal ?? controller.signal;
  const timeoutId = opts.timeoutMs
    ? setTimeout(
        () => controller.abort(new DOMException("Timeout", "TimeoutError")),
        opts.timeoutMs,
      )
    : null;

  let response: Response;
  try {
    response = await fetch(url, {
      method: opts.method ?? "GET",
      headers: { ...DEFAULT_HEADERS, ...(opts.headers ?? {}) },
      body:
        opts.body != null
          ? typeof opts.body === "string"
            ? opts.body
            : JSON.stringify(opts.body)
          : undefined,
      signal,
    });
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiUnavailableError(undefined, {
      url,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
  if (timeoutId) clearTimeout(timeoutId);

  const requestId = response.headers.get("x-request-id") ?? undefined;

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => undefined);
    }
    throw new BoxcraftError(
      `http_${response.status}`,
      `Request failed (${response.status}): ${response.statusText}`,
      { status: response.status, requestId, details: body },
    );
  }

  const type = opts.responseType ?? "json";
  try {
    if (type === "blob") return (await response.blob()) as unknown as T;
    if (type === "arrayBuffer") return (await response.arrayBuffer()) as unknown as T;
    if (type === "text") return (await response.text()) as unknown as T;
    return (await response.json()) as T;
  } catch (error) {
    throw new NetworkError(`Failed to parse response from ${url}`, error);
  }
}
