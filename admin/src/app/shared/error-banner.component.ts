import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-error-banner',
  template: `
    <div class="app-error-banner" *ngIf="resolvedKey() as k">
      <mat-icon [color]="color">{{ icon }}</mat-icon>
      <span>{{ k | translate }}</span>
    </div>
  `,
  styles: [
    `
      .app-error-banner {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: 12px;
        background: rgba(248, 113, 113, 0.12);
        color: #b91c1c;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorBannerComponent {
  @Input() key: string | null = null;
  @Input() error: any;
  @Input() icon: string = 'error';
  @Input() color: 'primary' | 'accent' | 'warn' = 'warn';

  resolvedKey(): string | null {
    if (this.key) return this.key;
    const code = this.error?.error?.error?.code;
    if (code) return `errors.backend.${code}`;
    return null;
  }
}

