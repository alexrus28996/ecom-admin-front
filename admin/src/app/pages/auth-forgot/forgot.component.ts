import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot',
  templateUrl: './forgot.component.html',
  styleUrls: ['./forgot.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotComponent {
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  loading = false;
  successKey: string | null = null;
  errorKey: string | null = null;
  lastError: any = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
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

    const email = this.form.get('email')?.value?.trim();
    if (!email) {
      return;
    }

    this.loading = true;
    this.successKey = null;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.auth
      .requestPasswordReset(email, window.location.origin)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.successKey = 'forgot.success';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.lastError = err;
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'forgot.errors.generic';
          this.cdr.markForCheck();
        }
      });
  }

  showError(control: 'email', error: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }
}

