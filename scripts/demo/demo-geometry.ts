import type { DemoProduct } from "./demo-products";

const rect = (x: number, y: number, width: number, height: number) =>
  `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;

export function makeDemoGeometry(product: DemoProduct) {
  const { length: l, width: w, height: h } = product;
  const x = h;
  const y = h;
  const face = (key: string, name: string, bx: number, by: number, bw: number, bh: number, direction?: string) => ({
    id: `board:${key}`,
    faceKey: `board:${key}`,
    name,
    layerKey: "board",
    svgPath: rect(bx, by, bw, bh),
    bbox: { x: bx, y: by, width: bw, height: bh },
    centroid: { x: bx + bw / 2, y: by + bh / 2 },
    direction,
  });
  const faces = [
    face("base", "Base", x, y, l, w, "bottom"),
    face("back", "Back", x, 0, l, h, "back"),
    face("front", "Front", x, y + w, l, h, "front"),
    face("left", "Left", 0, y, h, w, "left"),
    face("right", "Right", x + l, y, h, w, "right"),
    face("lid", "Lid", x, y + w + h, l, w, "top"),
  ];
  const fold = (id: string, index: number, parent: string, child: string, from: [number, number], to: [number, number], direction: 1 | -1) => ({
    id: `board:${id}`,
    foldIndex: index,
    parentFaceKey: `board:${parent}`,
    childFaceKey: `board:${child}`,
    from,
    to,
    direction,
    openAngle: 0,
    closedAngle: Math.PI / 2,
  });
  const folds = [
    fold("base-back", 0, "base", "back", [x, y], [x + l, y], -1),
    fold("base-front", 1, "base", "front", [x, y + w], [x + l, y + w], 1),
    fold("base-left", 2, "base", "left", [x, y], [x, y + w], 1),
    fold("base-right", 3, "base", "right", [x + l, y], [x + l, y + w], -1),
    fold("front-lid", 4, "front", "lid", [x, y + w + h], [x + l, y + w + h], 1),
  ];
  return { faces, folds, totalX: l + h * 2, totalY: w * 2 + h * 2 };
}
