import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { ClientSession, Connection, isValidObjectId, Model, mongo } from 'mongoose';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import {
  FeeInvoice,
  OutboxEvent,
  PaymentAttempt,
  PaymentOrder,
  PaymentStatusHistory,
  WebhookEvent,
} from '../schemas/payment.schemas';
import { PaymentOrderStatus } from '../enums/payment-status.enum';
import { CashfreeApiError, CashfreeClient, CashfreeCreateOrderRequest, toCashfreeAmount } from '../gateways/cashfree.client';
import { decryptPaymentSession, encryptPaymentSession } from '../security/payment-session-crypto';
import { AuthenticatedPrincipal } from '../../auth/jwt-auth.guard';

export interface PaymentAttemptResponse {
  cfPaymentId: string;
  status: string;
  amountMinor: number;
  currency: string;
  paymentGroup: string | null;
  paymentTime: Date | null;
  completionTime: Date | null;
}

export interface PaymentResponse {
  paymentId: string;
  invoiceId: string;
  studentId: string;
  orderId: string;
  cfOrderId: string | null;
  amountMinor: number;
  currency: string;
  status: PaymentOrderStatus;
  paymentSessionId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  attempts: PaymentAttemptResponse[];
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(PaymentOrder.name) private readonly orders: Model<PaymentOrder>,
    @InjectModel(FeeInvoice.name) private readonly invoices: Model<FeeInvoice>,
    @InjectModel(PaymentAttempt.name) private readonly attempts: Model<PaymentAttempt>,
    @InjectModel(WebhookEvent.name) private readonly webhookEvents: Model<WebhookEvent>,
    @InjectModel(PaymentStatusHistory.name) private readonly statusHistory: Model<PaymentStatusHistory>,
    @InjectModel(OutboxEvent.name) private readonly outbox: Model<OutboxEvent>,
    @InjectConnection() private readonly connection: Connection,
    private readonly cashfree: CashfreeClient,
    private readonly config: ConfigService,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
    idempotencyKey: string | undefined,
    principal: AuthenticatedPrincipal,
  ): Promise<PaymentResponse> {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      throw new BadRequestException('A unique Idempotency-Key header (8-128 characters) is required');
    }
    const requestHash = createHash('sha256')
      .update(`invoice:${dto.invoiceId}|user:${principal.userId}|student:${principal.studentId}`)
      .digest('hex');

    let order = await this.orders.findOne({ idempotencyKey }).select('+paymentSessionCiphertext +gatewayRequest').exec();
    if (order) {
      this.assertOwner(order, principal);
      this.assertSameRequest(order, requestHash);
      if (order.paymentSessionCiphertext) return this.toResponse(order, true);
      if (this.isTerminal(order.status)) return this.toResponse(order, false);
      return this.provisionCashfreeOrder(order);
    }

    const invoice = await this.invoices.findOne({
      invoiceId: dto.invoiceId,
      studentId: principal.studentId,
      active: true,
    }).exec();
    if (!invoice) throw new NotFoundException('Active fee invoice not found');
    if (!invoice.customerPhone || !invoice.studentId) {
      throw new BadRequestException('The invoice is missing Cashfree customer details');
    }
    const amountMinor = invoice.totalAmountMinor - invoice.paidAmountMinor;
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new ConflictException('The invoice has no outstanding balance');
    }
    if (amountMinor < 100) throw new BadRequestException('Cashfree INR orders must be at least INR 1.00');
    const currency = invoice.currency.trim().toUpperCase();
    if (currency !== 'INR') throw new BadRequestException('This payment module currently supports INR invoices only');

    const activeOrder = await this.orders.findOne({
      invoiceId: invoice.invoiceId,
      activeSlot: true,
    })
      .select('+paymentSessionCiphertext +gatewayRequest').exec();
    if (activeOrder) {
      this.assertOwner(activeOrder, principal);
      if (activeOrder.requestHash !== requestHash) {
        throw new ConflictException('An active payment already exists for this invoice');
      }
      if (activeOrder.paymentSessionCiphertext) return this.toResponse(activeOrder, true);
      return this.provisionCashfreeOrder(activeOrder);
    }

    const orderId = `ums_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const orderData = {
      invoiceId: invoice.invoiceId,
      studentId: invoice.studentId,
      userId: principal.userId,
      orderId,
      amountMinor,
      currency,
      status: PaymentOrderStatus.CREATING,
      paymentSessionCiphertext: null,
      idempotencyKey,
      requestHash,
      gatewayIdempotencyKey: randomUUID(),
      gatewayRequest: this.buildCashfreeOrderRequest(invoice, orderId, expiresAt),
      expiresAt,
      paidAt: null,
      lastError: null,
      activeSlot: true,
    };

    try {
      const created = await this.withTransaction(async (session) => {
        const [newOrder] = await this.orders.create([orderData], { session });
        await this.statusHistory.create([{
          paymentOrderId: newOrder._id.toString(),
          fromStatus: null,
          toStatus: PaymentOrderStatus.CREATING,
          source: 'API',
          sourceEventKey: null,
          details: { invoiceId: invoice.invoiceId },
        }], { session });
        return newOrder;
      });
      return this.provisionCashfreeOrder(created);
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
      order = await this.orders.findOne({ idempotencyKey }).select('+paymentSessionCiphertext +gatewayRequest').exec();
      if (order) {
        this.assertOwner(order, principal);
        this.assertSameRequest(order, requestHash);
        if (order.paymentSessionCiphertext) return this.toResponse(order, true);
        if (this.isTerminal(order.status)) return this.toResponse(order, false);
        return this.provisionCashfreeOrder(order);
      }
      const competingOrder = await this.orders.findOne({ invoiceId: invoice.invoiceId, activeSlot: true })
        .select('+paymentSessionCiphertext +gatewayRequest').exec();
      if (!competingOrder || competingOrder.requestHash !== requestHash) {
        throw new ConflictException('A conflicting payment request already exists for this invoice');
      }
      if (competingOrder.paymentSessionCiphertext) return this.toResponse(competingOrder, true);
      return this.provisionCashfreeOrder(competingOrder);
    }
  }

  async getPayment(id: string, principal: AuthenticatedPrincipal): Promise<PaymentResponse> {
    if (!isValidObjectId(id)) throw new NotFoundException('Payment not found');
    const order = await this.orders.findOne({
      _id: id,
      userId: principal.userId,
      studentId: principal.studentId,
    }).exec();
    if (!order) throw new NotFoundException('Payment not found');
    const attempts = await this.attempts.find({ paymentOrderId: order._id.toString() }).sort({ attemptNumber: 1 }).lean().exec();
    return { ...this.toResponse(order, false), attempts: attempts.map((attempt) => this.toAttemptResponse(attempt)) };
  }

  async listInvoicePayments(invoiceId: string, principal: AuthenticatedPrincipal): Promise<PaymentResponse[]> {
    const invoice = await this.invoices.findOne({ invoiceId, studentId: principal.studentId }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    const orders = await this.orders.find({ invoiceId, userId: principal.userId }).sort({ createdAt: -1 }).exec();
    return Promise.all(orders.map(async (order) => {
      const attempts = await this.attempts.find({ paymentOrderId: order._id.toString() }).sort({ attemptNumber: 1 }).lean().exec();
      return { ...this.toResponse(order, false), attempts: attempts.map((attempt) => this.toAttemptResponse(attempt)) };
    }));
  }

  async refreshPayment(id: string, principal: AuthenticatedPrincipal): Promise<PaymentResponse> {
    if (!isValidObjectId(id)) throw new NotFoundException('Payment not found');
    const order = await this.orders.findOne({
      _id: id,
      userId: principal.userId,
      studentId: principal.studentId,
    }).exec();
    if (!order) throw new NotFoundException('Payment not found');
    if (this.isTerminal(order.status)) return this.getPayment(id, principal);

    const gatewayOrder = await this.cashfree.getOrder(order.orderId);
    if (
      Math.round(Number(gatewayOrder.order_amount) * 100) !== order.amountMinor ||
      gatewayOrder.order_currency.toUpperCase() !== order.currency
    ) throw new ConflictException('Cashfree order amount/currency does not match the local payment record');

    const normalized = gatewayOrder.order_status.toUpperCase();
    let nextStatus = order.status;
    if (normalized === 'PAID') nextStatus = PaymentOrderStatus.PAID;
    else if (normalized === 'EXPIRED') nextStatus = PaymentOrderStatus.EXPIRED;
    else if (normalized === 'TERMINATED') nextStatus = PaymentOrderStatus.CANCELLED;
    else if (normalized === 'ACTIVE') nextStatus = PaymentOrderStatus.PENDING;
    if (nextStatus !== order.status) {
      await this.transitionOrder(order, nextStatus, 'RECONCILIATION', null, { cashfreeOrderStatus: normalized });
    }
    return this.getPayment(id, principal);
  }

  async applyCashfreeWebhook(
    payload: Record<string, any>,
    eventKey: string,
    webhookVersion: string | null,
  ): Promise<'processed' | 'duplicate'> {
    const data = payload.data ?? {};
    const providerOrderId = data.order?.order_id;
    const payment = data.payment;
    const cfPaymentId = payment?.cf_payment_id === undefined ? null : String(payment.cf_payment_id);
    const eventType = typeof payload.type === 'string' ? payload.type : 'UNKNOWN';
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    try {
      await this.withTransaction(async (session) => {
        const existingEvent = await this.webhookEvents.findOne({ eventKey }).session(session).exec();
        if (existingEvent) throw new DuplicateWebhookError();

        const [event] = await this.webhookEvents.create([{
          eventKey,
          webhookVersion,
          eventType,
          orderId: typeof providerOrderId === 'string' ? providerOrderId : null,
          cfPaymentId,
          rawPayload: payload,
          payloadSha256: payloadHash,
          signatureVerified: true,
          processingError: null,
          processedAt: null,
        }], { session });

        if (typeof providerOrderId !== 'string') {
          event.processingError = 'Webhook did not contain data.order.order_id';
          event.processedAt = new Date();
          await event.save({ session });
          return;
        }

        const order = await this.orders.findOne({ orderId: providerOrderId }).session(session)
          .select('+paymentSessionCiphertext').exec();
        if (!order) {
          event.processingError = 'No local payment order matches the Cashfree order ID';
          event.processedAt = new Date();
          await event.save({ session });
          return;
        }

        if (payment && cfPaymentId) {
          const incomingStatus = String(payment.payment_status ?? 'UNKNOWN').toUpperCase();
          const amountValue = Number(payment.payment_amount ?? data.order?.order_amount ?? 0);
          const incomingAmountMinor = Number.isFinite(amountValue) ? Math.round(amountValue * 100) : -1;
          const incomingCurrency = String(payment.payment_currency ?? data.order?.order_currency ?? '').toUpperCase();
          if (incomingAmountMinor !== order.amountMinor || incomingCurrency !== order.currency) {
            event.processingError = 'Webhook amount/currency does not match the payment order';
            event.processedAt = new Date();
            await event.save({ session });
            this.logger.error(`Payment webhook mismatch for order ${order.orderId}`);
            return;
          }

          let attempt = await this.attempts.findOne({ cfPaymentId }).session(session).exec();
          if (attempt && attempt.paymentOrderId !== order._id.toString()) {
            event.processingError = 'Cashfree payment ID is already associated with a different local order';
            event.processedAt = new Date();
            await event.save({ session });
            return;
          }
          if (!attempt) {
            const attemptNumber = await this.attempts.countDocuments({ paymentOrderId: order._id.toString() }).session(session).exec() + 1;
            [attempt] = await this.attempts.create([{
              paymentOrderId: order._id.toString(),
              attemptNumber,
              cfPaymentId,
              status: incomingStatus,
              amountMinor: incomingAmountMinor,
              currency: incomingCurrency,
              paymentGroup: typeof payment.payment_group === 'string' ? payment.payment_group : null,
              paymentTime: this.parseDate(payment.payment_time),
              completionTime: this.parseDate(payment.payment_completion_time),
              errorDetails: data.error_details ?? null,
              safePaymentMetadata: this.safePaymentMetadata(payment),
            }], { session });
          } else if (incomingStatus === 'SUCCESS' || !this.isTerminalAttempt(attempt.status)) {
            attempt.status = incomingStatus;
            attempt.paymentTime = this.parseDate(payment.payment_time) ?? attempt.paymentTime;
            attempt.completionTime = this.parseDate(payment.payment_completion_time) ?? attempt.completionTime;
            attempt.errorDetails = data.error_details ?? attempt.errorDetails;
            attempt.safePaymentMetadata = this.safePaymentMetadata(payment) ?? attempt.safePaymentMetadata;
            await attempt.save({ session });
          }

          if (incomingStatus === 'SUCCESS' && order.status !== PaymentOrderStatus.PAID) {
            await this.transitionWithSession(session, order, PaymentOrderStatus.PAID, 'WEBHOOK', eventKey, { cfPaymentId });
          } else if (incomingStatus === 'SUCCESS') {
            this.logger.warn(`Additional successful attempt recorded for already-paid order ${order.orderId}`);
          }
        }
        event.processedAt = new Date();
        await event.save({ session });
      });
      return 'processed';
    } catch (error) {
      if (error instanceof DuplicateWebhookError || this.isDuplicateKey(error)) return 'duplicate';
      throw error;
    }
  }

  private async provisionCashfreeOrder(order: any): Promise<PaymentResponse> {
    try {
      const request = order.gatewayRequest as CashfreeCreateOrderRequest;
      if (!request) throw new CashfreeApiError('Payment order has no saved Cashfree request for retry');
      const response = await this.cashfree.createOrder(request, order.gatewayIdempotencyKey);
      if (!response.payment_session_id || response.order_id !== order.orderId || !response.cf_order_id) {
        throw new CashfreeApiError('Cashfree response is missing required order/session fields');
      }
      await this.withTransaction(async (session) => {
        const current = await this.orders.findById(order._id).session(session).select('+paymentSessionCiphertext').exec();
        if (!current || this.isTerminal(current.status)) return;
        const previous = current.status;
        current.cfOrderId = response.cf_order_id;
        current.paymentSessionCiphertext = encryptPaymentSession(response.payment_session_id!);
        current.expiresAt = response.order_expiry_time ? this.parseDate(response.order_expiry_time) : current.expiresAt;
        current.status = PaymentOrderStatus.PENDING;
        current.lastError = null;
        await current.save({ session });
        await this.statusHistory.create([{
          paymentOrderId: current._id.toString(),
          fromStatus: previous,
          toStatus: PaymentOrderStatus.PENDING,
          source: 'CASHFREE_API',
          sourceEventKey: null,
          details: { cfOrderId: response.cf_order_id },
        }], { session });
      });
      const saved = await this.orders.findById(order._id).select('+paymentSessionCiphertext').exec();
      if (!saved) throw new NotFoundException('Payment order was not persisted');
      return this.toResponse(saved, true);
    } catch (error) {
      const message = error instanceof CashfreeApiError
        ? `Cashfree order creation failed${error.statusCode ? ` (${error.statusCode})` : ''}`
        : 'Cashfree order creation failed';
      await this.orders.updateOne(
        { _id: order._id, status: { $nin: [PaymentOrderStatus.PAID, PaymentOrderStatus.CANCELLED, PaymentOrderStatus.EXPIRED] } },
        { $set: { status: PaymentOrderStatus.RECONCILIATION_REQUIRED, lastError: message } },
      ).exec();
      this.logger.error(`${message}; order=${order.orderId}`);
      throw new ServiceUnavailableException('Payment initialization is being reconciled. Retry with the same Idempotency-Key.');
    }
  }

  private async transitionOrder(
    order: any,
    status: PaymentOrderStatus,
    source: string,
    sourceEventKey: string | null,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.withTransaction((session) => this.transitionWithSession(session, order, status, source, sourceEventKey, details));
  }

  private async transitionWithSession(
    session: ClientSession,
    order: any,
    status: PaymentOrderStatus,
    source: string,
    sourceEventKey: string | null,
    details: Record<string, unknown>,
  ): Promise<void> {
    const previous = order.status as PaymentOrderStatus;
    if (previous === status || (previous === PaymentOrderStatus.PAID && status !== PaymentOrderStatus.PAID)) return;
    order.status = status;
    if (status === PaymentOrderStatus.PAID) {
      order.paidAt = new Date();
      order.activeSlot = false;
      order.paymentSessionCiphertext = null;
      const invoice = await this.invoices.findOne({ invoiceId: order.invoiceId }).session(session).exec();
      if (!invoice || invoice.paidAmountMinor + order.amountMinor > invoice.totalAmountMinor) {
        throw new ConflictException('Invoice balance reconciliation failed after payment confirmation');
      }
      const invoiceUpdate = await this.invoices.updateOne(
        { invoiceId: order.invoiceId, paidAmountMinor: invoice.paidAmountMinor },
        { $inc: { paidAmountMinor: order.amountMinor } },
        { session },
      ).exec();
      if (!invoiceUpdate.matchedCount) {
        throw new ConflictException('Invoice balance reconciliation failed after payment confirmation');
      }
    }
    if ([PaymentOrderStatus.CANCELLED, PaymentOrderStatus.EXPIRED].includes(status)) {
      order.activeSlot = false;
      order.paymentSessionCiphertext = null;
    }
    await order.save({ session });
    const paymentOrderId = order._id.toString();
    await this.statusHistory.create([{
      paymentOrderId,
      fromStatus: previous,
      toStatus: status,
      source,
      sourceEventKey,
      details,
    }], { session });
    if (status === PaymentOrderStatus.PAID) {
      await this.outbox.updateOne(
        { deduplicationKey: `payment-succeeded:${paymentOrderId}` },
        {
          $setOnInsert: {
            aggregateId: paymentOrderId,
            eventType: 'PAYMENT_SUCCEEDED',
            deduplicationKey: `payment-succeeded:${paymentOrderId}`,
            payload: {
              paymentId: paymentOrderId,
              invoiceId: order.invoiceId,
              studentId: order.studentId,
              orderId: order.orderId,
              amountMinor: order.amountMinor,
              currency: order.currency,
              paidAt: order.paidAt?.toISOString(),
            },
            publishedAt: null,
            availableAt: new Date(),
            attempts: 0,
            lockedUntil: null,
            lastError: null,
          },
        },
        { upsert: true, session },
      ).exec();
    }
  }

  private async withTransaction<T>(callback: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await callback(session);
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
      return result;
    } catch (error) {
      if (error instanceof mongo.MongoError && error.hasErrorLabel('TransientTransactionError')) {
        throw new ServiceUnavailableException('MongoDB transaction could not be completed; retry safely');
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private buildCashfreeOrderRequest(invoice: FeeInvoice, orderId: string, expiresAt: Date): CashfreeCreateOrderRequest {
    const returnUrl = new URL(this.config.getOrThrow<string>('FRONTEND_RETURN_URL'));
    returnUrl.searchParams.set('order_id', orderId);
    const apiUrl = this.config.getOrThrow<string>('PUBLIC_API_URL').replace(/\/$/, '');
    return {
      order_id: orderId,
      order_amount: toCashfreeAmount(invoice.totalAmountMinor - invoice.paidAmountMinor),
      order_currency: invoice.currency.trim().toUpperCase(),
      customer_details: {
        customer_id: createHash('sha256').update(invoice.studentId).digest('hex').slice(0, 32),
        customer_name: invoice.studentName ?? undefined,
        customer_email: invoice.customerEmail ?? undefined,
        customer_phone: invoice.customerPhone,
      },
      order_meta: {
        return_url: returnUrl.toString(),
        notify_url: `${apiUrl}/api/v1/webhooks/cashfree`,
      },
      order_expiry_time: expiresAt.toISOString(),
      order_note: `University fee invoice ${invoice.invoiceId}`.slice(0, 200),
    };
  }

  private assertSameRequest(order: any, requestHash: string): void {
    if (order.requestHash !== requestHash) {
      throw new ConflictException('Idempotency-Key was already used for a different payment request');
    }
  }

  private assertOwner(order: any, principal: AuthenticatedPrincipal): void {
    if (order.userId !== principal.userId || order.studentId !== principal.studentId) {
      throw new NotFoundException('Payment not found');
    }
  }

  private toResponse(order: any, includeSession: boolean): PaymentResponse {
    const terminal = this.isTerminal(order.status);
    let paymentSessionId: string | null = null;
    if (includeSession && !terminal && order.paymentSessionCiphertext) {
      paymentSessionId = decryptPaymentSession(order.paymentSessionCiphertext);
    }
    return {
      paymentId: order._id.toString(),
      invoiceId: order.invoiceId,
      studentId: order.studentId,
      orderId: order.orderId,
      cfOrderId: order.cfOrderId ?? null,
      amountMinor: order.amountMinor,
      currency: order.currency,
      status: order.status,
      paymentSessionId,
      expiresAt: order.expiresAt ?? null,
      createdAt: order.createdAt,
      attempts: [],
    };
  }

  private toAttemptResponse(attempt: any): PaymentAttemptResponse {
    return {
      cfPaymentId: attempt.cfPaymentId,
      status: attempt.status,
      amountMinor: attempt.amountMinor,
      currency: attempt.currency,
      paymentGroup: attempt.paymentGroup ?? null,
      paymentTime: attempt.paymentTime ?? null,
      completionTime: attempt.completionTime ?? null,
    };
  }

  private safePaymentMetadata(payment: Record<string, any>): Record<string, unknown> {
    return {
      paymentGroup: typeof payment.payment_group === 'string' ? payment.payment_group : null,
      paymentMethodType: payment.payment_method && typeof payment.payment_method === 'object'
        ? Object.keys(payment.payment_method).slice(0, 1)[0] ?? null
        : null,
    };
  }

  private parseDate(value: unknown): Date | null {
    if (typeof value !== 'string') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private isTerminal(status: PaymentOrderStatus): boolean {
    return [PaymentOrderStatus.PAID, PaymentOrderStatus.FAILED, PaymentOrderStatus.CANCELLED, PaymentOrderStatus.EXPIRED]
      .includes(status);
  }

  private isTerminalAttempt(status: string): boolean {
    return ['SUCCESS', 'FAILED', 'CANCELLED', 'USER_DROPPED', 'VOID'].includes(status);
  }

  private isDuplicateKey(error: unknown): boolean {
    return error instanceof mongo.MongoServerError && error.code === 11000;
  }
}

class DuplicateWebhookError extends Error {}
