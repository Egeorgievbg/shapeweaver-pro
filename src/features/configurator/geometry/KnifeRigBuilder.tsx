import * as THREE from "three";
import { useEffect, useMemo } from "react";
import type {
  NormalizedPackagingModel,
  PackagingFold,
  PackagingPanel,
} from "@/integrations/boxcraft/types";
import { buildFoldGraph, type FoldNode } from "./FoldGraph";
import { buildPanelGeometry } from "./PanelGeometry";
import { useConfiguratorStore } from "@/stores/configurator";
import {
  evaluatePackagingAnimation,
  type EvaluatedAnimationState,
} from "./AnimationEvaluator";

interface KnifeRigProps {
  model: NormalizedPackagingModel;
  artworkTexture: THREE.Texture | null;
  materialColor: string;
  roughness: number;
  metalness: number;
  selectedPanelId: string | null;
  onPanelClick: (id: string) => void;
}

type PanelGeometryMap = Map<string, ReturnType<typeof buildPanelGeometry>>;
type FoldWithAxis = PackagingFold & { axis?: [number, number, number] };

/**
 * Renders exact source faces from the canonical dieline coordinate system.
 * Recorded animation manifests drive the hinges when available; geometry-only
 * products remain exact flat/static models and are never replaced by a generic box.
 */
export function KnifeRigBuilder(props: KnifeRigProps) {
  const foldProgress = useConfiguratorStore((state) => state.foldProgress);
  const animationState = useMemo(
    () => evaluatePackagingAnimation(props.model, foldProgress),
    [props.model, foldProgress],
  );

  const { root, orphans, panelGeometries, sceneScale, dielineSize } = useMemo(() => {
    const graph = buildFoldGraph(props.model);
    const dielineWidth = Math.max(props.model.dieline?.totalX ?? 0, 1);
    const dielineHeight = Math.max(props.model.dieline?.totalY ?? 0, 1);
    const thickness = Math.max(props.model.dimensions.thickness ?? 1.5, 0.05);
    const geometries: PanelGeometryMap = new Map();

    for (const panel of props.model.panels) {
      geometries.set(
        panel.id,
        buildPanelGeometry(panel, {
          thickness,
          dielineWidth,
          dielineHeight,
        }),
      );
    }

    const maximumDimension = Math.max(dielineWidth, dielineHeight, 1);
    return {
      root: graph?.root,
      orphans: graph?.orphans ?? props.model.panels,
      panelGeometries: geometries,
      sceneScale: 2 / maximumDimension,
      dielineSize: { width: dielineWidth, height: dielineHeight },
    };
  }, [props.model]);

  useEffect(
    () => () => {
      panelGeometries.forEach((result) => result?.geometry.dispose());
    },
    [panelGeometries],
  );

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(props.materialColor),
        roughness: props.roughness,
        metalness: props.metalness,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(() => {
    material.color.set(props.materialColor);
    material.roughness = props.roughness;
    material.metalness = props.metalness;
    material.map = props.artworkTexture;
    material.needsUpdate = true;
  }, [material, props.artworkTexture, props.materialColor, props.roughness, props.metalness]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <group
      scale={[sceneScale, -sceneScale, sceneScale]}
      position={[
        (-dielineSize.width / 2) * sceneScale,
        (dielineSize.height / 2) * sceneScale,
        0,
      ]}
      userData={{
        sourceId: props.model.sourceId,
        geometryStrategy: props.model.geometryStrategy,
        animationMode: animationState.recorded ? "recorded-animation" : "geometry-only",
      }}
    >
      {root && (
        <PanelNode
          node={root}
          parentOrigin={new THREE.Vector3(0, 0, 0)}
          geometries={panelGeometries}
          foldProgress={foldProgress}
          animationState={animationState}
          material={material}
          selectedPanelId={props.selectedPanelId}
          onPanelClick={props.onPanelClick}
          isRoot
        />
      )}

      {orphans.map((panel) => (
        <FlatPanel
          key={`orphan-${panel.id}`}
          panel={panel}
          geometry={panelGeometries.get(panel.id) ?? null}
          material={material}
          selected={props.selectedPanelId === panel.id}
          onPanelClick={props.onPanelClick}
          animationState={animationState}
        />
      ))}
    </group>
  );
}

interface PanelNodeProps {
  node: FoldNode;
  parentOrigin: THREE.Vector3;
  geometries: PanelGeometryMap;
  foldProgress: number;
  animationState: EvaluatedAnimationState;
  material: THREE.Material;
  selectedPanelId: string | null;
  onPanelClick: (id: string) => void;
  isRoot?: boolean;
}

