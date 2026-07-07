import { Suspense, useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { NormalizedPackagingModel } from "@/integrations/boxcraft/types";

interface Props {
  model: NormalizedPackagingModel;
  onFail: () => void;
}

/**
 * Strategy A — attempt to load a GLB from resolved URL. On failure the
 * caller downgrades to knife-rig.
 */
export function GltfModelBuilder(props: Props) {
  return (
    <Suspense fallback={null}>
      <GltfInner {...props} />
    </Suspense>
  );
}

function GltfInner({ model, onFail }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!model.gltf?.url) {
      setFailed(true);
      onFail();
    }
  }, [model.gltf?.url, onFail]);

  if (failed || !model.gltf?.url) return null;

  try {
    const gltf = useGLTF(model.gltf.url) as unknown as { scene: THREE.Group };
    const scene = gltf.scene.clone(true);
    // Fit into ~2 units
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2 / maxDim;
    scene.scale.setScalar(scale);
    const center = new THREE.Vector3();
    box.getCenter(center).multiplyScalar(scale);
    scene.position.sub(center);
    return <primitive object={scene} />;
  } catch {
    setFailed(true);
    onFail();
    return null;
  }
}
