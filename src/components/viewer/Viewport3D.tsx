import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, Grid, Bounds, Html } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useConfiguratorStore, type CameraPreset } from "@/stores/configurator";
import { GeometryResolver } from "@/features/configurator/geometry/GeometryResolver";
import { detectWebGL } from "@/lib/webgl";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ArtworkTextureState {
  texture: THREE.Texture | null;
  loading: boolean;
}

function useArtworkTexture(): ArtworkTextureState {
  const layers = useConfiguratorStore((state) => state.artworkLayers);
  const model = useConfiguratorStore((state) => state.productModel);
  const [state, setState] = useState<ArtworkTextureState>({ texture: null, loading: false });

  useEffect(() => {
    if (!model?.dieline) {
      setState((current) => {
        current.texture?.dispose();
        return { texture: null, loading: false };
      });
      return;
    }

    let cancelled = false;
    const dielineWidth = Math.max(Number(model.dieline.totalX) || 1, 1);
    const dielineHeight = Math.max(Number(model.dieline.totalY) || 1, 1);
    const canvas = document.createElement("canvas");
    const scale = Math.min(2048 / Math.max(dielineWidth, dielineHeight), 4);
    canvas.width = Math.max(1, Math.round(dielineWidth * scale));
    canvas.height = Math.max(1, Math.round(dielineHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      setState({ texture: null, loading: false });
      return;
    }

    setState((current) => ({ ...current, loading: true }));
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const loads = layers
      .filter((layer) => layer.visible)
      .sort((a, b) => a.order - b.order)
      .map(
        (layer) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
              const panel =
                layer.panelId !== "all"
                  ? model.panels.find((candidate) => candidate.id === layer.panelId)
                  : undefined;
              const bbox = panel?.bbox ?? { x: 0, y: 0, w: dielineWidth, h: dielineHeight };
              const centerX = (bbox.x + bbox.w / 2 + layer.offset.x) * scale;
              const centerY = (bbox.y + bbox.h / 2 + layer.offset.y) * scale;
              const drawWidth = image.width * layer.scale * scale * 0.3;
              const drawHeight = image.height * layer.scale * scale * 0.3;

              context.save();
              context.globalAlpha = layer.opacity;
              context.translate(centerX, centerY);
              context.rotate(THREE.MathUtils.degToRad(layer.rotation));
              context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
              context.restore();
              resolve();
            };
            image.onerror = () => resolve();
            image.src = layer.dataUrl;
          }),
      );

    void Promise.all(loads).then(() => {
      if (cancelled) return;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      setState((previous) => {
        previous.texture?.dispose();
        return { texture, loading: false };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [layers, model]);

  useEffect(() => () => state.texture?.dispose(), [state.texture]);
  return state;
}

const CAMERA_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  perspective: [3.2, 2.6, 4.2],
  isometric: [3.2, 2.6, 4.2],
  front: [0, 0.25, 5],
  back: [0, 0.25, -5],
  left: [-5, 0.25, 0],
  right: [5, 0.25, 0],
  top: [0.01, 5.4, 0.01],
  bottom: [0.01, -5.4, 0.01],
};

function CameraRig({ preset }: { preset: CameraPreset }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, invalidate } = useThree();

  useEffect(() => {
    camera.position.set(...CAMERA_POSITIONS[preset]);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [camera, invalidate, preset]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan
      enableRotate
      enableZoom
      enableDamping
      dampingFactor={0.08}
      minDistance={1.3}
      maxDistance={12}
      maxPolarAngle={Math.PI * 0.98}
      onChange={invalidate}
    />
  );
}

export function Viewport3D() {
  const [webglStatus] = useState(() => detectWebGL());
  const model = useConfiguratorStore((state) => state.productModel);
  const material = useConfiguratorStore((state) => state.material);
  const scene = useConfiguratorStore((state) => state.scene);
  const cameraPreset = useConfiguratorStore((state) => state.cameraPreset);
  const selectedPanelId = useConfiguratorStore((state) => state.selectedPanelId);
  const selectPanel = useConfiguratorStore((state) => state.selectPanel);
  const artwork = useArtworkTexture();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundColor = scene.transparentBackground ? undefined : scene.backgroundColor;

  if (!webglStatus.ok) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-viewport">
        <div className="max-w-xs text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 font-medium">WebGL unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your browser or GPU cannot render the 3D viewport. Reason: {webglStatus.reason}
          </p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-viewport text-sm text-muted-foreground">
        Select a product to initialize the 3D scene.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[420px] w-full" style={{ backgroundColor }}>
      <Canvas
        ref={canvasRef}
        shadows
        frameloop="demand"
        gl={{ antialias: true, preserveDrawingBuffer: true, alpha: scene.transparentBackground }}
        dpr={[1, 2]}
        camera={{ position: CAMERA_POSITIONS.perspective, fov: 38, near: 0.01, far: 100 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        onPointerMissed={() => selectPanel(null)}
      >
        {!scene.transparentBackground && <color attach="background" args={[scene.backgroundColor]} />}
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 8, 5]} intensity={scene.keyLightIntensity} castShadow />
        <directionalLight position={[-5, 3, -3]} intensity={scene.fillLightIntensity} />
        <directionalLight position={[0, 4, -6]} intensity={scene.rimLightIntensity} />

        {scene.preset !== "transparent" && (
          <Environment
            preset={
              scene.preset === "studio-dark"
                ? "warehouse"
                : scene.preset === "warm"
                  ? "sunset"
                  : scene.preset === "cool"
                    ? "dawn"
                    : "studio"
            }
          />
        )}

        {scene.showGrid && (
          <Grid args={[20, 20]} position={[0, -1.15, 0]} cellColor="#c0c0c0" sectionColor="#888888" fadeDistance={20} />
        )}

        <Suspense
          fallback={
            <Html center>
              <div className="flex items-center gap-2 rounded-md bg-black/70 px-3 py-2 text-xs text-white">
                <Loader2 className="h-3 w-3 animate-spin" /> Building 3D geometry…
              </div>
            </Html>
          }
        >
          <Bounds fit clip observe margin={1.35}>
            <GeometryResolver
              model={model}
              artworkTexture={artwork.texture}
              materialColor={material.color}
              roughness={material.roughness}
              metalness={material.metalness}
              selectedPanelId={selectedPanelId}
              onPanelClick={selectPanel}
            />
          </Bounds>
        </Suspense>

        {scene.contactShadows && (
          <ContactShadows position={[0, -1.15, 0]} opacity={0.35} blur={2.4} scale={8} far={4} />
        )}

        <CameraRig preset={cameraPreset} />
      </Canvas>

      {artwork.loading && (
        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-md bg-surface/90 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin" /> Applying artwork…
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 rounded-md bg-black/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white backdrop-blur">
        Geometry: {model.geometryStrategy === "gltf" ? "GLB / automatic fallback" : model.geometryStrategy}
      </div>
    </div>
  );
}

export function useViewportCanvas() {
  return typeof document !== "undefined" ? (document.querySelector("canvas") as HTMLCanvasElement | null) : null;
}
