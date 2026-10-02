import 'reflect-metadata';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentOrderStatus } from '../enums/payment-status.enum';

export type FeeInvoiceDocument = HydratedDocument<FeeInvoice>;

@Schema({ collection: 'fee_invoices', timestamps: true, versionKey: false })
export class FeeInvoice {
  @Prop({ type: String, required: true, unique: true })
  invoiceId!: string;

  @Prop({ type: String, required: true, index: true })
  studentId!: string;

  @Prop({ type: String, maxlength: 150 })
  studentName?: string;

  @Prop({ type: String, maxlength: 254 })
  customerEmail?: string;

  @Prop({ type: String, required: true, maxlength: 20 })
  customerPhone!: string;

  @Prop({ type: Number, required: true, min: 1 })
  totalAmountMinor!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  paidAmountMinor!: number;

  @Prop({ type: String, required: true, minlength: 3, maxlength: 3, default: 'INR' })
  currency!: string;

  @Prop({ type: Boolean, required: true, default: true, index: true })
  active!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const FeeInvoiceSchema = SchemaFactory.createForClass(FeeInvoice);

export type PaymentOrderDocument = HydratedDocument<PaymentOrder>;

@Schema({ collection: 'payment_orders', timestamps: true, versionKey: false })
export class PaymentOrder {
  @Prop({ type: String, required: true, index: true })
  invoiceId!: string;

  @Prop({ type: String, required: true, index: true })
  studentId!: string;

  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true, unique: true, maxlength: 45 })
  orderId!: string;

  @Prop({ type: String, default: null })
  cfOrderId!: string | null;

  @Prop({ type: Number, required: true, min: 1 })
  amountMinor!: number;

  @Prop({ type: String, required: true, minlength: 3, maxlength: 3 })
  currency!: string;

  @Prop({ type: String, required: true, enum: Object.values(PaymentOrderStatus), index: true })
  status!: PaymentOrderStatus;

  @Prop({ type: String, default: null, select: false })
  paymentSessionCiphertext!: string | null;

  @Prop({ type: String, required: true, unique: true, maxlength: 128 })
  idempotencyKey!: string;

  @Prop({ type: String, required: true, minlength: 64, maxlength: 64 })
  requestHash!: string;

  @Prop({ type: String, required: true, unique: true })
  gatewayIdempotencyKey!: string;

  @Prop({ type: Object, required: true, select: false })
  gatewayRequest!: Record<string, unknown>;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  @Prop({ type: String, default: null, maxlength: 500 })
  lastError!: string | null;

  @Prop({ type: Boolean, required: true, default: true })
  activeSlot!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PaymentOrderSchema = SchemaFactory.createForClass(PaymentOrder);
PaymentOrderSchema.index(
  { invoiceId: 1 },
  { unique: true, partialFilterExpression: { activeSlot: true }, name: 'uq_payment_orders_active_invoice' },
);
PaymentOrderSchema.index(
  { cfOrderId: 1 },
  { unique: true, partialFilterExpression: { cfOrderId: { $type: 'string' } }, name: 'uq_payment_orders_cf_order_id' },
);
PaymentOrderSchema.index({ invoiceId: 1, createdAt: -1 }, { name: 'idx_payment_orders_invoice_created' });

export type PaymentAttemptDocument = HydratedDocument<PaymentAttempt>;

@Schema({ collection: 'payment_attempts', timestamps: true, versionKey: false })
export class PaymentAttempt {
  @Prop({ type: String, required: true, index: true })
  paymentOrderId!: string;

  @Prop({ type: Number, required: true, min: 1 })
  attemptNumber!: number;

  @Prop({ type: String, required: true, unique: true })
  cfPaymentId!: string;

  @Prop({ type: String, required: true, maxlength: 40 })
  status!: string;

  @Prop({ type: Number, required: true, min: 0 })
  amountMinor!: number;

  @Prop({ type: String, required: true, minlength: 3, maxlength: 3 })
  currency!: string;

  @Prop({ type: String, default: null })
  paymentGroup!: string | null;

  @Prop({ type: Date, default: null })
  paymentTime!: Date | null;

  @Prop({ type: Date, default: null })
  completionTime!: Date | null;

  @Prop({ type: Object, default: null })
  errorDetails!: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  safePaymentMetadata!: Record<string, unknown> | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PaymentAttemptSchema = SchemaFactory.createForClass(PaymentAttempt);
PaymentAttemptSchema.index({ paymentOrderId: 1, attemptNumber: 1 }, { unique: true, name: 'uq_payment_attempt_order_number' });

export type WebhookEventDocument = HydratedDocument<WebhookEvent>;

@Schema({ collection: 'webhook_events', timestamps: { createdAt: 'receivedAt', updatedAt: false }, versionKey: false })
export class WebhookEvent {
  @Prop({ type: String, required: true, unique: true, maxlength: 128 })
  eventKey!: string;

  @Prop({ type: String, default: null, maxlength: 32 })
  webhookVersion!: string | null;

  @Prop({ type: String, required: true, maxlength: 100 })
  eventType!: string;

  @Prop({ type: String, default: null })
  orderId!: string | null;

  @Prop({ type: String, default: null })
  cfPaymentId!: string | null;

  @Prop({ type: Object, required: true })
  rawPayload!: Record<string, unknown>;

  @Prop({ type: String, required: true, minlength: 64, maxlength: 64 })
  payloadSha256!: string;

  @Prop({ type: Boolean, required: true, default: true })
  signatureVerified!: boolean;

  @Prop({ type: String, default: null, maxlength: 500 })
  processingError!: string | null;

  @Prop({ type: Date, default: null, index: true })
  processedAt!: Date | null;

  receivedAt!: Date;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
WebhookEventSchema.index({ processedAt: 1, receivedAt: 1 }, { name: 'idx_webhook_events_processing' });

export type PaymentStatusHistoryDocument = HydratedDocument<PaymentStatusHistory>;

@Schema({ collection: 'payment_status_history', timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
export class PaymentStatusHistory {
  @Prop({ type: String, required: true, index: true })
  paymentOrderId!: string;

  @Prop({ type: String, default: null, maxlength: 40 })
  fromStatus!: string | null;

  @Prop({ type: String, required: true, maxlength: 40 })
  toStatus!: string;

  @Prop({ type: String, required: true, maxlength: 40 })
  source!: string;

  @Prop({ type: String, default: null, maxlength: 128 })
  sourceEventKey!: string | null;

  @Prop({ type: Object, default: null })
  details!: Record<string, unknown> | null;

  createdAt!: Date;
}

export const PaymentStatusHistorySchema = SchemaFactory.createForClass(PaymentStatusHistory);
PaymentStatusHistorySchema.index({ paymentOrderId: 1, createdAt: 1 }, { name: 'idx_payment_status_history_order' });

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({ collection: 'outbox_events', timestamps: true, versionKey: false })
export class OutboxEvent {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  aggregateId!: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  eventType!: string;

  @Prop({ type: String, required: true, unique: true, maxlength: 160 })
  deduplicationKey!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: Date, default: null, index: true })
  publishedAt!: Date | null;

  @Prop({ type: Date, default: () => new Date(), index: true })
  availableAt!: Date;

  @Prop({ type: Number, min: 0, default: 0 })
  attempts!: number;

  @Prop({ type: Date, default: null, index: true })
  lockedUntil!: Date | null;

  @Prop({ type: String, default: null, maxlength: 500 })
  lastError!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ publishedAt: 1, createdAt: 1 }, { name: 'idx_outbox_pending' });