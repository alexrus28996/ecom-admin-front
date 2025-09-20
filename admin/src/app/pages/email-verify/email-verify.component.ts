import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({ selector: 'app-email-verify', templateUrl: './email-verify.component.html' })
export class EmailVerifyComponent {
  loading = true;
  msgKey: string | null = null;
  errKey: string | null = null;
  errMessage: string | null = null;

  constructor(route: ActivatedRoute, auth: AuthService) {
    const token = route.snapshot.paramMap.get('token') || '';

    auth.verifyEmail(token).subscribe({
      next: () => {
        this.loading = false;
        this.msgKey = 'emailVerify.success';
      },
      error: (e) => {
        this.loading = false;
        const code = e?.error?.error?.code;
        const message = e?.error?.error?.message;

        if (typeof code === 'string' && code.trim().length > 0) {
          this.errKey = `errors.backend.${code}`;
        } else if (typeof message === 'string' && message.trim().length > 0) {
          this.errMessage = message.trim();
        } else {
          this.errKey = 'emailVerify.errors.generic';
        }
      }
    });
  }
}

