import { compileLegacyPayloadManifest } from "../../src/features/configurator/manifest/legacyCompiler";
import type { ApiPayloadPackage } from "../../src/integrations/boxcraft/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const rectangle = (x: number, y: number, width: number, height: number) => [
  { mtd: "M", x, y },
  { mtd: "L", x: x + width, y },
  { mtd: "L", x: x + width, y: y + height },
  { mtd: "L", x, y: y + height },
  { mtd: "Z" },
];

const payloadPackage = {
  ok: true,
  schema: "boxcraft.visualization-payload-package/v1",
  source_id: "fixture-multilayer",
  payloads: {
    details: {
      payload: {
        payload: {
          nameKey: "Fixture multilayer box",
          length: 120,
          width: 80,
          height: 45,
        },
      },
    },
    preview: {
      payload: {
        data: {
          project_name: "Fixture multilayer box",
          mainFace: { face: "A" },
          otherFaces: [{ faceName: "B", direction: "back" }],
        },
      },
    },
    knife: {
      payload: {
        data: {
          size: { L: 120, W: 80, H: 45, D: 1.5 },
          layer: {
            outer: {
              totalX: 200,
              totalY: 100,
              thickness: 0.4,
              faces: [
                { name: "A", x: 0, y: 0, w: 100, h: 100, dlist: rectangle(0, 0, 100, 100) },
                { name: "B", x: 100, y: 0, w: 100, h: 100, dlist: rectangle(100, 0, 100, 100) },
              ],
              folds: [{ name: "A_B", x1: 100, y1: 0, x2: 100, y2: 100, rotate: true }],
              animation: [
                [{ action: "rotate", name: "A_B", rotate: 90, vector: { x: 0, y: 100, z: 0 } }],
                [
                  { action: "translate", name: "B", translate: 5, vector: { x: 0, y: 0, z: 1 } },
                  { action: "rotateMesh", name: "B", rotate: 15, vector: { x: 1, y: 0, z: 0 } },
                ],
              ],
            },
            inner: {
              totalX: 100,
              totalY: 40,
              thickness: 1.8,
              faces: [
                { name: "A", x: 0, y: 0, w: 50, h: 40, dlist: rectangle(0, 0, 50, 40) },
                { name: "B", x: 50, y: 0, w: 50, h: 40, dlist: rectangle(50, 0, 50, 40) },
              ],
              folds: [{ name: "A_B", x1: 50, y1: 0, x2: 50, y2: 40, rotate: true }],
            },
          },
        },
      },
    },
  },
} as unknown as ApiPayloadPackage;

const manifest = await compileLegacyPayloadManifest("fixture-multilayer", payloadPackage);
const operations = manifest.animations.flatMap((sequence) =>
  sequence.steps.flatMap((step) => step.operations),
);

assert(manifest.schema === "gptsboxes.viewer-manifest/v1", "Unexpected manifest schema");
assert(manifest.product.sourceId === "fixture-multilayer", "Source identity was lost");
assert(manifest.runtimeStrategy === "recorded-animation", "Recorded animation was not detected");
assert(manifest.model.productionStatus === "unverified", "Fixture must not be production approved");
assert(manifest.faces.some((face) => face.faceKey === "outer:A"), "Outer face identity missing");
assert(manifest.faces.some((face) => face.faceKey === "inner:A"), "Inner face identity missing");
assert(new Set(manifest.faces.map((face) => face.faceKey)).size === manifest.faces.length, "Face IDs collide");
assert(manifest.folds.length === 2, "Both layer folds must be preserved");
assert(operations.some((operation) => operation.type === "rotate"), "Rotate operation missing");
assert(operations.some((operation) => operation.type === "translate"), "Translate operation missing");
assert(operations.some((operation) => operation.type === "rotateMesh"), "rotateMesh operation missing");
assert(manifest.dielines.length === 2, "Each layer needs a dieline record");
assert(manifest.materials.length === 2, "Each layer needs material metadata");

console.log(
  JSON.stringify(
    {
      schema: manifest.schema,
      sourceId: manifest.product.sourceId,
      runtimeStrategy: manifest.runtimeStrategy,
      faces: manifest.faces.length,
      folds: manifest.folds.length,
      operations: operations.map((operation) => operation.type),
      layers: manifest.dielines.map((dieline) => dieline.layerKey),
    },
    null,
    2,
  ),
);
