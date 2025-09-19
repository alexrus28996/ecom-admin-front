import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshing = false;
  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
    private i18n: TranslateService
  ) {}
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.token;
    const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        const url = req.url || '';
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
        if (err.status === 401 && !isAuthEndpoint) {
          if (this.refreshing) {
            // Another request already triggered refresh; just logout to avoid loops
            this.auth.logout();
            this.router.navigate(['/login']);
            this.toast.error(this.i18n.instant('auth.errors.sessionExpired'));
            return throwError(() => err);
          }
          this.refreshing = true;
          return this.auth.refresh().pipe(
            switchMap((res) => {
              this.refreshing = false;
              if (!res || !res.token) {
                this.auth.logout();
                this.router.navigate(['/login']);
                this.toast.error(this.i18n.instant('auth.errors.sessionExpired'));
                return throwError(() => err);
              }
              const retried = req.clone({ setHeaders: { Authorization: `Bearer ${res.token}` } });
              return next.handle(retried);
            }),
            catchError((e) => {
              this.refreshing = false;
              this.auth.logout();
              this.router.navigate(['/login']);
              this.toast.error(this.i18n.instant('auth.errors.sessionExpired'));
              return throwError(() => e);
            })
          );
        } else if (err.status === 403) {
          // Access denied for current user/role
          this.toast.error(this.i18n.instant('auth.errors.accessDenied'));
          // if currently on an admin route or action, nudge back to dashboard
          this.router.navigate(['/denied']);
          return throwError(() => err);
        }
        return throwError(() => err);
      })
    );
  }
}
