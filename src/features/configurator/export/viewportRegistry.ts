import * as THREE from "three";

export interface ExportableViewport {
  root: THREE.Object3D;
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  sourceId: string;
}

let activeViewport: ExportableViewport | null = null;

export function registerExportableViewport(viewport: ExportableViewport) {
  activeViewport = viewport;
  return () => {
    if (activeViewport === viewport) activeViewport = null;
  };
}

export function getExportableViewport(): ExportableViewport {
  if (!activeViewport) {
    throw new Error("The 3D viewport is not ready for export.");
  }
  activeViewport.root.updateWorldMatrix(true, true);
  return activeViewport;
}
