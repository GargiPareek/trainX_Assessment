import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { MongoReplicaSetHealth } from '../database/mongo-replica-set.health';
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
} from './schemas/payment.schemas';
import { CashfreeClient } from './gateways/cashfree.client';
import { CashfreeWebhookController } from './controllers/cashfree-webhook.controller';
import { CashfreeWebhookService } from './services/cashfree-webhook.service';
import { ErpOutboxPublisher } from './services/erp-outbox-publisher.service';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentsService } from './services/payments.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: FeeInvoice.name, schema: FeeInvoiceSchema },
      { name: PaymentOrder.name, schema: PaymentOrderSchema },
      { name: PaymentAttempt.name, schema: PaymentAttemptSchema },
      { name: WebhookEvent.name, schema: WebhookEventSchema },
      { name: PaymentStatusHistory.name, schema: PaymentStatusHistorySchema },
      { name: OutboxEvent.name, schema: OutboxEventSchema },
    ]),
  ],
  controllers: [PaymentsController, CashfreeWebhookController],
  providers: [PaymentsService, CashfreeClient, CashfreeWebhookService, ErpOutboxPublisher, MongoReplicaSetHealth],
  exports: [PaymentsService],
})
export class PaymentsModule {}