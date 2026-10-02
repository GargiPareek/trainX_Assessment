export enum PaymentOrderStatus {
  CREATING = 'CREATING',
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  RECONCILIATION_REQUIRED = 'RECONCILIATION_REQUIRED',
}

export const ACTIVE_ORDER_STATUSES = [
  PaymentOrderStatus.CREATING,
  PaymentOrderStatus.PENDING,
  PaymentOrderStatus.RECONCILIATION_REQUIRED,
] as const;

export const TERMINAL_ORDER_STATUSES = [
  PaymentOrderStatus.PAID,
  PaymentOrderStatus.FAILED,
  PaymentOrderStatus.CANCELLED,
  PaymentOrderStatus.EXPIRED,
] as const;
