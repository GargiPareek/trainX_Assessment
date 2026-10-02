"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMINAL_ORDER_STATUSES = exports.ACTIVE_ORDER_STATUSES = exports.PaymentOrderStatus = void 0;
var PaymentOrderStatus;
(function (PaymentOrderStatus) {
    PaymentOrderStatus["CREATING"] = "CREATING";
    PaymentOrderStatus["PENDING"] = "PENDING";
    PaymentOrderStatus["PAID"] = "PAID";
    PaymentOrderStatus["FAILED"] = "FAILED";
    PaymentOrderStatus["CANCELLED"] = "CANCELLED";
    PaymentOrderStatus["EXPIRED"] = "EXPIRED";
    PaymentOrderStatus["RECONCILIATION_REQUIRED"] = "RECONCILIATION_REQUIRED";
})(PaymentOrderStatus || (exports.PaymentOrderStatus = PaymentOrderStatus = {}));
exports.ACTIVE_ORDER_STATUSES = [
    PaymentOrderStatus.CREATING,
    PaymentOrderStatus.PENDING,
    PaymentOrderStatus.RECONCILIATION_REQUIRED,
];
exports.TERMINAL_ORDER_STATUSES = [
    PaymentOrderStatus.PAID,
    PaymentOrderStatus.FAILED,
    PaymentOrderStatus.CANCELLED,
    PaymentOrderStatus.EXPIRED,
];
//# sourceMappingURL=payment-status.enum.js.map