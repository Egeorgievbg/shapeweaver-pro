import type { ApiProductListItem, NormalizedPackagingModel } from "./types";
import { resolveAssetUrl } from "./asset-resolver";

/** Turn an API list item into a lightweight metadata card record. */
export interface CatalogCard {
  sourceId: string;
  id: string;
  name: string;
  title?: string;
  family?: string;
  category?: string;
  material?: string;
  availableMaterials: string[];
  dimensions: { length: number; width: number; height: number; unit: string } | undefined;
  thumbnailUrl?: string;
  modelNumber?: number;
  geometryQuality?: string;
  hasKnife: boolean;
  hasDetails: boolean;
  hasPreview: boolean;
  readiness?: string;
}

export function adaptListItem(item: ApiProductListItem): CatalogCard {
  return {
    sourceId: item.source_id,
    id: item.id || `source-${item.source_id}`,
    name: item.name || item.title || `Product ${item.source_id}`,
    title: item.title,
    family: item.family || item.family_id,
    category: item.category || item.category_id,
    material: item.material || item.default_material_id,
    availableMaterials: item.available_materials ?? [],
    dimensions: item.dimensions
      ? {
          length: item.dimensions.length,
          width: item.dimensions.width,
          height: item.dimensions.height,
          unit: item.dimensions.unit,
        }
      : undefined,
    thumbnailUrl: resolveAssetUrl(inferThumb(item)),
    modelNumber: item.model_number,
    geometryQuality: item.geometry_quality,
    hasKnife: !!item.has_knife,
    hasDetails: !!item.has_details,
    hasPreview: !!item.has_preview,
    readiness: item.source_readiness,
  };
}

function inferThumb(item: ApiProductListItem): string | undefined {
  const mn = item.model_number;
  if (mn) return `https://yun.baoxiaohe.com/render/20220113/${mn}.jpg`;
  return undefined;
}

/** Human-friendly summary line for a normalized model. */
export function summarizeModel(m: NormalizedPackagingModel): string {
  const d = m.dimensions;
  return `${d.width} × ${d.depth} × ${d.height} ${d.unit} · ${m.panels.length} panels · ${m.folds.length} folds`;
}
