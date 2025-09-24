export interface Paginated<T> {
  data?: T[];
  items?: T[];
  total: number;
  page: number;
  pages: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MoneyAmount {
  amount: number;
  currency: string;
}
