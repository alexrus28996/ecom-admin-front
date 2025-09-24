import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  DashboardMetrics,
  ServiceHealth,
  ApiResponse
} from './api.types';

export interface SalesReportParams {
  from?: string; // ISO date string
  to?: string;   // ISO date string
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

export interface SalesReportData {
  period: string;
  revenue: number;
  orders: number;
  customers: number;
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<ApiResponse<DashboardMetrics>>(`${this.baseUrl}/admin/metrics`)
      .pipe(map(response => response.data!));
  }

  getSalesReport(params: SalesReportParams = {}): Observable<SalesReportData[]> {
    let httpParams = new HttpParams();

    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);
    if (params.groupBy) httpParams = httpParams.set('groupBy', params.groupBy);

    return this.http.get<ApiResponse<SalesReportData[]>>(`${this.baseUrl}/admin/reports/sales`, { params: httpParams })
      .pipe(map(response => response.data!));
  }

  getHealthStatus(): Observable<ServiceHealth> {
    return this.http.get<ServiceHealth>(`${this.baseUrl}/health`);
  }

  // For backward compatibility with existing dashboard component
  getDashboardData(): Observable<DashboardMetrics> {
    return this.getDashboardMetrics();
  }
}