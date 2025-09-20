import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SalesReportSeriesItem {
  period: string;
  revenue: number;
  orders: number;
}

export interface SalesReport {
  groupBy: 'day' | 'week' | 'month';
  series: SalesReportSeriesItem[];
}

export interface TopProductReportItem {
  product: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface TopCustomerReportItem {
  user: string;
  name: string;
  email?: string;
  orders: number;
  revenue: number;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly base = `${environment.apiBaseUrl}/admin/reports`;

  constructor(private readonly http: HttpClient) {}

  sales(params: { from?: string; to?: string; groupBy?: 'day' | 'week' | 'month' } = {}): Observable<SalesReport> {
    let httpParams = new HttpParams();
    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);
    if (params.groupBy) httpParams = httpParams.set('groupBy', params.groupBy);
    return this.http.get<SalesReport>(`${this.base}/sales`, { params: httpParams });
  }

  topProducts(params: { from?: string; to?: string; by?: 'quantity' | 'revenue'; limit?: number } = {}): Observable<{ by: string; items: TopProductReportItem[] }> {
    let httpParams = new HttpParams();
    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);
    if (params.by) httpParams = httpParams.set('by', params.by);
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<{ by: string; items: TopProductReportItem[] }>(`${this.base}/top-products`, { params: httpParams });
  }

  topCustomers(params: { from?: string; to?: string; by?: 'revenue' | 'orders'; limit?: number } = {}): Observable<{ by: string; items: TopCustomerReportItem[] }> {
    let httpParams = new HttpParams();
    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);
    if (params.by) httpParams = httpParams.set('by', params.by);
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<{ by: string; items: TopCustomerReportItem[] }>(`${this.base}/top-customers`, { params: httpParams });
  }
}
