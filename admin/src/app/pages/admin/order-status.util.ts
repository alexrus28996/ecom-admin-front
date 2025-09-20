export type OrderStatusValue = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatusValue = 'unpaid' | 'paid' | 'refunded';

export interface StatusOption<T extends string> {
  readonly value: T;
  readonly labelKey: string;
}

const ORDER_STATUS_VALUES: readonly OrderStatusValue[] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;
const PAYMENT_STATUS_VALUES: readonly PaymentStatusValue[] = ['unpaid', 'paid', 'refunded'] as const;

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUS_VALUES as readonly string[]);
const PAYMENT_STATUS_SET = new Set<string>(PAYMENT_STATUS_VALUES as readonly string[]);

export const UNKNOWN_ORDER_STATUS_KEY = 'adminOrders.status.unknown';
export const UNKNOWN_PAYMENT_STATUS_KEY = 'adminOrders.paymentStatus.unknown';

export const ORDER_STATUS_OPTIONS: StatusOption<OrderStatusValue>[] = ORDER_STATUS_VALUES.map(
  (value): StatusOption<OrderStatusValue> => ({
    value,
    labelKey: `adminOrders.status.${value}`
  })
);

export const PAYMENT_STATUS_OPTIONS: StatusOption<PaymentStatusValue>[] = PAYMENT_STATUS_VALUES.map(
  (value): StatusOption<PaymentStatusValue> => ({
    value,
    labelKey: `adminOrders.paymentStatus.${value}`
  })
);

export function orderStatusKey(value: string | null | undefined): string {
  if (!value) {
    return UNKNOWN_ORDER_STATUS_KEY;
  }
  return ORDER_STATUS_SET.has(value) ? `adminOrders.status.${value}` : UNKNOWN_ORDER_STATUS_KEY;
}

export function paymentStatusKey(value: string | null | undefined): string {
  if (!value) {
    return UNKNOWN_PAYMENT_STATUS_KEY;
  }
  return PAYMENT_STATUS_SET.has(value) ? `adminOrders.paymentStatus.${value}` : UNKNOWN_PAYMENT_STATUS_KEY;
}
