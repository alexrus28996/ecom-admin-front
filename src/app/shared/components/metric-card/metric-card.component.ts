import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [MatIconModule, NgIf, TranslateModule],
  template: `
    <div class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ labelKey | translate }}</span>
        <mat-icon *ngIf="icon" class="text-indigo-500">{{ icon }}</mat-icon>
      </div>
      <div class="text-3xl font-semibold text-slate-900 dark:text-slate-100">
        {{ value }}
      </div>
      <div *ngIf="description" class="text-sm text-slate-500 dark:text-slate-400">{{ description }}</div>
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  @Input() labelKey!: string;
  @Input() value!: string | number;
  @Input() icon?: string;
  @Input() description?: string;
}
