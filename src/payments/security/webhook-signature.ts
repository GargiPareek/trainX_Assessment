import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyCashfreeWebhookSignature(
  secret: string,
  timestamp: string | undefined,
  rawBody: Buffer | undefined,
  receivedSignature: string | undefined,
): boolean {
  if (!timestamp || !rawBody || !receivedSignature) return false;
  const expected = createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody]))
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(receivedSignature, 'base64');
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}