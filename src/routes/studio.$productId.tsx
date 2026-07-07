import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNormalizedProduct } from "@/integrations/boxcraft";
import { useConfiguratorStore } from "@/stores/configurator";
import { StudioWorkspace } from "@/components/studio/StudioWorkspace";
import { useI18n } from "@/lib/i18n";
import { Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/studio/$productId")({
  component: StudioProductPage,
  head: ({ params }) => ({
    meta: [
      { title: `Studio · ${params.productId} — GPTSBOXES` },
      {
        name: "description",
        content: `Configure packaging template ${params.productId} in the 3D studio.`,
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function StudioProductPage() {
  const { productId } = useParams({ from: "/studio/$productId" });
  const query = useNormalizedProduct(productId);
  const loadProduct = useConfiguratorStore((s) => s.loadProduct);
  const clearProduct = useConfiguratorStore((s) => s.clearProduct);
  const { t } = useI18n();

  useEffect(() => {
    if (query.data) loadProduct(query.data);
    return () => {
      clearProduct();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.id]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
          {t("studio.loading")}
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-3 text-center px-6">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <h2 className="text-lg font-semibold">{t("studio.failedLoad")}</h2>
        <p className="text-sm text-muted-foreground">{(query.error as Error).message}</p>
        <button
          onClick={() => query.refetch()}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          {t("action.retry")}
        </button>
      </div>
    );
  }

  if (!query.data) return null;
  return <StudioWorkspace />;
}
