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
  const modelNumber = item.model_number;
  if (modelNumber) return `https://yun.baoxiaohe.com/render/20220113/${modelNumber}.jpg`;
  return technicalPreview(item);
}

function technicalPreview(item: ApiProductListItem): string {
  const haystack = `${item.name} ${item.family ?? ""} ${item.category ?? ""}`.toLowerCase();
  const kind = /gable|carrier|handle/.test(haystack)
    ? "gable"
    : /display|counter|tray/.test(haystack)
      ? "display"
      : /rigid|gift|magnetic|luxury/.test(haystack)
        ? "rigid"
        : /tuck|carton|folding/.test(haystack)
          ? "tuck"
          : "mailer";

  const drawings: Record<string, string> = {
    mailer: `
      <path d="M48 88 126 60l78 28-78 30Z" fill="#d7a94f"/>
      <path d="m48 88 78 30v63L48 149Z" fill="#b9822f"/>
      <path d="m126 118 78-30v61l-78 32Z" fill="#e8bf6a"/>
      <path d="m48 88 2-39 76-28 78 28v39l-78-28Z" fill="none" stroke="#f0cb7a" stroke-width="5" stroke-linejoin="round"/>
      <path d="m50 49 76 28 76-28" fill="none" stroke="#f0cb7a" stroke-width="4"/>
    `,
    tuck: `
      <path d="M77 45 144 25l49 23-67 21Z" fill="#e5bd67"/>
      <path d="m77 45 49 24v116l-49-27Z" fill="#b9822f"/>
      <path d="m126 69 67-21v112l-67 25Z" fill="#d7a94f"/>
      <path d="m77 45 15-18 67-19 34 40" fill="none" stroke="#f0cb7a" stroke-width="4" stroke-linejoin="round"/>
    `,
    rigid: `
      <path d="M48 105 126 75l79 30-79 33Z" fill="#d7a94f"/>
      <path d="m48 105 78 33v44l-78-31Z" fill="#9e6b28"/>
      <path d="m126 138 79-33v45l-79 32Z" fill="#e8bf6a"/>
      <path d="M65 72 127 48l62 24-62 26Z" fill="#f0cb7a" stroke="#ffd990" stroke-width="3"/>
      <path d="m65 72 62 26 62-26" fill="none" stroke="#8f6125" stroke-width="3" opacity=".7"/>
    `,
    display: `
      <path d="M48 105 126 76l78 29-78 31Z" fill="#d7a94f"/>
      <path d="m48 105 78 31v47l-78-29Z" fill="#a9742b"/>
      <path d="m126 136 78-31v48l-78 30Z" fill="#e8bf6a"/>
      <path d="m126 76 34-56 44 17v68Z" fill="#c79238"/>
      <path d="M150 53h28" stroke="#f5d58f" stroke-width="5" stroke-linecap="round"/>
    `,
    gable: `
      <path d="M57 93 126 67l69 26-69 28Z" fill="#d7a94f"/>
      <path d="m57 93 69 28v61l-69-27Z" fill="#a9742b"/>
      <path d="m126 121 69-28v62l-69 27Z" fill="#e8bf6a"/>
      <path d="m57 93 24-43 45-24 46 24 23 43-69-26Z" fill="#c79238" stroke="#f0cb7a" stroke-width="4" stroke-linejoin="round"/>
      <path d="M104 50c0-12 9-20 22-20s22 8 22 20" fill="none" stroke="#f7dda6" stroke-width="7" stroke-linecap="round"/>
    `,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 252 210" role="img" aria-label="Technical packaging preview">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#171b20"/><stop offset="1" stop-color="#0c0f13"/>
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-opacity=".35"/></filter>
    </defs>
    <rect width="252" height="210" rx="18" fill="url(#bg)"/>
    <path d="M24 181h204M30 157h192" stroke="#ffffff" stroke-opacity=".07"/>
    <g filter="url(#shadow)" transform="translate(0 2)">${drawings[kind]}</g>
    <circle cx="28" cy="28" r="4" fill="#d7a94f"/>
    <path d="M40 28h56" stroke="#fff" stroke-opacity=".18" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Human-friendly summary line for a normalized model. */
export function summarizeModel(model: NormalizedPackagingModel): string {
  const dimensions = model.dimensions;
  return `${dimensions.width} × ${dimensions.depth} × ${dimensions.height} ${dimensions.unit} · ${model.panels.length} panels · ${model.folds.length} folds`;
}
