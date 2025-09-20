import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-error-banner',
  template: `
    <div class="app-error-banner" *ngIf="resolved() as ctx">
      <mat-icon [color]="color">{{ icon }}</mat-icon>
      <span>{{ ctx.key | translate: ctx.params }}</span>
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

  constructor(private readonly translate: TranslateService) {}

  resolved(): { key: string; params?: Record<string, unknown> } | null {
    if (this.key) {
      return { key: this.key };
    }

    const code = this.error?.error?.error?.code;
    if (!code) {
      return null;
    }

    const backendKey = `errors.backend.${code}`;
    const translated = this.translate.instant(backendKey);

    if (translated && translated !== backendKey) {
      return { key: backendKey };
    }

    return { key: 'errors.backend.default', params: { code } };
  }
}

