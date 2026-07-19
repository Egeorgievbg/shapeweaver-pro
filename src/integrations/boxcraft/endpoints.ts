/** Endpoint inventory. Change here, not in call sites. */
export const EP = {
  health: "/api/health",
  visHealth: "/api/v1/visualization/health",
  configuratorHealth: "/api/configurator/health",

  products: "/api/v1/visualization/products",
  product: (id: string) => `/api/v1/visualization/products/${encodeURIComponent(id)}`,
  manifest: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/manifest`,
  dieline: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/dieline`,
  animations: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/animations`,
  materials: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/materials`,
  assets: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/assets`,
  versions: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/versions`,
  validation: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/validation`,
  payloads: (id: string) => `/api/v1/visualization/products/${encodeURIComponent(id)}/payloads`,
  payload: (id: string, kind: "details" | "knife" | "preview") =>
    `/api/v1/visualization/products/${encodeURIComponent(id)}/payloads/${kind}`,

  relations: "/api/v1/visualization/relations",
  relationsKind: (kind: "families" | "categories" | "materials") =>
    `/api/v1/visualization/relations/${kind}`,

  configuratorCatalog: "/api/configurator/catalog",
  configuratorProduct: (id: string) => `/api/configurator/products/${encodeURIComponent(id)}`,
  configuratorDieline: (id: string) =>
    `/api/configurator/products/${encodeURIComponent(id)}/dieline`,
  configuratorSourcePayloads: (id: string) =>
    `/api/configurator/products/${encodeURIComponent(id)}/source-payloads`,
  assetsManifest: "/api/configurator/assets-manifest",
  asset: (path: string) => `/api/configurator/assets/${path.replace(/^\/+/, "")}`,
  websiteConfig: "/api/website-config",
} as const;
