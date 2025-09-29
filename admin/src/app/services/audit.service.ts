import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, mapTo } from 'rxjs/operators';

import { environment } from '../../environments/environment';

export interface AuditPayload {
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/audit`;

  constructor(private readonly http: HttpClient) {}

  log(payload: AuditPayload): Observable<void> {
    const body = {
      ...payload,
      occurredAt: new Date().toISOString()
    };
    return this.http.post<void>(this.baseUrl, body).pipe(
      mapTo(void 0),
      catchError(() => of(void 0))
    );
  }
}
