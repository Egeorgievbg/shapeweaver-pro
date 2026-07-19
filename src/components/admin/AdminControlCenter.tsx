import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Boxes,
  Braces,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Database,
  FileImage,
  FolderTree,
  Globe2,
  Languages,
  Loader2,
  LockKeyhole,
  PackageSearch,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useHealth, useProductsPage, useRelations } from "@/integrations/boxcraft";
import {
  ADMIN_RESOURCES,
  AdminApiError,
  adminRequest,
  capabilityAllows,
  type AdminCapabilitiesResponse,
  type AdminMethod,
} from "@/integrations/admin/client";
import { BOXCRAFT_API_BASE_URL } from "@/lib/env";
import { MESSAGES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ModuleId =
  | "overview"
  | "products"
  | "taxonomy"
  | "materials"
  | "content"
  | "geometry"
  | "assets"
  | "quotes"
  | "users"
  | "integrations"
  | "settings"
  | "audit";

type AdminModule = {
  id: ModuleId;
  labelKey: string;
  icon: LucideIcon;
  resource?: keyof typeof ADMIN_RESOURCES;
  methods?: AdminMethod[];
};

const MODULES: AdminModule[] = [
  { id: "overview", labelKey: "admin.overview", icon: CircleGauge },
  {
    id: "products",
    labelKey: "admin.products",
    icon: Boxes,
    resource: "products",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
  {
    id: "taxonomy",
    labelKey: "admin.taxonomy",
    icon: FolderTree,
    resource: "taxonomy",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
  {
    id: "materials",
    labelKey: "admin.materials",
    icon: Sparkles,
    resource: "materials",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
  {
    id: "content",
    labelKey: "admin.content",
    icon: Languages,
    resource: "translations",
    methods: ["GET", "POST", "PATCH"],
  },
  {
    id: "geometry",
    labelKey: "admin.geometry",
    icon: Wrench,
    resource: "geometry",
    methods: ["GET", "POST", "PATCH"],
  },
  {
    id: "assets",
    labelKey: "admin.assets",
    icon: FileImage,
    resource: "assets",
    methods: ["GET", "POST", "DELETE"],
  },
  {
    id: "quotes",
    labelKey: "admin.quotes",
    icon: PackageSearch,
    resource: "quotes",
    methods: ["GET", "PATCH"],
  },
  {
    id: "users",
    labelKey: "admin.users",
    icon: Users,
    resource: "users",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
  {
    id: "integrations",
    labelKey: "admin.integrations",
    icon: Globe2,
    resource: "integrations",
    methods: ["GET", "POST", "PATCH"],
  },
  {
    id: "settings",
    labelKey: "admin.settings",
    icon: Settings2,
    resource: "settings",
    methods: ["GET", "PATCH"],
  },
  { id: "audit", labelKey: "admin.audit", icon: Activity, resource: "audit", methods: ["GET"] },
];

export function AdminControlCenter() {
  const { t, locale, setLocale, formatNumber } = useI18n();
  const [activeModule, setActiveModule] = useState<ModuleId>("overview");
  const [navigationQuery, setNavigationQuery] = useState("");

  const health = useHealth();
  const relations = useRelations();
  const products = useProductsPage({ limit: 50, offset: 0 });
  const capabilities = useQuery({
    queryKey: ["admin", "capabilities"],
    queryFn: () => adminRequest<AdminCapabilitiesResponse>(ADMIN_RESOURCES.capabilities),
    retry: false,
    staleTime: 30_000,
  });

  const modules = useMemo(() => {
    const query = navigationQuery.trim().toLocaleLowerCase(locale === "bg" ? "bg-BG" : "en-GB");
    if (!query) return MODULES;
    return MODULES.filter((module) => t(module.labelKey).toLocaleLowerCase().includes(query));
  }, [locale, navigationQuery, t]);

  const writeEnabled = Boolean(
    capabilities.data?.capabilities.some(
      (capability) => capability.enabled && capability.methods.some((method) => method !== "GET"),
    ),
  );
  const relationCount =
    (relations.data?.families.length ?? 0) +
    (relations.data?.categories.length ?? 0) +
    (relations.data?.materials.length ?? 0);

  return (
    <div data-i18n-skip="true" className="min-h-[calc(100dvh-3.5rem)] bg-surface-2/45">
      <div className="border-b border-panel-border bg-panel px-4 py-5 md:px-7">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
              <ShieldCheck className="h-4 w-4" />{" "}
              {writeEnabled ? t("admin.mode.live") : t("admin.mode.readOnly")}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              {t("admin.title")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("admin.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === "bg" ? "en" : "bg")}
              className="studio-secondary-button"
            >
              <Languages className="h-4 w-4" /> {locale === "bg" ? "BG" : "EN"}
            </button>
            <button
              onClick={() => {
                capabilities.refetch();
                health.refetch();
                relations.refetch();
                products.refetch();
              }}
              className="studio-secondary-button"
            >
              <RefreshCw className="h-4 w-4" /> {t("action.refresh")}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="border-b border-panel-border bg-panel p-3 lg:min-h-[calc(100dvh-8.25rem)] lg:border-b-0 lg:border-r">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={navigationQuery}
              onChange={(event) => setNavigationQuery(event.target.value)}
              placeholder={t("admin.search")}
              className="h-10 w-full rounded-lg border border-input bg-surface-2 pl-9 pr-3 text-xs outline-none focus:border-gold/50 focus:ring-4 focus:ring-gold/10"
            />
          </div>
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {modules.map((module) => {
              const Icon = module.icon;
              const selected = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{t(module.labelKey)}</span>
                  {selected && <ChevronRight className="hidden h-3.5 w-3.5 lg:block" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 rounded-xl border border-panel-border bg-surface-2 p-3 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              {writeEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <LockKeyhole className="h-4 w-4 text-warning" />
              )}
              {writeEnabled ? t("status.writeEnabled") : t("status.readOnly")}
            </div>
            <p className="mt-2 leading-5 text-muted-foreground">{t("admin.mode.help")}</p>
          </div>
        </aside>

        <main className="min-w-0 p-4 md:p-6 lg:p-8">
          {activeModule === "overview" && (
            <OverviewPanel
              health={health.data}
              healthLoading={health.isLoading}
              productTotal={products.data?.pagination.total}
              relationCount={relationCount}
              capabilities={capabilities.data}
              capabilitiesError={capabilities.error}
              formatNumber={formatNumber}
            />
          )}
          {activeModule === "products" && (
            <ProductsPanel
              items={products.data?.items ?? []}
              loading={products.isLoading}
              capabilities={capabilities.data}
            />
          )}
          {activeModule === "taxonomy" && (
            <TaxonomyPanel
              title={t("admin.taxonomy")}
              groups={[
                {
                  key: "families",
                  label: t("filter.family"),
                  items: relations.data?.families ?? [],
                },
                {
                  key: "categories",
                  label: t("filter.category"),
                  items: relations.data?.categories ?? [],
                },
              ]}
              loading={relations.isLoading}
              capabilities={capabilities.data}
              resource="taxonomy"
            />
          )}
          {activeModule === "materials" && (
            <TaxonomyPanel
              title={t("admin.materials")}
              groups={[
                {
                  key: "materials",
                  label: t("filter.material"),
                  items: relations.data?.materials ?? [],
                },
              ]}
              loading={relations.isLoading}
              capabilities={capabilities.data}
              resource="materials"
            />
          )}
          {activeModule === "content" && <TranslationsPanel capabilities={capabilities.data} />}
          {activeModule === "geometry" && (
            <GeometryPanel items={products.data?.items ?? []} capabilities={capabilities.data} />
          )}
          {["assets", "quotes", "users", "integrations", "settings", "audit"].includes(
            activeModule,
          ) && <GenericResourcePanel moduleId={activeModule} capabilities={capabilities.data} />}
        </main>
      </div>
    </div>
  );
}

function OverviewPanel({
  health,
  healthLoading,
  productTotal,
  relationCount,
  capabilities,
  capabilitiesError,
  formatNumber,
}: {
  health: unknown;
  healthLoading: boolean;
  productTotal?: number;
  relationCount: number;
  capabilities?: AdminCapabilitiesResponse;
  capabilitiesError: Error | null;
  formatNumber: (value: number) => string;
}) {
  const { t } = useI18n();
  const stats = [
    {
      label: t("admin.apiHealth"),
      value: healthLoading ? "…" : health ? t("status.online") : t("status.offline"),
      icon: Database,
    },
    {
      label: t("admin.catalogTotal"),
      value: productTotal === undefined ? "—" : formatNumber(productTotal),
      icon: Boxes,
    },
    { label: t("admin.relationsTotal"), value: formatNumber(relationCount), icon: FolderTree },
    {
      label: t("admin.translationKeys"),
      value: formatNumber(Object.keys(MESSAGES.en).length),
      icon: Languages,
    },
  ];

  return (
    <div className="space-y-6">
      <PanelHeading title={t("admin.overview")} body={t("admin.mode.help")} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-panel-border bg-panel p-4">
            <stat.icon className="h-5 w-5 text-gold" />
            <p className="mt-5 text-2xl font-semibold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-panel-border bg-panel p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">{t("admin.capabilities")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.currentApi")}: {BOXCRAFT_API_BASE_URL}
            </p>
          </div>
          <StatusPill enabled={Boolean(capabilities)} />
        </div>
        {capabilities ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-panel-border">
                  <th className="py-2 pr-3">{t("admin.resource")}</th>
                  <th className="py-2 pr-3">{t("admin.endpoint")}</th>
                  <th className="py-2 pr-3">{t("admin.method")}</th>
                  <th className="py-2">{t("admin.permission")}</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.capabilities.map((capability) => (
                  <tr
                    key={`${capability.resource}-${capability.endpoint}`}
                    className="border-b border-panel-border/60"
                  >
                    <td className="py-2 pr-3 font-medium">{capability.resource}</td>
                    <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">
                      {capability.endpoint}
                    </td>
                    <td className="py-2 pr-3">{capability.methods.join(", ")}</td>
                    <td className="py-2">{capability.permission ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-xs leading-5">
            <div className="flex items-center gap-2 font-semibold">
              <LockKeyhole className="h-4 w-4" /> {t("status.readOnly")}
            </div>
            <p className="mt-2 text-muted-foreground">{t("admin.connectionRequired")}</p>
            {capabilitiesError && (
              <details className="mt-3">
                <summary className="cursor-pointer font-medium">Technical diagnostics</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
                  {capabilitiesError.message}
                </pre>
              </details>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-panel-border bg-panel p-4 md:p-5">
        <h2 className="text-sm font-semibold">{t("admin.systemInfo")}</h2>
        <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-[10px] leading-5">
          {JSON.stringify(health ?? { status: "unavailable" }, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function ProductsPanel({
  items,
  loading,
  capabilities,
}: {
  items: Array<Record<string, unknown>>;
  loading: boolean;
  capabilities?: AdminCapabilitiesResponse;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const canPatch = capabilityAllows(capabilities?.capabilities, "products", "PATCH");
  const canCreate = capabilityAllows(capabilities?.capabilities, "products", "POST");
  const filtered = items.filter((item) =>
    String(item.name ?? "")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <PanelHeading title={t("admin.products")} body={t("admin.mode.help")} />
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("filter.search")}
            className="h-10 w-full rounded-lg border border-input bg-panel pl-9 pr-3 text-xs"
          />
        </div>
        <button
          disabled={!canCreate}
          className="studio-primary-button disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Boxes className="h-4 w-4" /> {t("action.create")}
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="overflow-hidden rounded-xl border border-panel-border bg-panel">
          {loading ? (
            <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("status.loading")}
            </div>
          ) : (
            <div className="max-h-[650px] overflow-auto">
              {filtered.map((item) => {
                const id = String(item.id ?? item.sourceId ?? item.source_id ?? "");
                return (
                  <button
                    key={id}
                    onClick={() => setSelected(item)}
                    className="flex w-full items-center justify-between gap-3 border-b border-panel-border/70 px-4 py-3 text-left hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{String(item.name ?? id)}</p>
                      <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">
                        {id} · {String(item.geometryQuality ?? item.geometry_quality ?? "unknown")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <JsonEditorCard
          title={selected ? String(selected.name ?? t("admin.products")) : t("admin.selectModule")}
          value={selected ?? {}}
          endpoint={
            selected
              ? `${ADMIN_RESOURCES.products}/${String(selected.id ?? selected.sourceId ?? selected.source_id ?? "")}`
              : ADMIN_RESOURCES.products
          }
          method="PATCH"
          enabled={Boolean(selected && canPatch)}
        />
      </div>
    </div>
  );
}

function TaxonomyPanel({
  title,
  groups,
  loading,
  capabilities,
  resource,
}: {
  title: string;
  groups: Array<{
    key: string;
    label: string;
    items: Array<{ id: string; name: string; product_count: number }>;
  }>;
  loading: boolean;
  capabilities?: AdminCapabilitiesResponse;
  resource: "taxonomy" | "materials";
}) {
  const { t, formatNumber } = useI18n();
  const canWrite = capabilityAllows(capabilities?.capabilities, resource, "POST");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  return (
    <div className="space-y-5">
      <PanelHeading title={title} body={t("admin.mode.help")} />
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("status.loading")}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <section
                key={group.key}
                className="overflow-hidden rounded-xl border border-panel-border bg-panel"
              >
                <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
                  <h2 className="text-sm font-semibold">{group.label}</h2>
                  <button
                    disabled={!canWrite}
                    className="studio-secondary-button disabled:opacity-40"
                  >
                    {t("action.create")}
                  </button>
                </div>
                <div className="max-h-[560px] overflow-auto">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelected({ ...item, kind: group.key })}
                      className="flex w-full items-center justify-between border-b border-panel-border/60 px-4 py-3 text-left hover:bg-accent/50"
                    >
                      <span className="text-xs font-medium">{item.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatNumber(item.product_count)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <JsonEditorCard
            title={selected ? String(selected.name) : t("admin.selectModule")}
            value={selected ?? {}}
            endpoint={`${ADMIN_RESOURCES[resource]}/${String(selected?.id ?? "")}`}
            method="PATCH"
            enabled={Boolean(
              selected && capabilityAllows(capabilities?.capabilities, resource, "PATCH"),
            )}
          />
        </div>
      )}
    </div>
  );
}

function TranslationsPanel({ capabilities }: { capabilities?: AdminCapabilitiesResponse }) {
  const { t } = useI18n();
  const [rows, setRows] = useState(() =>
    Object.keys(MESSAGES.en).map((key) => ({
      key,
      bg: MESSAGES.bg[key] ?? "",
      en: MESSAGES.en[key] ?? "",
    })),
  );
  const [query, setQuery] = useState("");
  const canWrite =
    capabilityAllows(capabilities?.capabilities, "translations", "POST") ||
    capabilityAllows(capabilities?.capabilities, "translations", "PATCH");
  const mutation = useMutation({
    mutationFn: () =>
      adminRequest(ADMIN_RESOURCES.translations, { method: "POST", body: { items: rows } }),
    onSuccess: () => toast.success(t("admin.updated")),
    onError: (error) =>
      toast.error(t("admin.failed"), {
        description: error instanceof Error ? error.message : undefined,
      }),
  });
  const filtered = rows.filter((row) =>
    `${row.key} ${row.bg} ${row.en}`.toLowerCase().includes(query.toLowerCase()),
  );
  const coverage = Math.round(
    (rows.filter((row) => row.bg.trim() && row.en.trim()).length / Math.max(1, rows.length)) * 100,
  );

  return (
    <div className="space-y-5">
      <PanelHeading
        title={t("admin.content")}
        body={`${t("admin.translationCoverage")}: ${coverage}%`}
      />
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("admin.search")}
          className="h-10 min-w-64 flex-1 rounded-lg border border-input bg-panel px-3 text-xs"
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={!canWrite || mutation.isPending}
          className="studio-primary-button disabled:opacity-40"
        >
          <Save className="h-4 w-4" /> {t("admin.saveChanges")}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-panel-border bg-panel">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="sticky top-0 bg-surface-2 text-muted-foreground">
            <tr>
              <th className="w-64 px-3 py-3">Key</th>
              <th className="px-3 py-3">{t("admin.bg")}</th>
              <th className="px-3 py-3">{t("admin.en")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const index = rows.findIndex((item) => item.key === row.key);
              return (
                <tr key={row.key} className="border-t border-panel-border/70 align-top">
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                    {row.key}
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      value={row.bg}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, bg: event.target.value } : item,
                          ),
                        )
                      }
                      className="min-h-16 w-full rounded-md border border-input bg-background p-2 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      value={row.en}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, en: event.target.value } : item,
                          ),
                        )
                      }
                      className="min-h-16 w-full rounded-md border border-input bg-background p-2 text-xs"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GeometryPanel({
  items,
  capabilities,
}: {
  items: Array<Record<string, unknown>>;
  capabilities?: AdminCapabilitiesResponse;
}) {
  const { t } = useI18n();
  const canValidate = capabilityAllows(capabilities?.capabilities, "geometry", "POST");
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "validate" | "rebuild" }) =>
      adminRequest(`${ADMIN_RESOURCES.geometry}/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
      }),
    onSuccess: () => toast.success(t("admin.updated")),
    onError: (error) =>
      toast.error(t("admin.failed"), {
        description: error instanceof Error ? error.message : undefined,
      }),
  });

  return (
    <div className="space-y-5">
      <PanelHeading title={t("admin.geometry")} body={t("admin.mode.help")} />
      <div className="overflow-hidden rounded-xl border border-panel-border bg-panel">
        <div className="grid grid-cols-[minmax(0,1fr)_110px_170px] border-b border-panel-border bg-surface-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>{t("admin.products")}</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div className="max-h-[680px] overflow-auto">
          {items.map((item) => {
            const id = String(item.id ?? item.sourceId ?? item.source_id ?? "");
            const quality = String(item.geometryQuality ?? item.geometry_quality ?? "unknown");
            return (
              <div
                key={id}
                className="grid grid-cols-[minmax(0,1fr)_110px_170px] items-center gap-2 border-b border-panel-border/60 px-4 py-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{String(item.name ?? id)}</p>
                  <p className="truncate font-mono text-[9px] text-muted-foreground">{id}</p>
                </div>
                <StatusPill
                  enabled={!/missing|unsupported|broken/i.test(quality)}
                  label={quality}
                />
                <div className="flex gap-1">
                  <button
                    disabled={!canValidate || mutation.isPending}
                    onClick={() => mutation.mutate({ id, action: "validate" })}
                    className="rounded-md border border-input px-2 py-1 text-[10px] disabled:opacity-35"
                  >
                    {t("action.validate")}
                  </button>
                  <button
                    disabled={!canValidate || mutation.isPending}
                    onClick={() => mutation.mutate({ id, action: "rebuild" })}
                    className="rounded-md border border-input px-2 py-1 text-[10px] disabled:opacity-35"
                  >
                    {t("action.rebuild")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GenericResourcePanel({
  moduleId,
  capabilities,
}: {
  moduleId: ModuleId;
  capabilities?: AdminCapabilitiesResponse;
}) {
  const { t } = useI18n();
  const module = MODULES.find((item) => item.id === moduleId);
  const resource = module?.resource;
  const endpoint = resource ? ADMIN_RESOURCES[resource] : "";
  const canRead = resource ? capabilityAllows(capabilities?.capabilities, resource, "GET") : false;
  const canPatch = resource
    ? capabilityAllows(capabilities?.capabilities, resource, "PATCH")
    : false;
  const query = useQuery({
    queryKey: ["admin", resource],
    queryFn: () => adminRequest(endpoint),
    enabled: Boolean(endpoint && canRead),
    retry: false,
  });

  return (
    <div className="space-y-5">
      <PanelHeading
        title={module ? t(module.labelKey) : t("admin.selectModule")}
        body={t("admin.mode.help")}
      />
      {!canRead ? (
        <UnavailableCapability />
      ) : query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("status.loading")}
        </div>
      ) : (
        <JsonEditorCard
          title={module ? t(module.labelKey) : "Resource"}
          value={query.data ?? {}}
          endpoint={endpoint}
          method="PATCH"
          enabled={canPatch}
        />
      )}
      {moduleId === "assets" && (
        <div className="rounded-xl border border-dashed border-panel-border bg-panel p-8 text-center">
          <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">{t("action.upload")}</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, SVG, PDF, GLB, HDR, JSON</p>
          <button
            disabled={!capabilityAllows(capabilities?.capabilities, "assets", "POST")}
            className="studio-secondary-button mt-4 disabled:opacity-40"
          >
            {t("action.upload")}
          </button>
        </div>
      )}
    </div>
  );
}

function JsonEditorCard({
  title,
  value,
  endpoint,
  method,
  enabled,
}: {
  title: string;
  value: unknown;
  endpoint: string;
  method: "POST" | "PATCH" | "PUT";
  enabled: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [sourceValue, setSourceValue] = useState(value);
  if (sourceValue !== value) {
    setSourceValue(value);
    setText(JSON.stringify(value, null, 2));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        throw new AdminApiError("Invalid JSON document.");
      }
      return adminRequest(endpoint, { method, body });
    },
    onSuccess: () => {
      toast.success(t("admin.updated"));
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) =>
      toast.error(t("admin.failed"), {
        description: error instanceof Error ? error.message : undefined,
      }),
  });

  return (
    <section className="h-fit overflow-hidden rounded-xl border border-panel-border bg-panel">
      <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground">{endpoint}</p>
        </div>
        <Braces className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="p-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("admin.rawEditor")}
        </label>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          className="mt-2 min-h-[360px] w-full resize-y rounded-lg border border-input bg-surface-2 p-3 font-mono text-[10px] leading-5 outline-none focus:border-gold/50"
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={!enabled || mutation.isPending}
          className="studio-primary-button mt-3 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}{" "}
          {t("admin.saveChanges")}
        </button>
        {!enabled && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {t("admin.unsupported")}
          </p>
        )}
      </div>
    </section>
  );
}

function PanelHeading({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function StatusPill({ enabled, label }: { enabled: boolean; label?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold",
        enabled ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground",
      )}
    >
      {enabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label ?? (enabled ? t("status.online") : t("status.offline"))}
    </span>
  );
}

function UnavailableCapability() {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/10 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <LockKeyhole className="h-4 w-4" /> {t("status.readOnly")}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {t("admin.connectionRequired")} {t("admin.unsupported")}
      </p>
    </div>
  );
}
