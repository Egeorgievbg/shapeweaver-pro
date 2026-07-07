import { useEffect, useState } from "react";
import { preferences } from "@/stores/persistence";

type Locale = "bg" | "en";

const dict: Record<Locale, Record<string, string>> = {
  en: {
    // App shell
    "app.name": "GPTSBOXES",
    "app.tagline": "3D Packaging Studio",

    // Navigation
    "nav.studio": "Studio",
    "nav.library": "Library",
    "nav.saved": "Saved",
    "nav.admin": "Admin",

    // Common actions
    "action.export": "Export",
    "action.quote": "Request quote",
    "action.save": "Save",
    "action.undo": "Undo",
    "action.redo": "Redo",
    "action.reset": "Reset",
    "action.back": "Back to library",
    "action.cancel": "Cancel",
    "action.retry": "Retry",
    "action.open": "Open",

    // Studio empty state
    "studio.empty.title": "Pick a product to begin",
    "studio.empty.body": "Choose a package from the library to open it in the 3D studio.",
    "studio.empty.browse": "Browse library",
    "studio.loading": "Preparing model…",

    // Studio view modes
    "studio.viewMode.3d": "3D",
    "studio.viewMode.2d": "Dieline",
    "studio.viewMode.split": "Split",

    // Studio toolbar
    "studio.toolbar.unsaved": "• unsaved",
    "studio.toolbar.quote": "Request quote",

    // Left panel tabs
    "tab.models": "Models",
    "tab.artwork": "Artwork",
    "tab.materials": "Materials",
    "tab.dieline": "Dieline",
    "tab.saved": "Saved",
    "tab.layers": "Layers",

    // Models tab
    "models.currentProduct": "Current product",
    "models.changeProduct": "Change product",
    "models.sourceId": "Source ID",
    "models.family": "Family",
    "models.category": "Category",
    "models.strategy": "Strategy",
    "models.panels": "Panels",
    "models.folds": "Folds",
    "models.warnings": "Warnings",
    "models.warnings.none": "none",

    // Artwork tab
    "artwork.drop": "Drop artwork here",
    "artwork.formats": "PNG · JPG · WebP · SVG · max 12 MB",
    "artwork.noLayers": "No artwork yet.",
    "artwork.allPanels": "All panels",
    "artwork.panel": "Panel",
    "artwork.assignPanel": "Next upload will be assigned to panel",
    "artwork.scale": "Scale",
    "artwork.rotation": "Rotation",
    "artwork.opacity": "Opacity",

    // Layers tab
    "layers.panels": "Panels",

    // Materials tab
    "materials.presets": "Presets",
    "materials.color": "Color",
    "materials.roughness": "Roughness",
    "materials.metalness": "Metalness",
    "materials.clearcoat": "Clearcoat",

    // Dieline tab
    "dieline.tab.desc":
      "Open the dieline in the main viewport to inspect cut, fold, bleed and safe areas.",
    "dieline.tab.2dOnly": "2D only",
    "dieline.tab.split": "Split view",

    // Saved tab
    "saved.tab.desc": "Saved configurations live on the",
    "saved.tab.page": "Saved",

    // Inspector sections
    "inspector.product": "Product",
    "inspector.dimensions": "Dimensions",
    "inspector.material": "Material",
    "inspector.artwork": "Artwork",
    "inspector.fold": "Fold / open",
    "inspector.scene": "Scene",
    "inspector.camera": "Camera",
    "inspector.export": "Export",

    // Inspector – dimensions
    "inspector.dim.width": "Width (L)",
    "inspector.dim.depth": "Depth (W)",
    "inspector.dim.height": "Height (H)",
    "inspector.dim.thickness": "Thickness",
    "inspector.dim.knifeNote":
      "Dimensions currently update the size arrows only; live knife re-tessellation is queued.",

    // Inspector – fold
    "inspector.fold.progress": "Progress",
    "inspector.fold.flat": "Flat",
    "inspector.fold.closed": "Closed",

    // Inspector – scene
    "inspector.scene.preset": "Preset",
    "inspector.scene.environment": "Environment",
    "inspector.scene.keyLight": "Key light",
    "inspector.scene.fill": "Fill",
    "inspector.scene.rim": "Rim",
    "inspector.scene.shadows": "Shadows",
    "inspector.scene.grid": "Grid",
    "inspector.scene.transparentBg": "Transparent BG",
    "inspector.scene.background": "Background",

    // Scene presets
    "scene.studioLight": "Studio light",
    "scene.studioDark": "Studio dark",
    "scene.warm": "Warm",
    "scene.cool": "Cool",
    "scene.transparent": "Transparent",

    // Inspector – camera
    "inspector.camera.preset": "Preset",
    "inspector.camera.hint": "Drag to orbit · scroll to zoom · shift-drag to pan.",

    // Camera presets
    "camera.perspective": "Perspective",
    "camera.front": "Front",
    "camera.back": "Back",
    "camera.left": "Left",
    "camera.right": "Right",
    "camera.top": "Top",
    "camera.bottom": "Bottom",
    "camera.isometric": "Isometric",

    // Toast messages
    "toast.saved": "Configuration saved locally",

    // Catalog / library
    "catalog.loading": "Loading…",
    "catalog.failed": "Failed to load",
    "catalog.product": "product",
    "catalog.products": "products",
    "catalog.prev": "Prev",
    "catalog.next": "Next",
    "catalog.unavailable": "Catalog unavailable",
    "catalog.exact": "Exact",
    "catalog.previewOnly": "Preview only",

    // Filters
    "filter.search": "Search products",
    "filter.family": "Family",
    "filter.category": "Category",
    "filter.material": "Material",
    "filter.clear": "Clear filters",

    // Export dialog
    "export.title": "Export",
    "export.desc": "Save your configuration as an image, dieline, or configuration file.",
    "export.format.png": "PNG render",
    "export.format.svg": "SVG dieline",
    "export.format.json": "JSON config",
    "export.resolution": "Resolution",
    "export.transparent": "Transparent background",
    "export.svgNote":
      "SVG dieline is a preview export. It reflects the source knife data but has not been production-certified.",
    "export.download": "Export",
    "export.success.json": "Configuration exported",
    "export.success.dieline": "Dieline exported (preview quality — not production certified)",

    // Quote dialog
    "quote.title": "Request a quote",
    "quote.desc":
      "We'll attach your configuration, dimensions, material, and preview render to the request.",
    "quote.name": "Full name",
    "quote.company": "Company",
    "quote.phone": "Phone",
    "quote.email": "Email",
    "quote.quantity": "Quantity",
    "quote.deadline": "Deadline",
    "quote.notes": "Notes",
    "quote.notes.placeholder": "Print effects, colors, delivery details…",
    "quote.consent": "I agree to be contacted regarding this request.",
    "quote.notConfiguredNote":
      "The quote submission endpoint is not configured yet. Your request will be saved as a local draft until an endpoint is provided.",
    "quote.save": "Save as draft",
    "quote.saving": "Saving…",
    "quote.success": "Quote saved as draft",
    "quote.success.desc":
      "The quote endpoint is not configured yet, so we've stored your request locally.",

    // Dieline editor
    "dieline.noData": "No dieline data available for this product.",
    "dieline.fit": "Fit",
    "dieline.bleed": "Bleed",
    "dieline.labels": "Labels",
    "dieline.dimensions": "Dimensions",
    "dieline.hint": "Alt+drag to pan · scroll to zoom",
    "dieline.cut": "Cut",
    "dieline.fold": "Fold",

    // Configurations page
    "configs.title": "Saved configurations",
    "configs.subtitle": "Configurations are stored locally in this browser.",
    "configs.empty": "No saved configurations yet. Open a product in the studio and press Save.",
    "configs.source": "source",

    // Library page
    "library.badge": "Library",
    "library.title": "Packaging templates",
    "library.desc":
      "Every product is backed by real die-cut geometry from the BoxCraft visualization API. Pick one to open the studio.",

    // Landing page
    "landing.badge": "3D packaging studio",
    "landing.headline": "Design custom packaging in the browser.",
    "landing.body":
      "GPTSBOXES turns 1,600+ real die-cut templates into a live 3D configurator. Pick a construction, edit dimensions, drop in your artwork, and export a print-ready dieline or a photoreal render — no CAD required.",
    "landing.browseLibrary": "Browse library",
    "landing.openStudio": "Open studio",
    "landing.stat": "Live catalog: 1,665 curated packages · 9 families · 8 categories",
    "landing.feature.constructions.label": "1,600+ constructions",
    "landing.feature.constructions.desc": "Real die-cut geometry from the BoxCraft library.",
    "landing.feature.dieline.label": "Editable dieline",
    "landing.feature.dieline.desc": "Pan, zoom, and inspect every cut & fold line.",
    "landing.feature.artwork.label": "Artwork engine",
    "landing.feature.artwork.desc": "Drop PNG/SVG onto faces with live 3D preview.",
    "landing.feature.render.label": "Photoreal render",
    "landing.feature.render.desc": "PBR materials, HDRI lighting, PNG & GLB export.",

    // Studio product loading
    "studio.failedLoad": "Failed to load product",

    // Errors
    "error.api": "The API is currently unreachable.",
    "error.retry": "Retry",
  },

  bg: {
    // App shell
    "app.name": "GPTSBOXES",
    "app.tagline": "3D Студио за опаковки",

    // Navigation
    "nav.studio": "Студио",
    "nav.library": "Каталог",
    "nav.saved": "Запазени",
    "nav.admin": "Админ",

    // Common actions
    "action.export": "Експорт",
    "action.quote": "Запитване",
    "action.save": "Запази",
    "action.undo": "Отмени",
    "action.redo": "Повтори",
    "action.reset": "Нулирай",
    "action.back": "Към каталога",
    "action.cancel": "Отказ",
    "action.retry": "Опитай отново",
    "action.open": "Отвори",

    // Studio empty state
    "studio.empty.title": "Изберете продукт",
    "studio.empty.body": "Изберете опаковка от каталога, за да я отворите в 3D студиото.",
    "studio.empty.browse": "Прегледай каталога",
    "studio.loading": "Зареждане на модел…",

    // Studio view modes
    "studio.viewMode.3d": "3D",
    "studio.viewMode.2d": "Дилайн",
    "studio.viewMode.split": "Двоен",

    // Studio toolbar
    "studio.toolbar.unsaved": "• незапазено",
    "studio.toolbar.quote": "Запитване",

    // Left panel tabs
    "tab.models": "Модели",
    "tab.artwork": "Артуърк",
    "tab.materials": "Материали",
    "tab.dieline": "Дилайн",
    "tab.saved": "Запазени",
    "tab.layers": "Слоеве",

    // Models tab
    "models.currentProduct": "Текущ продукт",
    "models.changeProduct": "Смени продукт",
    "models.sourceId": "ID",
    "models.family": "Семейство",
    "models.category": "Категория",
    "models.strategy": "Стратегия",
    "models.panels": "Панели",
    "models.folds": "Сгъвания",
    "models.warnings": "Предупреждения",
    "models.warnings.none": "няма",

    // Artwork tab
    "artwork.drop": "Пуснете артуърк тук",
    "artwork.formats": "PNG · JPG · WebP · SVG · макс 12 МБ",
    "artwork.noLayers": "Няма добавен артуърк.",
    "artwork.allPanels": "Всички панели",
    "artwork.panel": "Панел",
    "artwork.assignPanel": "Следващото качване ще е за панел",
    "artwork.scale": "Мащаб",
    "artwork.rotation": "Завъртане",
    "artwork.opacity": "Прозрачност",

    // Layers tab
    "layers.panels": "Панели",

    // Materials tab
    "materials.presets": "Пресети",
    "materials.color": "Цвят",
    "materials.roughness": "Грапавост",
    "materials.metalness": "Металност",
    "materials.clearcoat": "Лак",

    // Dieline tab
    "dieline.tab.desc":
      "Отворете дилайна в основния прозорец, за да инспектирате линиите за рязане, сгъване, блийд и защитните зони.",
    "dieline.tab.2dOnly": "Само 2D",
    "dieline.tab.split": "Двоен изглед",

    // Saved tab
    "saved.tab.desc": "Запазените конфигурации се намират на страницата",
    "saved.tab.page": "Запазени",

    // Inspector sections
    "inspector.product": "Продукт",
    "inspector.dimensions": "Размери",
    "inspector.material": "Материал",
    "inspector.artwork": "Артуърк",
    "inspector.fold": "Сгъване",
    "inspector.scene": "Сцена",
    "inspector.camera": "Камера",
    "inspector.export": "Експорт",

    // Inspector – dimensions
    "inspector.dim.width": "Широчина (Д)",
    "inspector.dim.depth": "Дълбочина (Ш)",
    "inspector.dim.height": "Височина (В)",
    "inspector.dim.thickness": "Дебелина",
    "inspector.dim.knifeNote":
      "Размерите засега обновяват само размерните стрелки; живото преизчисляване е в разработка.",

    // Inspector – fold
    "inspector.fold.progress": "Прогрес",
    "inspector.fold.flat": "Плоско",
    "inspector.fold.closed": "Затворено",

    // Inspector – scene
    "inspector.scene.preset": "Пресет",
    "inspector.scene.environment": "Среда",
    "inspector.scene.keyLight": "Основна светлина",
    "inspector.scene.fill": "Запълваща",
    "inspector.scene.rim": "Контурна",
    "inspector.scene.shadows": "Сенки",
    "inspector.scene.grid": "Мрежа",
    "inspector.scene.transparentBg": "Прозрачен фон",
    "inspector.scene.background": "Фон",

    // Scene presets
    "scene.studioLight": "Студийна светлина",
    "scene.studioDark": "Тъмно студио",
    "scene.warm": "Топло",
    "scene.cool": "Студено",
    "scene.transparent": "Прозрачно",

    // Inspector – camera
    "inspector.camera.preset": "Пресет",
    "inspector.camera.hint": "Влачете за въртене · скрол за мащаб · shift+влачете за плъзгане.",

    // Camera presets
    "camera.perspective": "Перспектива",
    "camera.front": "Отпред",
    "camera.back": "Отзад",
    "camera.left": "Вляво",
    "camera.right": "Вдясно",
    "camera.top": "Отгоре",
    "camera.bottom": "Отдолу",
    "camera.isometric": "Изометрично",

    // Toast messages
    "toast.saved": "Конфигурацията е запазена локално",

    // Catalog / library
    "catalog.loading": "Зареждане…",
    "catalog.failed": "Грешка при зареждане",
    "catalog.product": "продукт",
    "catalog.products": "продукта",
    "catalog.prev": "Предишна",
    "catalog.next": "Следваща",
    "catalog.unavailable": "Каталогът е недостъпен",
    "catalog.exact": "Точен",
    "catalog.previewOnly": "Само преглед",

    // Filters
    "filter.search": "Търси продукти",
    "filter.family": "Семейство",
    "filter.category": "Категория",
    "filter.material": "Материал",
    "filter.clear": "Изчисти филтрите",

    // Export dialog
    "export.title": "Експорт",
    "export.desc": "Запазете конфигурацията като изображение, дилайн или конфигурационен файл.",
    "export.format.png": "PNG рендър",
    "export.format.svg": "SVG дилайн",
    "export.format.json": "JSON конфиг",
    "export.resolution": "Резолюция",
    "export.transparent": "Прозрачен фон",
    "export.svgNote":
      "SVG дилайнът е само за преглед. Отразява данните от шаблона, но не е сертифициран за производство.",
    "export.download": "Изтегли",
    "export.success.json": "Конфигурацията е изтеглена",
    "export.success.dieline": "Дилайнът е изтеглен (качество за преглед — не е сертифициран)",

    // Quote dialog
    "quote.title": "Запитване за оферта",
    "quote.desc": "Ще прикачим конфигурацията, размерите, материала и рендъра към запитването.",
    "quote.name": "Пълно име",
    "quote.company": "Компания",
    "quote.phone": "Телефон",
    "quote.email": "Имейл",
    "quote.quantity": "Количество",
    "quote.deadline": "Срок",
    "quote.notes": "Бележки",
    "quote.notes.placeholder": "Ефекти на печат, цветове, детайли за доставка…",
    "quote.consent": "Съгласен/а съм да бъда контактуван/а относно тази заявка.",
    "quote.notConfiguredNote":
      "Крайната точка за изпращане на оферти не е конфигурирана. Заявката ще бъде запазена локално.",
    "quote.save": "Запази като чернова",
    "quote.saving": "Запазване…",
    "quote.success": "Запитването е запазено като чернова",
    "quote.success.desc": "Крайната точка не е конфигурирана — заявката е запазена локално.",

    // Dieline editor
    "dieline.noData": "Няма данни за дилайн за този продукт.",
    "dieline.fit": "Вмести",
    "dieline.bleed": "Блийд",
    "dieline.labels": "Надписи",
    "dieline.dimensions": "Размери",
    "dieline.hint": "Alt+влачете за плъзгане · скрол за мащаб",
    "dieline.cut": "Рязане",
    "dieline.fold": "Сгъване",

    // Configurations page
    "configs.title": "Запазени конфигурации",
    "configs.subtitle": "Конфигурациите се съхраняват локално в браузъра.",
    "configs.empty": "Няма запазени конфигурации. Отворете продукт в студиото и натиснете Запази.",
    "configs.source": "ид",

    // Library page
    "library.badge": "Каталог",
    "library.title": "Шаблони за опаковки",
    "library.desc":
      "Всеки продукт е подкрепен от реална геометрия от BoxCraft visualization API. Изберете един, за да отворите студиото.",

    // Landing page
    "landing.badge": "3D студио за опаковки",
    "landing.headline": "Проектирайте персонализирани опаковки в браузъра.",
    "landing.body":
      "GPTSBOXES превръща над 1 600 реални шаблони за дилайн в жив 3D конфигуратор. Изберете конструкция, редактирайте размерите, добавете артуърк и експортирайте готов за печат дилайн или фотореалистичен рендър — без CAD.",
    "landing.browseLibrary": "Прегледай каталога",
    "landing.openStudio": "Отвори студиото",
    "landing.stat": "Жив каталог: 1 665 опаковки · 9 семейства · 8 категории",
    "landing.feature.constructions.label": "1 600+ конструкции",
    "landing.feature.constructions.desc": "Реална геометрия за дилайн от библиотеката BoxCraft.",
    "landing.feature.dieline.label": "Редактируем дилайн",
    "landing.feature.dieline.desc":
      "Плъзгайте, мащабирайте и инспектирайте всяка линия за рязане и сгъване.",
    "landing.feature.artwork.label": "Артуърк енджин",
    "landing.feature.artwork.desc": "Пускайте PNG/SVG върху повърхности с жив 3D преглед.",
    "landing.feature.render.label": "Фотореалистичен рендър",
    "landing.feature.render.desc": "PBR материали, HDRI осветление, PNG & GLB експорт.",

    // Studio product loading
    "studio.failedLoad": "Грешка при зареждане на продукт",

    // Errors
    "error.api": "API-то е недостъпно в момента.",
    "error.retry": "Опитай отново",
  },
};

let currentLocale: Locale = preferences.getLocale();
const listeners = new Set<() => void>();

export function useI18n() {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return {
    t: (key: string) => dict[currentLocale]?.[key] ?? dict.en[key] ?? key,
    locale: currentLocale,
    setLocale: (l: Locale) => {
      currentLocale = l;
      preferences.setLocale(l);
      listeners.forEach((fn) => fn());
    },
  };
}
