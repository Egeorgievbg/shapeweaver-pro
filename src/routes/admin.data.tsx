import { createFileRoute } from "@tanstack/react-router";
import { AdminControlCenter } from "@/components/admin/AdminControlCenter";

export const Route = createFileRoute("/admin/data")({
  component: AdminControlCenter,
  head: () => ({
    meta: [
      { title: "GPTSBOXES — Администрация / Administration" },
      {
        name: "description",
        content:
          "Bilingual administration center for catalog, content, materials, geometry, assets, integrations, users, and system settings.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
