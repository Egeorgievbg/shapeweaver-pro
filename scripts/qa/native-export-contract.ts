import * as THREE from "three";
import { exportNative3D } from "../../src/features/configurator/export/nativeExporters";
import { registerExportableViewport } from "../../src/features/configurator/export/viewportRegistry";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = new THREE.Group();
root.name = "fixture-export-root";
root.userData = { sourceId: "fixture-export", runtimeStrategy: "geometry-only" };
const geometry = new THREE.BoxGeometry(1, 2, 3);
const material = new THREE.MeshStandardMaterial({ color: "#c9a34a", roughness: 0.7 });
const mesh = new THREE.Mesh(geometry, material);
mesh.name = "face:fixture-front";
mesh.userData = { panelId: "fixture-front" };
root.add(mesh);
root.updateWorldMatrix(true, true);

const scene = new THREE.Scene();
scene.add(root);
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);

const unregister = registerExportableViewport({
  root,
  scene,
  camera,
  renderer: {} as THREE.WebGLRenderer,
  sourceId: "fixture-export",
});

const results: Record<string, { size: number; type: string }> = {};

try {
  const obj = await exportNative3D("obj");
  const objText = await obj.text();
  assert(objText.includes("v "), "OBJ has no vertices");
  assert(objText.includes("f "), "OBJ has no faces");
  results.obj = { size: obj.size, type: obj.type };

  const stl = await exportNative3D("stl");
  const stlBytes = await stl.arrayBuffer();
  assert(stlBytes.byteLength > 84, "Binary STL is too small");
  assert(new DataView(stlBytes).getUint32(80, true) > 0, "Binary STL has no triangles");
  results.stl = { size: stl.size, type: stl.type };

  const ply = await exportNative3D("ply");
  const plyText = await ply.text();
  assert(plyText.startsWith("ply\nformat ascii 1.0"), "PLY header is invalid");
  assert(plyText.includes("element face"), "PLY has no face declaration");
  results.ply = { size: ply.size, type: ply.type };

  const gltf = await exportNative3D("gltf");
  const gltfJson = JSON.parse(await gltf.text()) as { asset?: { version?: string } };
  assert(gltfJson.asset?.version === "2.0", "glTF asset version is not 2.0");
  results.gltf = { size: gltf.size, type: gltf.type };

  const glb = await exportNative3D("glb");
  const glbBytes = await glb.arrayBuffer();
  const header = new DataView(glbBytes);
  assert(header.getUint32(0, true) === 0x46546c67, "GLB magic is invalid");
  assert(header.getUint32(4, true) === 2, "GLB version is not 2");
  assert(header.getUint32(8, true) === glbBytes.byteLength, "GLB length header is invalid");
  results.glb = { size: glb.size, type: glb.type };
} finally {
  unregister();
  geometry.dispose();
  material.dispose();
}

console.log(JSON.stringify({ sourceId: "fixture-export", results }, null, 2));
