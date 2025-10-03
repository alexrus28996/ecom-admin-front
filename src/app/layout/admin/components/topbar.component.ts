import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { InitialsPipe } from '../../../shared/utils/initials.pipe';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatOptionModule,
    MatSelectModule,
    MatToolbarModule,
    TranslateModule,
    InitialsPipe,
  ],
  template: `
    <mat-toolbar color="transparent" class="sticky top-0 z-40 bg-white/80 backdrop-blur-md dark:bg-slate-900/80">
      <div class="flex flex-1 items-center gap-3">
        <button
          type="button"
          mat-icon-button
          class="text-slate-600 dark:text-slate-300 lg:hidden"
          (click)="menuToggle.emit()"
          aria-label="Toggle menu"
        >
          <mat-icon>menu</mat-icon>
        </button>
        <div class="hidden flex-col lg:flex">
          <span class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ 'app.name' | translate }}</span>
          <span class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ 'app.admin' | translate }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <mat-select
          class="min-w-[120px]"
          [value]="language$ | async"
          (valueChange)="onLanguageChange($event)"
          aria-label="Language selector"
        >
          <mat-option *ngFor="let language of languages" [value]="language">
            {{ ('languages.' + language) | translate }}
          </mat-option>
        </mat-select>

        <button
          mat-icon-button
          type="button"
          class="text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300"
          (click)="toggleTheme()"
          [attr.aria-label]="(isDark$ | async) ? ('common.lightMode' | translate) : ('common.darkMode' | translate)"
        >
          <mat-icon>{{ (isDark$ | async) ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>

        <ng-container *ngIf="user$ | async as user">
          <button
            mat-button
            type="button"
            [matMenuTriggerFor]="userMenu"
            class="flex items-center gap-3 rounded-full bg-slate-100 px-3 py-1.5 text-left hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white">
              {{ user | initials }}
            </div>
            <div class="hidden text-left sm:block">
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {{ user.name }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ user.email }}
              </p>
            </div>
            <mat-icon>expand_more</mat-icon>
          </button>
        </ng-container>
      </div>
    </mat-toolbar>

    <mat-menu #userMenu="matMenu" class="min-w-[220px]">
      <ng-container *ngIf="user$ | async as user">
        <div class="px-4 py-3">
          <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ user.name }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
        </div>
      </ng-container>
      <mat-divider></mat-divider>
      <button mat-menu-item type="button">
        <mat-icon>person</mat-icon>
        <span>{{ 'nav.profile' | translate }}</span>
      </button>
      <button mat-menu-item type="button" (click)="logout()">
        <mat-icon>logout</mat-icon>
        <span>{{ 'auth.logout' | translate }}</span>
      </button>
    </mat-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  @Output() menuToggle = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly themeService = inject(ThemeService);

  readonly user$ = this.authService.user$;
  readonly languages = this.languageService.languages;
  readonly language$ = this.languageService.language$;
  readonly isDark$ = this.themeService.isDark$;

  onLanguageChange(language: string) {
    this.languageService.setLanguage(language);
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  logout() {
    this.authService
      .logout()
      .pipe(
        catchError(() => {
          this.authService.handleSessionExpired();
          return of(false);
        }),
      )
      .subscribe();
  }
}
