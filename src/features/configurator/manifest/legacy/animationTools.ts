import type { ManifestAnimationOperation, ManifestAnimationSequence, ManifestFold } from "../types";
import { asRecord, finiteNumber, vectorTuple, type UnknownRecord } from "./pathTools";

function isOperation(value: unknown): boolean {
  const source = asRecord(value);
  const action = String(source?.action ?? source?.type ?? "");
  return action === "rotate" || action === "translate" || action === "rotateMesh";
}

function collectSteps(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    if (value.some(isOperation)) return [{ operations: value }];
    return value.flatMap(collectSteps);
  }
  const source = asRecord(value);
  if (!source) return [];
  if (isOperation(source)) return [{ operations: [source] }];
  for (const key of ["steps", "step", "animation", "animate", "list", "data"]) {
    if (source[key] != null) {
      const nested = collectSteps(source[key]);
      if (nested.length) return nested;
    }
  }
  if (Array.isArray(source.operations) || Array.isArray(source.actions)) return [source];
  return Object.values(source).flatMap(collectSteps);
}

function stepDuration(step: UnknownRecord): number | undefined {
  const direct = finiteNumber(step.duration ?? step.time, Number.NaN);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const interval = Array.isArray(step.interval) ? step.interval : null;
  if (interval?.length === 2) {
    const duration = finiteNumber(interval[1]) - finiteNumber(interval[0]);
    if (duration > 0) return duration;
  }
  const start = finiteNumber(step.start, Number.NaN);
  const end = finiteNumber(step.end, Number.NaN);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? end - start : undefined;
}

function compileOperation(
  layerKey: string,
  value: unknown,
  operationIndex: number,
  foldsByName: Map<string, ManifestFold>,
): ManifestAnimationOperation | null {
  const source = asRecord(value);
  if (!source) return null;
  const action = String(source.action ?? source.type ?? "");
  if (action !== "rotate" && action !== "translate" && action !== "rotateMesh") return null;
  const name = String(source.name ?? source.fold ?? source.target ?? "");
  const fold = foldsByName.get(name);
  const vector = vectorTuple(source.vector ?? source.axis);
  const operation: ManifestAnimationOperation = {
    type: action,
    operationIndex,
    foldId: action === "rotate" ? fold?.id : undefined,
    foldIndex: action === "rotate" ? fold?.foldIndex : undefined,
    targetFaceKey: action === "rotate" ? undefined : name ? `${layerKey}:${name}` : layerKey,
    angleDegrees: finiteNumber(source.rotate ?? source.angle, Number.NaN),
    axis: vector,
    pivot: vectorTuple(source.pivot ?? source.origin),
    vector: action === "translate" ? vector : undefined,
    distance: finiteNumber(source.translate ?? source.distance, Number.NaN),
  };
  if (!Number.isFinite(operation.angleDegrees)) delete operation.angleDegrees;
  if (!Number.isFinite(operation.distance)) delete operation.distance;
  return operation;
}

export function compileLayerAnimations(
  layerKey: string,
  rawAnimation: unknown,
  foldsByName: Map<string, ManifestFold>,
): ManifestAnimationSequence[] {
  const steps = collectSteps(rawAnimation);
  if (!steps.length) return [];
  const compiledSteps = steps.map((step, stepIndex) => {
    const rawOperations = Array.isArray(step.operations)
      ? step.operations
      : Array.isArray(step.actions)
        ? step.actions
        : [];
    return {
      stepIndex,
      duration: stepDuration(step),
      operations: rawOperations
        .map((value, operationIndex) =>
          compileOperation(layerKey, value, operationIndex, foldsByName),
        )
        .filter((operation): operation is ManifestAnimationOperation => Boolean(operation)),
    };
  });
  if (!compiledSteps.some((step) => step.operations.length)) return [];
  return [
    {
      id: `${layerKey}:source-animation`,
      name: `${layerKey} source animation`,
      isDefault: true,
      steps: compiledSteps,
    },
  ];
}
