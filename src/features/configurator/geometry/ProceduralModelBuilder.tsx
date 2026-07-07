import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { NormalizedPackagingModel } from "@/integrations/boxcraft/types";
import { useConfiguratorStore } from "@/stores/configurator";

interface Props {
  model: NormalizedPackagingModel;
  materialColor: string;
  roughness: number;
  metalness: number;
}

function safeDimension(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Stable Three.js fallback used whenever GLB or dieline geometry is missing or
 * invalid. It always renders a real six-panel package and keeps the lid
 * interactive through foldProgress.
 */
export function ProceduralModelBuilder(props: Props) {
  const foldProgress = useConfiguratorStore((s) => s.foldProgress);
  const dimensions = props.model.dimensions;

  const width = safeDimension(dimensions.width, 100);
  const depth = safeDimension(dimensions.depth, 60);
  const height = safeDimension(dimensions.height, 40);
  const maxDim = Math.max(width, depth, height, 1);
  const scale = 2 / maxDim;

  const w = width * scale;
  const d = depth * scale;
  const h = height * scale;
  const panelThickness = Math.max(0.012, safeDimension(dimensions.thickness, 1.5) * scale);

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(props.materialColor),
        roughness: props.roughness,
        metalness: props.metalness,
        side: THREE.DoubleSide,
        clearcoat: 0.08,
        clearcoatRoughness: 0.7,
      }),
    [],
  );

  useEffect(() => {
    material.color.set(props.materialColor);
    material.roughness = props.roughness;
    material.metalness = props.metalness;
    material.needsUpdate = true;
  }, [material, props.materialColor, props.roughness, props.metalness]);

  useEffect(() => () => material.dispose(), [material]);

  const lidAngle = THREE.MathUtils.clamp(foldProgress, 0, 1) * Math.PI * 0.72;

  return (
    <group position={[0, -h * 0.05, 0]}>
      <mesh material={material} position={[0, -h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, panelThickness, d]} />
      </mesh>

      <mesh material={material} position={[0, 0, -d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, panelThickness]} />
      </mesh>
      <mesh material={material} position={[0, 0, d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, panelThickness]} />
      </mesh>
      <mesh material={material} position={[-w / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[panelThickness, h, d]} />
      </mesh>
      <mesh material={material} position={[w / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[panelThickness, h, d]} />
      </mesh>

      <group position={[0, h / 2, -d / 2]} rotation={[-lidAngle, 0, 0]}>
        <mesh material={material} position={[0, 0, d / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, panelThickness, d]} />
        </mesh>
      </group>
    </group>
  );
}
