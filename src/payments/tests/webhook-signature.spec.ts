import { createHmac } from 'node:crypto';
import { verifyCashfreeWebhookSignature } from '../security/webhook-signature';

describe('verifyCashfreeWebhookSignature', () => {
  const secret = 'sandbox-webhook-secret';
  const timestamp = '1785401067911';
  const rawBody = Buffer.from('{"data":{"payment_amount":170.00}}', 'utf8');
  const signature = createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(timestamp), rawBody]))
    .digest('base64');

  it('accepts a valid signature over the exact raw request bytes', () => {
    expect(verifyCashfreeWebhookSignature(secret, timestamp, rawBody, signature)).toBe(true);
  });

  it('rejects a body changed by parsing or serialization', () => {
    const changedBody = Buffer.from('{"data":{"payment_amount":170}}', 'utf8');
    expect(verifyCashfreeWebhookSignature(secret, timestamp, changedBody, signature)).toBe(false);
  });

  it('rejects missing headers and invalid signatures', () => {
    expect(verifyCashfreeWebhookSignature(secret, undefined, rawBody, signature)).toBe(false);
    expect(verifyCashfreeWebhookSignature(secret, timestamp, rawBody, 'not-a-signature')).toBe(false);
  });
});