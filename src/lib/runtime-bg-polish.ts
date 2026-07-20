const POLISH_BG: Record<string, string> = {
  "Surface controls": "Настройки на повърхността",
  "Base colour": "Основен цвят",
  Clearcoat: "Защитен лак",
  "Active substrate:": "Активен материал:",
  "Drop artwork or browse": "Пуснете файл тук или изберете от устройството",
  "PNG, JPG, WebP or SVG · maximum 12 MB": "PNG, JPG, WebP или SVG · до 12 MB",
  "Upload target": "Зона за поставяне",
  "All panels": "Всички панели",
  "No artwork layers": "Няма слоеве с дизайн",
  "Upload a print file and assign it to a panel or the full dieline.":
    "Качете файл за печат и го задайте към панел или към целия дилайн.",
  Panel: "Панел",
  "Print side": "Страна за печат",
  Outside: "Отвън",
  Inside: "Отвътре",
  Scale: "Мащаб",
  Rotation: "Завъртане",
  Opacity: "Прозрачност",
  "Move up": "Премести нагоре",
  "Move down": "Премести надолу",
  Mailer: "Куриерски кутии",
  "Folding carton": "Сгъваем картон",
  Rigid: "Твърди кутии",
  Display: "Дисплейни кутии",
  Carrier: "Кутии с дръжка",
  "E-commerce": "Електронна търговия",
  Retail: "Търговски опаковки",
  Gift: "Подаръчни опаковки",
  "Food & gifts": "Храни и подаръци",
  Kraft: "Крафт картон",
  Greyboard: "Мукава",
  "E-flute": "Микровелпапе E",
  "qa-fixture": "ДЕМО",
  unverified: "НЕПОТВЪРДЕН",
  "knife-rig": "Точна сгъваема геометрия",
  "recorded-animation": "Записана анимация",
  "geometry-only": "Точна статична геометрия",
  "diagnostic-fallback": "Диагностичен модел",
  none: "Без ефект",
  matte: "Матова ламинация",
  gloss: "Гланцова ламинация",
  "spot-uv": "Селективен UV лак",
  "gold-foil": "Златно фолио",
  "silver-foil": "Сребърно фолио",
  emboss: "Релеф",
  demo_sqlite_not_production_data: "Демо конструкция — не е одобрена за производство.",
  qa_fixture_not_production_data: "Демо конструкция — не е одобрена за производство.",
  "qa-fixture_not_production_data": "Демо конструкция — не е одобрена за производство.",
  "production_status:unverified": "Производствен статус: непотвърден.",
  "material:mailer-001": "Крафт картон",
  "material:tuck-001": "GC1 картон",
  "material:rigid-001": "Мукава",
  "material:display-001": "Микровелпапе E",
  "material:gable-001": "Крафт картон",
};

function part(value: string) {
  const clean = value.trim();
  return POLISH_BG[clean] ?? clean;
}

export function translatePolishedRuntimeText(text: string): string | undefined {
  const exact = POLISH_BG[text];
  if (exact) return exact;

  const templates = text.match(/^(\d[\d,.]*) templates?$/);
  if (templates) return `${templates[1]} ${templates[1] === "1" ? "шаблон" : "шаблона"}`;

  const metadata = text.match(/^(.+?) · (.+?) · (mm|cm|in)$/);
  if (metadata) return `${part(metadata[1])} · ${part(metadata[2])} · ${metadata[3]}`;

  const geometry = text.match(/^Geometry:\s*(.+)$/);
  if (geometry) return `Геометрия: ${part(geometry[1])}`;

  return undefined;
}
