import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';

import { ReportService, SalesReport, TopCustomerReportItem, TopProductReportItem } from '../../../services/report.service';
import { AuditService } from '../../../services/audit.service';
import { ToastService } from '../../../core/toast.service';
import { PermissionsService } from '../../../core/permissions.service';

Chart.register(...registerables);

interface SalesFilters {
  from?: string;
  to?: string;
  groupBy?: 'day' | 'week' | 'month';
}

@Component({
  selector: 'app-reports-dashboard',
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsDashboardComponent implements OnInit, OnDestroy {
  readonly salesFiltersForm = this.fb.group({
    groupBy: ['day' as 'day' | 'week' | 'month'],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  readonly topProductsForm = this.fb.group({
    limit: [10],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  readonly topCustomersForm = this.fb.group({
    limit: [10],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  readonly salesChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Revenue' }
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        title: { display: true, text: 'Orders' },
        grid: { drawOnChartArea: false }
      }
    }
  };

  salesChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Revenue',
        data: [],
        borderColor: '#3f51b5',
        backgroundColor: 'rgba(63,81,181,0.2)',
        yAxisID: 'y'
      },
      {
        label: 'Orders',
        data: [],
        borderColor: '#009688',
        backgroundColor: 'rgba(0,150,136,0.2)',
        yAxisID: 'y1'
      }
    ]
  };

  topProducts: TopProductReportItem[] = [];
  topCustomers: TopCustomerReportItem[] = [];

  loadingSales = false;
  loadingProducts = false;
  loadingCustomers = false;
  readOnly = false;

  totalRevenue = 0;
  totalOrders = 0;
  activeCustomers = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly reportService: ReportService,
    private readonly audit: AuditService,
    private readonly toast: ToastService,
    private readonly permissions: PermissionsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.readOnly = !this.permissions.can('reports.view', false);
    if (this.readOnly) {
      return;
    }

    this.audit.log({ action: 'reports.view' }).subscribe();
    this.loadSales();
    this.loadTopProducts();
    this.loadTopCustomers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applySalesFilters(): void {
    this.loadSales();
    this.audit.log({ action: 'reports.sales.filter', metadata: this.salesFilterPayload() }).subscribe();
  }

  applyProductsFilters(): void {
    this.loadTopProducts();
    this.audit.log({ action: 'reports.products.filter', metadata: this.topProductsFilterPayload() }).subscribe();
  }

  applyCustomersFilters(): void {
    this.loadTopCustomers();
    this.audit.log({ action: 'reports.customers.filter', metadata: this.topCustomersFilterPayload() }).subscribe();
  }

  exportTopProducts(): void {
    this.exportCsv('top-products', this.topProducts.map((item) => ({
      product: item.name,
      quantity: item.quantity,
      revenue: item.revenue
    })), ['Product', 'Quantity', 'Revenue']);
    this.audit.log({ action: 'reports.products.export' }).subscribe();
  }

  exportTopCustomers(): void {
    this.exportCsv('top-customers', this.topCustomers.map((item) => ({
      name: item.name,
      email: item.email,
      orders: item.orders,
      revenue: item.revenue
    })), ['Customer', 'Email', 'Orders', 'Revenue']);
    this.audit.log({ action: 'reports.customers.export' }).subscribe();
  }

  exportSales(): void {
    const labels = this.salesChartData.labels ?? [];
    const revenueDataset = this.salesChartData.datasets[0]?.data ?? [];
    const ordersDataset = this.salesChartData.datasets[1]?.data ?? [];
    const rows = labels.map((label, index) => ({
      period: label as string,
      revenue: revenueDataset[index] ?? 0,
      orders: ordersDataset[index] ?? 0
    }));
    this.exportCsv('sales-report', rows, ['Period', 'Revenue', 'Orders']);
    this.audit.log({ action: 'reports.sales.export' }).subscribe();
  }

  private loadSales(): void {
    this.loadingSales = true;
    this.cdr.markForCheck();

    const payload = this.salesFilterPayload();
    this.reportService
      .sales(payload as SalesFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.hydrateSalesReport(report);
          this.loadingSales = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingSales = false;
          this.toast.error(err?.error?.error?.message ?? 'Failed to load sales report');
          this.cdr.markForCheck();
        }
      });
  }

  private hydrateSalesReport(report: SalesReport): void {
    const labels = report.series.map((point) => point.period);
    const revenue = report.series.map((point) => point.revenue);
    const orders = report.series.map((point) => point.orders);

    this.salesChartData = {
      labels,
      datasets: [
        { ...this.salesChartData.datasets[0], data: revenue },
        { ...this.salesChartData.datasets[1], data: orders }
      ]
    };

    this.totalRevenue = revenue.reduce((sum, value) => sum + value, 0);
    this.totalOrders = orders.reduce((sum, value) => sum + value, 0);
  }

  private loadTopProducts(): void {
    this.loadingProducts = true;
    this.cdr.markForCheck();

    this.reportService
      .topProducts(this.topProductsFilterPayload())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.topProducts = response.items ?? [];
          this.loadingProducts = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingProducts = false;
          this.toast.error(err?.error?.error?.message ?? 'Failed to load top products');
          this.cdr.markForCheck();
        }
      });
  }

  private loadTopCustomers(): void {
    this.loadingCustomers = true;
    this.cdr.markForCheck();

    this.reportService
      .topCustomers(this.topCustomersFilterPayload())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.topCustomers = response.items ?? [];
          this.activeCustomers = this.topCustomers.length;
          this.loadingCustomers = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingCustomers = false;
          this.toast.error(err?.error?.error?.message ?? 'Failed to load top customers');
          this.cdr.markForCheck();
        }
      });
  }

  private salesFilterPayload(): SalesFilters {
    const value = this.salesFiltersForm.value;
    const payload: SalesFilters = {
      groupBy: value.groupBy ?? 'day'
    };
    if (value.range?.start) payload.from = new Date(value.range.start).toISOString();
    if (value.range?.end) payload.to = new Date(value.range.end).toISOString();
    return payload;
  }

  private topProductsFilterPayload(): { from?: string; to?: string; limit?: number } {
    const value = this.topProductsForm.value;
    const payload: { from?: string; to?: string; limit?: number } = {
      limit: value.limit ?? 10
    };
    if (value.range?.start) payload.from = new Date(value.range.start).toISOString();
    if (value.range?.end) payload.to = new Date(value.range.end).toISOString();
    return payload;
  }

  private topCustomersFilterPayload(): { from?: string; to?: string; limit?: number } {
    const value = this.topCustomersForm.value;
    const payload: { from?: string; to?: string; limit?: number } = {
      limit: value.limit ?? 10
    };
    if (value.range?.start) payload.from = new Date(value.range.start).toISOString();
    if (value.range?.end) payload.to = new Date(value.range.end).toISOString();
    return payload;
  }

  private exportCsv(filename: string, rows: Array<Record<string, unknown>>, headers: string[]): void {
    const csvRows = [headers.join(',')];
    rows.forEach((row) => {
      const values = headers.map((header) => {
        const key = header.toLowerCase();
        const value = row[key] ?? row[header] ?? '';
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toast.success('Report exported');
  }
}
