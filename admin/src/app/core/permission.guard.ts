import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PermissionsService as PermissionsStateService } from './permissions.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly permissions: PermissionsStateService,
    private readonly toast: ToastService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    const required: string[] =
      route.data?.['permissions'] || route.data?.['requiredPermissions'] || route.data?.['permission'] || [];
    if (!Array.isArray(required) || required.length === 0) {
      return of(true);
    }

    const hasAll = required.every((permission) => this.permissions.can(permission, false));
    if (hasAll) {
      return of(true);
    }

    return this.permissions.load().pipe(
      map(() => {
        const allowed = required.every((permission) => this.permissions.can(permission, false));
        if (allowed) {
          return true;
        }
        this.toast.error("You don’t have permission.");
        return this.router.parseUrl('/denied');
      }),
      catchError(() => {
        this.toast.error("You don’t have permission.");
        return of(this.router.parseUrl('/denied'));
      })
    );
  }
}
