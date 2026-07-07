import { Component, Suspense, useMemo, type ErrorInfo, type ReactNode } from "react";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { NormalizedPackagingModel } from "@/integrations/boxcraft/types";

interface Props {
  model: NormalizedPackagingModel;
  onFail: () => void;
}

interface BoundaryProps {
  resetKey: string;
  onFail: () => void;
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

class GltfErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[ShapeWeaver] GLB loading failed; using fallback geometry", error, info);
    this.props.onFail();
  }

  componentDidUpdate(previousProps: BoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Attempts the source GLB and cleanly downgrades when CDN/CORS/404 fails. */
export function GltfModelBuilder({ model, onFail }: Props) {
  const url = model.gltf?.url;
  if (!url) return null;

  return (
    <GltfErrorBoundary resetKey={url} onFail={onFail}>
      <Suspense
        fallback={
          <Html center>
            <div className="rounded-md bg-black/70 px-3 py-2 text-xs text-white">
              Loading 3D model…
            </div>
          </Html>
        }
      >
        <GltfInner url={url} />
      </Suspense>
    </GltfErrorBoundary>
  );
}

function GltfInner({ url }: { url: string }) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };

  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
    const scale = 2 / maxDimension;

    clone.scale.setScalar(scale);
    clone.position.copy(center.multiplyScalar(-scale));
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clone;
  }, [gltf.scene]);

  return <primitive object={scene} />;
}
