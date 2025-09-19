import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../services/admin.service';
import { MetricSummary, HealthStatus } from '../../services/dashboard.models';

interface DashboardMetricCard {
  titleKey: string;
  value: number | string;
  trend?: number;
  icon: string;
  color: 'primary' | 'accent' | 'warn' | 'neutral';
  hintKey?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  metrics: MetricSummary | null = null;
  health: HealthStatus | null = null;
  loading = true;
  errorKey: string | null = null;

  constructor(private readonly adminService: AdminService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.errorKey = null;

    forkJoin({
      metrics: this.adminService.getMetrics(),
      health: this.adminService.getHealth().pipe(catchError(() => [{ status: 'down' }] as any))
    }).subscribe({
      next: ({ metrics, health }) => {
        this.metrics = metrics;
        this.health = Array.isArray(health) ? health[0] : health;
        this.loading = false;
      },
      error: () => {
        this.errorKey = 'dashboard.errors.loadFailed';
        this.loading = false;
      }
    });
  }

  buildCards(): DashboardMetricCard[] {
    if (!this.metrics) {
      return [];
    }

    return [
      {
        titleKey: 'dashboard.cards.users',
        value: this.metrics.users.total,
        icon: 'group',
        color: 'primary',
        hintKey: 'dashboard.cards.usersHint'
      },
      {
        titleKey: 'dashboard.cards.admins',
        value: this.metrics.users.admins,
        icon: 'admin_panel_settings',
        color: 'accent'
      },
      {
        titleKey: 'dashboard.cards.products',
        value: this.metrics.products.total,
        icon: 'inventory_2',
        color: 'primary'
      },
      {
        titleKey: 'dashboard.cards.orders',
        value: this.metrics.orders.total,
        icon: 'assignment',
        color: 'neutral'
      }
    ];
  }

  healthStatusClass(): 'healthy' | 'degraded' | 'down' {
    const status = this.health?.status?.toLowerCase();
    if (status === 'ok' || status === 'pass') {
      return 'healthy';
    }
    if (status === 'warn' || status === 'degraded') {
      return 'degraded';
    }
    return 'down';
  }
}
