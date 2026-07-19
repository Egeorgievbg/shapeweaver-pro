import { useEffect, useState } from "react";
import * as THREE from "three";
import type { NormalizedPackagingModel } from "@/integrations/boxcraft/types";
import { GltfModelBuilder } from "./GltfModelBuilder";
import { KnifeRigBuilder } from "./KnifeRigBuilder";
import { ProceduralModelBuilder } from "./ProceduralModelBuilder";

interface Props {
  model: NormalizedPackagingModel;
  artworkTexture: THREE.Texture | null;
  materialColor: string;
  roughness: number;
  metalness: number;
  selectedPanelId: string | null;
  onPanelClick: (id: string) => void;
}

export function ManifestGeometryResolver(props: Props) {
  const [gltfFailed, setGltfFailed] = useState(false);

  useEffect(() => {
    setGltfFailed(false);
  }, [props.model.id, props.model.gltf?.url]);

  const hasGltf =
    props.model.geometryStrategy === "gltf" && Boolean(props.model.gltf?.url) && !gltfFailed;
  const hasDielineFaces =
    props.model.panels.length > 0 &&
    props.model.panels.some((panel) => Boolean(panel.svgPath?.trim()));

  if (hasGltf) {
    return <GltfModelBuilder model={props.model} onFail={() => setGltfFailed(true)} />;
  }
  if (hasDielineFaces) {
    return <KnifeRigBuilder {...props} />;
  }
  if (
    props.model.geometryStrategy === "unsupported" ||
    props.model.geometryStrategy === "preview-only"
  ) {
    return null;
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
