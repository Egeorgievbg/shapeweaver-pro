import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import type { NormalizedPackagingModel } from "@/integrations/boxcraft/types";
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

/**
 * Strategy B — renders the box from the knife dieline.
 * Each panel becomes an ExtrudeGeometry; children are parented under groups
 * that rotate around their fold hinges. The whole tree is centered and
 * scaled to unit size for the camera fit rig.
 */
export function KnifeRigBuilder(props: KnifeRigProps) {
  const foldProgress = useConfiguratorStore((s) => s.foldProgress);
  const rootRef = useRef<THREE.Group>(null);

  const { root, panelGeometries, sceneScale, dielineSize } = useMemo(() => {
    const graph = buildFoldGraph(props.model);
    const dielineW = props.model.dieline?.totalX ?? 500;
    const dielineH = props.model.dieline?.totalY ?? 500;
    const thickness = props.model.dimensions.thickness ?? 1.5;
    const geoms = new Map<string, ReturnType<typeof buildPanelGeometry>>();
    if (graph) {
      const walk = (n: FoldNode) => {
        const g = buildPanelGeometry(n.panel, {
          thickness,
          dielineWidth: dielineW,
          dielineHeight: dielineH,
        });
        geoms.set(n.panel.id, g);
        n.children.forEach(walk);
      };
      walk(graph.root);
    }
    // Scale so largest side fits ~2 units in scene space
    const maxDim = Math.max(dielineW, dielineH);
    const scale = 2 / maxDim;
    return {
      root: graph?.root,
      panelGeometries: geoms,
      sceneScale: scale,
      dielineSize: { w: dielineW, h: dielineH },
    };
  }, [props.model]);

  // Cleanup geometries on unmount / model change
  useEffect(() => {
    return () => {
      panelGeometries.forEach((g) => g?.geometry.dispose());
    };
  }, [panelGeometries]);

  if (!root) return null;

  return (
    <group
      ref={rootRef}
      scale={sceneScale}
      position={[-dielineSize.w / 2 * sceneScale, dielineSize.h / 2 * sceneScale, 0]}
      // Flip Y so SVG down → Three up
      onUpdate={(g) => g.scale.setY(-Math.abs(g.scale.y))}
    >
      <PanelNode
        node={root}
        geometries={panelGeometries}
        foldProgress={foldProgress}
        artworkTexture={props.artworkTexture}
        materialColor={props.materialColor}
        roughness={props.roughness}
        metalness={props.metalness}
        selectedPanelId={props.selectedPanelId}
        onPanelClick={props.onPanelClick}
        isRoot
      />
    </group>
  );
}

interface PanelNodeProps {
  node: FoldNode;
  geometries: Map<string, ReturnType<typeof buildPanelGeometry>>;
  foldProgress: number;
  artworkTexture: THREE.Texture | null;
  materialColor: string;
  roughness: number;
  metalness: number;
  selectedPanelId: string | null;
  onPanelClick: (id: string) => void;
  isRoot?: boolean;
}

function PanelNode(props: PanelNodeProps) {
  const { node, foldProgress } = props;
  const groupRef = useRef<THREE.Group>(null);
  const geo = props.geometries.get(node.panel.id) ?? null;
  const isSelected = props.selectedPanelId === node.panel.id;

  // Compute hinge transform for this node (relative to parent)
  const { hingePivot, hingeAxis } = useMemo(() => {
    if (!node.incomingFold) return { hingePivot: new THREE.Vector3(), hingeAxis: new THREE.Vector3(1, 0, 0) };
    const f = node.incomingFold;
    const mid = new THREE.Vector3((f.from[0] + f.to[0]) / 2, (f.from[1] + f.to[1]) / 2, 0);
    const axis = new THREE.Vector3(f.to[0] - f.from[0], f.to[1] - f.from[1], 0).normalize();
    return { hingePivot: mid, hingeAxis: axis };
  }, [node.incomingFold]);

  // Apply hinge rotation each frame based on foldProgress
  useEffect(() => {
    if (!groupRef.current) return;
    if (!node.incomingFold) return;
    const angle = foldProgress * (Math.PI / 2) * (node.incomingFold.direction ?? 1);
    groupRef.current.setRotationFromAxisAngle(hingeAxis, angle);
  }, [foldProgress, node.incomingFold, hingeAxis]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(props.materialColor),
      roughness: props.roughness,
      metalness: props.metalness,
      side: THREE.DoubleSide,
    });
    if (props.artworkTexture) {
      mat.map = props.artworkTexture;
      mat.needsUpdate = true;
    }
    return mat;
  }, [props.materialColor, props.roughness, props.metalness, props.artworkTexture]);

  useEffect(() => () => material.dispose(), [material]);

  // Position mesh relative to hinge pivot
  const meshOffset: [number, number, number] = node.incomingFold
    ? [-hingePivot.x, -hingePivot.y, 0]
    : [0, 0, 0];

  return (
    <group ref={groupRef} position={node.incomingFold ? [hingePivot.x, hingePivot.y, 0] : [0, 0, 0]}>
      {geo && (
        <mesh
          geometry={geo.geometry}
          material={material}
          position={meshOffset}
          onClick={(e) => {
            e.stopPropagation();
            props.onPanelClick(node.panel.id);
          }}
        >
          {isSelected && (
            <meshBasicMaterial attach="material" color="#c9a34a" wireframe transparent opacity={0.6} />
          )}
        </mesh>
      )}
      {node.children.map((child) => (
        <PanelNode key={child.panel.id} {...props} node={child} isRoot={false} />
      ))}
    </group>
  );
}
