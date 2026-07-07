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
  clearcoat: number;
  clearcoatRoughness: number;
  selectedPanelId: string | null;
  onPanelClick: (id: string) => void;
}

/**
 * Strategy B — renders the box from the knife dieline.
 * Each panel becomes an ExtrudeGeometry; children are parented under groups
 * that rotate around their fold hinges. The whole tree is centered and
 * scaled to unit size for the camera fit rig.
 *
 * Coordinate system:
 *  - Root group: scale=[s, -s, s] flips SVG Y-down into Three.js Y-up.
 *    Position offsets the dieline centre to the world origin.
 *  - Each PanelNode group is positioned relative to its PARENT group's
 *    origin (= parent's absolute hinge position in dieline space), NOT the
 *    global dieline origin. This is critical for correct fold animation in
 *    multi-level hierarchies (e.g. flap panels on a tuck-end box).
 */
export function KnifeRigBuilder(props: KnifeRigProps) {
  const foldProgress = useConfiguratorStore((s) => s.foldProgress);

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

  // Use explicit scale array to flip Y (SVG Y-down → Three.js Y-up).
  // position centres the dieline at the world origin.
  return (
    <group
      scale={[sceneScale, -sceneScale, sceneScale]}
      position={[-dielineSize.w / 2 * sceneScale, dielineSize.h / 2 * sceneScale, 0]}
    >
      <PanelNode
        node={root}
        geometries={panelGeometries}
        foldProgress={foldProgress}
        artworkTexture={props.artworkTexture}
        materialColor={props.materialColor}
        roughness={props.roughness}
        metalness={props.metalness}
        clearcoat={props.clearcoat}
        clearcoatRoughness={props.clearcoatRoughness}
        selectedPanelId={props.selectedPanelId}
        onPanelClick={props.onPanelClick}
        parentAbsHinge={[0, 0]}
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
  clearcoat: number;
  clearcoatRoughness: number;
  selectedPanelId: string | null;
  onPanelClick: (id: string) => void;
  /**
   * Absolute dieline position (in mm) of the parent group's origin.
   * Root panels pass [0, 0]. Used to compute positions relative to the
   * parent group's local space instead of global dieline space.
   */
  parentAbsHinge: [number, number];
}

function PanelNode(props: PanelNodeProps) {
  const { node, foldProgress, parentAbsHinge } = props;
  const groupRef = useRef<THREE.Group>(null);
  const geo = props.geometries.get(node.panel.id) ?? null;
  const isSelected = props.selectedPanelId === node.panel.id;

  // Absolute hinge midpoint in dieline (mm) space.
  const absPivot = useMemo<[number, number]>(() => {
    if (!node.incomingFold) return [0, 0];
    const f = node.incomingFold;
    return [(f.from[0] + f.to[0]) / 2, (f.from[1] + f.to[1]) / 2];
  }, [node.incomingFold]);

  // Rotation axis in dieline space (SVG XY plane).
  const hingeAxis = useMemo<THREE.Vector3>(() => {
    if (!node.incomingFold) return new THREE.Vector3(1, 0, 0);
    const f = node.incomingFold;
    return new THREE.Vector3(f.to[0] - f.from[0], f.to[1] - f.from[1], 0).normalize();
  }, [node.incomingFold]);

  /**
   * GROUP POSITION — relative to the parent group's origin.
   *
   * The parent's origin sits at `parentAbsHinge` in dieline space.
   * This node's hinge is at `absPivot` in dieline space.
   * ∴ relative position = absPivot - parentAbsHinge.
   *
   * This ensures correct world-space pivot points at all nesting depths.
   */
  const groupPos: [number, number, number] = node.incomingFold
    ? [absPivot[0] - parentAbsHinge[0], absPivot[1] - parentAbsHinge[1], 0]
    : [0, 0, 0];

  /**
   * MESH OFFSET — places the geometry (whose vertices are in absolute
   * dieline coords) back to the correct absolute position.
   *
   * The group sits at absPivot in dieline space; subtracting absPivot in
   * the mesh's local space lands the geometry at dieline origin (0,0),
   * which the root group transform then maps correctly to world space.
   */
  const meshOffset: [number, number, number] = node.incomingFold
    ? [-absPivot[0], -absPivot[1], 0]
    : [0, 0, 0];

  // Apply hinge rotation whenever foldProgress changes.
  useEffect(() => {
    if (!groupRef.current || !node.incomingFold) return;
    const angle = foldProgress * (Math.PI / 2) * (node.incomingFold.direction ?? 1);
    groupRef.current.setRotationFromAxisAngle(hingeAxis, angle);
  }, [foldProgress, node.incomingFold, hingeAxis]);

  // Use MeshPhysicalMaterial so clearcoat is actually rendered.
  const material = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(props.materialColor),
      roughness: props.roughness,
      metalness: props.metalness,
      clearcoat: props.clearcoat,
      clearcoatRoughness: props.clearcoatRoughness,
      // Highlight selected panels via emissive rather than a conflicting child material.
      emissive: new THREE.Color(isSelected ? "#5a4010" : "#000000"),
      emissiveIntensity: isSelected ? 0.6 : 0,
      side: THREE.DoubleSide,
    });
    if (props.artworkTexture) {
      mat.map = props.artworkTexture;
      mat.needsUpdate = true;
    }
    return mat;
  }, [
    props.materialColor,
    props.roughness,
    props.metalness,
    props.clearcoat,
    props.clearcoatRoughness,
    props.artworkTexture,
    isSelected,
  ]);

  useEffect(() => () => material.dispose(), [material]);

  // Pass this node's absolute hinge down so children can compute relative positions.
  const childParentAbsHinge: [number, number] = node.incomingFold ? absPivot : parentAbsHinge;

  return (
    <group ref={groupRef} position={groupPos}>
      {geo && (
        <mesh
          geometry={geo.geometry}
          material={material}
          position={meshOffset}
          onClick={(e) => {
            e.stopPropagation();
            props.onPanelClick(node.panel.id);
          }}
        />
      )}
      {node.children.map((child) => (
        <PanelNode
          key={child.panel.id}
          {...props}
          node={child}
          parentAbsHinge={childParentAbsHinge}
        />
      ))}
    </group>
  );
}
