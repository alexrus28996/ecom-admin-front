import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, take } from 'rxjs';
import { LOGIN_ROUTE } from '../../constants/routes.constants';
import { UserRole } from '../../constants/roles.constants';
import { AuthService } from '../services/auth.service';

const checkAccess = (
  router: Router,
  canAccess: boolean,
): boolean | UrlTree => {
  if (canAccess) {
    return true;
  }
  return router.createUrlTree([LOGIN_ROUTE]);
};

export const RoleGuard: CanActivateFn & CanActivateChildFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasRole(UserRole.Admin)) {
    return true;
  }

  return authService.user$.pipe(
    take(1),
    map((user) => {
      const hasAccess = !!user && authService.hasRole(UserRole.Admin);
      return checkAccess(router, hasAccess);
    }),
  );
};
