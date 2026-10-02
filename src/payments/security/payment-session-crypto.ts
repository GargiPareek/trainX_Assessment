import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const configured = process.env.PAYMENT_SESSION_ENCRYPTION_KEY;
  if (!configured) throw new Error('PAYMENT_SESSION_ENCRYPTION_KEY is not configured');
  const encoded = configured.startsWith('base64:') ? configured.slice(7) : configured;
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('PAYMENT_SESSION_ENCRYPTION_KEY must decode to 32 bytes');
  return key;
}

export function encryptPaymentSession(sessionId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(sessionId, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64')).join('.');
}

export function decryptPaymentSession(value: string): string {
  const [ivText, tagText, ciphertextText] = value.split('.');
  if (!ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted payment session');
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}