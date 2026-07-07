import { useState } from "react";
import { preferences } from "@/stores/persistence";

type Locale = "bg" | "en";

const dict: Record<Locale, Record<string, string>> = {
  en: {
    "app.name": "GPTSBOXES",
    "app.tagline": "3D Packaging Studio",
    "nav.studio": "Studio",
    "nav.library": "Library",
    "nav.saved": "Saved",
    "nav.admin": "Admin",
    "action.export": "Export",
    "action.quote": "Request quote",
    "action.save": "Save",
    "action.undo": "Undo",
    "action.redo": "Redo",
    "action.reset": "Reset",
    "action.back": "Back to library",
    "studio.empty.title": "Pick a product to begin",
    "studio.empty.body": "Choose a package from the library to open it in the 3D studio.",
    "studio.loading": "Preparing model…",
    "studio.viewMode.3d": "3D",
    "studio.viewMode.2d": "Dieline",
    "studio.viewMode.split": "Split",
    "tab.models": "Models",
    "tab.artwork": "Artwork",
    "tab.materials": "Materials",
    "tab.dieline": "Dieline",
    "tab.saved": "Saved",
    "tab.layers": "Layers",
    "inspector.product": "Product",
    "inspector.dimensions": "Dimensions",
    "inspector.material": "Material",
    "inspector.artwork": "Artwork",
    "inspector.fold": "Fold / open",
    "inspector.scene": "Scene",
    "inspector.export": "Export",
    "filter.search": "Search products",
    "filter.family": "Family",
    "filter.category": "Category",
    "filter.material": "Material",
    "filter.clear": "Clear filters",
    "error.api": "The API is currently unreachable.",
    "error.retry": "Retry",
  },
  bg: {
    "app.name": "GPTSBOXES",
    "app.tagline": "3D Студио за опаковки",
    "nav.studio": "Студио",
    "nav.library": "Каталог",
    "nav.saved": "Запазени",
    "nav.admin": "Админ",
    "action.export": "Експорт",
    "action.quote": "Запитване",
    "action.save": "Запази",
    "action.undo": "Назад",
    "action.redo": "Напред",
    "action.reset": "Нулирай",
    "action.back": "Към каталога",
    "studio.empty.title": "Изберете продукт",
    "studio.empty.body": "Изберете опаковка от каталога, за да я отворите в 3D студиото.",
    "studio.loading": "Зареждане на модел…",
    "studio.viewMode.3d": "3D",
    "studio.viewMode.2d": "Дилайн",
    "studio.viewMode.split": "Двоен",
    "tab.models": "Модели",
    "tab.artwork": "Артуърк",
    "tab.materials": "Материали",
    "tab.dieline": "Дилайн",
    "tab.saved": "Запазени",
    "tab.layers": "Слоеве",
    "inspector.product": "Продукт",
    "inspector.dimensions": "Размери",
    "inspector.material": "Материал",
    "inspector.artwork": "Артуърк",
    "inspector.fold": "Сгъване",
    "inspector.scene": "Сцена",
    "inspector.export": "Експорт",
    "filter.search": "Търси продукти",
    "filter.family": "Семейство",
    "filter.category": "Категория",
    "filter.material": "Материал",
    "filter.clear": "Изчисти филтрите",
    "error.api": "API-то е недостъпно в момента.",
    "error.retry": "Опитай отново",
  },
};

let currentLocale: Locale = preferences.getLocale();
const listeners = new Set<() => void>();

export function useI18n() {
  const [, force] = useState(0);
  useState(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => listeners.delete(cb);
  });
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
