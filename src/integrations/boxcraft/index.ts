import { useQuery } from "@tanstack/react-query";
import { boxcraftFetch } from "./client";
import { EP } from "./endpoints";
import { zProductsPage, zRelations, type ProductsPageT, type RelationsT } from "./schemas";
import { adaptListItem, type CatalogCard } from "./adapters";
import { BoxcraftError } from "./errors";
import { normalizeViewerManifest } from "@/features/configurator/manifest/adapter";
import { compileLegacyPayloadManifest } from "@/features/configurator/manifest/legacyCompiler";
import {
  isViewerManifestV1,
  type ViewerManifestV1,
} from "@/features/configurator/manifest/types";
import type { ApiPayloadPackage, NormalizedPackagingModel } from "./types";

export * from "./types";
export * from "./errors";
export {
  boxcraftFetch,
  EP,
  adaptListItem,
  normalizeViewerManifest,
  compileLegacyPayloadManifest,
};
export type { CatalogCard, ViewerManifestV1 };

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
      const [api, visualization, configurator] = await Promise.allSettled([
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
          visualization.status === "fulfilled"
            ? visualization.value
            : { error: String((visualization as PromiseRejectedResult).reason) },
        configurator:
          configurator.status === "fulfilled"
            ? configurator.value
            : { error: String((configurator as PromiseRejectedResult).reason) },
      };

      return [api, visualization, configurator].some(
        (result) => result.status === "fulfilled",
      )
        ? services
        : null;
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
    placeholderData: (previous) => previous,
  });
}

async function loadNormalizedProduct(
  sourceId: string,
  signal: AbortSignal,
): Promise<NormalizedPackagingModel> {
  try {
    const raw = await boxcraftFetch<unknown>(EP.manifest(sourceId), { signal });
    if (!isViewerManifestV1(raw)) {
      throw new BoxcraftError(
        "viewer_manifest_invalid",
        `Viewer manifest for source ${sourceId} does not match gptsboxes.viewer-manifest/v1.`,
        { details: raw },
      );
    }
    return normalizeViewerManifest(raw);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 404 && status !== 501) throw error;
  }

  const payloadPackage = await boxcraftFetch<ApiPayloadPackage>(EP.payloads(sourceId), { signal });
  const compiledManifest = await compileLegacyPayloadManifest(sourceId, payloadPackage);
  return normalizeViewerManifest(compiledManifest);
}

export function useNormalizedProduct(sourceId: string | undefined) {
  return useQuery<NormalizedPackagingModel>({
    queryKey: ["boxcraft", "product-normalized", sourceId],
    enabled: !!sourceId,
    queryFn: ({ signal }) => loadNormalizedProduct(sourceId!, signal),
    staleTime: 5 * 60_000,
    retry: (count, error) => {
      const status = (error as { status?: number }).status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}
