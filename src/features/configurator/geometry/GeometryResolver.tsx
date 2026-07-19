import { useEffect, useState } from "react";
import type { NormalizedPackagingModel } from "@/integrations/boxcraft/types";
import { KnifeRigBuilder } from "./KnifeRigBuilder";
import { ProceduralModelBuilder } from "./ProceduralModelBuilder";
import { GltfModelBuilder } from "./GltfModelBuilder";
import * as THREE from "three";

interface Props {
  model: NormalizedPackagingModel;
  artworkTexture: THREE.Texture | null;
  materialColor: string;
  roughness: number;
  metalness: number;
  selectedPanelId: string | null;
  onPanelClick: (id: string) => void;
}

/**
 * Resolves the best available geometry without ever returning an empty
 * viewport. GLB is attempted first, a valid dieline becomes a fold rig, and
 * every incomplete product receives a real procedural Three.js package.
 */
export function GeometryResolver(props: Props) {
  const [gltfFailed, setGltfFailed] = useState(false);

  useEffect(() => {
    setGltfFailed(false);
  }, [props.model.id, props.model.gltf?.url]);

  const strategy = props.model.geometryStrategy;
  const hasGltf = strategy === "gltf" && Boolean(props.model.gltf?.url) && !gltfFailed;
  const hasKnifeGeometry =
    props.model.panels.length > 0 &&
    props.model.folds.length > 0 &&
    props.model.panels.some((panel) => Boolean(panel.svgPath?.trim()));

  if (hasGltf) {
    return (
      <GltfModelBuilder
        model={props.model}
        onFail={() => setGltfFailed(true)}
      />
    );
  }

  if (hasKnifeGeometry) {
    return <KnifeRigBuilder {...props} />;
  }

  return (
    <ProceduralModelBuilder
      model={props.model}
      materialColor={props.materialColor}
      roughness={props.roughness}
      metalness={props.metalness}
    />
  );
}
