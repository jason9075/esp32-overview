import { BoardPackage, ComponentStatus, GpioPinSpec } from '../data/boards/types';
import { assetUrl, escapeHtml, hasActiveTextSelection } from '../utils/html';

export interface InfoCardCallbacks {
  onFocusComponent: (componentId: string) => void;
  onFocusSubCircuit: (componentId: string, meshKey: string, subLabel: string) => void;
  onFocusGpioPin: (pinSpec: GpioPinSpec) => void;
  onReturnOverview: () => void;
}

type GpioFilterCategory = 'all' | 'power_gnd' | 'i2c_uart' | 'spi' | 'adc_touch_dac' | 'gpio' | 'flash_reserved';

const STATUS_META: Record<ComponentStatus, { label: string; className: string }> = {
  populated: { label: '正面搭載', className: 'status-populated' },
  backside: { label: '背面元件', className: 'status-backside' },
  'silkscreen-only': { label: '絲印標示／未焊孔位', className: 'status-silkscreen' },
};

const SIDE_LABELS: Record<'top' | 'bottom' | 'both', string> = {
  top: '正面 (Top)',
  bottom: '背面 (Bottom)',
  both: '雙面 (Both Sides)',
};

export class InfoCardUI {
  private readonly container: HTMLElement;
  private readonly callbacks: InfoCardCallbacks;
  private boardPkg: BoardPackage;
  private modalEl: HTMLElement | null = null;
  private currentId = 'board';
  private activeMeshKey: string | null = null;
  private activeSubLabel: string | null = null;
  private activeGpioPin: number | null = null;
  private gpioFilter: GpioFilterCategory = 'all';
  private collapsed = false;
  private renderedId: string | null = null;

  constructor(container: HTMLElement, initialBoardPkg: BoardPackage, callbacks: InfoCardCallbacks) {
    this.container = container;
    this.boardPkg = initialBoardPkg;
    this.callbacks = callbacks;
    this.initImageModal();
    this.bindDelegatedEvents();
    this.showComponent('board');
  }

  public setBoardPackage(pkg: BoardPackage): void {
    this.boardPkg = pkg;
    this.currentId = 'board';
    this.activeMeshKey = null;
    this.activeSubLabel = null;
    this.activeGpioPin = null;
    this.gpioFilter = 'all';
    this.showComponent('board');
  }

