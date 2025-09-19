import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({ selector: 'app-register', templateUrl: './register.component.html' })
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  loading = false;
  error = '';
  message = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.loading = true; this.error = ''; this.message = '';
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => { this.loading = false; this.message = 'Registered. You can now sign in.'; },
      error: (err) => { this.loading = false; this.error = err?.error?.error?.message || 'Registration failed'; }
    });
  }
}

