import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ClientSession, Model } from 'mongoose';
import { FeeInvoice, OutboxEvent, PaymentAttempt, PaymentOrder, PaymentStatusHistory, WebhookEvent } from '../schemas/payment.schemas';
import { PaymentOrderStatus } from '../enums/payment-status.enum';
import { PaymentsService } from '../services/payments.service';

function chain<T>(value: T) {
  return { select: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(value) };
}

describe('PaymentsService MongoDB idempotency', () => {
  const principal = { userId: '66ef3099401a926649193211', studentId: 'student-1' };
  let service: PaymentsService;
  let orders: { findOne: jest.Mock };
  let cashfree: { createOrder: jest.Mock; getOrder: jest.Mock };

  beforeAll(() => {
    process.env.PAYMENT_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  beforeEach(() => {
    orders = { findOne: jest.fn() };
    cashfree = { createOrder: jest.fn(), getOrder: jest.fn() };
    service = new PaymentsService(
      orders as unknown as Model<PaymentOrder>,
      {} as Model<FeeInvoice>,
      {} as Model<PaymentAttempt>,
      {} as Model<WebhookEvent>,
      {} as Model<PaymentStatusHistory>,
      {} as Model<OutboxEvent>,
      {} as never,
      cashfree as never,
      {} as never,
    );
  });

  it('requires an idempotency key before reading or creating a payment', async () => {
    await expect(service.createPayment({ invoiceId: 'invoice-1' }, undefined, principal))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(orders.findOne).not.toHaveBeenCalled();
  });

  it('returns an existing session for a repeated request without creating another Cashfree order', async () => {
    const invoiceId = 'b03c4328-2cd6-4976-8a59-64a626feab22';
    const sessionId = 'cashfree-session-token';
    const { encryptPaymentSession } = await import('../security/payment-session-crypto');
    orders.findOne.mockReturnValue(chain({
      _id: { toString: () => '66ef3099401a926649193211' },
      invoiceId,
      orderId: 'ums_order_1',
      cfOrderId: 'cf_order_1',
      amountMinor: 12500,
      currency: 'INR',
      status: PaymentOrderStatus.PENDING,
      userId: principal.userId,
      studentId: principal.studentId,
      requestHash: createHash('sha256')
        .update(`invoice:${invoiceId}|user:${principal.userId}|student:${principal.studentId}`)
        .digest('hex'),
      paymentSessionCiphertext: encryptPaymentSession(sessionId),
      expiresAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }));

    const result = await service.createPayment({ invoiceId }, 'idempotency-key-001', principal);

    expect(result.paymentSessionId).toBe(sessionId);
    expect(result.status).toBe(PaymentOrderStatus.PENDING);
    expect(cashfree.createOrder).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key for a different invoice', async () => {
    orders.findOne.mockReturnValue(chain({
      userId: principal.userId,
      studentId: principal.studentId,
      requestHash: 'first-request-hash',
      status: PaymentOrderStatus.PENDING,
    }));

    await expect(service.createPayment(
      { invoiceId: 'f7c03cb4-b9c4-4e44-8eeb-b851fca5fa87' },
      'idempotency-key-001',
      principal,
    )).rejects.toBeInstanceOf(ConflictException);
    expect(cashfree.createOrder).not.toHaveBeenCalled();
  });

  it('does not replay another student’s payment using their idempotency key', async () => {
    orders.findOne.mockReturnValue(chain({
      userId: 'different-user',
      studentId: 'different-student',
      requestHash: 'irrelevant-before-owner-check',
      status: PaymentOrderStatus.PENDING,
    }));

    await expect(service.createPayment(
      { invoiceId: 'b03c4328-2cd6-4976-8a59-64a626feab22' },
      'idempotency-key-001',
      principal,
    )).rejects.toBeInstanceOf(NotFoundException);
    expect(cashfree.createOrder).not.toHaveBeenCalled();
  });

  it('atomically applies a successful webhook to the order, invoice and ERP outbox', async () => {
    const query = <T>(value: T) => ({
      select: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(value),
    });
    const eventDoc = { save: jest.fn().mockResolvedValue(undefined) };
    const orderDoc = {
      _id: { toString: () => '66ef3099401a926649193211' },
      invoiceId: 'invoice-1',
      studentId: 'student-1',
      orderId: 'ums_123',
      amountMinor: 12500,
      currency: 'INR',
      status: PaymentOrderStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const attemptDoc = { status: 'SUCCESS' };
    const invoiceDoc = { paidAmountMinor: 0, totalAmountMinor: 12500 };
    const session = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };
    const webhookEvents = {
      findOne: jest.fn().mockReturnValue(query(null)),
      create: jest.fn().mockResolvedValue([eventDoc]),
    };
    const orders = { findOne: jest.fn().mockReturnValue(query(orderDoc)) };
    const attempts = {
      findOne: jest.fn().mockReturnValue(query(null)),
      countDocuments: jest.fn().mockReturnValue(query(0)),
      create: jest.fn().mockResolvedValue([attemptDoc]),
    };
    const invoices = {
      findOne: jest.fn().mockReturnValue(query(invoiceDoc)),
      updateOne: jest.fn().mockReturnValue(query({ matchedCount: 1 })),
    };
    const statusHistory = { create: jest.fn().mockResolvedValue([]) };
    const outbox = { updateOne: jest.fn().mockReturnValue(query({ acknowledged: true })) };
    const connection = { startSession: jest.fn().mockResolvedValue(session) };
    service = new PaymentsService(
      orders as unknown as Model<PaymentOrder>,
      invoices as unknown as Model<FeeInvoice>,
      attempts as unknown as Model<PaymentAttempt>,
      webhookEvents as unknown as Model<WebhookEvent>,
      statusHistory as unknown as Model<PaymentStatusHistory>,
      outbox as unknown as Model<OutboxEvent>,
      connection as never,
      cashfree as never,
      {} as never,
    );

    const result = await service.applyCashfreeWebhook({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: 'ums_123', order_amount: 125, order_currency: 'INR' },
        payment: {
          cf_payment_id: 'cashfree-payment-1',
          payment_status: 'SUCCESS',
          payment_amount: 125,
          payment_currency: 'INR',
        },
      },
    }, 'cashfree-event-1', '2026-01-01');

    expect(result).toBe('processed');
    expect(orderDoc.status).toBe(PaymentOrderStatus.PAID);
    expect(invoices.updateOne).toHaveBeenCalledWith(
      { invoiceId: 'invoice-1', paidAmountMinor: 0 },
      { $inc: { paidAmountMinor: 12500 } },
      { session: session as unknown as ClientSession },
    );
    expect(outbox.updateOne).toHaveBeenCalledWith(
      { deduplicationKey: 'payment-succeeded:66ef3099401a926649193211' },
      expect.any(Object),
      { upsert: true, session },
    );
  });

  it('acknowledges duplicate Cashfree webhook event keys without reprocessing', async () => {
    const existingEvent = { eventKey: 'already-recorded-event' };
    const eventQuery = {
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(existingEvent),
    };
    const session = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };
    const webhookEvents = {
      findOne: jest.fn().mockReturnValue(eventQuery),
      create: jest.fn(),
    };
    const connection = { startSession: jest.fn().mockResolvedValue(session) };
    service = new PaymentsService(
      {} as Model<PaymentOrder>,
      {} as Model<FeeInvoice>,
      {} as Model<PaymentAttempt>,
      webhookEvents as unknown as Model<WebhookEvent>,
      {} as Model<PaymentStatusHistory>,
      {} as Model<OutboxEvent>,
      connection as never,
      cashfree as never,
      {} as never,
    );

    const result = await service.applyCashfreeWebhook(
      { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'ums_order_1' } } },
      'already-recorded-event',
      '2026-01-01',
    );

    expect(result).toBe('duplicate');
    expect(webhookEvents.create).not.toHaveBeenCalled();
  });
});
