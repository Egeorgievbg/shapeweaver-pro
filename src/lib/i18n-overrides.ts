import { MESSAGES } from "@/lib/i18n";

const BG_OVERRIDES: Record<string, string> = {
  "admin.capabilities": "Възможности на сървъра",
  "admin.endpoint": "Крайна точка",
  "admin.unsupported": "Сървърът не предоставя тази операция.",
  "admin.connectionRequired": "Необходим е активен BoxCraft API или прокси от същия домейн.",
  "admin.slug": "Системен адрес (slug)",
  "admin.technicalDiagnostics": "Техническа диагностика",
  "export.title": "Експорт",
  "export.description": "Експортирайте текущата конфигурация, дилайн или реалната 3D поза.",
  "export.resolution": "Резолюция",
  "export.transparent": "Прозрачен фон",
  "export.native3d": "Нативни 3D формати",
  "export.capabilities": "Матрица на форматите",
  "export.currentPose": "3D export-ът съдържа текущата сгъната поза.",
  "export.previewDieline":
    "Дилайнът е непотвърден производствен preview, освен ако статусът не е approved.",
  "export.native": "Нативен",
  "export.serverConverted": "Сървърно конвертиране",
  "export.serverconverted": "Сървърно конвертиране",
  "export.conditional": "Условно",
  "export.unsupported": "Неподдържан",
  "export.success": "Файлът е експортиран.",
  "export.noDieline": "Няма наличен дилайн.",
  "export.viewportNotReady": "3D изгледът не е готов.",
};

const EN_OVERRIDES: Record<string, string> = {
  "admin.technicalDiagnostics": "Technical diagnostics",
  "export.title": "Export",
  "export.description": "Export the current configuration, dieline, or real 3D pose.",
  "export.resolution": "Resolution",
  "export.transparent": "Transparent background",
  "export.native3d": "Native 3D formats",
  "export.capabilities": "Format capability matrix",
  "export.currentPose": "The 3D export contains the current folded pose.",
  "export.previewDieline":
    "The dieline is an unverified production preview unless its status is approved.",
  "export.native": "Native",
  "export.serverConverted": "Server converted",
  "export.serverconverted": "Server converted",
  "export.conditional": "Conditional",
  "export.unsupported": "Unsupported",
  "export.success": "The file was exported.",
  "export.noDieline": "No dieline is available.",
  "export.viewportNotReady": "The 3D viewport is not ready.",
};

export function ensureI18nOverrides() {
  Object.assign(MESSAGES.bg, BG_OVERRIDES);
  Object.assign(MESSAGES.en, EN_OVERRIDES);
}

ensureI18nOverrides();
