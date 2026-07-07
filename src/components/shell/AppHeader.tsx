import { Link, useRouterState } from "@tanstack/react-router";
import { Boxes, Moon, Sun, Languages, Github } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
        "sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-panel-border bg-surface/85 px-4 backdrop-blur",
        isStudio && "h-12",
      )}
    >
      <Link to="/" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gold text-gold-foreground">
          <Boxes className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-semibold tracking-tight">{t("app.name")}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{t("app.tagline")}</span>
        </div>
      </Link>

      <nav className="ml-4 hidden items-center gap-1 md:flex">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => setLocale(locale === "en" ? "bg" : "en")}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-mono uppercase text-muted-foreground hover:bg-accent"
          aria-label="Toggle language"
        >
          <Languages className="h-3.5 w-3.5" /> {locale}
        </button>
        <button
          onClick={toggle}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <a
          href="https://constrictive-aspen-nonregimental.ngrok-free.dev/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-2 text-muted-foreground hover:bg-accent"
          aria-label="API docs"
        >
          <Github className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
