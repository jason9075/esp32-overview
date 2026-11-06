import './styles.css';
import {
  BOARD_PACKAGES,
  DEFAULT_BOARD_ID,
  getBoardPackage,
} from './data/boards/registry';
import { BoardId, BoardPackage } from './data/boards/types';
import { setupScene } from './scene/setupScene';
import { loadBoardModel, LoadedBoardModel } from './scene/loadBoardModel';
import { BoardCameraController, CameraPreset } from './scene/cameraControls';
import { BoardPicker } from './scene/picking';
import { HighlightManager } from './scene/highlight';
import { ToolbarUI } from './ui/toolbar';
import { InfoCardUI } from './ui/infoCard';
import { ComponentDrawerUI } from './ui/componentDrawer';
import { TutorialUI } from './ui/tutorial';
import { escapeHtml } from './utils/html';

export interface Esp32AppTestHook {
  ready: boolean;
  getBoardId: () => BoardId;
  setBoard: (boardId: BoardId) => Promise<void>;
  getAvailableBoards: () => BoardId[];
  selectComponent: (componentId: string, focusCamera?: boolean, meshKey?: string) => void;
  setCameraPreset: (preset: CameraPreset, immediate?: boolean) => void;
  getSelectedComponentId: () => string;
  getComponentIds: () => string[];
}

declare global {
  interface Window {
    __ESP32_APP__?: Esp32AppTestHook;
    __BOARD_APP__?: Esp32AppTestHook;
  }
}

