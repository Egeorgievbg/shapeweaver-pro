import { Link, useRouterState } from "@tanstack/react-router";
import { Boxes, ChevronDown, Languages, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isStudio = pathname.startsWith("/studio/") && pathname !== "/studio/";

  const nav = [
    { to: "/library", label: t("nav.library") },
    { to: "/studio", label: t("nav.studio") },
    { to: "/configurations", label: t("nav.saved") },
    { to: "/admin/data", label: t("nav.admin") },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-panel-border bg-panel/92 px-3 backdrop-blur-xl md:px-5",
        isStudio && "h-12",
      )}
    >
      <Link to="/" className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Boxes className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold tracking-tight">{t("app.name")}</span>
          {!isStudio && (
            <span className="hidden truncate text-[10px] text-muted-foreground sm:block">
              {t("app.tagline")}
            </span>
          )}
        </span>
      </Link>

      {!isStudio && (
        <nav className="ml-3 hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-accent text-foreground" }}
              className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {!isStudio && (
        <Link
          to="/library"
          className="ml-auto hidden w-full max-w-xs items-center gap-2 rounded-lg border border-input bg-surface-2 px-3 py-2 text-xs text-muted-foreground lg:flex"
        >
          <Search className="h-3.5 w-3.5" /> Search packaging structures
        </Link>
      )}

      <div className={cn("flex items-center gap-1", isStudio ? "ml-auto" : "ml-auto lg:ml-2")}>
        <button
          onClick={() => setLocale(locale === "en" ? "bg" : "en")}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Toggle language"
        >
          <Languages className="h-3.5 w-3.5" /> {locale}
          <ChevronDown className="h-3 w-3" />
        </button>
        <button onClick={toggle} className="studio-icon-button" aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
