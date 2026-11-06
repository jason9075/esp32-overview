import { CameraPreset } from '../scene/cameraControls';
import { BoardId, BoardPackage } from '../data/boards/types';
import { escapeHtml } from '../utils/html';

export interface ToolbarCallbacks {
  onSelectBoard: (boardId: BoardId) => void;
  onSelectPreset: (preset: CameraPreset) => void;
  onToggleTutorial: () => void;
  onToggleDrawer: () => void;
  onSelectOverview: () => void;
}

export class ToolbarUI {
  private readonly container: HTMLElement;
  private readonly callbacks: ToolbarCallbacks;
  private currentBoard: BoardPackage;
  private presetButtons = new Map<CameraPreset, HTMLButtonElement>();
  private tutorialBtn!: HTMLButtonElement;
  private drawerBtn!: HTMLButtonElement;

  constructor(container: HTMLElement, initialBoardPkg: BoardPackage, callbacks: ToolbarCallbacks) {
    this.container = container;
    this.currentBoard = initialBoardPkg;
    this.callbacks = callbacks;
    this.render();
  }

  public setBoard(boardPkg: BoardPackage): void {
    this.currentBoard = boardPkg;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="toolbar-brand" title="回到開發板總覽">
        <span class="brand-badge">${escapeHtml(this.currentBoard.badge)}</span>
        <div class="brand-text">
          <span class="brand-title">${escapeHtml(this.currentBoard.name)} (38-Pin Type-C)</span>
          <span class="brand-subtitle">3D 互動硬體架構導覽</span>
        </div>
      </div>

      <nav class="toolbar-views" aria-label="視角切換">
        <button type="button" class="toolbar-btn" data-preset="top">正面</button>
        <button type="button" class="toolbar-btn" data-preset="bottom">背面</button>
        <button type="button" class="toolbar-btn" data-preset="type_c">Type-C 端</button>
        <button type="button" class="toolbar-btn" data-preset="esp32_module">模組核心</button>
        <button type="button" class="toolbar-btn active" data-preset="overview">重設視角</button>
      </nav>

      <div class="toolbar-actions">
        <button type="button" class="toolbar-btn action-btn" data-action="tutorial">🎓 互動教學</button>
        <button type="button" class="toolbar-btn action-btn" data-action="drawer">📋 元件目錄</button>
      </div>
    `;

    const brandEl = this.container.querySelector('.toolbar-brand') as HTMLElement;
    brandEl.addEventListener('click', () => {
      this.callbacks.onSelectOverview();
    });

    this.presetButtons.clear();
    this.container.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((btn) => {
      const preset = btn.dataset.preset as CameraPreset;
      this.presetButtons.set(preset, btn);
      btn.addEventListener('click', () => {
        this.setActivePreset(preset);
        this.callbacks.onSelectPreset(preset);
      });
    });

    this.tutorialBtn = this.container.querySelector('[data-action="tutorial"]') as HTMLButtonElement;
    this.tutorialBtn.addEventListener('click', () => {
      this.callbacks.onToggleTutorial();
    });

    this.drawerBtn = this.container.querySelector('[data-action="drawer"]') as HTMLButtonElement;
    this.drawerBtn.addEventListener('click', () => {
      this.callbacks.onToggleDrawer();
    });
  }

  public setActivePreset(preset: CameraPreset | null): void {
    this.presetButtons.forEach((btn, p) => {
      btn.classList.toggle('active', p === preset);
    });
  }

  public setTutorialActive(active: boolean): void {
    if (this.tutorialBtn) {
      this.tutorialBtn.classList.toggle('active', active);
    }
  }

  public setDrawerActive(active: boolean): void {
    if (this.drawerBtn) {
      this.drawerBtn.classList.toggle('active', active);
    }
  }
}
