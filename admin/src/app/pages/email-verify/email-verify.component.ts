import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({ selector: 'app-email-verify', templateUrl: './email-verify.component.html' })
export class EmailVerifyComponent {
  token = '';
  loading = true;
  msg = ''; err = '';
  constructor(route: ActivatedRoute, auth: AuthService) {
    this.token = route.snapshot.paramMap.get('token') || '';
    auth.verifyEmail(this.token).subscribe({
      next: () => { this.loading = false; this.msg = 'Email verified.'; },
      error: (e) => { this.loading = false; this.err = e?.error?.error?.message || 'Verification failed'; }
    });
  }
}

