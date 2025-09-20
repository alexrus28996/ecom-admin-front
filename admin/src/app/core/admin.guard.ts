import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const requiredRoles = (route.data?.['roles'] as string[] | undefined) ?? ['admin'];

    if (this.auth.isLoggedIn && this.auth.hasAnyRole(requiredRoles)) {
      return true;
    }

    this.toast.error(this.i18n.instant('auth.errors.accessDenied'));
    return this.router.parseUrl('/denied');
  }
}
