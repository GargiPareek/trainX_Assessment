import mongoose from 'mongoose';
import {
  FeeInvoice,
  FeeInvoiceSchema,
  OutboxEvent,
  OutboxEventSchema,
  PaymentAttempt,
  PaymentAttemptSchema,
  PaymentOrder,
  PaymentOrderSchema,
  PaymentStatusHistory,
  PaymentStatusHistorySchema,
  WebhookEvent,
  WebhookEventSchema,
} from '../../payments/schemas/payment.schemas';
import { User, UserSchema } from '../../users/schemas/user.schema';

export const migrationId = '001-payment-collections';

export async function up(): Promise<void> {
  const schemas = [
    [FeeInvoice, FeeInvoiceSchema],
    [PaymentOrder, PaymentOrderSchema],
    [PaymentAttempt, PaymentAttemptSchema],
    [WebhookEvent, WebhookEventSchema],
    [PaymentStatusHistory, PaymentStatusHistorySchema],
    [OutboxEvent, OutboxEventSchema],
    [User, UserSchema],
  ] as const;

  for (const [modelClass, schema] of schemas) {
    const model = mongoose.model(modelClass.name, schema);
    await model.createIndexes();
    console.info(`Created/verified indexes for ${schema.options.collection}`);
  }
}