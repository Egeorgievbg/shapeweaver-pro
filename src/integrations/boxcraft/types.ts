/**
 * Types grounded in the REAL BoxCraft API response shape. Every field is
 * optional unless observed as always-present in sample payloads. Unknown
 * fields survive via `raw`.
 */

export type Unit = "mm" | "cm" | "in";
export type FaceDirection = "front" | "back" | "left" | "right" | "top" | "bottom";

export interface ApiPaginationMeta {
  total: number;
  limit: number;
  offset: number;
  count: number;
  has_more: boolean;
  next_offset?: number | null;
}

export interface ApiFilters {
  q: string | null;
  family: string | null;
  category: string | null;
  material: string | null;
}

export interface ApiProductListItem {
  source_id: string;
  id: string;
  name: string;
  title?: string;
  family_id?: string;
  category_id?: string;
  default_material_id?: string;
  family?: string;
  category?: string;
  material?: string;
  available_materials?: string[];
  dimensions?: { length: number; width: number; height: number; unit: string };
  model_number?: number;
  mockupNameKey?: string;
  nameKey?: string;
  source_readiness?: string;
  geometry_quality?: "exact" | "approximate" | "preview_only" | string;
  qa_status?: string;
  has_details?: boolean;
  has_knife?: boolean;
  has_preview?: boolean;
  api?: { self: string; payloads: string; details: string; knife: string; preview: string };
}

export interface ApiProductsPage {
  ok: boolean;
  schema: string;
  pagination: ApiPaginationMeta;
  filters: ApiFilters;
  items: ApiProductListItem[];
  links?: { self?: string; next?: string };
}

export interface ApiRelationsEntry {
  id: string;
  kind: "family" | "category" | "material";
  name: string;
  product_count: number;
}

export interface ApiRelations {
  schema: string;
  generated_at?: string;
  families: ApiRelationsEntry[];
  categories: ApiRelationsEntry[];
  materials: ApiRelationsEntry[];
}

/** Package returned by /products/{id}/payloads */
export interface ApiPayloadPackage {
  ok: boolean;
  schema: string;
  source_id: string;
  required: string[];
  available: string[];
  missing: string[];
  payloads: {
    details?: ApiPayloadWrapper<RawDetailsBody>;
    knife?: ApiPayloadWrapper<RawKnifeBody>;
    preview?: ApiPayloadWrapper<RawPreviewBody>;
  };
}

export interface ApiPayloadWrapper<T> {
  endpoint: string;
  source_id: string;
  file?: string;
  payload: {
    ok?: boolean;
    status?: number;
    elapsed_ms?: number;
    url?: string;
    headers?: Record<string, string>;
    payload?: T; // details path
    data?: T;    // knife/preview path
    error?: unknown;
    code?: number;
    msg?: string;
    time?: number;
  };
}

/** Raw details.data (from the pacdora-style upstream) */
export interface RawDetailsBody {
  id: number;
  cateId: number;
  num?: number;
  image?: string;
  knife?: string;
  keywords?: string;
  length?: number;
  width?: number;
  height?: number;
  gltf?: string;
  demoProjectDataUrl?: string;
  nameKey?: string;
  mockupNameKey?: string;
  [k: string]: unknown;
}

/** Raw knife.data — the die-cut geometry */
export interface RawKnifePoint {
  mtd: "M" | "L" | "A" | "Q" | "Z" | "C" | string;
  x?: number;
  y?: number;
  x1?: number; y1?: number;
  x2?: number; y2?: number;
  rx?: number; ry?: number;
  rotation?: number;
  largeArc?: number; sweep?: number;
}

export interface RawKnifeFace {
  name: string;
  w: number;
  h: number;
  x: number;
  y: number;
  dlist: RawKnifePoint[];
  holes?: RawKnifePoint[][] | null;
}

export interface RawKnifeFaceSvg {
  name: string;
  d: string;
}

export interface RawKnifeFold {
  name: string; // Convention: "PARENT_CHILD" e.g. "F_FT"
  x1: number; y1: number;
  x2: number; y2: number;
  rotate?: boolean;
}

export interface RawOpenParam {
  grade: number | string;
  name: string;
  value: number;
  description?: string;
  min?: number;
  max?: number;
  unit?: string;
}

