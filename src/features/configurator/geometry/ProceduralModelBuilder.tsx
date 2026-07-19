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

type ProductKind = "mailer" | "tuck" | "rigid" | "display" | "gable" | "generic";

interface GeometrySize {
  width: number;
  depth: number;
  height: number;
  thickness: number;
}

function safeDimension(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSize(dimensions: {
  width?: number;
  depth?: number;
  height?: number;
  thickness?: number;
}): GeometrySize {
  const width = safeDimension(dimensions.width, 100);
  const depth = safeDimension(dimensions.depth, 60);
  const height = safeDimension(dimensions.height, 40);
  const largest = Math.max(width, depth, height, 1);
  const scale = 2.25 / largest;

  return {
    width: width * scale,
    depth: depth * scale,
    height: height * scale,
    thickness: Math.max(0.014, safeDimension(dimensions.thickness, 1.5) * scale),
  };
}

function resolveProductKind(model: NormalizedPackagingModel): ProductKind {
  const identity = [model.name, model.title, model.family, model.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/mailer|shipping|shipper|postal|e-commerce/.test(identity)) return "mailer";
  if (/reverse tuck|straight tuck|tuck end|folding carton|carton/.test(identity)) return "tuck";
  if (/rigid|lid.off|gift box|greyboard|grayboard/.test(identity)) return "rigid";
  if (/display|counter|shelf ready|presentation tray/.test(identity)) return "display";
  if (/gable|handle|carry box/.test(identity)) return "gable";
  return "generic";
}

function Panel({
  size,
  position,
  rotation = [0, 0, 0],
  material,
}: {
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  material: THREE.Material;
}) {
  return (
    <mesh material={material} position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function MailerBox({ size, fold, outer, inner }: ModelProps) {
  const { width: w, depth: d, height: h, thickness: t } = size;
  const open = 1 - fold;
  const dustWidth = Math.min(w * 0.2, d * 0.32);

  return (
    <group position={[0, -h * 0.05, 0]} rotation={[0, 0.28, 0]}>
      <Panel size={[w, t, d]} position={[0, -h / 2, 0]} material={inner} />
      <Panel size={[w, h, t]} position={[0, 0, -d / 2]} material={outer} />
      <Panel size={[t, h, d]} position={[-w / 2, 0, 0]} material={outer} />
      <Panel size={[t, h, d]} position={[w / 2, 0, 0]} material={outer} />
      <Panel size={[w, h * 0.55, t]} position={[0, -h * 0.22, d / 2]} material={outer} />

      <group position={[0, h / 2, -d / 2]} rotation={[-open * 1.38, 0, 0]}>
        <Panel size={[w, t, d]} position={[0, 0, d / 2]} material={outer} />
        <Panel size={[w * 0.84, h * 0.28, t]} position={[0, -h * 0.06, d]} rotation={[-open * 0.2 - 0.08, 0, 0]} material={outer} />
        <Panel size={[dustWidth, h * 0.34, t]} position={[-w / 2 + dustWidth / 2, -h * 0.08, d * 0.78]} rotation={[-0.12, 0.24, 0]} material={outer} />
        <Panel size={[dustWidth, h * 0.34, t]} position={[w / 2 - dustWidth / 2, -h * 0.08, d * 0.78]} rotation={[-0.12, -0.24, 0]} material={outer} />
      </group>
    </group>
  );
}

function TuckBox({ size, fold, outer, inner }: ModelProps) {
  const { width: w, depth: d, height: h, thickness: t } = size;
  const open = 1 - fold;
  const dust = Math.min(d * 0.62, w * 0.3);

  return (
    <group rotation={[0, 0.4, 0]}>
      <Panel size={[w, t, d]} position={[0, -h / 2, 0]} material={inner} />
      <Panel size={[w, h, t]} position={[0, 0, -d / 2]} material={outer} />
      <Panel size={[w, h, t]} position={[0, 0, d / 2]} material={outer} />
      <Panel size={[t, h, d]} position={[-w / 2, 0, 0]} material={outer} />
      <Panel size={[t, h, d]} position={[w / 2, 0, 0]} material={outer} />

      <group position={[0, h / 2, -d / 2]} rotation={[-open * 1.25, 0, 0]}>
        <Panel size={[w, t, d]} position={[0, 0, d / 2]} material={outer} />
        <Panel size={[w * 0.88, h * 0.2, t]} position={[0, -h * 0.06, d]} rotation={[-open * 0.24 - 0.1, 0, 0]} material={outer} />
      </group>

      <group position={[-w / 2, h / 2, 0]} rotation={[0, 0, open * 1.12]}>
        <Panel size={[dust, t, d * 0.8]} position={[-dust / 2, 0, 0]} material={inner} />
      </group>
      <group position={[w / 2, h / 2, 0]} rotation={[0, 0, -open * 1.12]}>
        <Panel size={[dust, t, d * 0.8]} position={[dust / 2, 0, 0]} material={inner} />
      </group>

      <group position={[0, -h / 2, d / 2]} rotation={[open * 1.15, 0, 0]}>
        <Panel size={[w, t, d]} position={[0, 0, -d / 2]} material={outer} />
        <Panel size={[w * 0.84, h * 0.18, t]} position={[0, h * 0.05, -d]} rotation={[open * 0.22 + 0.1, 0, 0]} material={outer} />
      </group>
    </group>
  );
}

function RigidBox({ size, fold, outer, inner }: ModelProps) {
  const { width: w, depth: d, height: h, thickness: t } = size;
  const open = 1 - fold;
  const lidHeight = Math.max(h * 0.42, t * 2.4);
  const lidWidth = w + t * 2.4;
  const lidDepth = d + t * 2.4;

  return (
    <group rotation={[0, 0.3, 0]}>
      <Panel size={[w, t, d]} position={[0, -h / 2, 0]} material={inner} />
      <Panel size={[w, h, t]} position={[0, 0, -d / 2]} material={outer} />
      <Panel size={[w, h, t]} position={[0, 0, d / 2]} material={outer} />
      <Panel size={[t, h, d]} position={[-w / 2, 0, 0]} material={outer} />
      <Panel size={[t, h, d]} position={[w / 2, 0, 0]} material={outer} />

      <group position={[open * w * 0.2, h / 2 + lidHeight / 2 + t + open * h * 0.8, -open * d * 0.15]} rotation={[-open * 0.25, 0, open * 0.15]}>
        <Panel size={[lidWidth, t, lidDepth]} position={[0, lidHeight / 2, 0]} material={inner} />
        <Panel size={[lidWidth, lidHeight, t]} position={[0, 0, -lidDepth / 2]} material={outer} />
        <Panel size={[lidWidth, lidHeight, t]} position={[0, 0, lidDepth / 2]} material={outer} />
        <Panel size={[t, lidHeight, lidDepth]} position={[-lidWidth / 2, 0, 0]} material={outer} />
        <Panel size={[t, lidHeight, lidDepth]} position={[lidWidth / 2, 0, 0]} material={outer} />
      </group>
    </group>
  );
}

function DisplayBox({ size, fold, outer, inner }: ModelProps) {
  const { width: w, depth: d, height: h, thickness: t } = size;
  const open = 1 - fold;
  const trayHeight = Math.max(h * 0.34, 0.36);
  const backHeight = Math.max(h * 0.9, trayHeight * 1.7);

  return (
    <group rotation={[0, 0.3, 0]}>
      <Panel size={[w, t, d]} position={[0, -trayHeight / 2, 0]} material={inner} />
      <group position={[0, trayHeight / 2, -d / 2]} rotation={[-open * 1.18, 0, 0]}>
        <Panel size={[w, backHeight, t]} position={[0, backHeight / 2, 0]} material={outer} />
      </group>
      <Panel size={[t, trayHeight, d]} position={[-w / 2, 0, 0]} material={outer} />
      <Panel size={[t, trayHeight, d]} position={[w / 2, 0, 0]} material={outer} />
      <Panel size={[w, trayHeight * 0.34, t]} position={[0, -trayHeight * 0.33, d / 2]} material={outer} />
      <Panel size={[w * 0.15, trayHeight * 0.7, t]} position={[-w * 0.425, -trayHeight * 0.08, d / 2]} material={outer} />
      <Panel size={[w * 0.15, trayHeight * 0.7, t]} position={[w * 0.425, -trayHeight * 0.08, d / 2]} material={outer} />
    </group>
  );
}

function GableBox({ size, fold, outer, inner }: ModelProps) {
  const { width: w, depth: d, height: h, thickness: t } = size;
  const open = 1 - fold;
  const bodyHeight = h * 0.68;
  const roofHeight = Math.max(h - bodyHeight, 0.32);
  const roofLength = Math.hypot(d / 2, roofHeight);
  const slope = Math.atan2(roofHeight, d / 2);

  return (
    <group rotation={[0, 0.36, 0]}>
      <Panel size={[w, t, d]} position={[0, -bodyHeight / 2, 0]} material={inner} />
      <Panel size={[w, bodyHeight, t]} position={[0, 0, -d / 2]} material={outer} />
      <Panel size={[w, bodyHeight, t]} position={[0, 0, d / 2]} material={outer} />
      <Panel size={[t, bodyHeight, d]} position={[-w / 2, 0, 0]} material={outer} />
      <Panel size={[t, bodyHeight, d]} position={[w / 2, 0, 0]} material={outer} />

      <group position={[0, bodyHeight / 2, -d / 2]} rotation={[-open * 0.66, 0, 0]}>
        <Panel size={[w, t, roofLength]} position={[0, roofHeight / 2, d / 4]} rotation={[-slope, 0, 0]} material={outer} />
      </group>
      <group position={[0, bodyHeight / 2, d / 2]} rotation={[open * 0.66, 0, 0]}>
        <Panel size={[w, t, roofLength]} position={[0, roofHeight / 2, -d / 4]} rotation={[slope, 0, 0]} material={outer} />
      </group>

      <Panel size={[w * 0.58, roofHeight * 0.72, t]} position={[0, bodyHeight / 2 + roofHeight * 0.58, -t]} material={outer} />
      <Panel size={[w * 0.58, roofHeight * 0.72, t]} position={[0, bodyHeight / 2 + roofHeight * 0.58, t]} material={outer} />
      <Panel size={[w * 0.28, roofHeight * 0.12, t * 1.6]} position={[0, bodyHeight / 2 + roofHeight * 0.62, 0]} material={inner} />
    </group>
  );
}

interface ModelProps {
  size: GeometrySize;
  fold: number;
  outer: THREE.MeshPhysicalMaterial;
  inner: THREE.MeshPhysicalMaterial;
}

function GenericBox({ size, fold, outer, inner }: ModelProps) {
  return <MailerBox size={size} fold={fold} outer={outer} inner={inner} />;
}

/**
 * Dimension-driven fallback geometry. It is deliberately independent from GLB
 * and knife data so an incomplete product can never leave an empty viewport.
 * Fold progress updates group rotations in place; dimensions are read from the
 * live configurator store rather than the immutable source payload.
 */
export function ProceduralModelBuilder(props: Props) {
  const foldProgress = useConfiguratorStore((state) => state.foldProgress);
  const liveDimensions = useConfiguratorStore((state) => state.dimensions);
  const size = normalizeSize(liveDimensions);
  const kind = resolveProductKind(props.model);

  const outer = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(props.materialColor),
        roughness: props.roughness,
        metalness: props.metalness,
        side: THREE.DoubleSide,
        clearcoat: props.metalness > 0.2 ? 0.38 : 0.08,
        clearcoatRoughness: 0.62,
      }),
    [],
  );
  const inner = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#d2ad74"),
        roughness: Math.max(0.55, props.roughness),
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(() => {
    outer.color.set(props.materialColor);
    outer.roughness = props.roughness;
    outer.metalness = props.metalness;
    outer.clearcoat = props.metalness > 0.2 ? 0.38 : 0.08;
    outer.needsUpdate = true;
  }, [outer, props.materialColor, props.roughness, props.metalness]);

  useEffect(
    () => () => {
      outer.dispose();
      inner.dispose();
    },
    [outer, inner],
  );

  const modelProps: ModelProps = {
    size,
    fold: THREE.MathUtils.clamp(foldProgress, 0, 1),
    outer,
    inner,
  };

  if (kind === "mailer") return <MailerBox {...modelProps} />;
  if (kind === "tuck") return <TuckBox {...modelProps} />;
  if (kind === "rigid") return <RigidBox {...modelProps} />;
  if (kind === "display") return <DisplayBox {...modelProps} />;
  if (kind === "gable") return <GableBox {...modelProps} />;
  return <GenericBox {...modelProps} />;
}
