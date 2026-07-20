export type DemoProduct = {
  sourceId: string;
  name: string;
  family: string;
  category: string;
  material: string;
  color: string;
  length: number;
  width: number;
  height: number;
  productLine: "basic" | "premium";
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  { sourceId: "mailer-001", name: "Mailer Box", family: "Mailer", category: "E-commerce", material: "Kraft", color: "#b88755", length: 180, width: 120, height: 55, productLine: "basic" },
  { sourceId: "tuck-001", name: "Reverse Tuck Box", family: "Folding carton", category: "Retail", material: "GC1", color: "#f2eee4", length: 90, width: 45, height: 150, productLine: "basic" },
  { sourceId: "rigid-001", name: "Rigid Gift Box", family: "Rigid", category: "Gift", material: "Greyboard", color: "#1f2937", length: 160, width: 120, height: 65, productLine: "premium" },
  { sourceId: "display-001", name: "Counter Display Box", family: "Display", category: "Retail", material: "E-flute", color: "#d5c2a5", length: 210, width: 135, height: 170, productLine: "basic" },
  { sourceId: "gable-001", name: "Gable Box", family: "Carrier", category: "Food & gifts", material: "Kraft", color: "#c99b63", length: 140, width: 90, height: 125, productLine: "premium" },
];