async function initApp(): Promise<void> {
  const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  const toolbarEl = document.getElementById('toolbar') as HTMLElement;
  const infoCardEl = document.getElementById('info-card') as HTMLElement;
  const drawerEl = document.getElementById('component-drawer') as HTMLElement;
  const tutorialEl = document.getElementById('tutorial-overlay') as HTMLElement;
  const tooltipEl = document.getElementById('tooltip') as HTMLElement;
  const overlayEl = document.getElementById('ui-overlay') as HTMLElement;

  const { scene, camera, renderer } = setupScene(canvas);
  const cameraController = new BoardCameraController(camera, canvas, scene);

  let currentBoardPkg: BoardPackage = getBoardPackage(DEFAULT_BOARD_ID);
  let loadedModel: LoadedBoardModel | null = null;
  let picker: BoardPicker | null = null;
  let highlighter: HighlightManager | null = null;
  let selectedComponentId = 'board';
  let isSwitchingBoard = false;

  const focusComponentCamera = (componentId: string, specificMeshKey: string | null = null, durationMs = 650) => {
    if (!loadedModel) return;

    if (componentId === 'board') {
      toolbar.setActivePreset('overview');
      cameraController.transitionToPreset('overview', durationMs);
      return;
    }

    if (specificMeshKey && loadedModel.meshByKey.has(specificMeshKey)) {
      const subObj = loadedModel.meshByKey.get(specificMeshKey)!;
      const side =
        currentBoardPkg.placements[specificMeshKey]?.side ??
        currentBoardPkg.componentMap[componentId]?.side ??
        'top';
      toolbar.setActivePreset(null);
      cameraController.focusOnObjects([subObj], side, durationMs);
      return;
    }

    const entry = currentBoardPkg.componentMap[componentId];
    const objs = loadedModel.componentMeshes.get(componentId) ?? [];
    toolbar.setActivePreset(null);
    cameraController.focusOnObjects(objs, entry?.side ?? 'top', durationMs);
  };

  const selectComponent = (
    componentId: string,
    shouldFocusCamera = false,
    specificMeshKey: string | null = null,
    subLabel: string | null = null
  ) => {
    const validId = currentBoardPkg.componentMap[componentId] ? componentId : 'board';
    selectedComponentId = validId;
    highlighter?.setSelected(validId, specificMeshKey);
    infoCard.showComponent(validId, specificMeshKey, subLabel);
    drawer.setActiveComponent(validId);

    if (shouldFocusCamera) {
      focusComponentCamera(validId, specificMeshKey);
    }
  };

  const toolbar = new ToolbarUI(toolbarEl, currentBoardPkg, {
    onSelectBoard: (boardId: BoardId) => {
      switchBoard(boardId).catch((err) => {
        console.error('Error switching board:', err);
      });
    },
    onSelectPreset: (preset: CameraPreset) => {
      cameraController.transitionToPreset(preset);
    },
    onToggleTutorial: () => {
      const isNowActive = tutorial.toggle();
      toolbar.setTutorialActive(isNowActive);
    },
    onToggleDrawer: () => {
      const isNowOpen = drawer.toggle();
      toolbar.setDrawerActive(isNowOpen);
    },
    onSelectOverview: () => {
      selectComponent('board', true);
    },
  });

  const infoCard = new InfoCardUI(infoCardEl, currentBoardPkg, {
    onFocusComponent: (componentId: string) => {
      highlighter?.setSelected(componentId, null);
      highlighter?.setGpioPinMarker(null);
      focusComponentCamera(componentId, null);
    },
    onFocusSubCircuit: (componentId: string, meshKey: string, subLabel: string) => {
      highlighter?.setSelected(componentId, meshKey);
      infoCard.showComponent(componentId, meshKey, subLabel);
      focusComponentCamera(componentId, meshKey);
    },
    onFocusGpioPin: (pinSpec) => {
      if (!highlighter) return;
      const targetHeaderId = pinSpec.side === 'left' ? 'pin_headers_left' : 'pin_headers_right';
      highlighter.setSelected(targetHeaderId, null);
      const markerObj = highlighter.setGpioPinMarker(pinSpec);
      if (markerObj) {
        toolbar.setActivePreset(null);
        cameraController.focusOnObjects([markerObj], 'top', 550);
      }
    },
    onReturnOverview: () => {
      selectComponent('board', true);
    },
  });

  const drawer = new ComponentDrawerUI(drawerEl, currentBoardPkg, {
    onSelectComponent: (componentId: string) => {
      selectComponent(componentId, true);
    },
    onClose: () => {
      toolbar.setDrawerActive(false);
    },
  });

  const tutorial = new TutorialUI(tutorialEl, currentBoardPkg.tutorialSteps, {
    onStepSelectComponent: (componentId: string) => {
      selectComponent(componentId, true);
    },
    onClose: () => {
      toolbar.setTutorialActive(false);
    },
  });

  async function switchBoard(boardId: BoardId): Promise<void> {
    if (isSwitchingBoard) return;
    if (boardId === currentBoardPkg.id && loadedModel !== null) return;
    isSwitchingBoard = true;

    const targetPkg = getBoardPackage(boardId);
    currentBoardPkg = targetPkg;

    // Loading banner
    const loadingBanner = document.createElement('div');
    loadingBanner.className = 'loading-banner';
    loadingBanner.innerHTML = `
      <div class="loading-title">正在載入 ${escapeHtml(targetPkg.name)} 3D 模型…</div>
      <div class="loading-bar-track"><div class="loading-bar-fill" id="loading-fill"></div></div>
    `;
    overlayEl.appendChild(loadingBanner);
    const loadingFill = loadingBanner.querySelector('#loading-fill') as HTMLElement;

    try {
      if (highlighter) {
        highlighter.dispose();
        highlighter = null;
      }
      if (loadedModel) {
        scene.remove(loadedModel.rootGroup);
        loadedModel.dispose();
        loadedModel = null;
      }

      loadedModel = await loadBoardModel(targetPkg, renderer, (ratio) => {
        loadingFill.style.width = `${Math.round(ratio * 100)}%`;
      });
      scene.add(loadedModel.rootGroup);

      if (!picker) {
        picker = new BoardPicker(camera, loadedModel.interactiveMeshes);
      } else {
        picker.setInteractiveMeshes(loadedModel.interactiveMeshes);
      }
      highlighter = new HighlightManager(scene, loadedModel.componentMeshes, loadedModel.meshByKey);

      toolbar.setBoard(targetPkg);
      drawer.setBoardPackage(targetPkg);
      tutorial.setTutorialSteps(targetPkg.tutorialSteps);
      infoCard.setBoardPackage(targetPkg);

      selectedComponentId = 'board';
      toolbar.setActivePreset('overview');
      cameraController.transitionToPreset('overview', 500);

      loadingBanner.classList.add('hidden');
      setTimeout(() => loadingBanner.remove(), 260);
    } catch (err) {
      loadingBanner.classList.add('error');
      loadingBanner.innerHTML = `
        <div class="loading-title">⚠️ ${escapeHtml(targetPkg.name)} 3D 模型載入失敗</div>
        <div class="loading-error-detail">請確認網路連線或檔案後重新整理頁面。（${escapeHtml(String(err instanceof Error ? err.message : err))}）</div>
      `;
      console.error(`Failed to load board model for ${targetPkg.id}:`, err);
      throw err;
    } finally {
      isSwitchingBoard = false;
    }
  }

  // Load initial board
  await switchBoard(DEFAULT_BOARD_ID);

  let pointerDownX = 0;
  let pointerDownY = 0;
  let isDragging = false;

  canvas.addEventListener('pointerdown', (e) => {
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
    isDragging = false;
  });

  let pendingHover: { x: number; y: number } | null = null;
  let hoverFrameId: number | null = null;

  const runHoverPick = () => {
    hoverFrameId = null;
    if (!pendingHover || !picker || !highlighter) return;
    const { x, y } = pendingHover;
    pendingHover = null;

    const rect = canvas.getBoundingClientRect();
    const hit = picker.pick(x, y, rect);
    const entry =
      hit && hit.componentId !== 'board' ? currentBoardPkg.componentMap[hit.componentId] : undefined;

    if (hit && entry) {
      highlighter.setHovered(hit.componentId);
      canvas.style.cursor = 'pointer';
      const subText =
        hit.subLabel && hit.subLabel !== entry.titleZh
          ? `<span class="tooltip-sub">${escapeHtml(hit.subLabel)}</span>`
          : '';
      tooltipEl.innerHTML = `<span class="tooltip-abbr">${escapeHtml(entry.abbr)}</span>${escapeHtml(entry.titleZh)}${subText}`;
      tooltipEl.style.left = `${Math.min(x + 14, window.innerWidth - 320)}px`;
      tooltipEl.style.top = `${Math.max(y - 36, 12)}px`;
      tooltipEl.classList.remove('hidden');
    } else {
      highlighter.setHovered(null);
      canvas.style.cursor = 'grab';
      tooltipEl.classList.add('hidden');
    }
  };

  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons > 0) {
      const dx = e.clientX - pointerDownX;
      const dy = e.clientY - pointerDownY;
      if (Math.hypot(dx, dy) > 5) {
        isDragging = true;
        tooltipEl.classList.add('hidden');
        return;
      }
    }

    pendingHover = { x: e.clientX, y: e.clientY };
    if (hoverFrameId === null) {
      hoverFrameId = requestAnimationFrame(runHoverPick);
    }
  });

  canvas.addEventListener('pointerleave', () => {
    pendingHover = null;
    highlighter?.setHovered(null);
    tooltipEl.classList.add('hidden');
  });

  canvas.addEventListener('pointerup', (e) => {
    if (isDragging || e.button !== 0 || !picker) return;
    const rect = canvas.getBoundingClientRect();
    const hit = picker.pick(e.clientX, e.clientY, rect);
    if (hit && hit.componentId !== 'board') {
      selectComponent(hit.componentId, false, hit.placementKey ?? null, hit.subLabel ?? null);
    } else {
      selectComponent('board', false);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (tutorial.isActive()) {
        tutorial.stop();
      } else {
        selectComponent('board', true);
      }
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  };
  animate();

  const appHook: Esp32AppTestHook = {
    ready: true,
    getBoardId: () => currentBoardPkg.id,
    setBoard: async (boardId: BoardId) => {
      await switchBoard(boardId);
    },
    getAvailableBoards: () => Object.keys(BOARD_PACKAGES) as BoardId[],
    selectComponent: (componentId: string, focusCamera = true, meshKey?: string) => {
      const subLabel = meshKey ? (currentBoardPkg.placements[meshKey]?.subLabel ?? null) : null;
      selectComponent(componentId, focusCamera, meshKey ?? null, subLabel);
    },
    setCameraPreset: (preset: CameraPreset, immediate = false) => {
      toolbar.setActivePreset(preset);
      cameraController.transitionToPreset(preset, immediate ? 0 : 600);
    },
    getSelectedComponentId: () => selectedComponentId,
    getComponentIds: () => currentBoardPkg.components.map((c) => c.id),
  };

  window.__ESP32_APP__ = appHook;
  window.__BOARD_APP__ = appHook;
}

initApp().catch((err) => {
  console.error('Failed to initialize ESP32 3D Hardware Explorer:', err);
});
