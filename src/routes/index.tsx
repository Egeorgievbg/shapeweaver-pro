import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Boxes, Layers, Palette, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "GPTSBOXES — Design custom packaging in 3D" },
      {
        name: "description",
        content:
          "Browse 1,600+ die-cut packaging templates, configure dimensions and materials in real time, apply artwork, and export production-ready dielines.",
      },
      { property: "og:title", content: "GPTSBOXES — Design custom packaging in 3D" },
      {
        property: "og:description",
        content:
          "Real-time WebGL packaging studio with die-cut geometry, artwork, and dieline exports.",
      },
    ],
  }),
});

function LandingPage() {
  const { t } = useI18n();

  const features = [
    {
      icon: Boxes,
      label: t("landing.feature.constructions.label"),
      desc: t("landing.feature.constructions.desc"),
    },
    {
      icon: Layers,
      label: t("landing.feature.dieline.label"),
      desc: t("landing.feature.dieline.desc"),
    },
    {
      icon: Palette,
      label: t("landing.feature.artwork.label"),
      desc: t("landing.feature.artwork.desc"),
    },
    {
      icon: Sparkles,
      label: t("landing.feature.render.label"),
      desc: t("landing.feature.render.desc"),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-20 lg:py-28">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t("landing.badge")}
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-foreground lg:text-6xl">
            {t("landing.headline")}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("landing.body")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/library"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              {t("landing.browseLibrary")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent"
            >
              {t("landing.openStudio")}
            </Link>
          </div>
          <p className="mt-6 font-mono text-xs text-muted-foreground">{t("landing.stat")}</p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-panel-border bg-viewport shadow-inner">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.05) 75%, transparent 75%, transparent)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-40 w-56 rotate-[-8deg] rounded-md border border-panel-border shadow-lg"
              style={{ backgroundColor: "var(--color-gold)" }}
            />
          </div>
          <div className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            live preview · webgl · 60fps
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.label} className="panel-surface rounded-lg p-5">
            <f.icon className="h-5 w-5 text-gold" strokeWidth={1.6} />
            <p className="mt-4 text-sm font-medium">{f.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
