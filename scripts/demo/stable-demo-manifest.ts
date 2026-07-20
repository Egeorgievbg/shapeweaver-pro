import { makeDemoManifest } from "./demo-manifest";
import type { DemoProduct } from "./demo-products";

export const DEMO_DATASET_VERSION = "2026.07.20-v1";
export const DEMO_DATASET_TIMESTAMP = "2026-07-20T00:00:00.000Z";

export function makeStableDemoManifest(product: DemoProduct) {
  const manifest = makeDemoManifest(product);
  const sourceHash = `demo-sqlite-${DEMO_DATASET_VERSION}-${product.sourceId}`;
  return {
    ...manifest,
    generatedAt: DEMO_DATASET_TIMESTAMP,
    sourceHash,
    model: {
      ...manifest.model,
      version: `demo-sqlite-${DEMO_DATASET_VERSION}`,
      sourceHash,
    },
    validation: {
      ...manifest.validation,
      checkedAt: DEMO_DATASET_TIMESTAMP,
    },
  };
}
