import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { OutboxEvent } from '../schemas/payment.schemas';
import { ErpOutboxPublisher } from '../services/erp-outbox-publisher.service';

describe('ErpOutboxPublisher', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends a signed payment event and marks it published after ERP acknowledgement', async () => {
    const event = {
      _id: 'outbox-1',
      deduplicationKey: 'payment-succeeded:payment-1',
      payload: { paymentId: 'payment-1', status: 'PAID' },
      attempts: 1,
      lockedUntil: new Date('2026-10-03T10:00:30Z'),
    };
    const findQuery = { exec: jest.fn().mockResolvedValueOnce(event).mockResolvedValueOnce(null) };
    const outbox = {
      findOneAndUpdate: jest.fn().mockReturnValue(findQuery),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ matchedCount: 1 }) }),
    };
    const config = {
      get: jest.fn((key: string) => ({
        ERP_PAYMENT_WEBHOOK_URL: 'https://erp.example.edu/payment-events',
      })[key]),
      getOrThrow: jest.fn((key: string) => ({
        ERP_PAYMENT_WEBHOOK_URL: 'https://erp.example.edu/payment-events',
        ERP_PAYMENT_WEBHOOK_SECRET: 'x'.repeat(40),
      })[key]),
    };
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;
    const publisher = new ErpOutboxPublisher(outbox as unknown as Model<OutboxEvent>, config as unknown as ConfigService);

    await publisher.publishBatch();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://erp.example.edu/payment-events',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-ums-event-id': 'payment-succeeded:payment-1',
          'x-ums-signature': expect.any(String),
        }),
      }),
    );
    expect(outbox.updateOne).toHaveBeenCalledWith(
      { _id: 'outbox-1', publishedAt: null, lockedUntil: event.lockedUntil },
      { $set: expect.objectContaining({ lockedUntil: null, lastError: null }) },
    );
  });
});
