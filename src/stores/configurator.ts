import { create } from "zustand";
import type {
  Dimensions,
  NormalizedPackagingModel,
  PackagingMaterial,
} from "@/integrations/boxcraft/types";

export type ViewMode = "3d" | "2d" | "split";
export type CameraPreset =
  | "perspective"
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "isometric";

export type ScenePreset = "studio-light" | "studio-dark" | "warm" | "cool" | "transparent";

export interface ArtworkLayer {
  id: string;
  name: string;
  dataUrl: string;
  panelId: string | "all";
  side: "outside" | "inside";
  offset: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  order: number;
}

export interface SceneSettings {
  preset: ScenePreset;
  environmentIntensity: number;
  keyLightIntensity: number;
  fillLightIntensity: number;
  rimLightIntensity: number;
  contactShadows: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  backgroundColor: string;
  transparentBackground: boolean;
}

export interface MaterialState {
  presetId: string;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  effect: "none" | "matte" | "gloss" | "spot-uv" | "gold-foil" | "silver-foil" | "emboss";
}

interface HistoryEntry {
  dimensions: Dimensions;
  material: MaterialState;
  artworkLayers: ArtworkLayer[];
  foldProgress: number;
  selectedPanelId: string | null;
}

interface State {
  productModel: NormalizedPackagingModel | null;
  selectedProductId: string | null;
  dimensions: Dimensions;
  material: MaterialState;
  availableMaterials: PackagingMaterial[];
  artworkLayers: ArtworkLayer[];
  foldProgress: number;
  selectedPanelId: string | null;
  viewMode: ViewMode;
  cameraPreset: CameraPreset;
  scene: SceneSettings;
  isDirty: boolean;
  history: HistoryEntry[];
  historyIndex: number;

  loadProduct: (m: NormalizedPackagingModel) => void;
  clearProduct: () => void;
  setDimensions: (d: Partial<Dimensions>) => void;
  setMaterial: (m: Partial<MaterialState>) => void;
  setFoldProgress: (v: number) => void;
  setViewMode: (v: ViewMode) => void;
  setCameraPreset: (p: CameraPreset) => void;
  setScene: (s: Partial<SceneSettings>) => void;
  selectPanel: (id: string | null) => void;
  addArtwork: (a: Omit<ArtworkLayer, "id" | "order">) => void;
  updateArtwork: (id: string, patch: Partial<ArtworkLayer>) => void;
  removeArtwork: (id: string) => void;
  reorderArtwork: (id: string, direction: "up" | "down") => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  pushHistory: () => void;
  loadConfiguration: (json: string) => void;
  exportConfiguration: () => string;
}

const defaultDimensions: Dimensions = { width: 200, depth: 100, height: 60, unit: "mm", thickness: 1.5 };

const defaultMaterial: MaterialState = {
  presetId: "coated-white",
  color: "#f5f2ea",
  roughness: 0.72,
  metalness: 0.02,
  clearcoat: 0,
  clearcoatRoughness: 0.3,
  effect: "matte",
};

const defaultScene: SceneSettings = {
  preset: "studio-light",
  environmentIntensity: 0.9,
  keyLightIntensity: 1.2,
  fillLightIntensity: 0.5,
  rimLightIntensity: 0.6,
  contactShadows: true,
  showGrid: false,
  showDimensions: false,
  backgroundColor: "#eeeeee",
  transparentBackground: false,
};

