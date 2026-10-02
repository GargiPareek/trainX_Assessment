import mongoose, { Connection } from 'mongoose';
import {
  FeeInvoice,
  FeeInvoiceSchema,
  PaymentOrder,
  PaymentOrderSchema,
} from '../src/payments/schemas/payment.schemas';
import { PaymentOrderStatus } from '../src/payments/enums/payment-status.enum';

const describeWithDatabase = process.env.MONGODB_TEST_URI ? describe : describe.skip;

describeWithDatabase('MongoDB payment constraints and transactions', () => {
  let connection: Connection;
  let invoices: mongoose.Model<FeeInvoice>;
  let orders: mongoose.Model<PaymentOrder>;

  beforeAll(async () => {
    connection = await mongoose.createConnection(process.env.MONGODB_TEST_URI!, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    invoices = connection.model(FeeInvoice.name, FeeInvoiceSchema);
    orders = connection.model(PaymentOrder.name, PaymentOrderSchema);
    await Promise.all([invoices.init(), orders.init()]);
  });

  afterAll(async () => {
    if (connection) await connection.close();
  });

  it('enforces one active payment intent per invoice and supports transactions', async () => {
    const invoiceId = `invoice-${new mongoose.Types.ObjectId().toString()}`;
    await invoices.create({
      invoiceId,
      studentId: 'student-test',
      customerPhone: '9876543210',
      totalAmountMinor: 25000,
      paidAmountMinor: 0,
      currency: 'INR',
      active: true,
    });
    const base = {
      invoiceId,
      studentId: 'student-test',
      userId: 'user-test',
      amountMinor: 25000,
      currency: 'INR',
      status: PaymentOrderStatus.PENDING,
      idempotencyKey: `key-${new mongoose.Types.ObjectId().toString()}`,
      requestHash: 'a'.repeat(64),
      gatewayIdempotencyKey: new mongoose.Types.ObjectId().toString(),
      gatewayRequest: { order_id: 'test-order' },
      activeSlot: true,
    };
    await orders.create({ ...base, orderId: `order-${new mongoose.Types.ObjectId().toString()}` });
    await expect(orders.create({
      ...base,
      orderId: `order-${new mongoose.Types.ObjectId().toString()}`,
      idempotencyKey: `key-${new mongoose.Types.ObjectId().toString()}`,
    })).rejects.toMatchObject({ code: 11000 });

    const session = await connection.startSession();
    try {
      await session.withTransaction(async () => {
        await invoices.updateOne({ invoiceId }, { $inc: { paidAmountMinor: 100 } }, { session });
      });
    } finally {
      await session.endSession();
    }
    await expect(invoices.findOne({ invoiceId, paidAmountMinor: 100 })).resolves.toBeTruthy();
  });
});
