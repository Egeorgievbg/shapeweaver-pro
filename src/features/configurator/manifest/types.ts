import type { FaceDirection, Unit } from "@/integrations/boxcraft/types";

export type ViewerRuntimeStrategy =
  | "recorded-animation"
  | "geometry-only"
  | "gltf"
  | "manual-rig"
  | "diagnostic-fallback"
  | "unsupported";

export type ProductionStatus = "approved" | "unverified" | "rejected" | "quarantined";
export type ExportSupport = "native" | "server-converted" | "conditional" | "unsupported";

export interface ManifestProduct {
  sourceId: string;
  name: string;
  title?: string;
  family?: string;
  category?: string;
  dimensions: { length: number; width: number; height: number; thickness?: number; unit: Unit };
  defaultMaterialId?: string;
  availableMaterialIds?: string[];
}

export interface ManifestModelVersion {
  version: string;
  sourceHash: string;
  gltfUrl?: string;
  productionStatus: ProductionStatus;
  geometryQuality?: string;
}

export interface ManifestFace {
  id: string;
  faceKey: string;
  name: string;
  layerKey: string;
  svgPath: string;
  holes?: string[];
  bbox: { x: number; y: number; width: number; height: number };
  centroid?: { x: number; y: number };
  direction?: FaceDirection;
  orientationRotate?: number;
}

export interface ManifestFold {
  id: string;
  foldIndex: number;
  parentFaceKey: string;
  childFaceKey: string;
  from: [number, number];
  to: [number, number];
  direction?: 1 | -1;
  openAngle?: number;
  closedAngle?: number;
  axis?: [number, number, number];
}

export interface ManifestAnimationOperation {
  type: "rotate" | "translate" | "rotateMesh";
  operationIndex: number;
  foldId?: string;
  foldIndex?: number;
  targetFaceKey?: string;
  angleRadians?: number;
  angleDegrees?: number;
  axis?: [number, number, number];
  pivot?: [number, number, number];
  vector?: [number, number, number];
  distance?: number;
}

export interface ManifestAnimationStep {
  stepIndex: number;
  duration?: number;
  operations: ManifestAnimationOperation[];
}

export interface ManifestAnimationSequence {
  id: string;
  name: string;
  isDefault?: boolean;
  steps: ManifestAnimationStep[];
}

export interface ManifestDieline {
  id: string;
  layerKey: string;
  totalX: number;
  totalY: number;
  cutsPath: string;
  bleedsPath?: string;
  bleedline?: number;
  productionStatus: ProductionStatus;
}

export interface ManifestMaterial {
  id: string;
  name: string;
  nameBg?: string;
  nameEn?: string;
  layerKey: string;
  thickness: number;
  color: string;
  insideColor?: string;
  edgeColor?: string;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  transmission?: number;
  maps?: {
    color?: string;
    normal?: string;
    roughness?: string;
    bump?: string;
    alpha?: string;
  };
}

export interface ManifestAsset {
  id: string;
  kind: string;
  url: string;
  sha256?: string;
  mimeType?: string;
  provenance?: string;
  licensingStatus?: string;
}

export interface ManifestValidation {
  status: "valid" | "warning" | "invalid" | "quarantined";
  warnings: string[];
  errors: string[];
  checkedAt?: string;
}

export interface ViewerManifestV1 {
  schema: "gptsboxes.viewer-manifest/v1";
  generatedAt: string;
  sourceHash: string;
  product: ManifestProduct;
  model: ManifestModelVersion;
  faces: ManifestFace[];
  folds: ManifestFold[];
  animations: ManifestAnimationSequence[];
  dielines: ManifestDieline[];
  materials: ManifestMaterial[];
  assets: ManifestAsset[];
  runtimeStrategy: ViewerRuntimeStrategy;
  validation: ManifestValidation;
  exportCapabilities?: Record<string, ExportSupport>;
}

export function isViewerManifestV1(value: unknown): value is ViewerManifestV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ViewerManifestV1>;
  return (
    candidate.schema === "gptsboxes.viewer-manifest/v1" &&
    typeof candidate.sourceHash === "string" &&
    Boolean(candidate.product?.sourceId) &&
    Array.isArray(candidate.faces) &&
    Array.isArray(candidate.folds) &&
    Array.isArray(candidate.animations) &&
    Array.isArray(candidate.materials) &&
    Boolean(candidate.validation)
  );
}
