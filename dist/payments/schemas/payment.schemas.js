"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxEventSchema = exports.OutboxEvent = exports.PaymentStatusHistorySchema = exports.PaymentStatusHistory = exports.WebhookEventSchema = exports.WebhookEvent = exports.PaymentAttemptSchema = exports.PaymentAttempt = exports.PaymentOrderSchema = exports.PaymentOrder = exports.FeeInvoiceSchema = exports.FeeInvoice = void 0;
require("reflect-metadata");
const mongoose_1 = require("@nestjs/mongoose");
const payment_status_enum_1 = require("../enums/payment-status.enum");
let FeeInvoice = class FeeInvoice {
    invoiceId;
    studentId;
    studentName;
    customerEmail;
    customerPhone;
    totalAmountMinor;
    paidAmountMinor;
    currency;
    active;
    createdAt;
    updatedAt;
};
exports.FeeInvoice = FeeInvoice;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, unique: true }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "invoiceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "studentId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 150 }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "studentName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 254 }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "customerEmail", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, maxlength: 20 }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "customerPhone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, min: 1 }),
    __metadata("design:type", Number)
], FeeInvoice.prototype, "totalAmountMinor", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, min: 0, default: 0 }),
    __metadata("design:type", Number)
], FeeInvoice.prototype, "paidAmountMinor", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, minlength: 3, maxlength: 3, default: 'INR' }),
    __metadata("design:type", String)
], FeeInvoice.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, required: true, default: true, index: true }),
    __metadata("design:type", Boolean)
], FeeInvoice.prototype, "active", void 0);
exports.FeeInvoice = FeeInvoice = __decorate([
    (0, mongoose_1.Schema)({ collection: 'fee_invoices', timestamps: true, versionKey: false })
], FeeInvoice);
exports.FeeInvoiceSchema = mongoose_1.SchemaFactory.createForClass(FeeInvoice);
let PaymentOrder = class PaymentOrder {
    invoiceId;
    studentId;
    userId;
    orderId;
    cfOrderId;
    amountMinor;
    currency;
    status;
    paymentSessionCiphertext;
    idempotencyKey;
    requestHash;
    gatewayIdempotencyKey;
    gatewayRequest;
    expiresAt;
    paidAt;
    lastError;
    activeSlot;
    createdAt;
    updatedAt;
};
exports.PaymentOrder = PaymentOrder;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], PaymentOrder.prototype, "invoiceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], PaymentOrder.prototype, "studentId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], PaymentOrder.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, unique: true, maxlength: 45 }),
    __metadata("design:type", String)
], PaymentOrder.prototype, "orderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], PaymentOrder.prototype, "cfOrderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, min: 1 }),
    __metadata("design:type", Number)
], PaymentOrder.prototype, "amountMinor", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, minlength: 3, maxlength: 3 }),
    __metadata("design:type", String)
], PaymentOrder.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, enum: Object.values(payment_status_enum_1.PaymentOrderStatus), index: true }),
    __metadata("design:type", String)
], PaymentOrder.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, select: false }),
    __metadata("design:type", Object)
], PaymentOrder.prototype, "paymentSessionCiphertext", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, unique: true, maxlength: 128 }),
    __metadata("design:type", String)
], PaymentOrder.prototype, "idempotencyKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, minlength: 64, maxlength: 64 }),
    __metadata("design:type", String)
], PaymentOrder.prototype, "requestHash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, unique: true }),
    __metadata("design:type", String)
], PaymentOrder.prototype, "gatewayIdempotencyKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true, select: false }),
    __metadata("design:type", Object)
], PaymentOrder.prototype, "gatewayRequest", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], PaymentOrder.prototype, "expiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], PaymentOrder.prototype, "paidAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, maxlength: 500 }),
    __metadata("design:type", Object)
], PaymentOrder.prototype, "lastError", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, required: true, default: true }),
    __metadata("design:type", Boolean)
], PaymentOrder.prototype, "activeSlot", void 0);
exports.PaymentOrder = PaymentOrder = __decorate([
    (0, mongoose_1.Schema)({ collection: 'payment_orders', timestamps: true, versionKey: false })
], PaymentOrder);
exports.PaymentOrderSchema = mongoose_1.SchemaFactory.createForClass(PaymentOrder);
exports.PaymentOrderSchema.index({ invoiceId: 1 }, { unique: true, partialFilterExpression: { activeSlot: true }, name: 'uq_payment_orders_active_invoice' });
exports.PaymentOrderSchema.index({ cfOrderId: 1 }, { unique: true, partialFilterExpression: { cfOrderId: { $type: 'string' } }, name: 'uq_payment_orders_cf_order_id' });
exports.PaymentOrderSchema.index({ invoiceId: 1, createdAt: -1 }, { name: 'idx_payment_orders_invoice_created' });
let PaymentAttempt = class PaymentAttempt {
    paymentOrderId;
    attemptNumber;
    cfPaymentId;
    status;
    amountMinor;
    currency;
    paymentGroup;
    paymentTime;
    completionTime;
    errorDetails;
    safePaymentMetadata;
    createdAt;
    updatedAt;
};
exports.PaymentAttempt = PaymentAttempt;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], PaymentAttempt.prototype, "paymentOrderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, min: 1 }),
    __metadata("design:type", Number)
], PaymentAttempt.prototype, "attemptNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, unique: true }),
    __metadata("design:type", String)
], PaymentAttempt.prototype, "cfPaymentId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, maxlength: 40 }),
    __metadata("design:type", String)
], PaymentAttempt.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, min: 0 }),
    __metadata("design:type", Number)
], PaymentAttempt.prototype, "amountMinor", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, minlength: 3, maxlength: 3 }),
    __metadata("design:type", String)
], PaymentAttempt.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], PaymentAttempt.prototype, "paymentGroup", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], PaymentAttempt.prototype, "paymentTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], PaymentAttempt.prototype, "completionTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: null }),
    __metadata("design:type", Object)
], PaymentAttempt.prototype, "errorDetails", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: null }),
    __metadata("design:type", Object)
], PaymentAttempt.prototype, "safePaymentMetadata", void 0);
exports.PaymentAttempt = PaymentAttempt = __decorate([
    (0, mongoose_1.Schema)({ collection: 'payment_attempts', timestamps: true, versionKey: false })
], PaymentAttempt);
exports.PaymentAttemptSchema = mongoose_1.SchemaFactory.createForClass(PaymentAttempt);
exports.PaymentAttemptSchema.index({ paymentOrderId: 1, attemptNumber: 1 }, { unique: true, name: 'uq_payment_attempt_order_number' });
let WebhookEvent = class WebhookEvent {
    eventKey;
    webhookVersion;
    eventType;
    orderId;
    cfPaymentId;
    rawPayload;
    payloadSha256;
    signatureVerified;
    processingError;
    processedAt;
    receivedAt;
};
exports.WebhookEvent = WebhookEvent;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, unique: true, maxlength: 128 }),
    __metadata("design:type", String)
], WebhookEvent.prototype, "eventKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, maxlength: 32 }),
    __metadata("design:type", Object)
], WebhookEvent.prototype, "webhookVersion", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, maxlength: 100 }),
    __metadata("design:type", String)
], WebhookEvent.prototype, "eventType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WebhookEvent.prototype, "orderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WebhookEvent.prototype, "cfPaymentId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], WebhookEvent.prototype, "rawPayload", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, minlength: 64, maxlength: 64 }),
    __metadata("design:type", String)
], WebhookEvent.prototype, "payloadSha256", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, required: true, default: true }),
    __metadata("design:type", Boolean)
], WebhookEvent.prototype, "signatureVerified", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, maxlength: 500 }),
    __metadata("design:type", Object)
], WebhookEvent.prototype, "processingError", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null, index: true }),
    __metadata("design:type", Object)
], WebhookEvent.prototype, "processedAt", void 0);
exports.WebhookEvent = WebhookEvent = __decorate([
    (0, mongoose_1.Schema)({ collection: 'webhook_events', timestamps: { createdAt: 'receivedAt', updatedAt: false }, versionKey: false })
], WebhookEvent);
exports.WebhookEventSchema = mongoose_1.SchemaFactory.createForClass(WebhookEvent);
exports.WebhookEventSchema.index({ processedAt: 1, receivedAt: 1 }, { name: 'idx_webhook_events_processing' });
let PaymentStatusHistory = class PaymentStatusHistory {
    paymentOrderId;
    fromStatus;
    toStatus;
    source;
    sourceEventKey;
    details;
    createdAt;
};
exports.PaymentStatusHistory = PaymentStatusHistory;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], PaymentStatusHistory.prototype, "paymentOrderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, maxlength: 40 }),
    __metadata("design:type", Object)
], PaymentStatusHistory.prototype, "fromStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, maxlength: 40 }),
    __metadata("design:type", String)
], PaymentStatusHistory.prototype, "toStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, maxlength: 40 }),
    __metadata("design:type", String)
], PaymentStatusHistory.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, maxlength: 128 }),
    __metadata("design:type", Object)
], PaymentStatusHistory.prototype, "sourceEventKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: null }),
    __metadata("design:type", Object)
], PaymentStatusHistory.prototype, "details", void 0);
exports.PaymentStatusHistory = PaymentStatusHistory = __decorate([
    (0, mongoose_1.Schema)({ collection: 'payment_status_history', timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
], PaymentStatusHistory);
exports.PaymentStatusHistorySchema = mongoose_1.SchemaFactory.createForClass(PaymentStatusHistory);
exports.PaymentStatusHistorySchema.index({ paymentOrderId: 1, createdAt: 1 }, { name: 'idx_payment_status_history_order' });
let OutboxEvent = class OutboxEvent {
    _id;
    aggregateId;
    eventType;
    deduplicationKey;
    payload;
    publishedAt;
    availableAt;
    attempts;
    lockedUntil;
    lastError;
    createdAt;
    updatedAt;
};
exports.OutboxEvent = OutboxEvent;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "aggregateId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, maxlength: 100 }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "eventType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, unique: true, maxlength: 160 }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "deduplicationKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "payload", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null, index: true }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "publishedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: () => new Date(), index: true }),
    __metadata("design:type", Date)
], OutboxEvent.prototype, "availableAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, min: 0, default: 0 }),
    __metadata("design:type", Number)
], OutboxEvent.prototype, "attempts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null, index: true }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "lockedUntil", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, maxlength: 500 }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "lastError", void 0);
exports.OutboxEvent = OutboxEvent = __decorate([
    (0, mongoose_1.Schema)({ collection: 'outbox_events', timestamps: true, versionKey: false })
], OutboxEvent);
exports.OutboxEventSchema = mongoose_1.SchemaFactory.createForClass(OutboxEvent);
exports.OutboxEventSchema.index({ publishedAt: 1, createdAt: 1 }, { name: 'idx_outbox_pending' });
//# sourceMappingURL=payment.schemas.js.map