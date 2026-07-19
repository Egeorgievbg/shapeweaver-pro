import { MESSAGES, translate, type TranslationValues, useI18n as useBaseI18n } from "@/lib/i18n";

export { MESSAGES };

const ADMIN_OVERRIDES: Record<"bg" | "en", Record<string, string>> = {
  bg: {
    "admin.capabilities": "Възможности на сървъра",
    "admin.endpoint": "Крайна точка",
    "admin.unsupported": "Сървърът не предоставя тази операция.",
    "admin.connectionRequired": "Необходим е активен BoxCraft API или прокси от същия домейн.",
    "admin.slug": "Системен адрес (slug)",
    "admin.technicalDiagnostics": "Техническа диагностика",
  },
  en: {
    "admin.technicalDiagnostics": "Technical diagnostics",
  },
};

export function useI18n() {
  const base = useBaseI18n();

  return {
    ...base,
    t: (key: string, values?: TranslationValues) => {
      const override = ADMIN_OVERRIDES[base.locale]?.[key];
      if (!override) return base.t(key, values);
      if (!values) return override;
      return override.replace(/\{(\w+)\}/g, (_, token: string) =>
        String(values[token] ?? `{${token}}`),
      );
    },
    translate: (key: string, values?: TranslationValues) =>
      ADMIN_OVERRIDES[base.locale]?.[key] ?? translate(key, base.locale, values),
  };
}
