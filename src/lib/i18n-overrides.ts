import { MESSAGES } from "@/lib/i18n";

/**
 * Focused terminology overrides kept separate from the base dictionary so the
 * administration vocabulary can evolve without coupling it to the legacy
 * runtime translation map.
 */
Object.assign(MESSAGES.bg, {
  "admin.capabilities": "Възможности на сървъра",
  "admin.endpoint": "Крайна точка",
  "admin.unsupported": "Сървърът не предоставя тази операция.",
  "admin.connectionRequired":
    "Необходим е активен BoxCraft API или прокси от същия домейн.",
  "admin.slug": "Системен адрес (slug)",
  "admin.technicalDiagnostics": "Техническа диагностика",
});

Object.assign(MESSAGES.en, {
  "admin.technicalDiagnostics": "Technical diagnostics",
});
