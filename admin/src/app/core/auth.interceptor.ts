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
    const token = this.auth.token || localStorage.getItem('auth_token');
    const setHeaders: Record<string, string> = {};

    if (token) {
      setHeaders.Authorization = `Bearer ${token}`;
    }

    let idempotencyKey = req.headers.get('Idempotency-Key');
    if (!idempotencyKey && this.shouldAttachIdempotencyKey(req.method)) {
      idempotencyKey = this.generateIdempotencyKey();
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
        const processed = err instanceof HttpErrorResponse ? this.normalizeError(err) : err;
        const errorToThrow: HttpErrorResponse =
          processed instanceof HttpErrorResponse ? processed : err;
        const url = req.url || '';
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
        if (err.status === 401 && !isAuthEndpoint) {
          this.consecutive401 += 1;
          // If refresh already failed or we've seen repeated unauthorized responses, end the session.
          if (this.consecutive401 >= 2 || this.refreshing) {
            this.handleSessionExpired();
            this.forwardToErrorBanner(errorToThrow);
            return throwError(() => errorToThrow);
          }
          this.refreshing = true;
          return this.auth.refresh().pipe(
            switchMap((res) => {
              this.refreshing = false;
              if (!res || !res.token) {
                this.handleSessionExpired();
                this.forwardToErrorBanner(errorToThrow);
                return throwError(() => errorToThrow);
              }
              const retryHeaders: Record<string, string> = { Authorization: `Bearer ${res.token}` };
              const keyForRetry = idempotencyKey || authReq.headers.get('Idempotency-Key');
              if (keyForRetry) {
                retryHeaders['Idempotency-Key'] = keyForRetry;
              }
              const retried = req.clone({ setHeaders: retryHeaders });
              return next.handle(retried);
            }),
            catchError((e) => {
              this.refreshing = false;
              this.handleSessionExpired();
              const normalized = e instanceof HttpErrorResponse ? this.normalizeError(e) : e;
              if (normalized instanceof HttpErrorResponse) {
                this.forwardToErrorBanner(normalized);
              }
              return throwError(() => normalized);
            })
          );
        } else if (err.status === 403) {
          // Access denied for current user/role
          this.toast.error(this.i18n.instant('auth.errors.accessDenied'));
          // if currently on an admin route or action, nudge back to dashboard
          this.router.navigate(['/denied']);
          this.forwardToErrorBanner(errorToThrow);
          return throwError(() => errorToThrow);
        }
        this.forwardToErrorBanner(errorToThrow);
        return throwError(() => errorToThrow);
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

  private shouldAttachIdempotencyKey(method: string): boolean {
    return this.idempotentMethods.has((method || '').toUpperCase());
  }

  private generateIdempotencyKey(): string {
    const cryptoRef: Crypto | undefined = (globalThis as any)?.crypto;
    if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
      return cryptoRef.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return Math.floor(v).toString(16);
    });
  }

  private normalizeError(err: HttpErrorResponse): HttpErrorResponse {
    const payload = this.coerceErrorPayload(err.error);
    if (payload?.error && typeof payload.error === 'object') {
      const backendError = payload.error as Record<string, any>;
      const message = this.resolveErrorMessage(backendError, err);
      const normalizedPayload = {
        ...payload,
        error: {
          ...backendError,
          message,
          humanMessage: message,
          userMessage: message
        }
      };
      (err as any).error = normalizedPayload;
      (err as any).errorBannerMessage = message;
      return err;
    }

    const fallback = this.resolveErrorMessage(null, err);
    (err as any).error = {
      error: {
        message: fallback,
        humanMessage: fallback,
        userMessage: fallback
      }
    };
    (err as any).errorBannerMessage = fallback;
    return err;
  }

  private coerceErrorPayload(raw: unknown): any | null {
    if (!raw) {
      return null;
    }
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    const hasArrayBuffer = typeof ArrayBuffer !== 'undefined' && raw instanceof ArrayBuffer;
    const hasBlob = typeof Blob !== 'undefined' && raw instanceof Blob;
    if (hasArrayBuffer || hasBlob) {
      return null;
    }
    if (typeof raw === 'object') {
      return raw as any;
    }
    return null;
  }

  private resolveErrorMessage(backendError: Record<string, any> | null, err: HttpErrorResponse): string {
    const directMessage = backendError?.message;
    if (typeof directMessage === 'string' && directMessage.trim()) {
      return directMessage.trim();
    }

    const detailMessage = backendError?.details?.message;
    if (typeof detailMessage === 'string' && detailMessage.trim()) {
      return detailMessage.trim();
    }

    switch (err.status) {
      case 0:
        return 'Unable to reach the server. Please check your connection and try again.';
      case 400:
        return 'We couldn\'t process that request. Please verify the information and try again.';
      case 404:
        return 'The requested resource could not be found.';
      case 409:
        return 'This action could not be completed because of a conflict. Please refresh and try again.';
      case 422:
        return 'Some fields need your attention before we can complete this request.';
    }

    if (err.status >= 500) {
      return 'Something went wrong on our side. Please try again later.';
    }

    return err.message || 'The request could not be completed. Please try again.';
  }

  private forwardToErrorBanner(error: HttpErrorResponse): void {
    const payload = (error?.error ?? null) as any;
    if (!payload || typeof payload !== 'object') {
      return;
    }
    const backendError = payload.error as Record<string, any> | undefined;
    if (!backendError) {
      return;
    }

    const message =
      (typeof backendError.message === 'string' && backendError.message.trim()) ||
      (typeof backendError.humanMessage === 'string' && backendError.humanMessage.trim()) ||
      (typeof (error as any).errorBannerMessage === 'string' && (error as any).errorBannerMessage.trim());

    if (message) {
      backendError.message = backendError.message || message;
      backendError.humanMessage = backendError.humanMessage || message;
      backendError.userMessage = backendError.userMessage || message;
      (error as any).errorBannerMessage = message;
    }
  }
}
