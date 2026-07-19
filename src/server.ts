import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type LoginAttempt = { count: number; resetAt: number };

const ADMIN_COOKIE = "gptsboxes_admin";
const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map<string, LoginAttempt>();

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (module) => (module.default ?? module) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function getEnvironmentValue(env: unknown, key: string) {
  if (env && typeof env === "object") {
    const value = (env as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const processValue = typeof process !== "undefined" ? process.env[key] : undefined;
  return processValue?.trim() || undefined;
}

function jsonResponse(payload: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function parseCookies(request: Request) {
  const result = new Map<string, string>();
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) result.set(key, decodeURIComponent(value));
  }
  return result;
}

function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

async function hmacHex(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function createSessionToken(secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const signature = await hmacHex(secret, String(expiresAt));
  return { token: `${expiresAt}.${signature}`, expiresAt };
}

async function verifySessionToken(token: string | undefined, secret: string) {
  if (!token) return false;
  const [expiresRaw, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) {
    return false;
  }
  const expected = await hmacHex(secret, expiresRaw);
  return constantTimeEqual(signature, expected);
}

function clientIdentifier(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function loginAllowed(request: Request) {
  const key = clientIdentifier(request);
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  return attempt.count < MAX_LOGIN_ATTEMPTS;
}

function registerFailedLogin(request: Request) {
  const key = clientIdentifier(request);
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  attempt.count += 1;
}

function clearLoginAttempts(request: Request) {
  loginAttempts.delete(clientIdentifier(request));
}

function sessionCookie(request: Request, token: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function requiresCsrfHeader(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

async function handleAdminSession(request: Request, env: unknown) {
  const accessKey = getEnvironmentValue(env, "GPTSBOXES_ADMIN_ACCESS_KEY");
  const sessionSecret = getEnvironmentValue(env, "GPTSBOXES_ADMIN_SESSION_SECRET");

  if (!accessKey || !sessionSecret) {
    return jsonResponse(
      {
        ok: false,
        error: "admin_gateway_not_configured",
        message: "Set GPTSBOXES_ADMIN_ACCESS_KEY and GPTSBOXES_ADMIN_SESSION_SECRET on the server.",
      },
      503,
    );
  }

  if (request.method === "POST") {
    if (request.headers.get("x-requested-with") !== "GPTSBOXES-Admin") {
      return jsonResponse({ ok: false, error: "csrf_header_required" }, 403);
    }
    if (!loginAllowed(request)) {
      return jsonResponse({ ok: false, error: "rate_limited" }, 429);
    }

    const payload = (await request.json().catch(() => null)) as { accessKey?: unknown } | null;
    const suppliedKey = typeof payload?.accessKey === "string" ? payload.accessKey : "";
    if (!constantTimeEqual(suppliedKey, accessKey)) {
      registerFailedLogin(request);
      return jsonResponse({ ok: false, error: "invalid_credentials" }, 401);
    }

    clearLoginAttempts(request);
    const session = await createSessionToken(sessionSecret);
    return jsonResponse(
      {
        ok: true,
        authenticated: true,
        expires_at: new Date(session.expiresAt * 1000).toISOString(),
      },
      200,
      { "set-cookie": sessionCookie(request, session.token, ADMIN_SESSION_SECONDS) },
    );
  }

  if (request.method === "DELETE") {
    return jsonResponse({ ok: true, authenticated: false }, 200, {
      "set-cookie": sessionCookie(request, "", 0),
    });
  }

  const token = parseCookies(request).get(ADMIN_COOKIE);
  const authenticated = await verifySessionToken(token, sessionSecret);
  return jsonResponse({ ok: true, authenticated });
}

async function handleBoxcraftGateway(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/boxcraft")) return null;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { Allow: "GET, HEAD, OPTIONS" } });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, {
      Allow: "GET, HEAD, OPTIONS",
    });
  }

  const upstreamBase = getEnvironmentValue(env, "BOXCRAFT_UPSTREAM_URL");
  if (!upstreamBase) {
    return jsonResponse(
      {
        ok: false,
        error: "boxcraft_upstream_not_configured",
        message: "Set BOXCRAFT_UPSTREAM_URL on the server.",
      },
      503,
    );
  }

  const suffix = url.pathname.slice("/api/boxcraft".length) || "/";
  const target = new URL(
    `${suffix}${url.search}`,
    upstreamBase.endsWith("/") ? upstreamBase : `${upstreamBase}/`,
  );
  const headers = new Headers({
    Accept: request.headers.get("accept") ?? "application/json, */*",
    "User-Agent": "GPTSBOXES-BoxCraft-Gateway/1.0",
    "ngrok-skip-browser-warning": "true",
  });

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(target, {
      method: request.method,
      headers,
      redirect: "follow",
    });
  } catch (error) {
    console.error("BoxCraft upstream request failed", error);
    return jsonResponse({ ok: false, error: "boxcraft_upstream_unreachable" }, 502);
  }

  const responseHeaders = new Headers({ "x-content-type-options": "nosniff" });
  for (const name of [
    "content-type",
    "content-length",
    "cache-control",
    "etag",
    "last-modified",
    "x-request-id",
  ]) {
    const value = upstreamResponse.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(request.method === "HEAD" ? null : upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

async function handleAdminGateway(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/admin")) return null;
  if (url.pathname === "/api/admin/session") return handleAdminSession(request, env);

  const sessionSecret = getEnvironmentValue(env, "GPTSBOXES_ADMIN_SESSION_SECRET");
  if (!sessionSecret) {
    return jsonResponse({ ok: false, error: "admin_gateway_not_configured" }, 503);
  }

  const token = parseCookies(request).get(ADMIN_COOKIE);
  if (!(await verifySessionToken(token, sessionSecret))) {
    return jsonResponse({ ok: false, error: "authentication_required" }, 401);
  }

  if (
    requiresCsrfHeader(request.method) &&
    request.headers.get("x-requested-with") !== "GPTSBOXES-Admin"
  ) {
    return jsonResponse({ ok: false, error: "csrf_header_required" }, 403);
  }

  const upstreamBase = getEnvironmentValue(env, "GPTSBOXES_ADMIN_UPSTREAM_URL");
  const upstreamToken = getEnvironmentValue(env, "GPTSBOXES_ADMIN_UPSTREAM_TOKEN");
  if (!upstreamBase || !upstreamToken) {
    return jsonResponse(
      {
        ok: false,
        error: "admin_upstream_not_configured",
        message:
          "Set GPTSBOXES_ADMIN_UPSTREAM_URL and GPTSBOXES_ADMIN_UPSTREAM_TOKEN on the server.",
      },
      503,
    );
  }

  const target = new URL(
    `${url.pathname}${url.search}`,
    upstreamBase.endsWith("/") ? upstreamBase : `${upstreamBase}/`,
  );
  const headers = new Headers({
    Accept: request.headers.get("accept") ?? "application/json",
    Authorization: `Bearer ${upstreamToken}`,
    "X-GPTSBOXES-Admin-Proxy": "1",
  });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const ifMatch = request.headers.get("if-match");
  if (ifMatch) headers.set("if-match", ifMatch);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(target, {
      method: request.method,
      headers,
      body: requiresCsrfHeader(request.method) ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch (error) {
    console.error("Admin upstream request failed", error);
    return jsonResponse({ ok: false, error: "admin_upstream_unreachable" }, 502);
  }

  const responseHeaders = new Headers({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  for (const name of ["content-type", "etag", "x-request-id"]) {
    const value = upstreamResponse.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const boxcraftResponse = await handleBoxcraftGateway(request, env);
      if (boxcraftResponse) return boxcraftResponse;

      const adminResponse = await handleAdminGateway(request, env);
      if (adminResponse) return adminResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
