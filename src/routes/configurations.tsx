import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { savedConfigs, type SavedConfiguration } from "@/stores/persistence";
import { Trash2, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/configurations")({
  component: ConfigurationsPage,
  head: () => ({
    meta: [
      { title: "GPTSBOXES — Запазени / Saved configurations" },
      {
        name: "description",
        content: "Saved packaging configurations / Запазени конфигурации на опаковки.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ConfigurationsPage() {
  const { t, formatDate } = useI18n();
  const [items, setItems] = useState<SavedConfiguration[]>([]);

  useEffect(() => {
    setItems(savedConfigs.list());
  }, []);

  return (
    <div data-i18n-skip="true" className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("saved.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("saved.body")}</p>

      {items.length === 0 ? (
        <div className="panel-surface mt-8 rounded-lg p-10 text-center text-sm text-muted-foreground">
          {t("saved.empty")}
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((configuration) => {
            const parsed = safeParse(configuration.payload);
            return (
              <li
                key={configuration.id}
                className="panel-surface flex flex-wrap items-center justify-between gap-3 rounded-lg p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{configuration.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {formatDate(configuration.updatedAt)} · {t("saved.source")}{" "}
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
                      {t("saved.open")} <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      savedConfigs.remove(configuration.id);
                      setItems(savedConfigs.list());
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs text-destructive hover:bg-accent"
                    aria-label={t("saved.delete")}
                    title={t("saved.delete")}
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

function safeParse(value: string): { sourceProductId?: string | number | null } | null {
  try {
    return JSON.parse(value) as { sourceProductId?: string | number | null };
  } catch {
    return null;
  }
}
