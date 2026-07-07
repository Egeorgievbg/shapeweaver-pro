import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, Grid, Bounds } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useConfiguratorStore } from "@/stores/configurator";
import { GeometryResolver } from "@/features/configurator/geometry/GeometryResolver";
import { detectWebGL } from "@/lib/webgl";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ArtworkTextureState {
  texture: THREE.Texture | null;
  loading: boolean;
}

/** Combines all artwork layers onto a single canvas texture, mapped to the
 *  dieline coordinate system. */
function useArtworkTexture(): ArtworkTextureState {
  const layers = useConfiguratorStore((s) => s.artworkLayers);
  const model = useConfiguratorStore((s) => s.productModel);
  const [state, setState] = useState<ArtworkTextureState>({ texture: null, loading: false });

  useEffect(() => {
    if (!model?.dieline) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    const dielineW = model.dieline.totalX;
    const dielineH = model.dieline.totalY;
    const canvas = document.createElement("canvas");
    const scale = Math.min(2048 / Math.max(dielineW, dielineH), 4);
    canvas.width = Math.round(dielineW * scale);
    canvas.height = Math.round(dielineH * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const loads = layers
      .filter((l) => l.visible)
      .sort((a, b) => a.order - b.order)
      .map(
        (layer) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              // Place on the panel bbox if targeted; else center
              const panel = layer.panelId !== "all"
                ? model.panels.find((p) => p.id === layer.panelId)
                : undefined;
              const bbox = panel
                ? { x: panel.bbox.x, y: panel.bbox.y, w: panel.bbox.w, h: panel.bbox.h }
                : { x: 0, y: 0, w: dielineW, h: dielineH };
              const cx = (bbox.x + bbox.w / 2 + layer.offset.x) * scale;
              const cy = (bbox.y + bbox.h / 2 + layer.offset.y) * scale;
              const drawW = img.width * layer.scale * scale * 0.3;
              const drawH = img.height * layer.scale * scale * 0.3;
              ctx.save();
              ctx.globalAlpha = layer.opacity;
              ctx.translate(cx, cy);
              ctx.rotate((layer.rotation * Math.PI) / 180);
              ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
              ctx.restore();
              resolve();
            };
            img.onerror = () => resolve();
            img.src = layer.dataUrl;
          }),
      );

    Promise.all(loads).then(() => {
      if (cancelled) return;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      setState({ texture: tex, loading: false });
    });

    return () => { cancelled = true; };
  }, [layers, model]);

  return state;
}

export function Viewport3D() {
  const [webglStatus] = useState(() => detectWebGL());
  const model = useConfiguratorStore((s) => s.productModel);
  const material = useConfiguratorStore((s) => s.material);
  const scene = useConfiguratorStore((s) => s.scene);
  const selectedPanelId = useConfiguratorStore((s) => s.selectedPanelId);
  const selectPanel = useConfiguratorStore((s) => s.selectPanel);
  const artwork = useArtworkTexture();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const bgColor = scene.transparentBackground ? undefined : scene.backgroundColor;

  if (!webglStatus.ok) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-viewport">
        <div className="max-w-xs text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 font-medium">WebGL unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your browser or GPU can't render the 3D viewport. Reason: {webglStatus.reason}
          </p>
        </div>
      </div>
    );
  }

  if (!model) return null;

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: bgColor }}>
      <Canvas
        ref={canvasRef}
        gl={{ antialias: true, preserveDrawingBuffer: true, alpha: scene.transparentBackground }}
        dpr={[1, 2]}
        camera={{ position: [3, 2.5, 4], fov: 40 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        onPointerMissed={() => selectPanel(null)}
      >
        <color attach="background" args={[scene.transparentBackground ? "#00000000" : scene.backgroundColor]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 8, 5]} intensity={scene.keyLightIntensity} castShadow />
        <directionalLight position={[-5, 3, -3]} intensity={scene.fillLightIntensity} />
        <directionalLight position={[0, 4, -6]} intensity={scene.rimLightIntensity} />

        {scene.preset !== "transparent" && (
          <Environment preset={scene.preset === "studio-dark" ? "warehouse" : scene.preset === "warm" ? "sunset" : scene.preset === "cool" ? "dawn" : "studio"} />
        )}

        {scene.showGrid && <Grid args={[20, 20]} cellColor="#c0c0c0" sectionColor="#888888" fadeDistance={20} />}

        <Suspense fallback={null}>
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
          <ContactShadows position={[0, -1.2, 0]} opacity={0.35} blur={2.4} scale={8} far={4} />
        )}

        <OrbitControls
          makeDefault
          enablePan
          enableRotate
          enableZoom
          dampingFactor={0.08}
          maxPolarAngle={Math.PI * 0.98}
        />
      </Canvas>

      {artwork.loading && (
        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-md bg-surface/90 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin" /> Applying artwork…
        </div>
      )}

      {model.geometryStrategy === "procedural" && (
        <div className="absolute left-4 top-4 rounded-md bg-warning/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider">
          Geometry: procedural approximation
        </div>
      )}
      {model.geometryStrategy === "preview-only" && (
        <div className="absolute left-4 top-4 rounded-md bg-destructive/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-destructive-foreground">
          3D geometry not available for this product
        </div>
      )}
    </div>
  );
}

// exported for exporter to grab the current canvas
export function useViewportCanvas() {
  return typeof document !== "undefined" ? (document.querySelector("canvas") as HTMLCanvasElement | null) : null;
}

// helpers keep useMemo import used
const _keep = useMemo;
void _keep;
