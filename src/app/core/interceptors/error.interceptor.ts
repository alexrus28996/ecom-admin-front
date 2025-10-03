import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../../constants/api.constants';
import { AuthService } from '../services/auth.service';

const REFRESH_EXCLUDED_PATHS = [
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.refresh,
];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isUnauthorized = error.status === 401;
      const isRefreshRequest = REFRESH_EXCLUDED_PATHS.some((path) =>
        req.url.includes(path),
      );

      if (isUnauthorized && !isRefreshRequest && authService.getRefreshToken()) {
        return authService.refreshAccessToken().pipe(
          switchMap((token) =>
            next(
              req.clone({
                setHeaders: {
                  Authorization: `Bearer ${token}`,
                },
              }),
            ),
          ),
          catchError((refreshError) => {
            authService.handleSessionExpired();
            return throwError(() => refreshError);
          }),
        );
      }

      if (isUnauthorized) {
        authService.handleSessionExpired();
      }

      return throwError(() => error);
    }),
  );
};
