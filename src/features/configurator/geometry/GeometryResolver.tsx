import { useState } from "react";
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
 * Chooses the correct geometry builder based on model.geometryStrategy,
 * with a runtime downgrade path when GLB load fails.
 */
export function GeometryResolver(props: Props) {
  const [gltfFailed, setGltfFailed] = useState(false);
  const strategy = props.model.geometryStrategy;

  if (strategy === "gltf" && !gltfFailed) {
    return <GltfModelBuilder model={props.model} onFail={() => setGltfFailed(true)} />;
  }
  if (strategy === "knife-rig" || (strategy === "gltf" && gltfFailed)) {
    if (props.model.panels.length > 0 && props.model.folds.length > 0) {
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
  if (strategy === "procedural") {
    return (
      <ProceduralModelBuilder
        model={props.model}
        materialColor={props.materialColor}
        roughness={props.roughness}
        metalness={props.metalness}
      />
    );
  }
  return null;
}
