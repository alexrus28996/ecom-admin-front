import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-reset',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetComponent {
  readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly token: string;
  loading = false;
  successKey: string | null = null;
  errorKey: string | null = null;
  lastError: any = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.token = this.route.snapshot.paramMap.get('token') || '';
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    if (!this.token) {
      this.errorKey = 'reset.errors.invalidToken';
      this.cdr.markForCheck();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const password = this.form.get('password')?.value;
    if (!password) {
      return;
    }

    this.loading = true;
    this.successKey = null;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.auth
      .resetPassword(this.token, password)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.successKey = 'reset.success';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.lastError = err;
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'reset.errors.generic';
          this.cdr.markForCheck();
        }
      });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }

  showError(error: string): boolean {
    const ctrl = this.form.get('password');
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }
}

