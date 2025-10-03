import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [MatProgressSpinnerModule, NgIf, TranslateModule],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 py-12 text-slate-500 dark:text-slate-300">
      <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      <p *ngIf="messageKey">{{ messageKey | translate }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingStateComponent {
  @Input() messageKey?: string;
}
