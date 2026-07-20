type ProductFixture = {
  sourceId: string;
  name: string;
  family: string;
  category: string;
  material: string;
  color: string;
  length: number;
  width: number;
  height: number;
};

const products: ProductFixture[] = [
  { sourceId: "mailer-001", name: "Mailer Box", family: "Mailer", category: "E-commerce", material: "Kraft", color: "#b88755", length: 180, width: 120, height: 55 },
  { sourceId: "tuck-001", name: "Reverse Tuck Box", family: "Folding carton", category: "Retail", material: "GC1", color: "#f2eee4", length: 90, width: 45, height: 150 },
  { sourceId: "rigid-001", name: "Rigid Gift Box", family: "Rigid", category: "Gift", material: "Greyboard", color: "#1f2937", length: 160, width: 120, height: 65 },
  { sourceId: "display-001", name: "Counter Display Box", family: "Display", category: "Retail", material: "E-flute", color: "#d5c2a5", length: 210, width: 135, height: 170 },
  { sourceId: "gable-001", name: "Gable Box", family: "Carrier", category: "Food & gifts", material: "Kraft", color: "#c99b63", length: 140, width: 90, height: 125 },
];

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const rect = (x: number, y: number, width: number, height: number) =>
  `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;

function makeManifest(product: ProductFixture) {
  const { length: l, width: w, height: h } = product;
  const x = h;
  const y = h;
  const face = (
    key: string,
    name: string,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    direction?: "front" | "back" | "left" | "right" | "top" | "bottom",
  ) => ({
    id: `board:${key}`,
    faceKey: `board:${key}`,
    name,
    layerKey: "board",
    svgPath: rect(bx, by, bw, bh),
    bbox: { x: bx, y: by, width: bw, height: bh },
    centroid: { x: bx + bw / 2, y: by + bh / 2 },
    direction,
  });

  const faces = [
    face("base", "Base", x, y, l, w, "bottom"),
    face("back", "Back", x, 0, l, h, "back"),
    face("front", "Front", x, y + w, l, h, "front"),
    face("left", "Left", 0, y, h, w, "left"),
    face("right", "Right", x + l, y, h, w, "right"),
    face("lid", "Lid", x, y + w + h, l, w, "top"),
  ];

  const fold = (
    id: string,
    index: number,
    parent: string,
    child: string,
    from: [number, number],
    to: [number, number],
    direction: 1 | -1,
  ) => ({
    id: `board:${id}`,
    foldIndex: index,
    parentFaceKey: `board:${parent}`,
    childFaceKey: `board:${child}`,
    from,
    to,
    direction,
    openAngle: 0,
    closedAngle: Math.PI / 2,
  });

  const folds = [
    fold("base-back", 0, "base", "back", [x, y], [x + l, y], -1),
    fold("base-front", 1, "base", "front", [x, y + w], [x + l, y + w], 1),
    fold("base-left", 2, "base", "left", [x, y], [x, y + w], 1),
    fold("base-right", 3, "base", "right", [x + l, y], [x + l, y + w], -1),
    fold("front-lid", 4, "front", "lid", [x, y + w + h], [x + l, y + w + h], 1),
  ];

  return {
    schema: "gptsboxes.viewer-manifest/v1",
    generatedAt: new Date().toISOString(),
    sourceHash: `qa-fixture-${product.sourceId}`,
    product: {
      sourceId: product.sourceId,
      name: product.name,
      title: product.name,
      family: product.family,
      category: product.category,
      dimensions: { length: l, width: w, height: h, thickness: 1.5, unit: "mm" },
      defaultMaterialId: `material:${product.sourceId}`,
      availableMaterialIds: [`material:${product.sourceId}`],
    },
    model: {
      version: "qa-visual-v1",
      sourceHash: `qa-fixture-${product.sourceId}`,
      productionStatus: "unverified",
      geometryQuality: "qa-fixture",
    },
    faces,
    folds,
    animations: [
      {
        id: "assembly",
        name: "Assembly",
        isDefault: true,
        steps: folds.map((item, stepIndex) => ({
          stepIndex,
          duration: 1,
          operations: [
            {
              type: "rotate",
              operationIndex: 0,
              foldId: item.id,
              foldIndex: item.foldIndex,
              angleRadians: item.closedAngle * item.direction,
            },
          ],
        })),
      },
    ],
    dielines: [
      {
        id: `dieline:${product.sourceId}`,
        layerKey: "board",
        totalX: l + h * 2,
        totalY: w * 2 + h * 2,
        cutsPath: faces.map((item) => item.svgPath).join(" "),
        bleedline: 3,
        productionStatus: "unverified",
      },
    ],
    materials: [
      {
        id: `material:${product.sourceId}`,
        name: product.material,
        nameBg: product.material,
        nameEn: product.material,
        layerKey: "board",
        thickness: 1.5,
        color: product.color,
        insideColor: "#f6f1e8",
        edgeColor: "#8a765d",
        roughness: product.family === "Rigid" ? 0.6 : 0.82,
        metalness: 0,
        clearcoat: product.family === "Rigid" ? 0.08 : 0,
      },
    ],
    assets: [],
    runtimeStrategy: "recorded-animation",
    validation: {
      status: "warning",
      warnings: ["qa_fixture_not_production_data"],
      errors: [],
      checkedAt: new Date().toISOString(),
    },
    exportCapabilities: {
      png: "native",
      svg: "native",
      json: "native",
      glb: "native",
      gltf: "native",
      obj: "native",
      stl: "native",
      ply: "native",
      step: "unsupported",
      iges: "unsupported",
    },
  };
}

Bun.serve({
  port: 4174,
  hostname: "0.0.0.0",
  fetch(request) {
    const url = new URL(request.url);

    if (["/api/health", "/api/v1/visualization/health", "/api/configurator/health"].includes(url.pathname)) {
      return json({ ok: true, service: url.pathname, mode: "visual-qa" });
    }

    if (url.pathname === "/api/v1/visualization/products") {
      return json({
        ok: true,
        schema: "visualization-products-v1",
        pagination: {
          total: products.length,
          limit: products.length,
          offset: 0,
          count: products.length,
          has_more: false,
          next_offset: null,
        },
        filters: { q: null, family: null, category: null, material: null },
        items: products.map((product) => ({
          source_id: product.sourceId,
          id: product.sourceId,
          name: product.name,
          family: product.family,
          category: product.category,
          material: product.material,
          dimensions: {
            length: product.length,
            width: product.width,
            height: product.height,
            unit: "mm",
          },
          geometry_quality: "qa-fixture",
          qa_status: "visual-test-only",
          has_details: true,
          has_knife: true,
          has_preview: false,
        })),
      });
    }

    if (url.pathname === "/api/v1/visualization/relations") {
      const relation = (kind: "family" | "category" | "material", name: string) => ({
        id: `${kind}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        kind,
        name,
        product_count: products.filter((product) => product[kind] === name).length,
      });
      return json({
        schema: "relations-v1",
        generated_at: new Date().toISOString(),
        families: [...new Set(products.map((product) => product.family))].map((name) => relation("family", name)),
        categories: [...new Set(products.map((product) => product.category))].map((name) => relation("category", name)),
        materials: [...new Set(products.map((product) => product.material))].map((name) => relation("material", name)),
      });
    }

    const manifestMatch = url.pathname.match(/^\/api\/v1\/products\/([^/]+)\/manifest$/);
    if (manifestMatch) {
      const product = products.find((item) => item.sourceId === decodeURIComponent(manifestMatch[1]));
      return product ? json(makeManifest(product)) : json({ error: "not_found" }, 404);
    }

    if (url.pathname === "/api/admin/capabilities") {
      const resources = [
        "products", "taxonomy", "materials", "translations", "content", "geometry", "dielines",
        "assets", "quotes", "exports", "users", "roles", "integrations", "settings", "audit",
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
      return json({ ok: true, items: [], resource: url.pathname, mode: "visual-qa" });
    }

    return json({ ok: false, error: "not_found", path: url.pathname }, 404);
  },
});
