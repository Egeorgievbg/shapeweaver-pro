import { useEffect, useState } from "react";
import * as THREE from "three";
import type { NormalizedPackagingModel } from "@/integrations/boxcraft/types";
import { useConfiguratorStore } from "@/stores/configurator";

interface Props {
  model: NormalizedPackagingModel;
  materialColor: string;
  roughness: number;
  metalness: number;
}

/**
 * Strategy C — procedural approximation. Uniform 6-sided box scaled to
 * dimensions. Fold progress opens the top lid.
 */
export function ProceduralModelBuilder(props: Props) {
  const foldProgress = useConfiguratorStore((s) => s.foldProgress);
  const d = props.model.dimensions;
  // Normalize to scene units (~2)
  const maxDim = Math.max(d.width, d.depth, d.height);
  const s = 2 / maxDim;
  const w = d.width * s;
  const de = d.depth * s;
  const h = d.height * s;

  const [mat] = useState(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(props.materialColor),
        roughness: props.roughness,
        metalness: props.metalness,
        side: THREE.DoubleSide,
      }),
  );
  useEffect(() => {
    mat.color.set(props.materialColor);
    mat.roughness = props.roughness;
    mat.metalness = props.metalness;
    mat.needsUpdate = true;
  }, [mat, props.materialColor, props.roughness, props.metalness]);
  useEffect(() => () => mat.dispose(), [mat]);

  const lidAngle = foldProgress * (Math.PI / 2);
  return (
    <group>
      {/* Bottom + walls */}
      <mesh material={mat} position={[0, -h / 2 + 0.001, 0]}>
        <boxGeometry args={[w, 0.01, de]} />
      </mesh>
      <mesh material={mat} position={[0, 0, -de / 2]}>
        <boxGeometry args={[w, h, 0.01]} />
      </mesh>
      <mesh material={mat} position={[0, 0, de / 2]}>
        <boxGeometry args={[w, h, 0.01]} />
      </mesh>
      <mesh material={mat} position={[-w / 2, 0, 0]}>
        <boxGeometry args={[0.01, h, de]} />
      </mesh>
      <mesh material={mat} position={[w / 2, 0, 0]}>
        <boxGeometry args={[0.01, h, de]} />
      </mesh>
      {/* Hinged lid */}
      <group position={[0, h / 2, -de / 2]} rotation={[-lidAngle, 0, 0]}>
        <mesh material={mat} position={[0, 0, de / 2]}>
          <boxGeometry args={[w, 0.01, de]} />
        </mesh>
      </group>
    </group>
  );
}
