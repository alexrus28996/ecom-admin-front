import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ROUTES } from '../constants/app.constants';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate() {
    const u = this.auth.user;
    const isAdmin = !!u && Array.isArray(u.roles) && u.roles.includes('admin');
    if (isAdmin) return true;
    this.router.navigate(ROUTES.login);
    return false;
  }
}
