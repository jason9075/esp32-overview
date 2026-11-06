import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { BoardPackage } from '../data/boards/types';
import { assetUrl } from '../utils/html';

// High-speed raycasting via BVH
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export interface LoadedBoardModel {
  rootGroup: THREE.Group;
  interactiveMeshes: THREE.Object3D[];
  componentMeshes: Map<string, THREE.Object3D[]>;
  meshByKey: Map<string, THREE.Object3D>;
  dispose: () => void;
}

export async function loadBoardModel(
  boardPkg: BoardPackage,
  renderer: THREE.WebGLRenderer,
  onProgress?: (ratio: number) => void
): Promise<LoadedBoardModel> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loader.loadAsync(assetUrl(boardPkg.spec.glbAssetPath), (evt) => {
    if (evt.lengthComputable && evt.total > 0 && onProgress) {
      onProgress(evt.loaded / evt.total);
    }
  });

  const rootGroup = new THREE.Group();
  rootGroup.name = `${boardPkg.id}_root`;
  rootGroup.add(gltf.scene);

  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const interactiveMeshes: THREE.Object3D[] = [];
  const componentMeshes = new Map<string, THREE.Object3D[]>();
  const meshByKey = new Map<string, THREE.Object3D>();

  const registerComponentObject = (componentId: string, obj: THREE.Object3D) => {
    const list = componentMeshes.get(componentId) ?? [];
    if (!list.includes(obj)) {
      list.push(obj);
      componentMeshes.set(componentId, list);
    }
  };

  gltf.scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;

    const mats = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of mats) {
      if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
        mat.map.anisotropy = maxAnisotropy;
        mat.map.needsUpdate = true;
      }
    }

    let key = node.name;
    let groupRoot: THREE.Object3D = node;
    if (!boardPkg.placements[key] && node.parent && boardPkg.placements[node.parent.name]) {
      key = node.parent.name;
      groupRoot = node.parent;
    }

    const placement = boardPkg.placements[key];
    const componentId = placement?.componentId ?? 'board';
    const isPCB = placement?.isPCB ?? (key === 'pcb');
    const isAuxiliaryPassive = placement?.isAuxiliaryPassive ?? false;

    const pickData = {
      placementKey: key,
      componentId,
      subLabel: placement?.subLabel,
      side: placement?.side ?? 'top',
      isPCB,
      isAuxiliaryPassive,
    };
    node.userData = { ...node.userData, ...pickData };
    if (groupRoot !== node) {
      groupRoot.userData = { ...groupRoot.userData, ...pickData };
    }

    node.geometry.computeBoundsTree();

    if (!meshByKey.has(key)) {
      meshByKey.set(key, groupRoot);
    }

    interactiveMeshes.push(node);
    registerComponentObject(componentId, groupRoot);
  });

  // Always associate the PCB substrate with the board overview
  const pcbObj = meshByKey.get('pcb');
  if (pcbObj) {
    registerComponentObject('board', pcbObj);
  }

  const dispose = () => {
    gltf.scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.disposeBoundsTree();
        node.geometry.dispose();
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const mat of mats) {
          mat.dispose();
        }
      }
    });
    rootGroup.removeFromParent();
  };

  return {
    rootGroup,
    interactiveMeshes,
    componentMeshes,
    meshByKey,
    dispose,
  };
}
