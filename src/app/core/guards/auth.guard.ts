import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, take } from 'rxjs';
import { LOGIN_ROUTE } from '../../constants/routes.constants';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  return authService.user$.pipe(
    take(1),
    map((user): boolean | UrlTree => {
      if (user) {
        return true;
      }
      return router.createUrlTree([LOGIN_ROUTE]);
    }),
  );
};
