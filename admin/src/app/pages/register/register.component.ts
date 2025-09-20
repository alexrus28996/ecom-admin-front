import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  loading = false;
  successMessage: string | null = null;
  errorKey: string | null = null;
  lastError: any = null;

  constructor(private readonly fb: FormBuilder, private readonly auth: AuthService, private readonly router: Router) {}

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
    this.successMessage = null;
    this.errorKey = null;
    this.lastError = null;

    this.auth
      .register(name.trim(), email.trim(), password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Registration successful. You can now sign in.';
          this.form.reset();
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          const message = err?.error?.error?.message;
          const hasMessage = typeof message === 'string' && message.trim().length > 0;
          this.errorKey = code ? `errors.backend.${code}` : null;
          this.lastError = code || hasMessage ? err : { error: { error: { message: 'Registration failed. Please try again.' } } };
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
