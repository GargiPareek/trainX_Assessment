import { Controller, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { CashfreeWebhookService } from '../services/cashfree-webhook.service';

@Controller('webhooks')
export class CashfreeWebhookController {
  constructor(private readonly webhooks: CashfreeWebhookService) {}

  @Post('cashfree')
  @HttpCode(HttpStatus.OK)
  handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-webhook-timestamp') timestamp?: string,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-idempotency-key') eventKey?: string,
    @Headers('x-webhook-version') webhookVersion?: string,
  ): Promise<{ received: true; duplicate: boolean }> {
    return this.webhooks.handle(request.rawBody, timestamp, signature, eventKey, webhookVersion);
  }
}
