import { z } from "zod";

export const zPagination = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  count: z.number(),
  has_more: z.boolean(),
  next_offset: z.number().nullable().optional(),
});

export const zProductListItem = z
  .object({
    source_id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    id: z.string().optional().default(""),
    name: z.string().default(""),
    title: z.string().optional(),
    family_id: z.string().optional(),
    category_id: z.string().optional(),
    default_material_id: z.string().optional(),
    family: z.string().optional(),
    category: z.string().optional(),
    material: z.string().optional(),
    available_materials: z.array(z.string()).optional(),
    dimensions: z
      .object({
        length: z.number(),
        width: z.number(),
        height: z.number(),
        unit: z.string(),
      })
      .partial()
      .optional(),
    model_number: z.number().optional(),
    mockupNameKey: z.string().optional(),
    nameKey: z.string().optional(),
    source_readiness: z.string().optional(),
    geometry_quality: z.string().optional(),
    qa_status: z.string().optional(),
    has_details: z.boolean().optional(),
    has_knife: z.boolean().optional(),
    has_preview: z.boolean().optional(),
    api: z
      .object({
        self: z.string().optional(),
        payloads: z.string().optional(),
        details: z.string().optional(),
        knife: z.string().optional(),
        preview: z.string().optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough();

export const zProductsPage = z
  .object({
    ok: z.boolean().default(true),
    schema: z.string().default(""),
    pagination: zPagination,
    filters: z
      .object({
        q: z.string().nullable().optional(),
        family: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        material: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
    items: z.array(zProductListItem),
    links: z.object({ self: z.string().optional(), next: z.string().optional() }).partial().optional(),
  })
  .passthrough();

export const zRelationsEntry = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  product_count: z.number().default(0),
});

export const zRelations = z
  .object({
    schema: z.string().optional().default(""),
    generated_at: z.string().optional(),
    families: z.array(zRelationsEntry).default([]),
    categories: z.array(zRelationsEntry).default([]),
    materials: z.array(zRelationsEntry).default([]),
  })
  .passthrough();

export const zHealth = z.object({}).passthrough();

export type ProductsPageT = z.infer<typeof zProductsPage>;
export type RelationsT = z.infer<typeof zRelations>;
