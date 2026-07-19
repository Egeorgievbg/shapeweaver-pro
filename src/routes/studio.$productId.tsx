import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNormalizedProduct } from "@/integrations/boxcraft";
import { useConfiguratorStore } from "@/stores/configurator";
import { StudioWorkspace } from "@/components/studio/StudioWorkspace";
import { AlertTriangle, Box, Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/studio/$productId")({
  component: StudioProductPage,
  head: ({ params }) => ({
    meta: [
      { title: `Studio · ${params.productId} — GPTSBOXES` },
      { name: "description", content: `Configure packaging template ${params.productId} in the 3D studio.` },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function StudioProductPage() {
  const { productId } = useParams({ from: "/studio/$productId" });
  const query = useNormalizedProduct(productId);
  const loadProduct = useConfiguratorStore((s) => s.loadProduct);
  const clearProduct = useConfiguratorStore((s) => s.clearProduct);

  useEffect(() => {
    if (query.data) loadProduct(query.data);
    return () => {
      clearProduct();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.id]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center bg-viewport px-5">
        <div className="w-full max-w-sm rounded-2xl border border-panel-border bg-panel p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
            <div>
              <p className="text-sm font-semibold">Preparing packaging studio</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">source-{productId}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-xs">
            <LoadStep complete label="Product metadata" />
            <LoadStep complete={false} label="Dieline and panel relationships" />
            <LoadStep complete={false} label="3D geometry and materials" />
            <LoadStep complete={false} label="Artwork workspace" />
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/5 animate-pulse rounded-full bg-gold" />
          </div>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center bg-viewport px-6">
        <div className="w-full max-w-lg rounded-2xl border border-panel-border bg-panel p-7 text-center shadow-xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">The structure could not be loaded</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{(query.error as Error).message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button onClick={() => query.refetch()} className="studio-primary-button">
              Retry structure
            </button>
            <Link to="/library" className="studio-secondary-button">
              <Box className="h-4 w-4" /> Back to library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!query.data) return null;
  return <StudioWorkspace />;
}

function LoadStep({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={
          complete
            ? "flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success"
            : "flex h-5 w-5 items-center justify-center rounded-full border border-panel-border text-muted-foreground"
        }
      >
        {complete ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <span className={complete ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
