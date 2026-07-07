import { createFileRoute } from "@tanstack/react-router";
import { useHealth, useRelations } from "@/integrations/boxcraft";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/data")({
  component: AdminDataPage,
  head: () => ({
    meta: [
      { title: "Admin · Data diagnostics — GPTSBOXES" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminDataPage() {
  const health = useHealth();
  const relations = useRelations();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Data diagnostics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Read-only view of the BoxCraft API health & relations index.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Health</h2>
        <div className="panel-surface mt-2 rounded-lg p-4">
          {health.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Probing…
            </p>
          ) : health.data ? (
            <pre className="max-h-80 overflow-auto rounded bg-surface-2 p-3 font-mono text-xs">
{JSON.stringify(health.data, null, 2)}
            </pre>
          ) : (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" /> Unreachable
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
          Relations
        </h2>
        <div className="panel-surface mt-2 grid gap-4 rounded-lg p-4 md:grid-cols-3">
          {(["families", "categories", "materials"] as const).map((k) => (
            <div key={k}>
              <p className="text-xs font-mono uppercase text-muted-foreground">{k}</p>
              {relations.isLoading ? (
                <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {relations.data?.[k]?.map((e) => (
                    <li key={e.id} className="flex items-center justify-between border-b border-panel-border/60 py-1">
                      <span>
                        <CheckCircle2 className="mr-1 inline-block h-3 w-3 text-success" />
                        {e.name}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{e.product_count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
