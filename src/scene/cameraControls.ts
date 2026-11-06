import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';

export type CameraPreset = 'overview' | 'top' | 'bottom' | 'type_c' | 'esp32_module';

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
}

const PRESET_POSES: Record<CameraPreset, CameraPose> = {
  overview: {
    position: new THREE.Vector3(-26, 62, 50),
    target: new THREE.Vector3(-2, 1.5, 0),
    up: new THREE.Vector3(0, 1, 0),
  },
  top: {
    position: new THREE.Vector3(0, 80, 0.01),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, -1),
  },
  bottom: {
    position: new THREE.Vector3(0, -80, -0.01),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, -1),
  },
  type_c: {
    position: new THREE.Vector3(-32, 26, 20),
    target: new THREE.Vector3(-18, 1.5, 0),
    up: new THREE.Vector3(0, 1, 0),
  },
  esp32_module: {
    position: new THREE.Vector3(14, 34, 26),
    target: new THREE.Vector3(12, 2.0, 0),
    up: new THREE.Vector3(0, 1, 0),
  },
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class BoardCameraController {
  public readonly controls: ArcballControls;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly target = new THREE.Vector3(0, 1.5, 0);
  private animFrameId: number | null = null;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene: THREE.Scene) {
    this.camera = camera;
    this.controls = new ArcballControls(camera, domElement, scene);
    this.controls.setGizmosVisible(false);
    this.controls.enableAnimations = false;
    this.controls.dampingFactor = 18;
    this.controls.wMax = 12;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 220;

    this.applyPoseImmediate(PRESET_POSES.overview);
  }

  private syncControlsTarget(): void {
    const ctrlWithTarget = this.controls as unknown as { target?: THREE.Vector3 };
    if (ctrlWithTarget.target) {
      ctrlWithTarget.target.copy(this.target);
    }
  }

  public applyPoseImmediate(pose: CameraPose): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.camera.position.copy(pose.position);
    this.camera.up.copy(pose.up);
    this.target.copy(pose.target);
    this.camera.lookAt(this.target);
    this.syncControlsTarget();
    this.controls.update();
  }

  public transitionToPose(endPose: CameraPose, durationMs = 650): Promise<void> {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const startPos = this.camera.position.clone();
    const startTarget = this.target.clone();
    const startUp = this.camera.up.clone();

    const endPos = endPose.position.clone();
    const endTarget = endPose.target.clone();
    const endUp = endPose.up.clone();

    const startTime = performance.now();

    return new Promise((resolve) => {
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1.0);
        const t = easeOutCubic(progress);

        this.camera.position.lerpVectors(startPos, endPos, t);
        this.target.lerpVectors(startTarget, endTarget, t);
        this.camera.up.lerpVectors(startUp, endUp, t).normalize();

        this.camera.lookAt(this.target);
        this.syncControlsTarget();
        this.controls.update();

        if (progress < 1.0) {
          this.animFrameId = requestAnimationFrame(step);
        } else {
          this.animFrameId = null;
          resolve();
        }
      };
      this.animFrameId = requestAnimationFrame(step);
    });
  }

  public transitionToPreset(preset: CameraPreset, durationMs = 650): Promise<void> {
    return this.transitionToPose(PRESET_POSES[preset], durationMs);
  }

  public focusOnObjects(
    objects: THREE.Object3D[],
    side: 'top' | 'bottom' | 'both' = 'top',
    durationMs = 650
  ): Promise<void> {
    if (objects.length === 0) {
      return this.transitionToPreset('overview', durationMs);
    }

    const box = new THREE.Box3();
    for (const obj of objects) {
      box.expandByObject(obj);
    }

    if (box.isEmpty()) {
      return this.transitionToPreset('overview', durationMs);
    }

    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 6);

    const isBottom = side === 'bottom';
    const ySign = isBottom ? -1 : 1;
    const distance = Math.max(maxDim * 2.6, 22);

    const targetPos = new THREE.Vector3(
      center.x + (isBottom ? 8 : -8),
      center.y + ySign * distance * 0.95,
      center.z + (isBottom ? -12 : 12)
    );

    const targetPose: CameraPose = {
      position: targetPos,
      target: center,
      up: isBottom ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0),
    };

    return this.transitionToPose(targetPose, durationMs);
  }

  public update(): void {
    this.controls.update();
  }

  public dispose(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.controls.dispose();
  }
}
