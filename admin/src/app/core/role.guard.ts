import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> {
    const requiredRoles = (route.data?.['roles'] as string[] | undefined) ?? ['admin'];

    if (this.hasAccess(requiredRoles)) {
      return true;
    }

    if (!this.auth.hasRefreshToken) {
      return this.handleDenied(state.url, requiredRoles, true);
    }

    return this.auth.loadContext({ force: true }).pipe(
      map(() => {
        if (this.hasAccess(requiredRoles)) {
          return true;
        }
        return this.handleDenied(state.url, requiredRoles, false);
      }),
      catchError(() => of(this.handleDenied(state.url, requiredRoles, true)))
    );
  }

  private hasAccess(requiredRoles: readonly string[]): boolean {
    if (!requiredRoles.length) {
      return true;
    }

    const user = this.auth.currentUser;
    if (!user) {
      return false;
    }

    if (user.roles?.includes('admin')) {
      console.debug('[RoleGuard] Admin bypass granted', { user, requiredRoles });
      return true;
    }

    const allowed = requiredRoles.some((role) => user.roles?.includes(role));
    if (allowed) {
      return true;
    }

    return false;
  }

  private handleDenied(url: string, requiredRoles: readonly string[], redirectToLogin: boolean): UrlTree {
    const messageKey = 'auth.errors.accessDenied';
    const translated = this.i18n.instant(messageKey);
    this.toast.error(translated !== messageKey ? translated : 'Access Denied');
    console.warn('[RoleGuard] Access denied', {
      user: this.auth.currentUser,
      requiredRoles
    });

    if (redirectToLogin) {
      return this.router.createUrlTree(['/login'], {
        queryParams: { redirectTo: url }
      });
    }

    return this.router.parseUrl('/denied');
  }
}
