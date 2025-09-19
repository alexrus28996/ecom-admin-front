export interface MetricSummary {
  users: {
    total: number;
    active: number;
    admins: number;
  };
  products: {
    total: number;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
  };
  revenueLast7Days: Array<{ date: string; total: number }>;
}

export interface HealthStatus {
  status: string;
  name?: string;
  version?: string;
}

export interface DashboardSnapshot {
  metrics: MetricSummary;
  health: HealthStatus;
  loading: boolean;
}
