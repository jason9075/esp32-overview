import * as THREE from 'three';

export interface PickHit {
  componentId: string;
  placementKey?: string;
  subLabel?: string;
  object: THREE.Object3D;
  point: THREE.Vector3;
}

export class BoardPicker {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly camera: THREE.PerspectiveCamera;
  private interactiveMeshes: THREE.Object3D[];

  constructor(camera: THREE.PerspectiveCamera, interactiveMeshes: THREE.Object3D[]) {
    this.camera = camera;
    this.interactiveMeshes = interactiveMeshes;
  }

  public setInteractiveMeshes(meshes: THREE.Object3D[]): void {
    this.interactiveMeshes = meshes;
  }

  public pick(clientX: number, clientY: number, domRect: DOMRect): PickHit | null {
    this.pointerNdc.x = ((clientX - domRect.left) / domRect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - domRect.top) / domRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    // Single BVH-accelerated raycast; the nearest PCB hit acts as the occluder for parts on the far side.
    const allHits = this.raycaster.intersectObjects(this.interactiveMeshes, false);
    if (allHits.length === 0) return null;

    const pcbHit = allHits.find((hit) => hit.object.userData?.isPCB);
    const pcbDist = pcbHit ? pcbHit.distance : Infinity;

    const visibleHits = allHits.filter((hit) => {
      if (hit.object.userData?.isPCB) return true;
      return hit.distance <= pcbDist + 0.35;
    });

    if (visibleHits.length === 0) return null;

    const primaryHit =
      visibleHits.find(
        (hit) =>
          hit.object.userData?.componentId &&
          hit.object.userData.componentId !== 'board' &&
          !hit.object.userData?.isAuxiliaryPassive
      ) ?? visibleHits[0];

    const obj = primaryHit.object;
    const componentId = (obj.userData?.componentId as string) || 'board';
    const placementKey = obj.userData?.placementKey as string | undefined;
    const subLabel = obj.userData?.subLabel as string | undefined;

    return {
      componentId,
      placementKey,
      subLabel,
      object: obj,
      point: primaryHit.point,
    };
  }
}
