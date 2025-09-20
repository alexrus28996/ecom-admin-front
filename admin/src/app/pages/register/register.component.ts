import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  loading = false;
  successKey: string | null = null;
  errorKey: string | null = null;
  lastError: any = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  submit(): void {
    if (this.loading) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    if (!name || !email || !password) {
      return;
    }

    this.loading = true;
    this.successKey = null;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.auth
      .register(name.trim(), email.trim(), password)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.successKey = 'register.success';
          this.form.reset();
          this.cdr.markForCheck();
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          const message = err?.error?.error?.message;
          const hasMessage = typeof message === 'string' && message.trim().length > 0;
          this.lastError = err;
          if (code) {
            this.errorKey = `errors.backend.${code}`;
          } else if (!hasMessage) {
            this.errorKey = 'register.errors.generic';
          } else {
            this.errorKey = null;
          }
          this.cdr.markForCheck();
        }
      });
  }

  showError(control: 'name' | 'email' | 'password', error: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
