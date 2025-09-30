import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private baseUrl = `${environment.apiBaseUrl}/admin`;

  constructor(private http: HttpClient) {}

  getMetrics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/metrics`).pipe(map((res: any) => res || {}));
  }

  getSalesReport(params: any = {}): Observable<any> {
    return this.http.get(`${this.baseUrl}/reports/sales`, { params }).pipe(
      map((res: any) => {
        if (res && res.series) {
          return res.series;
        }
        return res.data || [];
      })
    );
  }
}
