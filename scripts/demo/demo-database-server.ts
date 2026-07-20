import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DEMO_DATASET_TIMESTAMP, DEMO_DATASET_VERSION } from "./stable-demo-manifest";

const databasePath = resolve(
  process.env.GPTSBOXES_DEMO_DB ?? "data/demo/gptsboxes_demo.sqlite",
);
const port = Number(process.env.GPTSBOXES_DEMO_API_PORT ?? 4174);

if (!existsSync(databasePath)) {
  throw new Error(
    `Demo database not found at ${databasePath}. Copy gptsboxes_demo.sqlite to data/demo/ or set GPTSBOXES_DEMO_DB.`,
  );
}

const database = new Database(databasePath, { readonly: true, strict: true });
database.exec("PRAGMA query_only=ON; PRAGMA foreign_keys=ON;");

const integrity = database.query("PRAGMA integrity_check").get() as Record<string, unknown>;
const foreignKeyErrors = database.query("PRAGMA foreign_key_check").all();
if (!Object.values(integrity).includes("ok") || foreignKeyErrors.length > 0) {
  database.close();
  throw new Error("Demo SQLite integrity validation failed");
}

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const rows = () =>
  database
    .query(
      "SELECT source_id,name,family,category,material,length_mm,width_mm,height_mm,product_line,geometry_quality,production_status FROM products ORDER BY name",
    )
    .all() as Record<string, unknown>[];

const server = Bun.serve({
  port,
  hostname: "127.0.0.1",
  fetch(request) {
    const url = new URL(request.url);

    if (
      ["/api/health", "/api/v1/visualization/health", "/api/configurator/health"].includes(
        url.pathname,
      )
    ) {
      return json({
        ok: true,
        mode: "sqlite-demo",
        datasetVersion: DEMO_DATASET_VERSION,
        database: databasePath,
        integrity: "ok",
        foreignKeyErrors: 0,
      });
    }

    if (url.pathname === "/api/v1/visualization/products") {
      const items = rows().map((row) => ({
        source_id: row.source_id,
        id: row.source_id,
        name: row.name,
        family: row.family,
        category: row.category,
        material: row.material,
        product_line: row.product_line,
        dimensions: {
          length: row.length_mm,
          width: row.width_mm,
          height: row.height_mm,
          unit: "mm",
        },
        geometry_quality: row.geometry_quality,
        production_status: row.production_status,
        has_details: true,
        has_knife: true,
        has_preview: false,
      }));
      return json({
        ok: true,
        schema: "visualization-products-v1",
        pagination: {
          total: items.length,
          limit: items.length,
          offset: 0,
          count: items.length,
          has_more: false,
          next_offset: null,
        },
        filters: {},
        items,
      });
    }

    if (url.pathname === "/api/v1/visualization/relations") {
      const products = rows();
      const relation = (kind: "family" | "category" | "material") =>
        [...new Set(products.map((row) => String(row[kind])))].map((name) => ({
          id: `${kind}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          kind,
          name,
          product_count: products.filter((row) => row[kind] === name).length,
        }));
      return json({
        schema: "relations-v1",
        generated_at: DEMO_DATASET_TIMESTAMP,
        families: relation("family"),
        categories: relation("category"),
        materials: relation("material"),
      });
    }

    const manifestMatch = url.pathname.match(/^\/api\/v1\/products\/([^/]+)\/manifest$/);
    if (manifestMatch) {
      const row = database
        .query("SELECT manifest_json FROM manifests WHERE source_id=?")
        .get(decodeURIComponent(manifestMatch[1])) as { manifest_json?: string } | null;
      return row?.manifest_json
        ? new Response(row.manifest_json, {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "public, max-age=300",
            },
          })
        : json({ error: "not_found" }, 404);
    }

    if (url.pathname === "/api/admin/capabilities") {
      return json({ ok: true, authenticated: true, role: "administrator", capabilities: [] });
    }
    if (url.pathname.startsWith("/api/admin/")) {
      return json({ ok: true, items: [], mode: "sqlite-demo" });
    }
    return json({ ok: false, error: "not_found", path: url.pathname }, 404);
  },
});

console.log(
  `ShapeWeaver SQLite demo API ${DEMO_DATASET_VERSION} listening on http://127.0.0.1:${server.port}`,
);

const shutdown = () => {
  server.stop(true);
  database.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
