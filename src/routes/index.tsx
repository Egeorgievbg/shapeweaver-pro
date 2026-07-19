import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Boxes, Layers, Palette, Sparkles } from "lucide-react";
import { PackagingHeroVisual } from "@/components/landing/PackagingHeroVisual";
import { useProductsPage, useRelations } from "@/integrations/boxcraft";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "GPTSBOXES — 3D опаковки / 3D packaging design" },
      {
        name: "description",
        content:
          "Bilingual browser-based packaging configurator for real product structures, dimensions, materials, artwork, dielines, 3D visualization, and export.",
      },
      { property: "og:title", content: "GPTSBOXES — 3D Packaging Studio" },
      {
        property: "og:description",
        content:
          "Real-time packaging studio with 2D dielines, WebGL visualization, artwork, and production exports.",
      },
    ],
  }),
});

function LandingPage() {
  const { t, formatNumber } = useI18n();
  const products = useProductsPage({ limit: 1, offset: 0 });
  const relations = useRelations();
  const productCount = products.data?.pagination.total;
  const familyCount = relations.data?.families.length;
  const categoryCount = relations.data?.categories.length;

  const features = [
    {
      icon: Boxes,
      label: t("landing.feature.constructions"),
      desc: t("landing.feature.constructions.body"),
    },
    {
      icon: Layers,
      label: t("landing.feature.dieline"),
      desc: t("landing.feature.dieline.body"),
    },
    {
      icon: Palette,
      label: t("landing.feature.artwork"),
      desc: t("landing.feature.artwork.body"),
    },
    {
      icon: Sparkles,
      label: t("landing.feature.render"),
      desc: t("landing.feature.render.body"),
    },
  ];

  return (
    <div
      data-i18n-skip="true"
      className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 sm:py-20 lg:py-24"
    >
      <section className="grid gap-12 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t("landing.eyebrow")}
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-tight text-foreground lg:text-6xl">
            {t("landing.title")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{t("landing.body")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/library"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
            >
              {t("landing.library")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-accent"
            >
              {t("landing.studio")}
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {productCount === undefined ? (
              <span>{t("landing.live")}</span>
            ) : (
              <>
                <span className="rounded-md border border-panel-border bg-panel px-2.5 py-1.5">
                  {formatNumber(productCount)} products
                </span>
                <span className="rounded-md border border-panel-border bg-panel px-2.5 py-1.5">
                  {formatNumber(familyCount ?? 0)} families
                </span>
                <span className="rounded-md border border-panel-border bg-panel px-2.5 py-1.5">
                  {formatNumber(categoryCount ?? 0)} categories
                </span>
              </>
            )}
          </div>
        </div>
        <PackagingHeroVisual label={t("landing.preview")} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <div
            key={feature.label}
            className="panel-surface group rounded-xl p-5 transition hover:-translate-y-1 hover:border-gold/25 hover:shadow-lg"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <feature.icon className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-4 text-sm font-semibold">{feature.label}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
