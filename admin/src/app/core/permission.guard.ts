import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AuthService } from './auth.service';
import { PermissionsService } from './permissions.service';
import { ToastService } from './toast.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly permissions: PermissionsService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly i18n: TranslateService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | boolean {
    const required: string[] =
      route.data?.['permissions'] || route.data?.['requiredPermissions'] || route.data?.['permission'] || [];

    if (!Array.isArray(required) || required.length === 0) {
      return true;
    }

    if (this.hasPermission(required)) {
      return true;
    }

    return this.auth.loadContext({ force: true }).pipe(
      map(() => {
        if (this.hasPermission(required)) {
          return true;
        }
        return this.deny(state.url, required);
      }),
      catchError(() => of(this.deny(state.url, required)))
    );
  }

  private hasPermission(required: readonly string[]): boolean {
    if (!required.length) {
      return true;
    }

    const user = this.auth.currentUser;
    if (!user) {
      return false;
    }

    if (user.roles?.includes('admin')) {
      console.debug('[PermissionGuard] Admin bypass granted', { user, required });
      return true;
    }

    const permissions = this.auth.permissions;
    if (permissions.includes('*')) {
      return true;
    }

    return required.some((permission) => permissions.includes(permission) || this.permissions.can(permission, false));
  }

  private deny(url: string, required: readonly string[]): UrlTree {
    const messageKey = 'auth.errors.accessDenied';
    const translated = this.i18n.instant(messageKey);
    this.toast.error(translated !== messageKey ? translated : 'Access Denied');
    console.warn('[PermissionGuard] Access denied', {
      user: this.auth.currentUser,
      requiredPermissions: required
    });
    return this.router.parseUrl('/denied');
  }
}
