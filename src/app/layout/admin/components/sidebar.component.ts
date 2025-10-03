import { NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { DASHBOARD_ROUTE } from '../../../constants/routes.constants';

interface NavigationItem {
  icon: string;
  labelKey: string;
  route?: string;
  enabled: boolean;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [
    NgClass,
    NgFor,
    NgIf,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    TranslateModule,
  ],
  template: `
    <nav
      class="flex h-full flex-col bg-white/90 px-3 py-6 backdrop-blur-lg shadow-lg dark:bg-slate-900/80"
      [ngClass]="{
        'w-64': !collapsed,
        'w-20': collapsed,
      }"
      role="navigation"
      aria-label="Admin navigation"
    >
      <div class="flex items-center gap-3 px-2">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <mat-icon>storefront</mat-icon>
        </div>
        <div class="text-left" *ngIf="!collapsed">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ 'app.name' | translate }}</p>
          <p class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ 'app.admin' | translate }}</p>
        </div>
      </div>

      <mat-nav-list class="mt-8 space-y-1">
        <ng-container *ngFor="let item of navigation">
          <a
            *ngIf="item.enabled && item.route; else disabledItem"
            mat-list-item
            [routerLink]="item.route"
            [routerLinkActiveOptions]="{ exact: true }"
            #rla="routerLinkActive"
            [ngClass]="[
              'rounded-xl px-3 transition-colors',
              collapsed ? 'justify-center' : 'gap-3',
              rla.isActive
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            ]"
            matTooltip="{{ item.labelKey | translate }}"
            [matTooltipDisabled]="!collapsed"
          >
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            <span matListItemTitle *ngIf="!collapsed">{{ item.labelKey | translate }}</span>
          </a>
          <ng-template #disabledItem>
            <div
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-400 opacity-70"
              [ngClass]="{ 'justify-center': collapsed }"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              <span *ngIf="!collapsed">{{ item.labelKey | translate }}</span>
            </div>
          </ng-template>
        </ng-container>
      </mat-nav-list>

      <button
        type="button"
        class="mt-auto flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
        (click)="toggleCollapse.emit(!collapsed)"
      >
        <mat-icon class="text-lg">{{ collapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
        <span *ngIf="!collapsed" class="ml-2">{{ collapsed ? 'common.expand' : 'common.collapse' | translate }}</span>
      </button>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<boolean>();

  readonly navigation: NavigationItem[] = [
    {
      icon: 'dashboard',
      labelKey: 'nav.dashboard',
      route: DASHBOARD_ROUTE,
      enabled: true,
    },
    { icon: 'group', labelKey: 'nav.users', enabled: false },
    { icon: 'inventory_2', labelKey: 'nav.products', enabled: false },
    { icon: 'category', labelKey: 'nav.categories', enabled: false },
    { icon: 'warehouse', labelKey: 'nav.inventory', enabled: false },
    { icon: 'receipt_long', labelKey: 'nav.orders', enabled: false },
    { icon: 'insights', labelKey: 'nav.reports', enabled: false },
    { icon: 'assignment', labelKey: 'nav.audit', enabled: false },
  ];
}
