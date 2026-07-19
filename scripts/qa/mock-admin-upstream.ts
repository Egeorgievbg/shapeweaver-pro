const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

Bun.serve({
  port: 4174,
  hostname: "0.0.0.0",
  fetch(request) {
    const url = new URL(request.url);

    if (
      url.pathname === "/api/health" ||
      url.pathname === "/api/v1/visualization/health" ||
      url.pathname === "/api/configurator/health"
    ) {
      return json({ ok: true, service: url.pathname });
    }

    if (url.pathname === "/api/v1/visualization/products") {
      return json({
        ok: true,
        schema: "visualization-products-v1",
        pagination: {
          total: 2,
          limit: 50,
          offset: 0,
          count: 2,
          has_more: false,
          next_offset: null,
        },
        filters: {},
        items: [
          {
            source_id: "mailer-001",
            id: "mailer-001",
            name: "Mailer Box",
            family: "Mailer",
            category: "E-commerce",
            material: "Kraft",
            geometry_quality: "knife-rig",
            has_details: true,
            has_knife: true,
            has_preview: true,
          },
          {
            source_id: "rigid-001",
            id: "rigid-001",
            name: "Rigid Gift Box",
            family: "Rigid",
            category: "Gift",
            material: "Greyboard",
            geometry_quality: "gltf",
            has_details: true,
            has_knife: true,
            has_preview: true,
          },
        ],
      });
    }

    if (url.pathname === "/api/v1/visualization/relations") {
      return json({
        schema: "relations-v1",
        generated_at: new Date().toISOString(),
        families: [
          { id: "mailer", kind: "family", name: "Mailer", product_count: 1 },
          { id: "rigid", kind: "family", name: "Rigid", product_count: 1 },
        ],
        categories: [
          { id: "ecommerce", kind: "category", name: "E-commerce", product_count: 1 },
          { id: "gift", kind: "category", name: "Gift", product_count: 1 },
        ],
        materials: [
          { id: "kraft", kind: "material", name: "Kraft", product_count: 1 },
          { id: "greyboard", kind: "material", name: "Greyboard", product_count: 1 },
        ],
      });
    }

    if (url.pathname === "/api/admin/capabilities") {
      const resources = [
        "products",
        "taxonomy",
        "materials",
        "translations",
        "content",
        "geometry",
        "dielines",
        "assets",
        "quotes",
        "exports",
        "users",
        "roles",
        "integrations",
        "settings",
        "audit",
      ];
      return json({
        ok: true,
        authenticated: true,
        role: "administrator",
        generated_at: new Date().toISOString(),
        capabilities: resources.map((resource) => ({
          resource,
          endpoint: `/api/admin/${resource}`,
          methods: resource === "audit" ? ["GET"] : ["GET", "POST", "PATCH", "DELETE"],
          enabled: true,
          permission: `admin:${resource}`,
        })),
      });
    }

    if (url.pathname.startsWith("/api/admin/")) {
      return json({ ok: true, items: [], resource: url.pathname });
    }

    return json({ ok: false, error: "not_found", path: url.pathname }, 404);
  },
});
