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
    const accessDeniedMessage = this.i18n.instant('auth.errors.accessDenied');

    if (!requiredRoles.length) {
      return true;
    }

    if (this.auth.hasValidAccessToken() && this.auth.hasAnyRole(requiredRoles)) {
      return true;
    }

    if (!this.auth.hasRefreshToken) {
      this.toast.error(accessDeniedMessage);
      this.auth.logout();
      return this.router.createUrlTree(['/login'], {
        queryParams: { redirectTo: state.url }
      });
    }

    return this.auth.refresh({ force: true }).pipe(
      map((response) => {
        if (response && this.auth.hasAnyRole(requiredRoles)) {
          return true;
        }
        this.toast.error(accessDeniedMessage);
        return this.router.parseUrl('/denied');
      }),
      catchError(() => {
        this.toast.error(accessDeniedMessage);
        this.auth.logout();
        return of(
          this.router.createUrlTree(['/login'], {
            queryParams: { redirectTo: state.url }
          })
        );
      })
    );
  }
}
