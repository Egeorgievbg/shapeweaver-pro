import { ADMIN_API_BASE_URL } from "@/lib/env";

export type AdminMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface AdminCapability {
  resource: string;
  endpoint: string;
  methods: AdminMethod[];
  enabled: boolean;
  permission?: string;
}

export interface AdminCapabilitiesResponse {
  ok: boolean;
  authenticated?: boolean;
  role?: string;
  capabilities: AdminCapability[];
  generated_at?: string;
}

export interface AdminSessionResponse {
  ok: boolean;
  authenticated: boolean;
  expires_at?: string;
}

export const ADMIN_RESOURCES = {
  session: "/api/admin/session",
  capabilities: "/api/admin/capabilities",
  products: "/api/admin/products",
  taxonomy: "/api/admin/taxonomy",
  materials: "/api/admin/materials",
  translations: "/api/admin/translations",
  content: "/api/admin/content",
  geometry: "/api/admin/geometry",
  dielines: "/api/admin/dielines",
  assets: "/api/admin/assets",
  quotes: "/api/admin/quotes",
  exports: "/api/admin/exports",
  users: "/api/admin/users",
  roles: "/api/admin/roles",
  integrations: "/api/admin/integrations",
  settings: "/api/admin/settings",
  audit: "/api/admin/audit",
} as const;

export class AdminApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  const base = ADMIN_API_BASE_URL.replace(/\/+$/, "");
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function adminRequest<T = unknown>(
  path: string,
  options: {
    method?: AdminMethod;
    body?: unknown;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const url = buildUrl(path);
  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      credentials: "include",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "GPTSBOXES-Admin",
        ...(options.headers ?? {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new AdminApiError("The administration service is unreachable.", undefined, {
      url,
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => undefined);

  if (!response.ok) {
    throw new AdminApiError(
      response.status === 401 || response.status === 403
        ? "Administrator authentication is required."
        : response.status === 404
          ? "This administration capability is not implemented by the backend."
          : response.status === 503
            ? "The secure administration gateway is not configured."
            : `Administration request failed (${response.status}).`,
      response.status,
      { url, payload },
    );
  }

  return payload as T;
}

export function capabilityAllows(
  capabilities: AdminCapability[] | undefined,
  resource: string,
  method: AdminMethod,
) {
  return Boolean(
    capabilities?.some(
      (capability) =>
        capability.enabled &&
        capability.resource === resource &&
        capability.methods.includes(method),
    ),
  );
}
