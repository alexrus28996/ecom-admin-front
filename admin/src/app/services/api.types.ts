export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface MoneyAmount {
  amount: number;
  currency: string;
}
