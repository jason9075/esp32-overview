import { BoardPackage, ComponentEntry, ComponentStatus } from '../data/boards/types';
import { escapeHtml } from '../utils/html';

export interface ComponentDrawerCallbacks {
  onSelectComponent: (componentId: string) => void;
  onClose: () => void;
}

const STATUS_BADGE: Record<ComponentStatus, { text: string; cls: string }> = {
  populated: { text: '正面搭載', cls: 'badge-populated' },
  backside: { text: '背面元件', cls: 'badge-backside' },
  'silkscreen-only': { text: '絲印／焊孔', cls: 'badge-silkscreen' },
};

export class ComponentDrawerUI {
  private readonly container: HTMLElement;
  private readonly callbacks: ComponentDrawerCallbacks;
  private boardPkg: BoardPackage;
  private isOpen = false;
  private activeId = 'board';

  constructor(container: HTMLElement, initialBoardPkg: BoardPackage, callbacks: ComponentDrawerCallbacks) {
    this.container = container;
    this.boardPkg = initialBoardPkg;
    this.callbacks = callbacks;
    this.render();
  }

  public setBoardPackage(pkg: BoardPackage): void {
    this.boardPkg = pkg;
    this.activeId = 'board';
    this.render();
  }

  public toggle(forceState?: boolean): boolean {
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
    this.container.classList.toggle('open', this.isOpen);
    return this.isOpen;
  }

  public setActiveComponent(componentId: string): void {
    this.activeId = componentId;
    this.container.querySelectorAll<HTMLElement>('.drawer-item').forEach((el) => {
      const match = el.dataset.componentId === componentId;
      el.classList.toggle('active', match);
      if (match && this.isOpen) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  private render(): void {
    const itemsHtml = this.boardPkg.components
      .map((item: ComponentEntry) => {
        const badge = STATUS_BADGE[item.status];
        const isActive = item.id === this.activeId;
        return `
          <button
            type="button"
            class="drawer-item ${isActive ? 'active' : ''}"
            data-component-id="${escapeHtml(item.id)}"
          >
            <div class="drawer-item-top">
              <span class="drawer-item-abbr">${escapeHtml(item.abbr)}</span>
              <span class="drawer-item-badge ${badge.cls}">${badge.text}</span>
            </div>
            <div class="drawer-item-title">${escapeHtml(item.titleZh)}</div>
            <div class="drawer-item-sub">${escapeHtml(item.subtitleEn)}</div>
          </button>
        `;
      })
      .join('');

    this.container.innerHTML = `
      <div class="drawer-header">
        <div>
          <h2 class="drawer-title">${escapeHtml(this.boardPkg.name)} 元件目錄</h2>
          <p class="drawer-subtitle">共 ${this.boardPkg.components.length} 項板載晶片、連接器與擴充座</p>
        </div>
        <button type="button" class="drawer-close-btn" aria-label="關閉元件目錄">✕</button>
      </div>
      <div class="drawer-list">
        ${itemsHtml}
      </div>
    `;

    const closeBtn = this.container.querySelector('.drawer-close-btn') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => {
      this.toggle(false);
      this.callbacks.onClose();
    });

    this.container.querySelectorAll<HTMLButtonElement>('.drawer-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.componentId;
        if (id) {
          this.setActiveComponent(id);
          this.callbacks.onSelectComponent(id);
        }
      });
    });
  }
}