export const useConfiguratorStore = create<State>((set, get) => ({
  productModel: null,
  selectedProductId: null,
  dimensions: defaultDimensions,
  material: defaultMaterial,
  availableMaterials: [],
  artworkLayers: [],
  foldProgress: 1,
  selectedPanelId: null,
  viewMode: "3d",
  cameraPreset: "perspective",
  scene: defaultScene,
  isDirty: false,
  history: [],
  historyIndex: -1,

  loadProduct: (m) =>
    set({
      productModel: m,
      selectedProductId: m.sourceId,
      dimensions: m.dimensions,
      availableMaterials: m.materials,
      material: {
        ...defaultMaterial,
        color: m.materials[0]?.color ?? defaultMaterial.color,
        roughness: m.materials[0]?.roughness ?? defaultMaterial.roughness,
        metalness: m.materials[0]?.metalness ?? defaultMaterial.metalness,
        presetId: m.materials[0]?.id ?? defaultMaterial.presetId,
      },
      artworkLayers: [],
      foldProgress: 1,
      selectedPanelId: null,
      history: [],
      historyIndex: -1,
      isDirty: false,
    }),

  clearProduct: () => set({ productModel: null, selectedProductId: null }),

  setDimensions: (d) => {
    set((s) => ({ dimensions: { ...s.dimensions, ...d }, isDirty: true }));
    get().pushHistory();
  },

  setMaterial: (m) => {
    set((s) => ({ material: { ...s.material, ...m }, isDirty: true }));
  },

  setFoldProgress: (v) => set({ foldProgress: Math.min(1, Math.max(0, v)) }),
  setViewMode: (v) => set({ viewMode: v }),
  setCameraPreset: (p) => set({ cameraPreset: p }),
  setScene: (patch) => set((s) => ({ scene: { ...s.scene, ...patch } })),
  selectPanel: (id) => set({ selectedPanelId: id }),

  addArtwork: (a) => {
    set((s) => ({
      artworkLayers: [
        ...s.artworkLayers,
        { ...a, id: crypto.randomUUID(), order: s.artworkLayers.length },
      ],
      isDirty: true,
    }));
  },

  updateArtwork: (id, patch) =>
    set((s) => ({
      artworkLayers: s.artworkLayers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      isDirty: true,
    })),

  removeArtwork: (id) =>
    set((s) => {
      const layer = s.artworkLayers.find((l) => l.id === id);
      if (layer?.dataUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(layer.dataUrl); } catch { /* noop */ }
      }
      return { artworkLayers: s.artworkLayers.filter((l) => l.id !== id), isDirty: true };
    }),

  reorderArtwork: (id, direction) =>
    set((s) => {
      const idx = s.artworkLayers.findIndex((l) => l.id === id);
      if (idx < 0) return s;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= s.artworkLayers.length) return s;
      const next = [...s.artworkLayers];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { artworkLayers: next.map((l, i) => ({ ...l, order: i })), isDirty: true };
    }),

  pushHistory: () => {
    const s = get();
    const entry: HistoryEntry = {
      dimensions: s.dimensions,
      material: s.material,
      artworkLayers: s.artworkLayers,
      foldProgress: s.foldProgress,
      selectedPanelId: s.selectedPanelId,
    };
    const trimmed = s.history.slice(0, s.historyIndex + 1);
    trimmed.push(entry);
    set({ history: trimmed.slice(-50), historyIndex: Math.min(trimmed.length - 1, 49) });
  },

  undo: () => {
    const s = get();
    if (s.historyIndex <= 0) return;
    const entry = s.history[s.historyIndex - 1];
    set({ ...entry, historyIndex: s.historyIndex - 1 });
  },

  redo: () => {
    const s = get();
    if (s.historyIndex >= s.history.length - 1) return;
    const entry = s.history[s.historyIndex + 1];
    set({ ...entry, historyIndex: s.historyIndex + 1 });
  },

  reset: () => set({
    dimensions: defaultDimensions,
    material: defaultMaterial,
    artworkLayers: [],
    foldProgress: 1,
    selectedPanelId: null,
    scene: defaultScene,
    isDirty: false,
    history: [],
    historyIndex: -1,
  }),

  loadConfiguration: (json) => {
    try {
      const c = JSON.parse(json);
      set((s) => ({
        dimensions: c.dimensions ?? s.dimensions,
        material: c.material ?? s.material,
        artworkLayers: c.artworkLayers ?? [],
        foldProgress: c.foldProgress ?? s.foldProgress,
        scene: { ...s.scene, ...(c.scene ?? {}) },
        isDirty: false,
      }));
    } catch (err) {
      console.error("Configuration load failed", err);
    }
  },

  exportConfiguration: () => {
    const s = get();
    return JSON.stringify(
      {
        schemaVersion: "1.0.0",
        sourceSystem: "boxcraft_visualization_api",
        sourceProductId: s.selectedProductId,
        productSnapshot: s.productModel
          ? { id: s.productModel.id, name: s.productModel.name, family: s.productModel.family }
          : null,
        dimensions: s.dimensions,
        material: s.material,
        artworkLayers: s.artworkLayers,
        scene: s.scene,
        foldProgress: s.foldProgress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  },
}));
