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
    const token = this.resolveToken();
    const idempotencyKey = this.shouldAddIdempotencyKey(req) ? this.generateIdempotencyKey() : null;
    const requestWithHeaders = this.decorateRequest(req, token, idempotencyKey);

    return next.handle(requestWithHeaders).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.consecutive401 = 0;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        const { error: enrichedError } = this.enrichBackendError(err, requestWithHeaders);
        const url = requestWithHeaders.url || '';
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
        if (enrichedError.status === 401 && !isAuthEndpoint) {
          this.consecutive401 += 1;
          // If refresh already failed or we've seen repeated unauthorized responses, end the session.
          if (this.consecutive401 >= 2 || this.refreshing) {
            this.handleSessionExpired();
            return throwError(() => enrichedError);
          }
          this.refreshing = true;
          return this.auth.refresh().pipe(
            switchMap((res) => {
              this.refreshing = false;
              if (!res || !res.token) {
                this.handleSessionExpired();
                return throwError(() => enrichedError);
              }
              const retried = this.decorateRequest(req, res.token, idempotencyKey);
              return next.handle(retried);
            }),
            catchError((e) => {
              this.refreshing = false;
              this.handleSessionExpired();
              const { error: refreshError } = this.enrichBackendError(e, requestWithHeaders);
              return throwError(() => refreshError);
            })
          );
        } else if (enrichedError.status === 403) {
          // Access denied for current user/role
          this.toast.error(this.i18n.instant('auth.errors.accessDenied'));
          // if currently on an admin route or action, nudge back to dashboard
          this.router.navigate(['/denied']);
          return throwError(() => enrichedError);
        }
        return throwError(() => enrichedError);
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

  private resolveToken(): string | null {
    return this.auth.token ?? localStorage.getItem('auth_token');
  }

  private decorateRequest(
    req: HttpRequest<any>,
    token: string | null,
    idempotencyKey: string | null
  ): HttpRequest<any> {
    const headers: Record<string, string> = {};
    if (token && !req.headers.has('Authorization')) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (idempotencyKey && !req.headers.has('Idempotency-Key')) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req;
  }

  private shouldAddIdempotencyKey(req: HttpRequest<any>): boolean {
    const method = (req.method || '').toUpperCase();
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  }

  private generateIdempotencyKey(): string {
    const cryptoRef: Crypto | undefined = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
    if (cryptoRef?.randomUUID) {
      return cryptoRef.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private enrichBackendError(
    err: HttpErrorResponse,
    req: HttpRequest<any>
  ): { error: HttpErrorResponse; message: string | null } {
    if (!(err instanceof HttpErrorResponse)) {
      return { error: err, message: null };
    }

    const payload = err.error as any;
    const backendError = payload?.error;
    if (!backendError || typeof backendError !== 'object') {
      return { error: err, message: null };
    }

    const code = this.coerceString(backendError.code) ?? this.coerceString(backendError.name);
    const rawMessage = this.coerceString(backendError.message);
    const translated = code ? this.translateIfAvailable(`errors.backend.${code}`) : null;
    const fallback = this.i18n.instant('errors.backend.default', { code: code ?? err.status ?? 'UNKNOWN' });
    const resolvedMessage = rawMessage ?? translated ?? fallback;

    const normalizedCode = this.coerceString(backendError.code) ?? this.coerceString(backendError.name) ?? 'UNKNOWN';
    const normalizedInner = {
      ...backendError,
      name: this.coerceString(backendError.name) ?? code ?? 'Error',
      code: normalizedCode,
      details: backendError.details ?? null,
      message: rawMessage ?? resolvedMessage,
      userMessage: resolvedMessage,
      displayMessage: resolvedMessage,
      messageKey: code ? `errors.backend.${code}` : null
    };

    const normalizedPayload = {
      ...payload,
      error: normalizedInner,
      bannerMessage: resolvedMessage,
      userMessage: resolvedMessage
    };

    const enriched = new HttpErrorResponse({
      error: normalizedPayload,
      headers: err.headers,
      status: err.status,
      statusText: err.statusText,
      url: err.url ?? req.url
    });

    return { error: enriched, message: resolvedMessage };
  }

  private coerceString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private translateIfAvailable(key: string): string | null {
    const translated = this.i18n.instant(key);
    return translated && translated !== key ? translated : null;
  }
}
