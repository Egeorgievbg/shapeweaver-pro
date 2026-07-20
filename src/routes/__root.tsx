import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import studioCss from "../studio.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppHeader } from "@/components/shell/AppHeader";
import { RuntimeLocalizationBridge } from "@/components/i18n/RuntimeLocalizationBridge";
import { useI18n } from "@/lib/i18n";

function NotFoundComponent() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("root.notFound.eyebrow")}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-foreground">{t("root.notFound.title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("root.notFound.body")}</p>
        <Link to="/" className="studio-primary-button mt-6 justify-center">
          {t("root.notFound.back")}
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-destructive">
          {t("root.error.eyebrow")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold">{t("root.error.title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error.message || t("root.error.body")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="studio-primary-button"
          >
            {t("root.error.retry")}
          </button>
          <Link to="/" className="studio-secondary-button">
            {t("nav.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "GPTSBOXES — 3D Packaging Studio / 3D студио за опаковки" },
      {
        name: "description",
        content:
          "Professional bilingual 3D packaging studio for catalog browsing, dimensions, materials, artwork, dielines, visualization, export, and administration.",
      },
      { name: "author", content: "GPTSBOXES" },
      { name: "theme-color", content: "#f6f7f8" },
      { property: "og:title", content: "GPTSBOXES — 3D Packaging Studio" },
      {
        property: "og:description",
        content: "Design, visualize, manage, and quote custom packaging in Bulgarian or English.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: studioCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { locale } = useI18n();
  return (
    <QueryClientProvider client={queryClient}>
      <RuntimeLocalizationBridge />
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </div>
      <Toaster
        position="top-right"
        theme="system"
        richColors
        closeButton
        toastOptions={{
          ariaProps: {
            role: "status",
            "aria-live": "polite",
          },
        }}
        key={locale}
      />
    </QueryClientProvider>
  );
}
