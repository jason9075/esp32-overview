import * as THREE from 'three';
import { GpioPinSpec } from '../data/boards/types';

interface SavedMaterialProps {
  emissive: THREE.Color;
  emissiveIntensity: number;
  opacity: number;
}

export class HighlightManager {
  private readonly scene: THREE.Scene;
  private readonly componentMeshes: Map<string, THREE.Object3D[]>;
  private readonly meshByKey: Map<string, THREE.Object3D>;
  private readonly savedMaterials = new Map<THREE.Material, SavedMaterialProps>();
  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private selectedMeshKey: string | null = null;
  private selectionBoxHelper: THREE.Box3Helper | null = null;
  private gpioPinMarkerGroup: THREE.Group | null = null;

  constructor(
    scene: THREE.Scene,
    componentMeshes: Map<string, THREE.Object3D[]>,
    meshByKey: Map<string, THREE.Object3D>
  ) {
    this.scene = scene;
    this.componentMeshes = componentMeshes;
    this.meshByKey = meshByKey;
    this.isolateComponentMaterials();
  }

  private isolateComponentMaterials(): void {
    for (const [, objects] of this.componentMeshes.entries()) {
      for (const obj of objects) {
        obj.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) => this.cloneAndSaveMaterial(m));
          } else if (child.material) {
            child.material = this.cloneAndSaveMaterial(child.material);
          }
        });
      }
    }
  }

  private cloneAndSaveMaterial(mat: THREE.Material): THREE.Material {
    const cloned = mat.clone();
    if (cloned instanceof THREE.MeshStandardMaterial) {
      this.savedMaterials.set(cloned, {
        emissive: cloned.emissive.clone(),
        emissiveIntensity: cloned.emissiveIntensity,
        opacity: cloned.opacity,
      });
    }
    return cloned;
  }

  public setHovered(componentId: string | null): void {
    if (this.hoveredId === componentId) return;
    const prev = this.hoveredId;
    this.hoveredId = componentId;
    if (prev) this.refreshComponentVisual(prev);
    if (componentId) this.refreshComponentVisual(componentId);
  }

  public setSelected(componentId: string | null, specificMeshKey: string | null = null): void {
    const prev = this.selectedId;
    this.selectedId = componentId;
    this.selectedMeshKey = specificMeshKey;
    if (componentId && !componentId.includes('pin_header') && componentId !== 'gpio_header') {
      this.setGpioPinMarker(null);
    }
    if (prev) this.refreshComponentVisual(prev);
    if (componentId) this.refreshComponentVisual(componentId);
    this.updateSelectionOutline(componentId, specificMeshKey);
  }

  public setGpioPinMarker(pinSpec: GpioPinSpec | null): THREE.Object3D | null {
    if (this.gpioPinMarkerGroup) {
      this.scene.remove(this.gpioPinMarkerGroup);
      this.gpioPinMarkerGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });
      this.gpioPinMarkerGroup = null;
    }

    if (!pinSpec) return null;

    const [px, py, pz] = pinSpec.position3D;
    const pinColor = new THREE.Color(pinSpec.color);
    const group = new THREE.Group();
    group.position.set(px, py, pz);

    // Glowing pin sleeve around the specific 2.54mm header post
    const sleeveGeo = new THREE.CylinderGeometry(0.85, 0.85, 5.5, 16);
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: pinColor,
      emissive: pinColor,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.75,
      roughness: 0.2,
      metalness: 0.1,
    });
    const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    group.add(sleeveMesh);

    // Beacon sphere above the pin tip
    const tipGeo = new THREE.SphereGeometry(1.0, 16, 16);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: pinColor,
      emissiveIntensity: 1.2,
      roughness: 0.15,
    });
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);
    tipMesh.position.set(0, 3.6, 0);
    group.add(tipMesh);

    this.gpioPinMarkerGroup = group;
    this.scene.add(group);
    return group;
  }

  private refreshComponentVisual(componentId: string): void {
    if (componentId === 'board') return;

    const objects = this.componentMeshes.get(componentId);
    if (!objects) return;

    const isSelected = this.selectedId === componentId;
    const isHovered = this.hoveredId === componentId;

    for (const obj of objects) {
      const isSynthetic = Boolean(obj.userData?.isSyntheticZone);
      const isFocusedSubMesh =
        !this.selectedMeshKey || obj.userData?.placementKey === this.selectedMeshKey;

      obj.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
          const saved = this.savedMaterials.get(mat);
          if (!saved) continue;

          if (isSelected) {
            mat.emissive.setHex(isFocusedSubMesh ? 0xe73525 : 0x5e81ac);
            mat.emissiveIntensity = isSynthetic ? 0.65 : isFocusedSubMesh ? 0.45 : 0.22;
            if (isSynthetic) mat.opacity = 0.45;
          } else if (isHovered) {
            mat.emissive.setHex(0xd08770);
            mat.emissiveIntensity = isSynthetic ? 0.55 : 0.32;
            if (isSynthetic) mat.opacity = 0.35;
          } else {
            mat.emissive.copy(saved.emissive);
            mat.emissiveIntensity = saved.emissiveIntensity;
            if (isSynthetic) mat.opacity = saved.opacity;
          }
        }
      });
    }
  }

  private updateSelectionOutline(componentId: string | null, specificMeshKey: string | null): void {
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }

    if (!componentId || componentId === 'board') return;

    const targetObjects =
      specificMeshKey && this.meshByKey.has(specificMeshKey)
        ? [this.meshByKey.get(specificMeshKey)!]
        : (this.componentMeshes.get(componentId) ?? []);

    if (targetObjects.length === 0) return;

    const box = new THREE.Box3();
    for (const obj of targetObjects) {
      box.expandByObject(obj);
    }
    if (box.isEmpty()) return;

    box.expandByScalar(0.3);
    this.selectionBoxHelper = new THREE.Box3Helper(box, new THREE.Color(0xe73525));
    this.scene.add(this.selectionBoxHelper);
  }

  public dispose(): void {
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }
    this.setGpioPinMarker(null);
    for (const [mat] of this.savedMaterials.entries()) {
      mat.dispose();
    }
    this.savedMaterials.clear();
  }
}