function PanelNode(props: PanelNodeProps) {
  const incomingFold = props.node.incomingFold as FoldWithAxis | undefined;
  const hinge = useMemo(() => {
    if (!incomingFold) {
      return {
        globalPivot: new THREE.Vector3(0, 0, 0),
        localPivot: new THREE.Vector3(0, 0, 0),
        quaternion: new THREE.Quaternion(),
      };
    }

    const globalPivot = new THREE.Vector3(
      (incomingFold.from[0] + incomingFold.to[0]) / 2,
      (incomingFold.from[1] + incomingFold.to[1]) / 2,
      0,
    );
    const localPivot = globalPivot.clone().sub(props.parentOrigin);
    const axis = incomingFold.axis
      ? new THREE.Vector3(...incomingFold.axis)
      : new THREE.Vector3(
          incomingFold.to[0] - incomingFold.from[0],
          incomingFold.to[1] - incomingFold.from[1],
          0,
        );
    if (axis.lengthSq() < 1e-8) axis.set(1, 0, 0);
    axis.normalize();

    const recordedAngle = props.animationState.foldAngles.get(incomingFold.id);
    const genericAngle =
      THREE.MathUtils.lerp(
        incomingFold.openAngle ?? 0,
        incomingFold.closedAngle ?? Math.PI / 2,
        props.foldProgress,
      ) * (incomingFold.direction ?? 1);
    const angle = recordedAngle ?? genericAngle;
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);

    return { globalPivot, localPivot, quaternion };
  }, [incomingFold, props.animationState, props.foldProgress, props.parentOrigin]);

  const geometry = props.geometries.get(props.node.panel.id) ?? null;
  const selected = props.selectedPanelId === props.node.panel.id;
  const panelTransform = props.animationState.panelTransforms.get(props.node.panel.id);
  const basePosition = props.isRoot
    ? new THREE.Vector3(0, 0, 0)
    : hinge.localPivot.clone();
  if (panelTransform) basePosition.add(panelTransform.translation);
  const combinedQuaternion = hinge.quaternion.clone();
  if (panelTransform) combinedQuaternion.multiply(panelTransform.rotation);
  const meshPosition: [number, number, number] = props.isRoot
    ? [0, 0, 0]
    : [-hinge.globalPivot.x, -hinge.globalPivot.y, -hinge.globalPivot.z];

  return (
    <group position={basePosition} quaternion={combinedQuaternion}>
      {geometry && (
        <SelectablePanelMesh
          panelId={props.node.panel.id}
          geometry={geometry.geometry}
          position={meshPosition}
          material={props.material}
          selected={selected}
          onPanelClick={props.onPanelClick}
        />
      )}

      {props.node.children.map((child) => (
        <PanelNode
          key={child.panel.id}
          {...props}
          node={child}
          parentOrigin={incomingFold ? hinge.globalPivot : props.parentOrigin}
          isRoot={false}
        />
      ))}
    </group>
  );
}

function SelectablePanelMesh({
  panelId,
  geometry,
  position,
  material,
  selected,
  onPanelClick,
}: {
  panelId: string;
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  material: THREE.Material;
  selected: boolean;
  onPanelClick: (id: string) => void;
}) {
  return (
    <group position={position}>
      <mesh
        name={`face:${panelId}`}
        userData={{ panelId }}
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onPanelClick(panelId);
        }}
      />
      {selected && (
        <mesh geometry={geometry} scale={[1.002, 1.002, 1.01]}>
          <meshBasicMaterial
            color="#c9a34a"
            wireframe
            transparent
            opacity={0.62}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

function FlatPanel({
  panel,
  geometry,
  material,
  selected,
  onPanelClick,
  animationState,
}: {
  panel: PackagingPanel;
  geometry: ReturnType<typeof buildPanelGeometry>;
  material: THREE.Material;
  selected: boolean;
  onPanelClick: (id: string) => void;
  animationState: EvaluatedAnimationState;
}) {
  if (!geometry) return null;
  const transform = animationState.panelTransforms.get(panel.id);
  return (
    <group
      position={transform?.translation}
      quaternion={transform?.rotation}
    >
      <SelectablePanelMesh
        panelId={panel.id}
        geometry={geometry.geometry}
        position={[0, 0, 0]}
        material={material}
        selected={selected}
        onPanelClick={onPanelClick}
      />
    </group>
  );
}
