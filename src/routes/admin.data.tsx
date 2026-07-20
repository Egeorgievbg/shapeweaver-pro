import { createFileRoute } from "@tanstack/react-router";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";

export const Route = createFileRoute("/admin/data")({
  component: AdminAuthGate,
  head: () => ({
    meta: [
      { title: "GPTSBOXES — Администрация / Administration" },
      {
        name: "description",
        content:
          "Secure bilingual administration center for catalog, content, materials, geometry, assets, integrations, users, and system settings.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
