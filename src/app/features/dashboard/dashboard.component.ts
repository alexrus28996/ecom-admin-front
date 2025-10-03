import { CurrencyPipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Chart } from 'chart.js/auto';
import { finalize } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { MetricsSummary, SalesReportPoint } from '../../core/models/dashboard.model';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    NgFor,
    NgIf,
    MatCardModule,
    LoadingStateComponent,
    MetricCardComponent,
    TranslateModule,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ 'nav.dashboard' | translate }}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ 'dashboard.subtitle' | translate }}</p>
      </div>

      <section>
        <ng-container *ngIf="!metricsLoading; else metricsLoadingTpl">
          <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <app-metric-card
              *ngIf="metrics"
              labelKey="dashboard.users"
              [value]="numberFormatter.transform(metrics.users.total) ?? 0"
              icon="people"
            ></app-metric-card>
            <app-metric-card
              *ngIf="metrics"
              labelKey="dashboard.products"
              [value]="numberFormatter.transform(metrics.products.total) ?? 0"
              icon="inventory_2"
            ></app-metric-card>
            <app-metric-card
              *ngIf="metrics"
              labelKey="dashboard.orders"
              [value]="metrics.orders.pending + metrics.orders.paid + metrics.orders.delivered"
              icon="shopping_cart"
            >
              <div class="grid grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div class="rounded-lg bg-slate-100 px-2 py-1 text-center dark:bg-slate-800">
                  <span class="block font-semibold text-slate-700 dark:text-slate-200">{{ metrics.orders.pending }}</span>
                  <span>{{ 'dashboard.pending' | translate }}</span>
                </div>
                <div class="rounded-lg bg-slate-100 px-2 py-1 text-center dark:bg-slate-800">
                  <span class="block font-semibold text-slate-700 dark:text-slate-200">{{ metrics.orders.paid }}</span>
                  <span>{{ 'dashboard.paid' | translate }}</span>
                </div>
                <div class="rounded-lg bg-slate-100 px-2 py-1 text-center dark:bg-slate-800">
                  <span class="block font-semibold text-slate-700 dark:text-slate-200">{{ metrics.orders.delivered }}</span>
                  <span>{{ 'dashboard.delivered' | translate }}</span>
                </div>
              </div>
            </app-metric-card>
            <app-metric-card
              *ngIf="metrics"
              labelKey="dashboard.revenue"
              [value]="currencyFormatter.transform(metrics.revenue.last7Days, 'USD') ?? 0"
              icon="payments"
            ></app-metric-card>
          </div>
          <div *ngIf="metricsError" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {{ 'dashboard.metricsError' | translate }}
          </div>
        </ng-container>
        <ng-template #metricsLoadingTpl>
          <app-loading-state messageKey="dashboard.loadingMetrics"></app-loading-state>
        </ng-template>
      </section>

      <section class="grid gap-6 lg:grid-cols-12">
        <mat-card class="lg:col-span-12 bg-white/90 p-6 shadow-sm dark:bg-slate-900/80">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ 'dashboard.salesChart' | translate }}</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ 'dashboard.salesDescription' | translate }}</p>
            </div>
          </div>
          <ng-container *ngIf="!salesLoading; else chartLoading">
            <div class="h-80">
              <canvas #salesChart></canvas>
            </div>
            <div *ngIf="salesError" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {{ 'dashboard.salesError' | translate }}
            </div>
          </ng-container>
          <ng-template #chartLoading>
            <app-loading-state messageKey="dashboard.loadingSales"></app-loading-state>
          </ng-template>
        </mat-card>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DecimalPipe, CurrencyPipe],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  readonly numberFormatter = inject(DecimalPipe);
  readonly currencyFormatter = inject(CurrencyPipe);

  @ViewChild('salesChart') private salesChartRef?: ElementRef<HTMLCanvasElement>;
  private chartInstance?: Chart;

  metricsLoading = true;
  salesLoading = true;
  metricsError = false;
  salesError = false;

  metrics: MetricsSummary | null = null;
  private pendingSeries: SalesReportPoint[] | null = null;

  constructor() {
    this.loadMetrics();
    this.loadSales();
  }

  ngAfterViewInit() {
    if (this.pendingSeries) {
      this.renderChart(this.pendingSeries);
      this.pendingSeries = null;
    }
  }

  ngOnDestroy() {
    this.chartInstance?.destroy();
  }

  private loadMetrics() {
    this.metricsLoading = true;
    this.metricsError = false;

    this.dashboardService
      .getMetrics()
      .pipe(finalize(() => (this.metricsLoading = false)))
      .subscribe({
        next: (metrics) => {
          this.metrics = metrics;
        },
        error: () => {
          this.metricsError = true;
        },
      });
  }

  private loadSales() {
    this.salesLoading = true;
    this.salesError = false;

    this.dashboardService
      .getSalesReport()
      .pipe(finalize(() => (this.salesLoading = false)))
      .subscribe({
        next: (series) => this.handleSalesSeries(series),
        error: () => {
          this.salesError = true;
        },
      });
  }

  private handleSalesSeries(series: SalesReportPoint[]) {
    if (!this.salesChartRef) {
      this.pendingSeries = series;
      return;
    }
    this.renderChart(series);
  }

  private renderChart(series: SalesReportPoint[]) {
    const canvas = this.salesChartRef?.nativeElement;
    if (!canvas) {
      return;
    }

    const labels = series.map((point) => new Date(point.date).toLocaleDateString());
    const revenueData = series.map((point) => point.revenue);
    const ordersData = series.map((point) => point.orders);

    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = revenueData;
      this.chartInstance.data.datasets[1].data = ordersData;
      this.chartInstance.update();
      return;
    }

    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueData,
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            yAxisID: 'y1',
          },
          {
            label: 'Orders',
            data: ordersData,
            borderColor: '#22C55E',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#1f2937',
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#6b7280',
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.2)',
            },
          },
          y1: {
            type: 'linear',
            position: 'left',
            ticks: {
              color: '#4338ca',
            },
            grid: {
              color: 'rgba(99, 102, 241, 0.15)',
            },
          },
          y2: {
            type: 'linear',
            position: 'right',
            ticks: {
              color: '#15803d',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });
  }
}
