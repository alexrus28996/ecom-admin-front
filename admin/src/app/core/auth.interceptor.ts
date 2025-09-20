import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';

type HttpMethodWithBody = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface BackendErrorDetails {
  name?: string;
  message?: string;
  code?: string;
  details?: any;
  friendlyMessage?: string;
  translationKey?: string | null;
}

interface BackendErrorPayload {
  error?: BackendErrorDetails;
  friendlyMessage?: string;
  translationKey?: string | null;
  [key: string]: any;
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshing = false;
  private consecutive401 = 0;
  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
    private i18n: TranslateService
  ) {}
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const storedToken = this.auth.token || localStorage.getItem('auth_token');
    const idempotencyKey = this.shouldAttachIdempotencyKey(req.method) ? this.generateIdempotencyKey() : null;

    const setHeaders: Record<string, string> = {};
    if (storedToken) {
      setHeaders.Authorization = `Bearer ${storedToken}`;
    }
    if (idempotencyKey) {
      setHeaders['Idempotency-Key'] = idempotencyKey;
    }

    const authReq = Object.keys(setHeaders).length ? req.clone({ setHeaders }) : req;

    return next.handle(authReq).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.consecutive401 = 0;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        const enhancedError = this.enhanceError(err, authReq.url || req.url || '');
        const url = authReq.url || req.url || '';
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
        if (enhancedError.status === 401 && !isAuthEndpoint) {
          this.consecutive401 += 1;
          // If refresh already failed or we've seen repeated unauthorized responses, end the session.
          if (this.consecutive401 >= 2 || this.refreshing) {
            this.handleSessionExpired();
            return throwError(() => enhancedError);
          }
          this.refreshing = true;
          return this.auth.refresh().pipe(
            switchMap((res) => {
              this.refreshing = false;
              if (!res || !res.token) {
                this.handleSessionExpired();
                return throwError(() => enhancedError);
              }
              const retryHeaders: Record<string, string> = { Authorization: `Bearer ${res.token}` };
              if (idempotencyKey) {
                retryHeaders['Idempotency-Key'] = idempotencyKey;
              }
              const retried = req.clone({ setHeaders: retryHeaders });
              return next.handle(retried);
            }),
            catchError((e) => {
              this.refreshing = false;
              this.handleSessionExpired();
              const finalError = e instanceof HttpErrorResponse ? this.enhanceError(e, authReq.url || req.url || '') : enhancedError;
              return throwError(() => finalError);
            })
          );
        } else if (enhancedError.status === 403) {
          // Access denied for current user/role
          this.toast.error(this.i18n.instant('auth.errors.accessDenied'));
          // if currently on an admin route or action, nudge back to dashboard
          this.router.navigate(['/denied']);
          return throwError(() => enhancedError);
        }
        return throwError(() => enhancedError);
      })
    );
  }

  private handleSessionExpired(): void {
    this.consecutive401 = 0;
    this.refreshing = false;
    this.auth.logout();
    this.router.navigate(['/login']);
    this.toast.error(this.i18n.instant('auth.errors.sessionExpired'));
  }

  private shouldAttachIdempotencyKey(method?: string | null): method is HttpMethodWithBody {
    if (!method) {
      return false;
    }
    const upper = method.toUpperCase() as HttpMethodWithBody | string;
    return upper === 'POST' || upper === 'PUT' || upper === 'PATCH' || upper === 'DELETE';
  }

  private generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback RFC4122 v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private enhanceError(err: HttpErrorResponse, requestUrl: string): HttpErrorResponse {
    if (!(err instanceof HttpErrorResponse)) {
      return err;
    }

    const payload: BackendErrorPayload = this.normalizePayload(err.error);
    const backendError = payload.error;

    const translationKey = backendError?.code ? `errors.backend.${backendError.code}` : null;
    const resolvedMessage = this.resolveErrorMessage(payload, translationKey);

    const enrichedPayload: BackendErrorPayload = {
      ...payload,
      error: backendError ? { ...backendError, friendlyMessage: resolvedMessage, translationKey } : backendError,
      friendlyMessage: resolvedMessage,
      translationKey
    };

    return new HttpErrorResponse({
      error: enrichedPayload,
      headers: err.headers,
      status: err.status,
      statusText: err.statusText,
      url: err.url || requestUrl
    });
  }

  private normalizePayload(error: any): BackendErrorPayload {
    if (error && typeof error === 'object') {
      return error as BackendErrorPayload;
    }
    if (typeof error === 'string') {
      return { friendlyMessage: error };
    }
    return {};
  }

  private resolveErrorMessage(payload: BackendErrorPayload, translationKey: string | null): string {
    const backendError = payload.error;

    if (translationKey) {
      const translated = this.i18n.instant(translationKey, backendError?.details ?? {});
      if (translated && translated !== translationKey) {
        return translated;
      }
    }

    if (payload.friendlyMessage) {
      return payload.friendlyMessage;
    }

    if (backendError?.friendlyMessage) {
      return backendError.friendlyMessage;
    }

    if (backendError?.message) {
      return backendError.message;
    }

    if (translationKey) {
      return this.i18n.instant('errors.backend.default', { code: backendError?.code || 'UNKNOWN' });
    }

    return this.i18n.instant('errors.backend.default', { code: 'UNKNOWN' });
  }
}
