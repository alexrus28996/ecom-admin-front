import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({ selector: 'app-reset', templateUrl: './reset.component.html' })
export class ResetComponent {
  token = '';
  password = '';
  loading = false;
  msg = ''; err = '';
  constructor(private route: ActivatedRoute, private auth: AuthService, private router: Router) {
    this.token = this.route.snapshot.paramMap.get('token') || '';
  }
  submit() {
    this.loading = true; this.msg=''; this.err='';
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => { this.loading = false; this.msg = 'Password reset. You can sign in.'; },
      error: (e) => { this.loading = false; this.err = e?.error?.error?.message || 'Reset failed'; }
    });
  }
}

