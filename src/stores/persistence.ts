const KEY_CONFIGS = "gptsboxes:saved-configurations:v1";
const KEY_QUOTES = "gptsboxes:quote-drafts:v1";
const KEY_THEME = "gptsboxes:theme";
const KEY_LOCALE = "gptsboxes:locale";

export interface SavedConfiguration {
  id: string;
  name: string;
  updatedAt: string;
  payload: string;
  thumbnail?: string;
}

function readList<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (error) {
    console.warn("persist write failed", error);
  }
}

export const savedConfigs = {
  list(): SavedConfiguration[] {
    return readList<SavedConfiguration>(KEY_CONFIGS).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  },
  upsert(entry: SavedConfiguration) {
    const list = readList<SavedConfiguration>(KEY_CONFIGS);
    const index = list.findIndex((configuration) => configuration.id === entry.id);
    if (index >= 0) list[index] = entry;
    else list.push(entry);
    writeList(KEY_CONFIGS, list);
  },
  remove(id: string) {
    const list = readList<SavedConfiguration>(KEY_CONFIGS).filter(
      (configuration) => configuration.id !== id,
    );
    writeList(KEY_CONFIGS, list);
  },
  get(id: string) {
    return readList<SavedConfiguration>(KEY_CONFIGS).find(
      (configuration) => configuration.id === id,
    );
  },
};

export interface QuoteDraft {
  id: string;
  createdAt: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  quantity: number;
  deadline?: string;
  notes?: string;
  configurationPayload: string;
  previewDataUrl?: string;
  sourceProductId?: string | null;
  status: "draft" | "submitted" | "failed";
}

export const quoteDrafts = {
  list(): QuoteDraft[] {
    return readList<QuoteDraft>(KEY_QUOTES).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  add(draft: QuoteDraft) {
    const list = readList<QuoteDraft>(KEY_QUOTES);
    list.push(draft);
    writeList(KEY_QUOTES, list);
  },
  remove(id: string) {
    writeList(
      KEY_QUOTES,
      readList<QuoteDraft>(KEY_QUOTES).filter((quote) => quote.id !== id),
    );
  },
};

export const preferences = {
  getTheme(): "light" | "dark" {
    if (typeof localStorage === "undefined") return "light";
    return (localStorage.getItem(KEY_THEME) as "light" | "dark" | null) ?? "light";
  },
  setTheme(theme: "light" | "dark") {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY_THEME, theme);
  },
  getLocale(): "bg" | "en" {
    if (typeof localStorage === "undefined") return "bg";
    return (localStorage.getItem(KEY_LOCALE) as "bg" | "en" | null) ?? "bg";
  },
  setLocale(locale: "bg" | "en") {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY_LOCALE, locale);
  },
};
