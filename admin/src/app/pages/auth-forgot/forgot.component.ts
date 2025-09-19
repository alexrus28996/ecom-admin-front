import { Component } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({ selector: 'app-forgot', templateUrl: './forgot.component.html' })
export class ForgotComponent {
  email = '';
  loading = false;
  msg = ''; err = '';
  constructor(private auth: AuthService) {}
  submit() {
    this.loading = true; this.msg=''; this.err='';
    this.auth.requestPasswordReset(this.email, window.location.origin).subscribe({
      next: () => { this.loading = false; this.msg = 'If the email exists, a reset link was sent.'; },
      error: (e) => { this.loading = false; this.err = e?.error?.error?.message || 'Request failed'; }
    });
  }
}

