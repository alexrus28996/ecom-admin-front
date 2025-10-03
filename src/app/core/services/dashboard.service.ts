import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../constants/api.constants';
import {
  MetricsSummary,
  SalesReportPoint,
  SalesReportResponse,
} from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly http: HttpClient) {}

  getMetrics(): Observable<MetricsSummary> {
    return this.http.get<MetricsSummary>(API_ENDPOINTS.admin.metrics);
  }

  getSalesReport(): Observable<SalesReportPoint[]> {
    return this.http
      .get<SalesReportResponse>(API_ENDPOINTS.admin.salesReport)
      .pipe(map((response) => response.series));
  }
}
