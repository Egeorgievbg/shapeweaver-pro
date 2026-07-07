import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { savedConfigs, type SavedConfiguration } from "@/stores/persistence";
import { useI18n } from "@/lib/i18n";
import { Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/configurations")({
  component: ConfigurationsPage,
  head: () => ({
    meta: [
      { title: "Saved configurations — GPTSBOXES" },
      { name: "description", content: "Your saved packaging configurations." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ConfigurationsPage() {
  const [items, setItems] = useState<SavedConfiguration[]>([]);
  const { t } = useI18n();
  useEffect(() => {
    setItems(savedConfigs.list());
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("configs.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("configs.subtitle")}</p>

      {items.length === 0 ? (
        <div className="panel-surface mt-8 rounded-lg p-10 text-center text-sm text-muted-foreground">
          {t("configs.empty")}
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((c) => {
            const parsed = safeParse(c.payload);
            return (
              <li
                key={c.id}
                className="panel-surface flex items-center justify-between rounded-lg p-4"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleString()} · {t("configs.source")}{" "}
                    {parsed?.sourceProductId ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {parsed?.sourceProductId && (
                    <Link
                      to="/studio/$productId"
                      params={{ productId: String(parsed.sourceProductId) }}
                      className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      {t("action.open")} <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      savedConfigs.remove(c.id);
                      setItems(savedConfigs.list());
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs text-destructive hover:bg-accent"
                    aria-label="Delete configuration"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function safeParse(s: string): { sourceProductId?: string | number | null } | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
