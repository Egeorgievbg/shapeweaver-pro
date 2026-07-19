import { useQuery } from "@tanstack/react-query";
import { boxcraftFetch } from "./client";
import { EP } from "./endpoints";
import { zProductsPage, zRelations, type ProductsPageT, type RelationsT } from "./schemas";
import { adaptListItem, type CatalogCard } from "./adapters";
import { normalizePayloadPackage } from "./payload-normalizer";
import type { ApiPayloadPackage, NormalizedPackagingModel } from "./types";

export * from "./types";
export * from "./errors";
export { boxcraftFetch, EP, adaptListItem, normalizePayloadPackage };
export type { CatalogCard };

/* ---------------- Query helpers ---------------- */

export interface CatalogQuery {
  q?: string;
  family?: string;
  category?: string;
  material?: string;
  limit?: number;
  offset?: number;
}

export function useHealth() {
  return useQuery({
    queryKey: ["boxcraft", "health"],
    queryFn: async () => {
      const [api, vis, cfg] = await Promise.allSettled([
        boxcraftFetch(EP.health),
        boxcraftFetch(EP.visHealth),
        boxcraftFetch(EP.configuratorHealth),
      ]);
      const services = {
        api:
          api.status === "fulfilled"
            ? api.value
            : { error: String((api as PromiseRejectedResult).reason) },
        visualization:
          vis.status === "fulfilled"
            ? vis.value
            : { error: String((vis as PromiseRejectedResult).reason) },
        configurator:
          cfg.status === "fulfilled"
            ? cfg.value
            : { error: String((cfg as PromiseRejectedResult).reason) },
      };

      return [api, vis, cfg].some((result) => result.status === "fulfilled") ? services : null;
    },
    staleTime: 30_000,
  });
}

export function useRelations() {
  return useQuery({
    queryKey: ["boxcraft", "relations"],
    queryFn: async (): Promise<RelationsT> => {
      const raw = await boxcraftFetch(EP.relations);
      return zRelations.parse(raw);
    },
    staleTime: 5 * 60_000,
  });
}

export function useProductsPage(params: CatalogQuery) {
  return useQuery({
    queryKey: ["boxcraft", "products", params],
    queryFn: async ({ signal }) => {
      const raw = await boxcraftFetch(EP.products, {
        query: params as Record<string, string | number | boolean | undefined | null>,
        signal,
      });
      const parsed: ProductsPageT = zProductsPage.parse(raw);
      return {
        pagination: parsed.pagination,
        filters: parsed.filters,
        items: parsed.items.map((item) => adaptListItem(item as never)),
      };
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useNormalizedProduct(sourceId: string | undefined) {
  return useQuery<NormalizedPackagingModel>({
    queryKey: ["boxcraft", "product-normalized", sourceId],
    enabled: !!sourceId,
    queryFn: async ({ signal }) => {
      const pkg = await boxcraftFetch<ApiPayloadPackage>(EP.payloads(sourceId!), { signal });
      return normalizePayloadPackage(sourceId!, pkg);
    },
    staleTime: 5 * 60_000,
    retry: (count, err) => {
      // don't retry 404s
      const status = (err as { status?: number }).status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}
