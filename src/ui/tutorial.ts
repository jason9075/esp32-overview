import { TutorialStep } from '../data/boards/types';
import { escapeHtml } from '../utils/html';

export interface TutorialCallbacks {
  onStepSelectComponent: (componentId: string) => void;
  onClose: () => void;
}

export class TutorialUI {
  private readonly container: HTMLElement;
  private readonly callbacks: TutorialCallbacks;
  private steps: TutorialStep[];
  private active = false;
  private currentStepIndex = 0;

  constructor(container: HTMLElement, initialSteps: TutorialStep[], callbacks: TutorialCallbacks) {
    this.container = container;
    this.steps = initialSteps;
    this.callbacks = callbacks;
    this.render();
  }

  public setTutorialSteps(steps: TutorialStep[]): void {
    const wasActive = this.active;
    this.stop();
    this.steps = steps;
    this.currentStepIndex = 0;
    this.render();
    if (wasActive) {
      this.start();
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public start(): void {
    this.active = true;
    this.currentStepIndex = 0;
    this.container.classList.add('active');
    this.syncStep();
  }

  public stop(): void {
    if (!this.active) return;
    this.active = false;
    this.container.classList.remove('active');
    this.callbacks.onClose();
  }

  public toggle(): boolean {
    if (this.active) {
      this.stop();
    } else {
      this.start();
    }
    return this.active;
  }

  private syncStep(): void {
    this.render();
    const step = this.steps[this.currentStepIndex];
    if (step) {
      this.callbacks.onStepSelectComponent(step.componentId);
    }
  }

  private render(): void {
    if (this.steps.length === 0) return;
    const step = this.steps[this.currentStepIndex] ?? this.steps[0];
    const total = this.steps.length;
    const isFirst = this.currentStepIndex === 0;
    const isLast = this.currentStepIndex === total - 1;

    const dotsHtml = this.steps
      .map(
        (_, idx) =>
          `<button type="button" class="tutorial-dot ${idx === this.currentStepIndex ? 'active' : ''}" data-step="${idx}" aria-label="第 ${idx + 1} 步"></button>`
      )
      .join('');

    this.container.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-header">
          <span class="tutorial-step-badge">步驟 ${step.stepNumber} / ${total}</span>
          <div class="tutorial-dots">${dotsHtml}</div>
          <button type="button" class="tutorial-close-btn" title="結束教學">✕</button>
        </div>
        <h3 class="tutorial-title">${escapeHtml(step.title)}</h3>
        <p class="tutorial-body">${escapeHtml(step.body)}</p>
        <div class="tutorial-footer">
          <button type="button" class="tutorial-nav-btn" data-nav="prev" ${isFirst ? 'disabled' : ''}>
            ← 上一步
          </button>
          <button type="button" class="tutorial-nav-btn primary" data-nav="next">
            ${isLast ? '完成導覽 ✓' : '下一步 →'}
          </button>
        </div>
      </div>
    `;

    const closeBtn = this.container.querySelector('.tutorial-close-btn') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => {
      this.stop();
    });

    const prevBtn = this.container.querySelector('[data-nav="prev"]') as HTMLButtonElement;
    prevBtn?.addEventListener('click', () => {
      if (this.currentStepIndex > 0) {
        this.currentStepIndex--;
        this.syncStep();
      }
    });

    const nextBtn = this.container.querySelector('[data-nav="next"]') as HTMLButtonElement;
    nextBtn?.addEventListener('click', () => {
      if (this.currentStepIndex < total - 1) {
        this.currentStepIndex++;
        this.syncStep();
      } else {
        this.stop();
      }
    });

    this.container.querySelectorAll<HTMLButtonElement>('.tutorial-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const stepIdx = Number(dot.dataset.step);
        if (!Number.isNaN(stepIdx)) {
          this.currentStepIndex = stepIdx;
          this.syncStep();
        }
      });
    });
  }
}