  private initImageModal(): void {
    const modal = document.createElement('div');
    modal.id = 'image-lightbox-modal';
    modal.className = 'image-modal-backdrop hidden';
    modal.innerHTML = `
      <div class="image-modal-dialog" role="dialog" aria-modal="true">
        <div class="image-modal-header">
          <div class="image-modal-titles">
            <div class="image-modal-title"></div>
            <div class="image-modal-subtitle"></div>
          </div>
          <div class="image-modal-actions">
            <button type="button" class="image-modal-btn" data-modal-action="zoom">🔍 切換原寸放大</button>
            <button type="button" class="image-modal-btn close" data-modal-action="close" title="關閉 (Esc)">✕ 關閉</button>
          </div>
        </div>
        <div class="image-modal-body">
          <img class="image-modal-img" src="" alt="" />
        </div>
        <div class="image-modal-caption"></div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modalEl = modal;

    const close = () => {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    };

    modal.querySelector('[data-modal-action="close"]')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        close();
      }
    });

    const zoomBtn = modal.querySelector('[data-modal-action="zoom"]') as HTMLButtonElement;
    const modalImg = modal.querySelector('.image-modal-img') as HTMLImageElement;
    zoomBtn?.addEventListener('click', () => {
      modalImg.classList.toggle('zoomed');
      zoomBtn.textContent = modalImg.classList.contains('zoomed') ? '🔍 縮小回適配大小' : '🔍 切換原寸放大';
    });
  }

  public openImageModal(imgSrc: string, title: string, subtitle: string, caption = ''): void {
    if (!this.modalEl) return;
    const titleEl = this.modalEl.querySelector('.image-modal-title') as HTMLElement;
    const subtitleEl = this.modalEl.querySelector('.image-modal-subtitle') as HTMLElement;
    const imgEl = this.modalEl.querySelector('.image-modal-img') as HTMLImageElement;
    const captionEl = this.modalEl.querySelector('.image-modal-caption') as HTMLElement;

    titleEl.textContent = title;
    subtitleEl.textContent = subtitle;
    imgEl.src = imgSrc;
    imgEl.alt = title;
    imgEl.classList.remove('zoomed');
    captionEl.textContent = caption;

    this.modalEl.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  public showComponent(
    componentId: string,
    specificMeshKey: string | null = null,
    subLabel: string | null = null
  ): void {
    const entry = this.boardPkg.componentMap[componentId] ?? this.boardPkg.componentMap.board;
    this.currentId = entry.id;
    this.activeMeshKey = specificMeshKey;
    this.activeSubLabel = subLabel;
    this.render();
  }

  public showGpioPin(pinNumber: number): void {
    const pin = this.boardPkg.gpioPinMap[pinNumber];
    if (!pin) return;
    this.activeGpioPin = pinNumber;
    this.currentId = pin.side === 'left' ? 'pin_headers_left' : 'pin_headers_right';
    this.render();

    const row = this.container.querySelector(`[data-gpio-row="${pinNumber}"]`) as HTMLElement;
    if (row) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private filterGpioPins(): GpioPinSpec[] {
    const all = this.boardPkg.gpioPins;
    switch (this.gpioFilter) {
      case 'power_gnd':
        return all.filter((p) => p.type === 'power3v3' || p.type === 'power5v' || p.type === 'gnd');
      case 'i2c_uart':
        return all.filter((p) => p.type === 'i2c' || p.type === 'uart');
      case 'spi':
        return all.filter((p) => p.type === 'spi');
      case 'adc_touch_dac':
        return all.filter((p) => p.type === 'adc' || p.type === 'touch' || p.type === 'dac');
      case 'gpio':
        return all.filter((p) => p.type === 'gpio');
      case 'flash_reserved':
        return all.filter((p) => p.type === 'flash_reserved');
      default:
        return all;
    }
  }

  private renderGpioPinoutSection(): string {
    const leftPins = this.boardPkg.gpioPins.filter((p) => p.side === 'left');
    const rightPins = this.boardPkg.gpioPins.filter((p) => p.side === 'right');
    const filteredPins = this.filterGpioPins();
    const diagramSrc = assetUrl('assets/gpio_pinout_diagram.svg');

    const filterButtons: { id: GpioFilterCategory; label: string }[] = [
      { id: 'all', label: '全部腳位 (38)' },
      { id: 'power_gnd', label: '電源 / GND (7)' },
      { id: 'i2c_uart', label: 'I²C / UART (6)' },
      { id: 'spi', label: 'SPI 匯流排 (8)' },
      { id: 'adc_touch_dac', label: 'ADC / 觸控 / DAC (11)' },
      { id: 'gpio', label: '通用 GPIO (6)' },
      { id: 'flash_reserved', label: '⚠️ Flash 保留 (6)' },
    ];

    const renderMiniPinBtn = (p: GpioPinSpec) => `
      <button
        type="button"
        class="gpio-mini-pin ${this.activeGpioPin === p.pin ? 'selected' : ''}"
        data-pin-select="${p.pin}"
        style="--pin-color: ${p.color}"
        title="Pin ${p.pin}: ${escapeHtml(p.name)} (${escapeHtml(p.titleZh)})"
      >
        <span class="gpio-mini-num">${p.pin}</span>
      </button>
    `;

    return `
      <div class="gpio-pinout-section">
        <div class="gpio-section-header">
          <span class="gpio-section-title">📌 38-Pin GPIO 完整腳位圖與逐腳詳解</span>
          <span class="gpio-section-hint">點擊任一腳位可在 3D 模型上精準標示並聚焦金屬排針</span>
        </div>

        <figure
          class="gpio-master-figure zoomable-figure"
          data-zoom-src="${escapeHtml(diagramSrc)}"
          data-zoom-title="${escapeHtml(this.boardPkg.name)} — 38-Pin GPIO 完整彩色腳位定義圖"
          data-zoom-subtitle="38-Pin 2.54mm Pitch Dual-Row Header (Left 1..19 / Right 20..38)"
          data-zoom-caption="左側排 (Pin 1~19) 包含 3V3、EN、4 組純輸入類比 ADC1、雙 DAC 與 5V/VIN；右側排 (Pin 20~38) 包含主 SPI (VSPI)、I2C、UART0/UART2、觸控與板載藍色 LED。"
        >
          <div class="zoomable-img-wrapper">
            <img
              src="${escapeHtml(diagramSrc)}"
              alt="${escapeHtml(this.boardPkg.name)} 38-Pin GPIO 完整彩色腳位圖"
              class="gpio-pinout-img"
              width="1100"
              height="920"
            />
            <span class="zoom-badge">🔍 點擊放大檢視</span>
          </div>
          <figcaption class="gpio-figure-caption">
            ▲ ${escapeHtml(this.boardPkg.name)} 38-Pin 雙排完整腳位圖（點擊圖片可彈出高解析度視窗）
          </figcaption>
        </figure>

        <div class="gpio-interactive-matrix">
          <div class="gpio-matrix-labels">
            <span>← 左側排 (Pins 1..19: 3V3 ~ 5V/VIN)</span>
            <span>右側排 (Pins 20..38: GND ~ GND) →</span>
          </div>
          <div class="gpio-matrix-columns">
            <div class="gpio-column-pins">
              ${leftPins.map(renderMiniPinBtn).join('')}
            </div>
            <div class="gpio-column-pins">
              ${rightPins.map(renderMiniPinBtn).join('')}
            </div>
          </div>
        </div>

        <div class="gpio-filter-bar" role="tablist">
          ${filterButtons
            .map(
              (fb) => `
                <button
                  type="button"
                  class="gpio-filter-chip ${this.gpioFilter === fb.id ? 'active' : ''}"
                  data-gpio-filter="${fb.id}"
                >
                  ${fb.label}
                </button>
              `
            )
            .join('')}
        </div>

        <div class="gpio-pins-table-wrapper">
          <table class="gpio-pins-table">
            <thead>
              <tr>
                <th style="width: 44px">Pin</th>
                <th style="width: 50px">排別</th>
                <th style="width: 80px">腳位名稱</th>
                <th>功能說明與主要用途</th>
                <th style="width: 75px">信號類型</th>
                <th style="width: 140px">預設偏壓／開機注意</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPins
                .map((p) => {
                  const isSelected = this.activeGpioPin === p.pin;
                  const pinSvgSrc = assetUrl(`assets/gpio_pins/pin_${String(p.pin).padStart(2, '0')}.svg`);
                  return `
                    <tr
                      class="gpio-pin-row ${isSelected ? 'active-pin-row' : ''}"
                      data-gpio-row="${p.pin}"
                      style="--pin-accent: ${p.color}"
                    >
                      <td class="pin-cell-num">
                        <span class="pin-dot" style="background: ${p.color}"></span>
                        <strong>${p.pin}</strong>
                      </td>
                      <td class="pin-cell-side">${p.side === 'left' ? '左排' : '右排'}</td>
                      <td class="pin-cell-name">
                        <code>${escapeHtml(p.name)}</code>
                      </td>
                      <td class="pin-cell-desc">
                        <div class="pin-desc-title">${escapeHtml(p.titleZh)}</div>
                        <div class="pin-desc-body">${escapeHtml(p.descriptionZh)}</div>
                        ${
                          p.altFunctions
                            ? `<div class="pin-alt-fns">複用：<code>${escapeHtml(p.altFunctions)}</code></div>`
                            : ''
                        }
                        <div class="pin-mini-action">
                          <button
                            type="button"
                            class="pin-view-schematic-btn zoomable-btn"
                            data-zoom-src="${escapeHtml(pinSvgSrc)}"
                            data-zoom-title="Pin ${p.pin} — ${escapeHtml(p.name)}"
                            data-zoom-subtitle="${escapeHtml(p.titleZh)}"
                            data-zoom-caption="${escapeHtml(p.descriptionZh)}"
                          >
                            🖼️ 檢視腳位卡片
                          </button>
                        </div>
                      </td>
                      <td class="pin-cell-type">
                        <span class="pin-type-badge type-${p.type}">${escapeHtml(p.typeLabel)}</span>
                      </td>
                      <td class="pin-cell-pull">
                        <span class="pin-pull-text">${escapeHtml(p.defaultPull)}</span>
                        ${
                          p.strappingInfo
                            ? `<div class="pin-strapping-warn">${escapeHtml(p.strappingInfo)}</div>`
                            : ''
                        }
                      </td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private render(): void {
    const entry = this.boardPkg.componentMap[this.currentId] ?? this.boardPkg.componentMap.board;
    const isBoardOverview = entry.id === 'board';
    const isPinHeader = entry.id === 'pin_headers_left' || entry.id === 'pin_headers_right';
    const statusMeta = STATUS_META[entry.status];

    const factsHtml =
      entry.facts.length > 0
        ? `
          <div class="info-section">
            <h4 class="section-title">關鍵規格數據</h4>
            <dl class="facts-grid">
              ${entry.facts
                .map(
                  (f) => `
                    <div class="fact-item">
                      <dt class="fact-label">${escapeHtml(f.label)}</dt>
                      <dd class="fact-value">${escapeHtml(f.value)}</dd>
                    </div>
                  `
                )
                .join('')}
            </dl>
          </div>
        `
        : '';

    const subCircuitsHtml =
      entry.subCircuits && entry.subCircuits.length > 0
        ? `
          <div class="info-section">
            <h4 class="section-title">內部重點單元分解</h4>
            <div class="subcircuits-list">
              ${entry.subCircuits
                .map(
                  (sc) => `
                    <div
                      class="subcircuit-card ${this.activeMeshKey === sc.meshKey ? 'active' : ''}"
                      data-subcircuit-mesh="${escapeHtml(sc.meshKey)}"
                      data-subcircuit-label="${escapeHtml(sc.label)}"
                    >
                      <div class="subcircuit-top">
                        <span class="subcircuit-label">${escapeHtml(sc.label)}</span>
                        <code class="subcircuit-spec">${escapeHtml(sc.valueSpec)}</code>
                      </div>
                      <p class="subcircuit-detail">${escapeHtml(sc.detail)}</p>
                    </div>
                  `
                )
                .join('')}
            </div>
          </div>
        `
        : '';

    const notesHtml =
      entry.notes && entry.notes.length > 0
        ? `
          <div class="info-section">
            <h4 class="section-title">設計注意事項與除錯建議</h4>
            <ul class="notes-list">
              ${entry.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
            </ul>
          </div>
        `
        : '';

    const linksHtml =
      entry.links && entry.links.length > 0
        ? `
          <div class="info-section">
            <h4 class="section-title">原廠技術文件與參考鏈接</h4>
            <ul class="links-list">
              ${entry.links
                .map(
                  (l) => `
                    <li>
                      <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="doc-link">
                        <span>📄 ${escapeHtml(l.label)}</span>
                        <span class="ext-icon">↗</span>
                      </a>
                    </li>
                  `
                )
                .join('')}
            </ul>
          </div>
        `
        : '';

    const gpioSectionHtml =
      isBoardOverview || isPinHeader ? this.renderGpioPinoutSection() : '';

    // Re-rendering the same component (pin select, filter chip, collapse) must not jump the scroll back to the top
    const prevScrollTop =
      this.renderedId === entry.id
        ? (this.container.querySelector('.info-card-content') as HTMLElement | null)?.scrollTop ?? 0
        : 0;

    this.container.innerHTML = `
      <div class="info-card-inner ${this.collapsed ? 'collapsed' : ''}">
        <div class="info-card-header">
          <div class="header-badges">
            <span class="component-abbr">${escapeHtml(entry.abbr)}</span>
            <span class="component-status-badge ${statusMeta.className}">
              ${statusMeta.label}
            </span>
            <span class="component-side-badge">${SIDE_LABELS[entry.side]}</span>
          </div>
          <div class="header-controls">
            ${
              !isBoardOverview
                ? `<button type="button" class="btn-overview-return" title="返回主機板總覽">⮌ 總覽</button>`
                : ''
            }
            <button type="button" class="btn-collapse" title="${this.collapsed ? '展開面板' : '收合面板'}">
              ${this.collapsed ? '▲' : '▼'}
            </button>
          </div>
        </div>

        <div class="info-card-titles">
          <h2 class="component-title">${escapeHtml(entry.titleZh)}</h2>
          <div class="component-subtitle">${escapeHtml(entry.subtitleEn)}</div>
          ${
            this.activeSubLabel
              ? `<div class="sub-picked-label">🔍 聚焦子元件：${escapeHtml(this.activeSubLabel)}</div>`
              : ''
          }
        </div>

        <div class="info-card-content">
          <div class="summary-box">
            <p>${escapeHtml(entry.summary)}</p>
          </div>

          <div class="paragraphs-section">
            ${entry.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
          </div>

          ${factsHtml}
          ${subCircuitsHtml}
          ${notesHtml}
          ${linksHtml}
          ${gpioSectionHtml}
        </div>
      </div>
    `;

    this.renderedId = entry.id;
    if (prevScrollTop > 0) {
      const content = this.container.querySelector('.info-card-content') as HTMLElement | null;
      if (content) content.scrollTop = prevScrollTop;
    }
  }

  private bindDelegatedEvents(): void {
    this.container.addEventListener('click', (e) => {
      if (hasActiveTextSelection()) return;

      const target = e.target as HTMLElement;

      // Collapse toggle
      if (target.closest('.btn-collapse')) {
        this.collapsed = !this.collapsed;
        this.render();
        return;
      }

      // Return to overview
      if (target.closest('.btn-overview-return')) {
        this.callbacks.onReturnOverview();
        return;
      }

      // Zoomable image click
      const zoomable = target.closest('.zoomable-figure, .zoomable-btn') as HTMLElement;
      if (zoomable) {
        const src = zoomable.dataset.zoomSrc;
        const title = zoomable.dataset.zoomTitle || '';
        const subtitle = zoomable.dataset.zoomSubtitle || '';
        const caption = zoomable.dataset.zoomCaption || '';
        if (src) {
          this.openImageModal(src, title, subtitle, caption);
          return;
        }
      }

      // GPIO filter chips
      const filterBtn = target.closest('[data-gpio-filter]') as HTMLElement;
      if (filterBtn) {
        const filter = filterBtn.dataset.gpioFilter as GpioFilterCategory;
        if (filter) {
          this.gpioFilter = filter;
          this.render();
        }
        return;
      }

      // Pin matrix click
      const miniPinBtn = target.closest('[data-pin-select]') as HTMLElement;
      if (miniPinBtn) {
        const pinNum = Number(miniPinBtn.dataset.pinSelect);
        if (!Number.isNaN(pinNum)) {
          const pinSpec = this.boardPkg.gpioPinMap[pinNum];
          if (pinSpec) {
            this.activeGpioPin = pinNum;
            this.callbacks.onFocusGpioPin(pinSpec);
            this.render();
          }
        }
        return;
      }

      // Pin table row click
      const pinRow = target.closest('[data-gpio-row]') as HTMLElement;
      if (pinRow && !target.closest('.zoomable-btn')) {
        const pinNum = Number(pinRow.dataset.gpioRow);
        if (!Number.isNaN(pinNum)) {
          const pinSpec = this.boardPkg.gpioPinMap[pinNum];
          if (pinSpec) {
            this.activeGpioPin = pinNum;
            this.callbacks.onFocusGpioPin(pinSpec);
            this.render();
          }
        }
        return;
      }

      // Subcircuit card click
      const subCard = target.closest('[data-subcircuit-mesh]') as HTMLElement;
      if (subCard) {
        const meshKey = subCard.dataset.subcircuitMesh;
        const label = subCard.dataset.subcircuitLabel || '';
        if (meshKey) {
          this.activeMeshKey = meshKey;
          this.activeSubLabel = label;
          this.callbacks.onFocusSubCircuit(this.currentId, meshKey, label);
          this.render();
        }
      }
    });
  }
}
