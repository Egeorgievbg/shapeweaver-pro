import { Database } from "bun:sqlite";
import { resolve } from "node:path";

const path = resolve(process.env.GPTSBOXES_DEMO_DB ?? "data/demo/gptsboxes_demo.sqlite");
const db = new Database(path, { readonly: true, strict: true });
db.exec("PRAGMA query_only=ON; PRAGMA foreign_keys=ON;");

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const rows = () =>
  db.query(`SELECT source_id,name,family,category,material,length_mm,width_mm,height_mm,product_line,geometry_quality,production_status FROM products ORDER BY name`).all() as Record<string, unknown>[];

Bun.serve({
  port: Number(process.env.PORT ?? 4174),
  hostname: "0.0.0.0",
  fetch(request) {
    const url = new URL(request.url);
    if (["/api/health", "/api/v1/visualization/health", "/api/configurator/health"].includes(url.pathname)) {
      const integrity = db.query("PRAGMA integrity_check").get();
      return json({ ok: true, mode: "sqlite-demo", database: path, integrity });
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
        dimensions: { length: row.length_mm, width: row.width_mm, height: row.height_mm, unit: "mm" },
        geometry_quality: row.geometry_quality,
        production_status: row.production_status,
        has_details: true,
        has_knife: true,
        has_preview: false,
      }));
      return json({ ok: true, schema: "visualization-products-v1", pagination: { total: items.length, limit: items.length, offset: 0, count: items.length, has_more: false, next_offset: null }, filters: {}, items });
    }
    if (url.pathname === "/api/v1/visualization/relations") {
      const products = rows();
      const relation = (kind: "family" | "category" | "material") => [...new Set(products.map((row) => String(row[kind])))].map((name) => ({ id: `${kind}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, kind, name, product_count: products.filter((row) => row[kind] === name).length }));
      return json({ schema: "relations-v1", generated_at: new Date().toISOString(), families: relation("family"), categories: relation("category"), materials: relation("material") });
    }
    const match = url.pathname.match(/^\/api\/v1\/products\/([^/]+)\/manifest$/);
    if (match) {
      const row = db.query("SELECT manifest_json FROM manifests WHERE source_id=?").get(decodeURIComponent(match[1])) as { manifest_json?: string } | null;
      return row?.manifest_json ? new Response(row.manifest_json, { headers: { "content-type": "application/json; charset=utf-8" } }) : json({ error: "not_found" }, 404);
    }
    if (url.pathname === "/api/admin/capabilities") return json({ ok: true, authenticated: true, role: "administrator", capabilities: [] });
    if (url.pathname.startsWith("/api/admin/")) return json({ ok: true, items: [], mode: "sqlite-demo" });
    return json({ ok: false, error: "not_found", path: url.pathname }, 404);
  },
});
