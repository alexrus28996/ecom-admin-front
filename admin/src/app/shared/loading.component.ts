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
      .app-loading-overlay {
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        z-index: 1;
      }
      :host-context(.theme-dark) .app-loading-overlay {
        background: rgba(17, 24, 39, 0.5);
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

