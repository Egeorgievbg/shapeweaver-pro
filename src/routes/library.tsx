import { createFileRoute } from "@tanstack/react-router";
import { CatalogView } from "@/components/catalog/CatalogView";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Packaging library — GPTSBOXES" },
      {
        name: "description",
        content:
          "Browse 1,600+ real die-cut packaging templates: cartons, mailers, shipping boxes, sleeves, rigid boxes and more.",
      },
      { property: "og:title", content: "Packaging library — GPTSBOXES" },
      {
        property: "og:description",
        content: "Filter by family, category and material. Open any product in the 3D studio.",
      },
    ],
  }),
});

function LibraryPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t("library.badge")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("library.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("library.desc")}</p>
      </div>
      <CatalogView />
    </div>
  );
}
