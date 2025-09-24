import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `
    <div class="app-loading-overlay" *ngIf="show">
      <mat-progress-spinner [diameter]="diameter" mode="indeterminate"></mat-progress-spinner>
      <p class="muted" *ngIf="labelKey">{{ labelKey | translate }}</p>
    </div>
  `,
  styles: [
    `
      :host {
        position: relative;
        display: contents;
      }
      .app-loading-overlay {
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0.8);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 12px;
        z-index: 100;
        border-radius: inherit;
        transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      .app-loading-overlay p {
        margin: 0;
        font-size: 14px;
        color: var(--app-text-muted);
        font-weight: 500;
      }
      :host-context(.theme-dark) .app-loading-overlay {
        background: rgba(17, 24, 39, 0.85);
        backdrop-filter: blur(6px);
      }
      :host-context(.theme-dark) .app-loading-overlay p {
        color: rgba(255, 255, 255, 0.7);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingComponent {
  @Input() show = false;
  @Input() diameter = 40;
  @Input() labelKey: string | null = null;
}

