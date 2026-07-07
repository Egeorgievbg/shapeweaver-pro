import { Link, createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/studio/")({
  component: StudioEmpty,
  head: () => ({
    meta: [
      { title: "Studio — GPTSBOXES" },
      {
        name: "description",
        content: "Open a packaging template in the 3D studio to configure it.",
      },
    ],
  }),
});

function StudioEmpty() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="panel-surface flex h-16 w-16 items-center justify-center rounded-full">
        <Boxes className="h-7 w-7 text-gold" strokeWidth={1.5} />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">{t("studio.empty.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("studio.empty.body")}</p>
      <Link
        to="/library"
        className="mt-6 inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {t("studio.empty.browse")}
      </Link>
    </div>
  );
}
