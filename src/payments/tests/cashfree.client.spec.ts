import { ConfigService } from '@nestjs/config';
import { CashfreeClient } from '../gateways/cashfree.client';

describe('CashfreeClient', () => {
  const originalFetch = global.fetch;
  const config = {
    getOrThrow: jest.fn((key: string) => ({
      CASHFREE_BASE_URL: 'https://sandbox.cashfree.com/pg',
      CASHFREE_API_VERSION: '2026-01-01',
      CASHFREE_CLIENT_ID: 'sandbox-client-id',
      CASHFREE_CLIENT_SECRET: 'sandbox-client-secret',
    })[key]),
  };

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('creates Cashfree sandbox orders using the configured API version and idempotency key', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        order_id: 'ums-order-1',
        cf_order_id: 'cf-order-1',
        order_amount: 125,
        order_currency: 'INR',
        order_status: 'ACTIVE',
        payment_session_id: 'session-1',
      }),
    });
    global.fetch = fetchMock;
    const client = new CashfreeClient(config as unknown as ConfigService);

    const result = await client.createOrder({
      order_id: 'ums-order-1',
      order_amount: 125,
      order_currency: 'INR',
      customer_details: { customer_id: 'hashed-student-id', customer_phone: '9876543210' },
      order_meta: {
        return_url: 'https://frontend.example.test/return',
        notify_url: 'https://api.example.test/api/v1/webhooks/cashfree',
      },
      order_expiry_time: '2026-10-03T12:00:00.000Z',
      order_note: 'University fee invoice',
    }, 'a1a1c94f-4ef7-4217-a118-7b2dc6bc4fe1');

    expect(result.payment_session_id).toBe('session-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sandbox.cashfree.com/pg/orders',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-version': '2026-01-01',
          'x-client-id': 'sandbox-client-id',
          'x-client-secret': 'sandbox-client-secret',
          'x-idempotency-key': 'a1a1c94f-4ef7-4217-a118-7b2dc6bc4fe1',
        }),
      }),
    );
  });
});
