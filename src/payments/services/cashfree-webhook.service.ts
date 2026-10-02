import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PaymentsService } from './payments.service';
import { verifyCashfreeWebhookSignature } from '../security/webhook-signature';

@Injectable()
export class CashfreeWebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly payments: PaymentsService,
  ) {}

  async handle(
    rawBody: Buffer | undefined,
    timestamp: string | undefined,
    signature: string | undefined,
    providerEventKey: string | undefined,
    webhookVersion: string | undefined,
  ): Promise<{ received: true; duplicate: boolean }> {
    const valid = verifyCashfreeWebhookSignature(
      this.config.getOrThrow<string>('CASHFREE_CLIENT_SECRET'),
      timestamp,
      rawBody,
      signature,
    );
    if (!valid) throw new UnauthorizedException('Invalid Cashfree webhook signature');
    if (!rawBody) throw new BadRequestException('Webhook body is required');

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, any>;
    } catch {
      throw new BadRequestException('Webhook body must be valid JSON');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Webhook body must be a JSON object');
    }

    const eventKey = providerEventKey && providerEventKey.length <= 128
      ? providerEventKey
      : createHash('sha256').update(rawBody).digest('hex');
    const result = await this.payments.applyCashfreeWebhook(
      payload,
      eventKey,
      webhookVersion?.slice(0, 32) ?? null,
    );
    return { received: true, duplicate: result === 'duplicate' };
  }
}
