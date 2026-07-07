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
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppHeader } from "@/components/shell/AppHeader";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Error 404</p>
        <h1 className="mt-3 text-4xl font-semibold text-foreground">Route not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you were looking for isn't part of the studio.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Back to studio
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-destructive">Runtime error</p>
        <h1 className="mt-3 text-2xl font-semibold">Something interrupted the studio</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Retry
          </button>
          <Link
            to="/"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Home
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GPTSBOXES — 3D Packaging Studio" },
      {
        name: "description",
        content:
          "Professional 3D packaging design studio: browse 1,600+ die-cut packaging templates, configure dimensions and materials, apply artwork, and export production-ready dielines.",
      },
      { name: "author", content: "GPTSBOXES" },
      { name: "theme-color", content: "#f5f2ea" },
      { property: "og:title", content: "GPTSBOXES — 3D Packaging Studio" },
      { property: "og:description", content: "Design, visualize, and export custom packaging in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />
        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
      </div>
      <Toaster position="top-right" theme="system" richColors closeButton />
    </QueryClientProvider>
  );
}
