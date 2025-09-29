import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { PermissionsService } from '../../core/permissions.service';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private permissions: PermissionsService,
    private toast: ToastService,
    private translate: TranslateService
  ) {}

  submit(): void {
    if (this.loading) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    if (!email || !password) {
      return;
    }

    this.loading = true;
    this.errorKey = null;
    this.lastError = null;

    this.auth
      .login(email.trim(), password)
      .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: () => {
            this.permissions.load().subscribe({ next: () => {}, error: () => {} });
            this.router.navigate(['/dashboard']);
          },
        error: (err) => {
          const code = err?.error?.error?.code;
          const message = err?.error?.error?.message;
          const hasMessage = typeof message === 'string' && message.trim().length > 0;
          this.errorKey = code ? `errors.backend.${code}` : null;
          this.lastError = code || hasMessage ? err : { error: { error: { message: this.translate.instant('login.errors.generic') } } };
          const toastMessage = this.resolveErrorMessage(code, hasMessage ? message : null);
          this.toast.error(toastMessage);
        }
      });
  }

  showError(control: 'email' | 'password', error: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }

  private resolveErrorMessage(code?: string, fallbackMessage: string | null = null): string {
    if (code) {
      const translationKey = `errors.backend.${code}`;
      const translated = this.translate.instant(translationKey);
      if (translated && translated !== translationKey) {
        return translated;
      }
    }

    if (fallbackMessage && fallbackMessage.trim().length > 0) {
      return fallbackMessage;
    }

    return this.translate.instant('login.errors.generic');
  }
}
