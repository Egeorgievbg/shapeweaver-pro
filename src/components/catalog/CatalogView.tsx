import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, Boxes, CheckCircle2, ImageOff, AlertCircle } from "lucide-react";
import { useProductsPage, useRelations, type CatalogCard } from "@/integrations/boxcraft";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

export function CatalogView() {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [material, setMaterial] = useState<string | undefined>();
  const [page, setPage] = useState(0);

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
  const activeFilters = [family, category, material, q].filter(Boolean).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Filters */}
      <aside className="panel-surface h-fit rounded-lg p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search products"
            className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <FilterGroup label="Family" value={family} onChange={(v) => { setFamily(v); setPage(0); }}
          items={relations.data?.families ?? []} />
        <FilterGroup label="Category" value={category} onChange={(v) => { setCategory(v); setPage(0); }}
          items={relations.data?.categories ?? []} />
        <FilterGroup label="Material" value={material} onChange={(v) => { setMaterial(v); setPage(0); }}
          items={relations.data?.materials ?? []} />

        {activeFilters > 0 && (
          <button
            onClick={() => { setFamily(undefined); setCategory(undefined); setMaterial(undefined); setQ(""); setPage(0); }}
            className="mt-4 w-full rounded-md border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            Clear filters ({activeFilters})
          </button>
        )}
      </aside>

      {/* Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {products.isLoading
              ? "Loading…"
              : products.isError
              ? "Failed to load"
              : `${total.toLocaleString()} product${total === 1 ? "" : "s"}`}
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="rounded border border-input px-2 py-1 disabled:opacity-40">
                Prev
              </button>
              <span className="font-mono text-muted-foreground">{page + 1} / {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page + 1 >= pageCount}
                className="rounded border border-input px-2 py-1 disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </div>

        {products.isError ? (
          <ErrorState message={(products.error as Error)?.message ?? "API error"} onRetry={() => products.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.isLoading && !products.data
              ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
              : products.data?.items.map((p) => <ProductCard key={p.id} card={p} />)}
          </div>
        )}
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
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="mt-5">
      <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <ul className="max-h-56 space-y-0.5 overflow-auto pr-1">
        {items.map((it) => {
          const active = value === it.id;
          return (
            <li key={it.id}>
              <button
                onClick={() => onChange(active ? undefined : it.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60",
                )}
              >
                <span className="truncate">{it.name}</span>
                <span className="ml-2 font-mono text-[10px]">{it.product_count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProductCard({ card }: { card: CatalogCard }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <Link
      to="/studio/$productId"
      params={{ productId: card.sourceId }}
      className="panel-surface group flex flex-col overflow-hidden rounded-lg transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-viewport">
        {card.thumbnailUrl && !imgFailed ? (
          <img
            src={card.thumbnailUrl}
            alt={card.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain p-4 transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {card.geometryQuality === "exact" ? (
            <Badge tone="gold" icon={<CheckCircle2 className="h-3 w-3" />}>Exact</Badge>
          ) : card.geometryQuality ? (
            <Badge tone="warn">{card.geometryQuality}</Badge>
          ) : null}
          {!card.hasKnife && <Badge tone="warn">Preview only</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-panel-border p-3">
        <p className="line-clamp-2 text-sm font-medium">{card.name}</p>
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {card.family && <Tag>{card.family}</Tag>}
          {card.material && <Tag>{card.material}</Tag>}
        </div>
        {card.dimensions && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {card.dimensions.length}×{card.dimensions.width}×{card.dimensions.height} {card.dimensions.unit}
          </p>
        )}
      </div>
    </Link>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{children}</span>;
}

function Badge({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: "gold" | "warn" | "success";
  icon?: React.ReactNode;
}) {
  const cls = {
    gold: "bg-gold/90 text-gold-foreground",
    warn: "bg-warning/90 text-foreground",
    success: "bg-success text-success-foreground",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", cls)}>
      {icon}{children}
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="panel-surface animate-pulse overflow-hidden rounded-lg">
      <div className="aspect-[4/3] bg-muted" />
      <div className="space-y-2 border-t border-panel-border p-3">
        <div className="h-3 w-3/4 rounded bg-muted" />
        <div className="h-2 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="panel-surface flex flex-col items-center justify-center gap-3 rounded-lg p-10 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm font-medium">Catalog unavailable</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <button onClick={onRetry} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        Retry
      </button>
    </div>
  );
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
const _keepBoxes = Boxes;
