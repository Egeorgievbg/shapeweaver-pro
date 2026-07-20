const EXACT_BG: Record<string, string> = {
  simple: "Опростен",
  professional: "Професионален",
  Simple: "Опростен",
  Professional: "Професионален",
  Project: "Проект",
  Selection: "Избор",
  "Configuration inspector": "Инспектор на конфигурацията",
  "Live project summary and assembly state.":
    "Обобщение на проекта и състоянието на сглобяване в реално време.",
  "Panel-specific print and geometry context.": "Контекст за печат и геометрия на избрания панел.",
  Structure: "Конструкция",
  Finish: "Ефект",
  Progress: "Напредък",
  "Quote-ready configuration": "Конфигурация, готова за оферта",
  "The quote includes the structure, dimensions, material, finish, artwork manifest and preview state.":
    "Офертата включва конструкцията, размерите, материала, ефектите, дизайна и текущия визуален преглед.",
  Panels: "Панели",
  Folds: "Сгъвки",
  Warnings: "Предупреждения",
  "Replace structure": "Смени конструкцията",
  Diagnostics: "Диагностика",
  "Technical metadata": "Технически данни",
  "Source ID": "Изходен ID",
  Geometry: "Геометрия",
  "Panels / folds": "Панели / сгъвки",
  "Structure, technical health and product identity.":
    "Конструкция, техническо състояние и продуктова идентичност.",
  "Outer dimensions, board thickness and manufacturing limits.":
    "Външни размери, дебелина на материала и производствени ограничения.",
  "Board substrate, colour and physical surface response.":
    "Основа, цвят и физическо поведение на повърхността.",
  "Upload, assign and position print artwork by panel.":
    "Качване, задаване и позициониране на дизайна по панели.",
  "Lamination, foil, selective UV and emboss treatments.":
    "Ламинация, фолио, селективен UV лак и релефни ефекти.",
  "Lighting, background, camera and presentation settings.":
    "Осветление, фон, камера и настройки за представяне.",
  "Camera presets": "Позиции на камерата",
  "Studio environment": "Студийна среда",
  Preset: "Профил",
  Environment: "Среда",
  "Key light": "Основна светлина",
  "Fill light": "Запълваща светлина",
  "Rim light": "Контражур",
  Viewport: "3D изглед",
  "Contact shadows": "Контактни сенки",
  "Engineering grid": "Техническа решетка",
  "Dimension overlay": "Размерни линии",
  "Transparent background": "Прозрачен фон",
  Background: "Фон",
  Bottom: "Отдолу",
  Perspective: "Перспектива",
  "Studio light": "Светло студио",
  "Studio dark": "Тъмно студио",
  "Warm editorial": "Топъл editorial",
  "Cool technical": "Студен технически",
  Transparent: "Прозрачно",
  Compact: "Компактен",
  Current: "Текущ",
  Large: "Голям",
  "Outer dimensions": "Външни размери",
  "Length · L": "Дължина · L",
  "Width · W": "Ширина · W",
  "Height · H": "Височина · H",
  "Board thickness": "Дебелина на материала",
  "Configured size": "Зададен размер",
  "Values outside the manufacturing range are constrained by the source structure limits.":
    "Стойностите извън производствения диапазон се ограничават според изходната конструкция.",
  "Material presets": "Материали",
  "Surface response": "Повърхност",
  Roughness: "Грапавост",
  Metalness: "Металност",
  Colour: "Цвят",
  Color: "Цвят",
  "Inside colour": "Вътрешен цвят",
  "Edge colour": "Цвят на ръба",
  "Artwork layers": "Слоеве на дизайна",
  "Upload PNG or SVG": "Качи PNG или SVG",
  "No artwork layers yet": "Все още няма добавен дизайн",
  "Use transparent PNG or SVG files for the cleanest print preview.":
    "Използвайте прозрачен PNG или SVG за най-чист визуален преглед.",
  "No finish": "Без ефект",
  "Natural substrate response": "Естествено поведение на материала",
  "Matte lamination": "Матова ламинация",
  "Soft diffuse protection": "Мека матова защита",
  "Gloss lamination": "Гланцова ламинация",
  "High reflection and colour depth": "Силен блясък и наситен цвят",
  "Selective UV": "Селективен UV лак",
  "Gloss highlight on a mask": "Гланцов акцент по маска",
  "Gold foil": "Златно фолио",
  "Metallic hot-stamped layer": "Метализиран слой с топъл печат",
  "Silver foil": "Сребърно фолио",
  "Cool metallic layer": "Студен метализиран слой",
  Emboss: "Релеф",
  "Raised tactile relief": "Повдигнат тактилен релеф",
  "Finish previews are physically approximated. Production masks remain separate export layers.":
    "Прегледът на ефектите е физически апроксимиран. Производствените маски остават отделни export слоеве.",
  "Camera and presentation": "Камера и представяне",
  "No artwork assigned to this panel.": "Към този панел няма зададен дизайн.",
  "Artwork · 0": "Дизайн · 0",
  "Preparing packaging studio": "Подготовка на студиото за опаковки",
  "Product metadata": "Продуктови данни",
  "Dieline and panel relationships": "Дилайн и връзки между панелите",
  "3D geometry and materials": "3D геометрия и материали",
  "Artwork workspace": "Работна среда за дизайн",
  "The structure could not be loaded": "Конструкцията не можа да бъде заредена",
  "Retry structure": "Опитай отново",
  "Packaging structure library": "Каталог с конструкции за опаковки",
  "Choose a structure. Configure it in one connected workflow.":
    "Изберете конструкция и я конфигурирайте в един свързан процес.",
  "Search, filter and open a production-linked packaging template. Dimensions, dieline, artwork, 3D and quote data remain inside one project.":
    "Търсете, филтрирайте и отваряйте свързани с производството шаблони. Размерите, дилайнът, дизайнът, 3D изгледът и офертата остават в един проект.",
  "Search mailer, rigid, tuck end, display, FEFCO…":
    "Търси mailer, rigid, tuck end, display, FEFCO…",
  "Browse by construction": "Разгледай по конструкция",
  "Popular packaging families": "Популярни семейства опаковки",
  Structures: "Конструкции",
  "Linked editor": "Свързан редактор",
  Results: "Резултати",
  "Loading structures…": "Зареждане на конструкции…",
  "Catalog unavailable": "Каталогът е недостъпен",
  "matching structures": "намерени конструкции",
  Refine: "Филтриране",
  "Structure filters": "Филтри за конструкциите",
  "Product line": "Продуктова линия",
  All: "Всички",
  Family: "Семейство",
  Category: "Категория",
  "Ready to configure": "Готово за конфигуриране",
  Configure: "Конфигурирай",
  Filters: "Филтри",
  Library: "Каталог",
  "Show results": "Покажи резултатите",
  "Clear search": "Изчисти търсенето",
  "Close filters": "Затвори филтрите",
  "Toggle favorite": "Добави/премахни от любими",
  "Exact geometry": "Точна геометрия",
  "No structures match these filters": "Няма конструкции, които отговарят на филтрите",
  "Remove a filter or search for a broader packaging family.":
    "Премахнете филтър или потърсете по-общо семейство опаковки.",
  "Clear filters": "Изчисти филтрите",
  "Format capability matrix": "Матрица на форматите",
  "Native 3D formats": "Нативни 3D формати",
  "The 3D export contains the current folded pose.":
    "3D export-ът съдържа текущата сгъната поза.",
};

export function translateExtendedRuntimeText(text: string): string | undefined {
  const exact = EXACT_BG[text];
  if (exact) return exact;

  const warnings = text.match(/^(\d+) geometry diagnostics?$/);
  if (warnings) return `${warnings[1]} геометрични предупреждения`;

  const matching = text.match(/^(\d[\d,.]*) matching structures$/);
  if (matching) return `${matching[1]} намерени конструкции`;

  const templates = text.match(/^(\d[\d,.]*) templates$/);
  if (templates) return `${templates[1]} шаблона`;

  const layers = text.match(/^(\d+) layers?$/);
  if (layers) return `${layers[1]} ${layers[1] === "1" ? "слой" : "слоя"}`;

  const panelMap = text.match(/^Panel map · (\d+)$/);
  if (panelMap) return `Карта на панелите · ${panelMap[1]}`;

  const diagnosticsTitle = text.match(/^Diagnostics · (\d+)$/);
  if (diagnosticsTitle) return `Диагностика · ${diagnosticsTitle[1]}`;

  return undefined;
}
