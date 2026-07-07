import { createFileRoute } from "@tanstack/react-router";
import { CatalogView } from "@/components/catalog/CatalogView";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Packaging library — GPTSBOXES" },
      { name: "description", content: "Browse 1,600+ real die-cut packaging templates: cartons, mailers, shipping boxes, sleeves, rigid boxes and more." },
      { property: "og:title", content: "Packaging library — GPTSBOXES" },
      { property: "og:description", content: "Filter by family, category and material. Open any product in the 3D studio." },
    ],
  }),
});

function LibraryPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Library</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Packaging templates</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every product is backed by real die-cut geometry from the BoxCraft visualization API. Pick
          one to open the studio.
        </p>
      </div>
      <CatalogView />
    </div>
  );
}
