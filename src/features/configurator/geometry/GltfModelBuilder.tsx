import { Suspense, useEffect, useMemo } from "react";
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
 *
 * NOTE: useGLTF uses React Suspense and must NOT be called inside a
 * try-catch or conditionally. We guard the URL check in the wrapper so
 * GltfInner is only rendered when a URL is known to exist.
 */
export function GltfModelBuilder({ model, onFail }: Props) {
  useEffect(() => {
    if (!model.gltf?.url) onFail();
  }, [model.gltf?.url, onFail]);

  if (!model.gltf?.url) return null;

  return (
    <Suspense fallback={null}>
      <GltfInner model={model} onFail={onFail} />
    </Suspense>
  );
}

function GltfInner({ model, onFail }: Props) {
  // useGLTF must be called unconditionally at the top level (Suspense-based hook).
  const gltf = useGLTF(model.gltf!.url) as unknown as { scene: THREE.Group };

  const scene = useMemo(() => {
    if (!gltf?.scene) return null;
    const s = gltf.scene.clone(true);
    // Fit into ~2 scene units
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2 / maxDim;
    s.scale.setScalar(scale);
    const center = new THREE.Vector3();
    box.getCenter(center).multiplyScalar(scale);
    s.position.sub(center);
    return s;
  }, [gltf?.scene]);

  useEffect(() => {
    if (!scene) onFail();
  }, [scene, onFail]);

  if (!scene) return null;
  return <primitive object={scene} />;
}
