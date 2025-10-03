export interface MetricsSummary {
  users: CountMetric;
  products: CountMetric;
  orders: OrderMetrics;
  revenue: RevenueMetric;
}

export interface CountMetric {
  total: number;
}

export interface OrderMetrics {
  pending: number;
  paid: number;
  delivered: number;
}

export interface RevenueMetric {
  last7Days: number;
}

export interface SalesReportPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface SalesReportResponse {
  series: SalesReportPoint[];
}
