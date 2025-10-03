import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { API_ENDPOINTS } from '../../constants/api.constants';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6 dark:from-slate-900 dark:to-slate-800">
      <mat-card class="w-full max-w-md bg-white/90 p-8 shadow-xl backdrop-blur dark:bg-slate-900/90">
        <div class="mb-6 text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/10">
            <mat-icon color="primary">admin_panel_settings</mat-icon>
          </div>
          <h1 class="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {{ 'auth.loginTitle' | translate }}
          </h1>
        </div>
        <form class="space-y-5" [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'auth.email' | translate }}</mat-label>
            <input
              matInput
              type="email"
              formControlName="email"
              autocomplete="email"
              [attr.aria-invalid]="form.controls.email.invalid"
            />
            <mat-error *ngIf="form.controls.email.hasError('required')">
              {{ 'auth.emailRequired' | translate }}
            </mat-error>
            <mat-error *ngIf="form.controls.email.hasError('email')">
              {{ 'auth.emailInvalid' | translate }}
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'auth.password' | translate }}</mat-label>
            <input
              matInput
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="form.controls.password.invalid"
            />
            <mat-error *ngIf="form.controls.password.hasError('required')">
              {{ 'auth.passwordRequired' | translate }}
            </mat-error>
            <mat-error *ngIf="form.controls.password.hasError('minlength')">
              {{ 'auth.passwordLength' | translate }}
            </mat-error>
          </mat-form-field>

          <a
            class="block text-sm font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300"
            [href]="forgotPasswordHref"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ 'auth.forgotPassword' | translate }}
          </a>

          <div *ngIf="errorKey" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {{ errorKey | translate }}
          </div>

          <button
            mat-raised-button
            color="primary"
            class="flex w-full items-center justify-center gap-3 py-3 text-base font-semibold"
            type="submit"
            [disabled]="form.invalid || loading"
          >
            <mat-progress-spinner
              *ngIf="loading"
              diameter="20"
              mode="indeterminate"
              strokeWidth="3"
            ></mat-progress-spinner>
            <span>{{ 'auth.login' | translate }}</span>
          </button>
        </form>
      </mat-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly forgotPasswordHref = API_ENDPOINTS.auth.forgotPassword;

  loading = false;
  errorKey: string | null = null;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit() {
    if (this.form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    this.errorKey = null;

    this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.authService.navigateToDashboard();
        },
        error: (error) => {
          if (error.status === 401 || error.status === 400) {
            this.errorKey = 'auth.invalidCredentials';
            return;
          }
          this.errorKey = 'auth.genericError';
        },
      });
  }
}
