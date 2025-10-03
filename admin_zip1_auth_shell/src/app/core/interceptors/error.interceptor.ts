import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private toast: ToastService) {}
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        const code = (err.error && err.error.code) ? err.error.code : err.status;
        const message = (err.error && err.error.message) ? err.error.message : err.message;
        console.error('[HTTP]', code, message, err);
        this.toast.error(`${code}: ${message}`);
        return throwError(() => err);
      })
    );
  }
}
