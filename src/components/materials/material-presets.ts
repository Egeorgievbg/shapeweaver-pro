export interface MaterialPreset {
  id: string;
  name: string;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  category: "paper" | "board" | "corrugated" | "rigid" | "specialty" | "film";
  description: string;
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  { id: "coated-white", name: "Coated white board", color: "#f5f2ea", roughness: 0.55, metalness: 0.02, category: "board", description: "Bright white coated paperboard, ~350 gsm." },
  { id: "uncoated-white", name: "Uncoated paper", color: "#efe8d8", roughness: 0.9, metalness: 0, category: "paper", description: "Natural matte finish, ideal for organic brands." },
  { id: "kraft", name: "Kraft brown", color: "#b48a5f", roughness: 0.92, metalness: 0, category: "paper", description: "Recycled kraft, warm brown, textured surface." },
  { id: "grayboard", name: "Grayboard", color: "#8f8f8f", roughness: 0.88, metalness: 0, category: "board", description: "Dense grey chipboard core, common for rigid boxes." },
  { id: "corrugated-brown", name: "Corrugated (brown)", color: "#c19670", roughness: 0.9, metalness: 0, category: "corrugated", description: "E-flute corrugated, brown outer." },
  { id: "corrugated-white", name: "Corrugated (white)", color: "#f0ece1", roughness: 0.88, metalness: 0, category: "corrugated", description: "White-topped corrugated for premium shipping." },
  { id: "wrapped-rigid", name: "Wrapped rigid", color: "#1a1a1a", roughness: 0.35, metalness: 0.04, clearcoat: 0.3, clearcoatRoughness: 0.4, category: "rigid", description: "Rigid box wrapped in matte laminate." },
  { id: "gloss-laminate", name: "Gloss laminate", color: "#ffffff", roughness: 0.15, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.1, category: "film", description: "High-gloss film over printed board." },
  { id: "matte-laminate", name: "Matte laminate", color: "#ffffff", roughness: 0.72, metalness: 0.02, category: "film", description: "Soft matte finish." },
  { id: "soft-touch", name: "Soft-touch", color: "#1e1e1e", roughness: 0.85, metalness: 0.01, category: "film", description: "Velvet-like tactile lamination." },
  { id: "gold-foil", name: "Metallic gold", color: "#c9a34a", roughness: 0.28, metalness: 0.85, category: "specialty", description: "Gold foil stamp / metallic board." },
  { id: "silver-foil", name: "Metallic silver", color: "#d6d6d6", roughness: 0.25, metalness: 0.9, category: "specialty", description: "Silver metallic foil." },
];

export function getPreset(id: string): MaterialPreset | undefined {
  return MATERIAL_PRESETS.find((p) => p.id === id);
}
