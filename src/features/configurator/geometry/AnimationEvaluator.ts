import * as THREE from "three";
import type { NormalizedPackagingModel } from "@/integrations/boxcraft/types";
import type { ManifestBackedPackagingModel, ManifestFoldModel } from "../manifest/adapter";

export interface EvaluatedPanelTransform {
  translation: THREE.Vector3;
  rotation: THREE.Quaternion;
}

export interface EvaluatedAnimationState {
  foldAngles: Map<string, number>;
  panelTransforms: Map<string, EvaluatedPanelTransform>;
  recorded: boolean;
}

function manifestModel(model: NormalizedPackagingModel): ManifestBackedPackagingModel | null {
  const candidate = model as Partial<ManifestBackedPackagingModel>;
  return candidate.runtimeStrategy && Array.isArray(candidate.animations)
    ? (candidate as ManifestBackedPackagingModel)
    : null;
}

function operationWeight(stepStart: number, stepDuration: number, cursor: number): number {
  return THREE.MathUtils.clamp((cursor - stepStart) / Math.max(stepDuration, 1e-6), 0, 1);
}

function rotationAngle(operation: {
  angleRadians?: number;
  angleDegrees?: number;
}): number {
  if (Number.isFinite(operation.angleRadians)) return operation.angleRadians as number;
  if (Number.isFinite(operation.angleDegrees)) {
    return THREE.MathUtils.degToRad(operation.angleDegrees as number);
  }
  return 0;
}

export function evaluatePackagingAnimation(
  model: NormalizedPackagingModel,
  progress: number,
): EvaluatedAnimationState {
  const source = manifestModel(model);
  const sequence = source?.animations.find((item) => item.isDefault) ?? source?.animations[0];
  if (!source || source.runtimeStrategy !== "recorded-animation" || !sequence?.steps.length) {
    return { foldAngles: new Map(), panelTransforms: new Map(), recorded: false };
  }

  const durations = sequence.steps.map((step) => Math.max(step.duration ?? 1, 1e-6));
  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
  const cursor = THREE.MathUtils.clamp(progress, 0, 1) * totalDuration;
  const foldAngles = new Map<string, number>();
  const panelTransforms = new Map<string, EvaluatedPanelTransform>();
  const folds = model.folds as ManifestFoldModel[];
  let stepStart = 0;

  sequence.steps.forEach((step, stepPosition) => {
    const duration = durations[stepPosition];
    const weight = operationWeight(stepStart, duration, cursor);
    stepStart += duration;
    if (weight <= 0) return;

    for (const operation of step.operations) {
      if (operation.type === "rotate") {
        const fold = operation.foldId
          ? folds.find((candidate) => candidate.id === operation.foldId)
          : folds.find((candidate) => candidate.foldIndex === operation.foldIndex);
        if (!fold) continue;
        const previous = foldAngles.get(fold.id) ?? 0;
        foldAngles.set(fold.id, previous + rotationAngle(operation) * weight);
        continue;
      }

      const panelId = operation.targetFaceKey;
      if (!panelId) continue;
      const current =
        panelTransforms.get(panelId) ??
        { translation: new THREE.Vector3(), rotation: new THREE.Quaternion() };

      if (operation.type === "translate") {
        const vector = operation.vector
          ? new THREE.Vector3(...operation.vector)
          : operation.axis
            ? new THREE.Vector3(...operation.axis).normalize().multiplyScalar(operation.distance ?? 0)
            : new THREE.Vector3();
        current.translation.addScaledVector(vector, weight);
      } else if (operation.type === "rotateMesh") {
        const axis = operation.axis
          ? new THREE.Vector3(...operation.axis)
          : new THREE.Vector3(0, 0, 1);
        if (axis.lengthSq() > 1e-8) {
          axis.normalize();
          current.rotation.multiply(
            new THREE.Quaternion().setFromAxisAngle(axis, rotationAngle(operation) * weight),
          );
        }
      }
      panelTransforms.set(panelId, current);
    }
  });

  return { foldAngles, panelTransforms, recorded: true };
}
