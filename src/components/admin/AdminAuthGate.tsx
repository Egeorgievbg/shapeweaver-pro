import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AdminControlCenter } from "@/components/admin/AdminControlCenter";
import {
  ADMIN_RESOURCES,
  AdminApiError,
  adminRequest,
  type AdminSessionResponse,
} from "@/integrations/admin/client";
import { useI18n } from "@/lib/i18n";

export function AdminAuthGate() {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [accessKey, setAccessKey] = useState("");

  const session = useQuery({
    queryKey: ["admin", "session"],
    queryFn: () => adminRequest<AdminSessionResponse>(ADMIN_RESOURCES.session),
    retry: false,
    staleTime: 30_000,
  });

  const login = useMutation({
    mutationFn: () =>
      adminRequest<AdminSessionResponse>(ADMIN_RESOURCES.session, {
        method: "POST",
        body: { accessKey },
      }),
    onSuccess: async () => {
      setAccessKey("");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success(
        locale === "bg" ? "Успешен административен вход" : "Administrator sign-in successful",
      );
    },
    onError: (error) => {
      const status = error instanceof AdminApiError ? error.status : undefined;
      toast.error(
        status === 429
          ? locale === "bg"
            ? "Твърде много неуспешни опити. Опитайте по-късно."
            : "Too many failed attempts. Try again later."
          : locale === "bg"
            ? "Невалиден администраторски ключ"
            : "Invalid administrator access key",
      );
    },
  });

  const logout = useMutation({
    mutationFn: () =>
      adminRequest<AdminSessionResponse>(ADMIN_RESOURCES.session, { method: "DELETE" }),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["admin"] });
      await session.refetch();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (accessKey.trim()) login.mutate();
  };

  useEffect(() => {
    const applyDiagnosticsLabel = () => {
      const label = locale === "bg" ? "Техническа диагностика" : "Technical diagnostics";
      document.querySelectorAll("summary").forEach((summary) => {
        const value = summary.textContent?.trim();
        if (value === "Technical diagnostics" || value === "Техническа диагностика") {
          summary.textContent = label;
        }
      });
    };

    applyDiagnosticsLabel();
    const observer = new MutationObserver(applyDiagnosticsLabel);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  if (session.isLoading) {
    return (
      <div
        data-i18n-skip="true"
        className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-surface-2/45"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("status.loading")}
        </div>
      </div>
    );
  }

  const gatewayUnavailable = session.error instanceof AdminApiError && session.error.status === 503;

  if (gatewayUnavailable) {
    return (
      <div data-i18n-skip="true">
        <AdminControlCenter />
      </div>
    );
  }

  if (!session.data?.authenticated) {
    return (
      <div
        data-i18n-skip="true"
        className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-surface-2/45 px-4 py-12"
      >
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-2xl border border-panel-border bg-panel p-6 shadow-xl md:p-8"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
            GPTSBOXES · {locale === "bg" ? "Защитена зона" : "Secure area"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {locale === "bg" ? "Вход в администрацията" : "Administration sign in"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {locale === "bg"
              ? "Въведете сървърно конфигурирания администраторски ключ. Той се изпраща само към защитения шлюз от същия домейн и не се запазва в браузъра."
              : "Enter the server-configured administrator access key. It is sent only to the same-origin gateway and is never stored in the browser."}
          </p>

          <label className="mt-6 block text-xs font-medium">
            {locale === "bg" ? "Администраторски ключ" : "Administrator access key"}
            <span className="relative mt-2 block">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value)}
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-gold/50 focus:ring-4 focus:ring-gold/10"
                placeholder={locale === "bg" ? "Въведете ключ" : "Enter access key"}
                autoFocus
              />
            </span>
          </label>

          <button
            type="submit"
            disabled={!accessKey.trim() || login.isPending}
            className="studio-primary-button mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
          >
            {login.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {locale === "bg" ? "Влез" : "Sign in"}
          </button>

          {session.isError && (
            <p className="mt-4 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
              {locale === "bg"
                ? "Защитеният административен шлюз не отговори. Проверете сървърната конфигурация."
                : "The secure administration gateway did not respond. Check the server configuration."}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div data-i18n-skip="true" className="relative">
      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-lg border border-panel-border bg-panel px-3 py-2 text-xs font-medium shadow-lg hover:bg-accent disabled:opacity-50"
      >
        {logout.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
        {locale === "bg" ? "Изход от администрацията" : "Sign out"}
      </button>
      <AdminControlCenter />
    </div>
  );
}
