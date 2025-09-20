import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-error-banner',
  template: `
    <div class="app-error-banner" *ngIf="resolved() as ctx">
      <mat-icon [color]="color">{{ icon }}</mat-icon>
      <ng-container *ngIf="ctx.message; else translated">
        <span>{{ ctx.message }}</span>
      </ng-container>
      <ng-template #translated>
        <span>{{ ctx.key | translate: ctx.params }}</span>
      </ng-template>
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

  resolved(): { key?: string; params?: Record<string, unknown>; message?: string } | null {
    if (this.key) {
      return { key: this.key };
    }

    const payload = this.error?.error?.error ?? {};
    const codeRaw = (payload as Record<string, unknown>)['code'];
    const code = typeof codeRaw === 'string' ? codeRaw : null;

    if (code) {
      const backendKey = `errors.backend.${code}`;
      const translated = this.translate.instant(backendKey);

      if (translated && translated !== backendKey) {
        return { key: backendKey };
      }
    }

    const messageRaw = (payload as Record<string, unknown>)['message'];
    if (typeof messageRaw === 'string' && messageRaw.trim().length > 0) {
      return { message: messageRaw.trim() };
    }

    if (code) {
      return { key: 'errors.backend.default', params: { code } };
    }

    return null;
  }
}

