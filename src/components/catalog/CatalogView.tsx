import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Grid2x2,
  Heart,
  ImageOff,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useProductsPage, useRelations, type CatalogCard } from "@/integrations/boxcraft";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;
type LineFilter = "all" | "basic" | "premium";
type Density = "comfortable" | "compact";

export function CatalogView() {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [material, setMaterial] = useState<string | undefined>();
  const [line, setLine] = useState<LineFilter>("all");
  const [page, setPage] = useState(0);
  const [density, setDensity] = useState<Density>("comfortable");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const relations = useRelations();
  const products = useProductsPage({
    q: q || undefined,
    family,
    category,
    material,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const total = products.data?.pagination.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE) || 1;
  const activeFilters = [family, category, material, q, line !== "all" ? line : undefined].filter(
    Boolean,
  ).length;
  const featuredFamilies = useMemo(
    () => (relations.data?.families ?? []).slice(0, 6),
    [relations.data?.families],
  );

  const visibleItems = useMemo(() => {
    const items = products.data?.items ?? [];
    if (line === "all") return items;
    return items.filter((item) => {
      const haystack = `${item.name} ${item.family ?? ""} ${item.material ?? ""}`.toLowerCase();
      return line === "premium"
        ? /(rigid|luxury|gift|premium|magnetic)/.test(haystack)
        : !/(rigid|luxury|gift|premium|magnetic)/.test(haystack);
    });
  }, [line, products.data?.items]);

  const clearFilters = () => {
    setFamily(undefined);
    setCategory(undefined);
    setMaterial(undefined);
    setQ("");
    setLine("all");
    setPage(0);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-2xl border border-panel-border bg-panel">
        <div className="grid gap-6 px-5 py-6 md:grid-cols-[1fr_auto] md:px-8 md:py-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
              <Sparkles className="h-3 w-3" /> Packaging structure library
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              Choose a structure. Configure it in one connected workflow.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Search, filter and open a production-linked packaging template. Dimensions, dieline,
              artwork, 3D and quote data remain inside one project.
            </p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <div className="rounded-xl border border-panel-border bg-surface-2 px-4 py-3 text-center">
              <p className="text-xl font-semibold">{total.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Structures
              </p>
            </div>
            <div className="rounded-xl border border-panel-border bg-surface-2 px-4 py-3 text-center">
              <p className="text-xl font-semibold">2D + 3D</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Linked editor
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-panel-border bg-surface-2/60 p-4 md:px-8">
          <div className="relative mx-auto max-w-4xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(0);
              }}
              placeholder="Search mailer, rigid, tuck end, display, FEFCO…"
              className="h-12 w-full rounded-xl border border-input bg-panel pl-12 pr-12 text-sm shadow-sm outline-none transition focus:border-gold/50 focus:ring-4 focus:ring-gold/10"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {featuredFamilies.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
                Browse by construction
              </p>
              <h2 className="mt-1 text-base font-semibold">Popular packaging families</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {featuredFamilies.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  setFamily(family === item.id ? undefined : item.id);
                  setPage(0);
                }}
                className={cn(
                  "group rounded-xl border p-3 text-left transition-all",
                  family === item.id
                    ? "border-gold bg-gold/5"
                    : "border-panel-border bg-panel hover:-translate-y-0.5 hover:border-muted-foreground/40 hover:shadow-sm",
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground group-hover:text-gold">
                  {index % 2 === 0 ? (
                    <Boxes className="h-4 w-4" />
                  ) : (
                    <Grid2x2 className="h-4 w-4" />
                  )}
                </span>
                <p className="mt-3 truncate text-xs font-semibold">{item.name}</p>
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                  {item.product_count.toLocaleString()} templates
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <button
          onClick={() => setFiltersOpen(true)}
          className="studio-secondary-button w-full justify-center lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters{" "}
          {activeFilters > 0 ? `(${activeFilters})` : ""}
        </button>

        <aside className="hidden h-fit overflow-hidden rounded-2xl border border-panel-border bg-panel lg:block">
          <FilterSidebar
            family={family}
            category={category}
            material={material}
            line={line}
            activeFilters={activeFilters}
            relations={relations.data}
            setFamily={(value) => {
              setFamily(value);
              setPage(0);
            }}
            setCategory={(value) => {
              setCategory(value);
              setPage(0);
            }}
            setMaterial={(value) => {
              setMaterial(value);
              setPage(0);
            }}
            setLine={(value) => {
              setLine(value);
              setPage(0);
            }}
            clearFilters={clearFilters}
          />
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Results
              </p>
              <p className="mt-1 text-sm font-semibold">
                {products.isLoading
                  ? "Loading structures…"
                  : products.isError
                    ? "Catalog unavailable"
                    : `${total.toLocaleString()} matching structures`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-input bg-panel p-0.5">
                <button
                  onClick={() => setDensity("comfortable")}
                  className={cn(
                    "rounded-md p-1.5",
                    density === "comfortable"
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground",
                  )}
                  aria-label="Comfortable grid"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDensity("compact")}
                  className={cn(
                    "rounded-md p-1.5",
                    density === "compact" ? "bg-accent text-foreground" : "text-muted-foreground",
                  )}
                  aria-label="Compact grid"
                >
                  <Grid2x2 className="h-4 w-4" />
                </button>
              </div>
              {pageCount > 1 && <Pagination page={page} pageCount={pageCount} setPage={setPage} />}
            </div>
          </div>

          {products.isError ? (
            <ErrorState
              message={(products.error as Error)?.message ?? "API error"}
              onRetry={() => products.refetch()}
            />
          ) : (
            <div
              className={cn(
                "grid gap-4",
                density === "comfortable"
                  ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                  : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
              )}
            >
              {products.isLoading && !products.data
                ? Array.from({ length: 8 }).map((_, index) => (
                    <CardSkeleton key={index} compact={density === "compact"} />
                  ))
                : visibleItems.map((card) => (
                    <ProductCard
                      key={card.id}
                      card={card}
                      compact={density === "compact"}
                      favorite={favorites.has(card.id)}
                      onToggleFavorite={() => toggleFavorite(card.id)}
                    />
                  ))}
            </div>
          )}

          {!products.isLoading && !products.isError && visibleItems.length === 0 && (
            <div className="rounded-2xl border border-panel-border bg-panel px-6 py-12 text-center">
              <Search className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold">No structures match these filters</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Remove a filter or search for a broader packaging family.
              </p>
              <button onClick={clearFilters} className="studio-secondary-button mt-4">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close filters"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-panel-border bg-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
                  Library
                </p>
                <p className="text-sm font-semibold">Filters</p>
              </div>
              <button onClick={() => setFiltersOpen(false)} className="studio-icon-button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <FilterSidebar
              family={family}
              category={category}
              material={material}
              line={line}
              activeFilters={activeFilters}
              relations={relations.data}
              setFamily={(value) => {
                setFamily(value);
                setPage(0);
              }}
              setCategory={(value) => {
                setCategory(value);
                setPage(0);
              }}
              setMaterial={(value) => {
                setMaterial(value);
                setPage(0);
              }}
              setLine={(value) => {
                setLine(value);
                setPage(0);
              }}
              clearFilters={clearFilters}
            />
            <div className="sticky bottom-0 border-t border-panel-border bg-panel p-4">
              <button
                onClick={() => setFiltersOpen(false)}
                className="studio-primary-button w-full justify-center"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSidebar({
  family,
  category,
  material,
  line,
  activeFilters,
  relations,
  setFamily,
  setCategory,
  setMaterial,
  setLine,
  clearFilters,
}: {
  family: string | undefined;
  category: string | undefined;
  material: string | undefined;
  line: LineFilter;
  activeFilters: number;
  relations:
    | {
        families: { id: string; name: string; product_count: number }[];
        categories: { id: string; name: string; product_count: number }[];
        materials: { id: string; name: string; product_count: number }[];
      }
    | undefined;
  setFamily: (value: string | undefined) => void;
  setCategory: (value: string | undefined) => void;
  setMaterial: (value: string | undefined) => void;
  setLine: (value: LineFilter) => void;
  clearFilters: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Refine
          </p>
          <p className="text-sm font-semibold">Structure filters</p>
        </div>
        {activeFilters > 0 && (
          <button onClick={clearFilters} className="text-xs font-medium text-gold hover:underline">
            Clear {activeFilters}
          </button>
        )}
      </div>

      <div className="space-y-5 p-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Product line
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
            {(["all", "basic", "premium"] as LineFilter[]).map((value) => (
              <button
                key={value}
                onClick={() => setLine(value)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize",
                  line === value
                    ? value === "premium"
                      ? "bg-gold text-gold-foreground"
                      : value === "basic"
                        ? "bg-success text-success-foreground"
                        : "bg-panel text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <FilterGroup
          label="Family"
          value={family}
          onChange={setFamily}
          items={relations?.families ?? []}
        />
        <FilterGroup
          label="Category"
          value={category}
          onChange={setCategory}
          items={relations?.categories ?? []}
        />
        <FilterGroup
          label="Material"
          value={material}
          onChange={setMaterial}
          items={relations?.materials ?? []}
        />
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string | undefined;
  items: { id: string; name: string; product_count: number }[];
  onChange: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-panel-border pt-4">
      <button
        onClick={() => setOpen((current) => !current)}
        className="mb-2 flex w-full items-center justify-between text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const active = value === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(active ? undefined : item.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs",
                  active
                    ? "bg-gold/10 text-foreground ring-1 ring-gold/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="truncate">{item.name}</span>
                <span className="ml-2 font-mono text-[9px]">{item.product_count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  card,
  compact,
  favorite,
  onToggleFavorite,
}: {
  card: CatalogCard;
  compact: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const premium = /(rigid|luxury|gift|premium|magnetic)/i.test(`${card.name} ${card.family ?? ""}`);
  return (
    <article className="group overflow-hidden rounded-2xl border border-panel-border bg-panel transition-all hover:-translate-y-1 hover:border-muted-foreground/35 hover:shadow-xl hover:shadow-black/5">
      <div className={cn("relative bg-viewport", compact ? "aspect-square" : "aspect-[4/3]")}>
        {card.thumbnailUrl && !imgFailed ? (
          <img
            src={card.thumbnailUrl}
            alt={card.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        <button
          onClick={(event) => {
            event.preventDefault();
            onToggleFavorite();
          }}
          className={cn(
            "absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-panel/80 shadow-sm backdrop-blur transition",
            favorite ? "text-gold" : "text-muted-foreground opacity-0 group-hover:opacity-100",
          )}
          aria-label="Toggle favorite"
        >
          <Heart className={cn("h-3.5 w-3.5", favorite && "fill-current")} />
        </button>
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]",
              premium ? "bg-gold text-gold-foreground" : "bg-success text-success-foreground",
            )}
          >
            {premium ? "Premium" : "Basic"}
          </span>
          {card.geometryQuality === "exact" ? (
            <Badge tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>
              Exact geometry
            </Badge>
          ) : card.geometryQuality ? (
            <Badge tone="warn">{card.geometryQuality}</Badge>
          ) : null}
        </div>
      </div>

      <div className={cn("border-t border-panel-border", compact ? "p-3" : "p-4")}>
        <p className="line-clamp-2 text-sm font-semibold leading-5">{card.name}</p>
        {!compact && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.family && <Tag>{card.family}</Tag>}
            {card.material && <Tag>{card.material}</Tag>}
          </div>
        )}
        {card.dimensions && (
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            {card.dimensions.length} × {card.dimensions.width} × {card.dimensions.height}{" "}
            {card.dimensions.unit}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Star className="h-3 w-3 text-gold" /> Ready to configure
          </div>
          <Link
            to="/studio/$productId"
            params={{ productId: card.sourceId }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Configure <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Pagination({
  page,
  pageCount,
  setPage,
}: {
  page: number;
  pageCount: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-input bg-panel p-1 text-xs">
      <button
        onClick={() => setPage((current) => Math.max(0, current - 1))}
        disabled={page === 0}
        className="rounded px-2 py-1 disabled:opacity-35"
      >
        Prev
      </button>
      <span className="min-w-14 text-center font-mono text-[10px] text-muted-foreground">
        {page + 1} / {pageCount}
      </span>
      <button
        onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
        disabled={page + 1 >= pageCount}
        className="rounded px-2 py-1 disabled:opacity-35"
      >
        Next
      </button>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground">
      {children}
    </span>
  );
}

function Badge({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: "warn" | "success";
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-medium",
        tone === "success" ? "bg-panel/90 text-success shadow-sm" : "bg-warning/90 text-foreground",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function CardSkeleton({ compact }: { compact: boolean }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-panel-border bg-panel">
      <div className={cn("bg-muted", compact ? "aspect-square" : "aspect-[4/3]")} />
      <div className="space-y-2 border-t border-panel-border p-4">
        <div className="h-3 w-3/4 rounded bg-muted" />
        <div className="h-2 w-1/2 rounded bg-muted" />
        <div className="h-8 rounded bg-muted" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-panel-border bg-panel p-12 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm font-semibold">Catalog unavailable</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <button onClick={onRetry} className="studio-primary-button">
        Retry catalog
      </button>
    </div>
  );
}
