import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export function setupScene(canvas: HTMLCanvasElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1f27);

  const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.5,
    1000
  );

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Studio environment reflections for metallic RF shield, Type-C shell, gold pins & IC packages
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.48;
  pmremGenerator.dispose();

  // Balanced lighting for both top (+Y) and bottom (-Y) board inspection
  const ambientLight = new THREE.AmbientLight(0xd8dee9, 0.45);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xeceff4, 0x4c566a, 0.48);
  hemiLight.position.set(0, 100, 0);
  scene.add(hemiLight);

  // Top Key Light
  const topKeyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  topKeyLight.position.set(-35, 90, 50);
  scene.add(topKeyLight);

  // Top Fill Light
  const topFillLight = new THREE.DirectionalLight(0xe5e9f0, 0.6);
  topFillLight.position.set(45, 80, -45);
  scene.add(topFillLight);

  // Bottom Key Light (for back of board inspection)
  const bottomKeyLight = new THREE.DirectionalLight(0xffffff, 0.85);
  bottomKeyLight.position.set(30, -90, 40);
  scene.add(bottomKeyLight);

  // Bottom Fill Light
  const bottomFillLight = new THREE.DirectionalLight(0xd8dee9, 0.5);
  bottomFillLight.position.set(-40, -75, -40);
  scene.add(bottomFillLight);

  return { scene, camera, renderer };
}
