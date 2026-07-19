import { createFileRoute } from "@tanstack/react-router";
import { CatalogView } from "@/components/catalog/CatalogView";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Packaging structure library — GPTSBOXES" },
      {
        name: "description",
        content:
          "Browse real packaging structures, filter by family and material, and open a connected 2D and 3D configuration workflow.",
      },
      { property: "og:title", content: "Packaging structure library — GPTSBOXES" },
      {
        property: "og:description",
        content: "Choose a packaging structure and configure dimensions, artwork, materials and finishes.",
      },
    ],
  }),
});

function LibraryPage() {
  return (
    <div className="mx-auto w-full max-w-[1680px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <CatalogView />
    </div>
  );
}