export interface RawKnifeBody {
  totalX: number;
  totalY: number;
  faces: RawKnifeFace[];
  facesForSvg: RawKnifeFaceSvg[];
  thickness: number;
  cuts: RawKnifePoint[];
  cutsForSvg: string;
  folds: RawKnifeFold[];
  holes?: RawKnifePoint[][];
  holesForSvg?: unknown[];
  bleedline?: number;
  bleeds?: RawKnifePoint[];
  bleedsForSvg?: string;
  sizeArrowData?: RawSizeArrow[];
  openParams?: RawOpenParam[][];
  ccalMap?: Record<string, unknown>;
  modeCate?: {
    id?: number;
    name?: string;
    faces?: string; // JSON string of face->direction mapping
    cate_no?: string;
    lengthLimit?: string;
    widthLimit?: string;
    heightLimit?: string;
    minThickness?: string;
    [k: string]: unknown;
  };
  science?: Record<string, unknown>;
  size?: { L: number; W: number; H: number; D: number; [k: string]: unknown };
  outSize?: { L: number; W: number; H: number; D: number };
  knifeSize?: { L: number; W: number; H: number; D: number };
  [k: string]: unknown;
}

export interface RawSizeArrow {
  d?: unknown[];
  tpointer?: { x: number; y: number; value: string };
  p1?: { x: number; y: number };
  p2?: { x: number; y: number };
  lineName?: string;
  lineLength?: number;
  lineType?: string;
  unit?: string;
}

export interface RawFaceOrientation {
  name: string;
  value: string; // face name key
  rotate: number | string;
}

export interface RawPreviewFaceMapping {
  faceName: string;
  direction: FaceDirection | string;
  faceLayer: string;
}

export interface RawPreviewBody {
  nameKey?: string;
  mainFace?: {
    face: string;
    side: "outside" | "inside";
    layer: string;
    showWatermark?: boolean;
    showUploadText?: boolean;
    watermarkAngle?: number;
    watermarkScale?: number;
  };
  otherFaces?: RawPreviewFaceMapping[];
  length?: number;
  width?: number;
  height?: number;
  cate_id?: number;
  layer?: Record<string, unknown>;
  preview_3d_img?: string;
  project_name?: string;
  can_print?: boolean;
  supportSciences?: unknown[];
  cate?: Record<string, unknown>;
  size_type?: string;
  [k: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Normalized internal model — the one the app actually uses.                 */
/* -------------------------------------------------------------------------- */

export type GeometryStrategy =
  | "gltf"
  | "knife-rig"
  | "procedural"
  | "preview-only"
  | "unsupported";

export interface Dimensions {
  width: number;   // X (L)
  height: number;  // Z (H)
  depth: number;   // Y (W)
  unit: Unit;
  thickness?: number;
}

export interface PackagingPanel {
  id: string;                 // face name from knife
  name: string;
  svgPath: string;            // facesForSvg[i].d
  bbox: { x: number; y: number; w: number; h: number };
  direction?: FaceDirection;  // 3d placement (if known)
  orientationRotate?: number; // rotation from modeCate.faces
  layer: string;              // "traditional" | "corrugated" | ...
  isFlap: boolean;
  parentId?: string;
  centroid: { x: number; y: number };
}

export interface PackagingFold {
  id: string;              // fold.name
  parentPanelId: string;
  childPanelId: string;
  from: [number, number];
  to: [number, number];
  direction: 1 | -1;       // hinge sign
  openAngle: number;       // radians when fully open (dieline flat)
  closedAngle: number;     // radians when box is closed
}

export interface PackagingMaterial {
  id: string;
  name: string;
  layer: string;
  thickness: number;
  color: string;
  roughness: number;
  metalness: number;
}

export interface NormalizedDieline {
  totalX: number;
  totalY: number;
  cutsPath: string;
  bleedsPath?: string;
  bleedline?: number;
  faces: PackagingPanel[];
  folds: PackagingFold[];
  holes: { d: string }[];
  sizeArrows: {
    label: string;
    length: number;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    tpointer?: { x: number; y: number };
    axis: "length" | "width" | "height" | "other";
  }[];
}

export interface NormalizedPreview {
  imageUrl?: string;
  faceMappings: RawPreviewFaceMapping[];
  mainFace?: RawPreviewBody["mainFace"];
}

export interface NormalizedPackagingModel {
  id: string;
  sourceId: string;
  name: string;
  title?: string;
  family?: string;
  category?: string;
  thumbnailUrl?: string;
  units: Unit;
  dimensions: Dimensions;
  board?: { thickness?: number; materialId?: string };
  geometryStrategy: GeometryStrategy;
  gltf?: { url: string; draco?: boolean; ktx2?: boolean };
  panels: PackagingPanel[];
  folds: PackagingFold[];
  dieline?: NormalizedDieline;
  preview?: NormalizedPreview;
  materials: PackagingMaterial[];
  openParams: RawOpenParam[];
  faceDirectionMap: Record<string, FaceDirection>;
  faceOrientationMap: Record<string, number>;
  limits?: {
    lengthMin?: number; lengthMax?: number;
    widthMin?: number; widthMax?: number;
    heightMin?: number; heightMax?: number;
    thicknessMin?: number;
  };
  warnings: string[];
  raw: {
    details: unknown;
    knife: unknown;
    preview: unknown;
  };
}
