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
  private readonly idempotentMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
    private i18n: TranslateService
  ) {}
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.token;
    const shouldUseIdempotencyKey = this.shouldAddIdempotencyKey(req.method);

    const setHeaders: Record<string, string> = {};
    if (token) {
      setHeaders.Authorization = `Bearer ${token}`;
    }
    const writeKey = shouldUseIdempotencyKey ? this.generateIdempotencyKey() : null;
    if (writeKey) {
      setHeaders['Idempotency-Key'] = writeKey;
    }

    const preparedReq = Object.keys(setHeaders).length ? req.clone({ setHeaders }) : req;

    return next.handle(preparedReq).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.consecutive401 = 0;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        const enhancedError = this.enhanceError(err);
        const url = req.url || '';
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
              if (writeKey) {
                retryHeaders['Idempotency-Key'] = writeKey;
              }
              const retried = req.clone({ setHeaders: retryHeaders });
              return next.handle(retried);
            }),
            catchError((e) => {
              this.refreshing = false;
              this.handleSessionExpired();
              const fallback = e instanceof HttpErrorResponse ? this.enhanceError(e) : enhancedError;
              return throwError(() => fallback);
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

  private shouldAddIdempotencyKey(method: string): boolean {
    if (!method) {
      return false;
    }
    const normalized = method.toUpperCase();
    return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE';
  }

  private generateIdempotencyKey(): string {
    const crypto = globalThis.crypto as Crypto | undefined;
    if (crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return template.replace(/[xy]/g, (char) => {
      const r = Math.floor(Math.random() * 16);
      const v = char === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private enhanceError(err: HttpErrorResponse): HttpErrorResponse {
    const clonedBody = this.cloneErrorBody(err.error);
    const apiError = this.extractApiError(err.error);
    const code = this.resolveErrorCode(apiError, err);
    const message = this.resolveErrorMessage(apiError, err, err.error);

    if (!apiError && !code && !message) {
      return err;
    }

    const nextError = { ...(apiError || {}) } as Record<string, unknown>;
    if (code) {
      nextError.code = code;
    }
    if (message) {
      nextError.message = message;
    }

    clonedBody.error = { ...clonedBody.error, ...nextError };

    const enhanced = new HttpErrorResponse({
      error: clonedBody,
      headers: err.headers,
      status: err.status,
      statusText: err.statusText,
      url: err.url ?? undefined
    });

    (enhanced as any).message = err.message;
    (enhanced as any).name = err.name;

    return enhanced;
  }

  private cloneErrorBody(body: unknown): any {
    if (Array.isArray(body)) {
      return [...body];
    }
    if (body && typeof body === 'object') {
      return { ...(body as Record<string, unknown>) };
    }
    return {};
  }

  private extractApiError(body: unknown): Record<string, unknown> | null {
    if (body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)) {
      const nested = (body as Record<string, unknown>)['error'];
      if (nested && typeof nested === 'object') {
        return { ...(nested as Record<string, unknown>) };
      }
    }
    return null;
  }

  private resolveErrorCode(apiError: Record<string, unknown> | null, err: HttpErrorResponse): string {
    const code = apiError?.['code'];
    if (typeof code === 'string' && code.trim().length > 0) {
      return code;
    }
    const name = apiError?.['name'];
    if (typeof name === 'string' && name.trim().length > 0) {
      return name;
    }
    if (err.status) {
      return `HTTP_${err.status}`;
    }
    return 'UNKNOWN_ERROR';
  }

  private resolveErrorMessage(
    apiError: Record<string, unknown> | null,
    err: HttpErrorResponse,
    rawBody: unknown
  ): string | null {
    const message = apiError?.['message'];
    if (typeof message === 'string' && message.trim().length > 0) {
      return message.trim();
    }

    const details = apiError?.['details'];
    if (typeof details === 'string' && details.trim().length > 0) {
      return details.trim();
    }
    if (Array.isArray(details)) {
      const combined = details
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((value) => value.length > 0)
        .join(', ');
      if (combined.length > 0) {
        return combined;
      }
    }

    if (typeof rawBody === 'string' && rawBody.trim().length > 0) {
      return rawBody.trim();
    }

    const code = apiError?.['code'];
    if (typeof code === 'string' && code.trim().length > 0) {
      const backendKey = `errors.backend.${code}`;
      const translated = this.i18n.instant(backendKey);
      if (translated && translated !== backendKey) {
        return translated;
      }
    }

    if (err.message && err.message.trim().length > 0) {
      return err.message.trim();
    }

    return null;
  }
}
