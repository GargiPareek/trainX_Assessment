export declare enum PaymentOrderStatus {
    CREATING = "CREATING",
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    EXPIRED = "EXPIRED",
    RECONCILIATION_REQUIRED = "RECONCILIATION_REQUIRED"
}
export declare const ACTIVE_ORDER_STATUSES: readonly [PaymentOrderStatus.CREATING, PaymentOrderStatus.PENDING, PaymentOrderStatus.RECONCILIATION_REQUIRED];
export declare const TERMINAL_ORDER_STATUSES: readonly [PaymentOrderStatus.PAID, PaymentOrderStatus.FAILED, PaymentOrderStatus.CANCELLED, PaymentOrderStatus.EXPIRED];
