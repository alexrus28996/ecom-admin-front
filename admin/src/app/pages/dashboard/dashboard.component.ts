import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminService } from '../../services/admin.service';
import { MetricSummary, HealthStatus } from '../../services/dashboard.models';
import { OrdersService } from '../../services/orders.service';
import { ReturnsService } from '../../services/returns.service';
import { InventoryService } from '../../services/inventory.service';

interface DashboardMetricCard {
  titleKey?: string;
  title?: string;
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
  operations = {
    ordersToday: 0,
    pendingReturns: 0,
    lowStock: 0
  };

  constructor(
    private readonly adminService: AdminService,
    private readonly ordersService: OrdersService,
    private readonly returnsService: ReturnsService,
    private readonly inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.errorKey = null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    forkJoin({
      metrics: this.adminService.getMetrics(),
      health: this.adminService.getHealth().pipe(catchError(() => [{ status: 'down' }] as any)),
      ordersToday: this.ordersService
        .getAdminOrders({ dateStart: todayStart.toISOString(), dateEnd: todayEnd.toISOString(), limit: 1 })
        .pipe(
          map((res) => res.pagination?.total || res.total || res.items?.length || 0),
          catchError(() => of(0))
        ),
      pendingReturns: this.returnsService
        .getReturns({ status: 'requested', limit: 1 })
        .pipe(
          map((res) => res.pagination?.total || res.total || res.items?.length || 0),
          catchError(() => of(0))
        ),
      lowStock: this.inventoryService
        .getLowStock({ limit: 1 })
        .pipe(
          map((res) => res.pagination?.total || res.total || res.items?.length || 0),
          catchError(() => of(0))
        )
    }).subscribe({
      next: ({ metrics, health, ordersToday, pendingReturns, lowStock }) => {
        this.metrics = metrics;
        this.health = Array.isArray(health) ? health[0] : health;
        this.operations = {
          ordersToday,
          pendingReturns,
          lowStock
        };
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

  operationsCards(): DashboardMetricCard[] {
    return [
      {
        title: 'Orders today',
        value: this.operations.ordersToday,
        icon: 'today',
        color: 'accent'
      },
      {
        title: 'Pending returns',
        value: this.operations.pendingReturns,
        icon: 'assignment_return',
        color: 'warn'
      },
      {
        title: 'Low stock alerts',
        value: this.operations.lowStock,
        icon: 'warehouse',
        color: 'primary'
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
