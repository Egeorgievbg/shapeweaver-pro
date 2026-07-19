import * as THREE from "three";
import { useEffect, useMemo } from "react";
import type { NormalizedPackagingModel, PackagingPanel } from "@/integrations/boxcraft/types";
import { buildFoldGraph, type FoldNode } from "./FoldGraph";
import { buildPanelGeometry } from "./PanelGeometry";
import { useConfiguratorStore } from "@/stores/configurator";

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

/**
 * Strategy B — renders the box from the knife dieline.
 * Geometry remains in the canonical global dieline coordinate system. Each
 * nested hinge converts its global pivot into the parent group's local origin,
 * so multi-level folds accumulate correctly.
 */
export function KnifeRigBuilder(props: KnifeRigProps) {
  const foldProgress = useConfiguratorStore((state) => state.foldProgress);

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

  if (!root) return null;

  return (
    <group
      scale={[sceneScale, -sceneScale, sceneScale]}
      position={[
        (-dielineSize.width / 2) * sceneScale,
        (dielineSize.height / 2) * sceneScale,
        0,
      ]}
    >
      <PanelNode
        node={root}
        parentOrigin={new THREE.Vector3(0, 0, 0)}
        geometries={panelGeometries}
        foldProgress={foldProgress}
        material={material}
        selectedPanelId={props.selectedPanelId}
        onPanelClick={props.onPanelClick}
        isRoot
      />

      {orphans.map((panel) => (
        <FlatPanel
          key={`orphan-${panel.id}`}
          panel={panel}
          geometry={panelGeometries.get(panel.id) ?? null}
          material={material}
          selected={props.selectedPanelId === panel.id}
          onPanelClick={props.onPanelClick}
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
  material: THREE.Material;
  selectedPanelId: string | null;
  onPanelClick: (id: string) => void;
  isRoot?: boolean;
}

function PanelNode(props: PanelNodeProps) {
  const incomingFold = props.node.incomingFold;
  const hinge = useMemo(() => {
    if (!incomingFold) {
      return {
        globalPivot: new THREE.Vector3(0, 0, 0),
        localPivot: new THREE.Vector3(0, 0, 0),
        axis: new THREE.Vector3(1, 0, 0),
        angle: 0,
        quaternion: new THREE.Quaternion(),
      };
    }

    const globalPivot = new THREE.Vector3(
      (incomingFold.from[0] + incomingFold.to[0]) / 2,
      (incomingFold.from[1] + incomingFold.to[1]) / 2,
      0,
    );
    const localPivot = globalPivot.clone().sub(props.parentOrigin);
    const axis = new THREE.Vector3(
      incomingFold.to[0] - incomingFold.from[0],
      incomingFold.to[1] - incomingFold.from[1],
      0,
    );
    if (axis.lengthSq() < 1e-8) axis.set(1, 0, 0);
    axis.normalize();

    const openAngle = incomingFold.openAngle ?? 0;
    const closedAngle = incomingFold.closedAngle ?? Math.PI / 2;
    const angle =
      THREE.MathUtils.lerp(openAngle, closedAngle, props.foldProgress) *
      (incomingFold.direction ?? 1);
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);

    return { globalPivot, localPivot, axis, angle, quaternion };
  }, [incomingFold, props.foldProgress, props.parentOrigin]);

  const geometry = props.geometries.get(props.node.panel.id) ?? null;
  const selected = props.selectedPanelId === props.node.panel.id;
  const groupPosition: [number, number, number] = props.isRoot
    ? [0, 0, 0]
    : [hinge.localPivot.x, hinge.localPivot.y, hinge.localPivot.z];
  const meshPosition: [number, number, number] = props.isRoot
    ? [0, 0, 0]
    : [-hinge.globalPivot.x, -hinge.globalPivot.y, -hinge.globalPivot.z];

  return (
    <group position={groupPosition} quaternion={hinge.quaternion}>
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
          <meshBasicMaterial color="#c9a34a" wireframe transparent opacity={0.62} depthWrite={false} />
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
}: {
  panel: PackagingPanel;
  geometry: ReturnType<typeof buildPanelGeometry>;
  material: THREE.Material;
  selected: boolean;
  onPanelClick: (id: string) => void;
}) {
  if (!geometry) return null;
  return (
    <SelectablePanelMesh
      panelId={panel.id}
      geometry={geometry.geometry}
      position={[0, 0, 0]}
      material={material}
      selected={selected}
      onPanelClick={onPanelClick}
    />
  );
}
