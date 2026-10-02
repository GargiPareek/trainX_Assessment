import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { CashfreeWebhookService } from '../services/cashfree-webhook.service';

describe('CashfreeWebhookService', () => {
  const secret = 'webhook-secret-for-test';
  const timestamp = '1785401067911';
  const rawBody = Buffer.from('{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{}}');
  const signature = createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(timestamp), rawBody]))
    .digest('base64');
  const config = { getOrThrow: jest.fn().mockReturnValue(secret) };
  const payments = { applyCashfreeWebhook: jest.fn() };
  let service: CashfreeWebhookService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CashfreeWebhookService(config as never, payments as never);
  });

  it('passes authenticated events to the idempotent processor', async () => {
    payments.applyCashfreeWebhook.mockResolvedValue('duplicate');
    const response = await service.handle(rawBody, timestamp, signature, 'cf-event-key', '2026-01-01');

    expect(response).toEqual({ received: true, duplicate: true });
    expect(payments.applyCashfreeWebhook).toHaveBeenCalledWith(
      { type: 'PAYMENT_SUCCESS_WEBHOOK', data: {} },
      'cf-event-key',
      '2026-01-01',
    );
  });

  it('rejects invalid signatures without reaching payment processing', async () => {
    await expect(service.handle(rawBody, timestamp, 'invalid', 'event-key', undefined))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(payments.applyCashfreeWebhook).not.toHaveBeenCalled();
  });
});
