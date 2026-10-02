import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { CashfreeWebhookService } from '../services/cashfree-webhook.service';
export declare class CashfreeWebhookController {
    private readonly webhooks;
    constructor(webhooks: CashfreeWebhookService);
    handle(request: RawBodyRequest<Request>, timestamp?: string, signature?: string, eventKey?: string, webhookVersion?: string): Promise<{
        received: true;
        duplicate: boolean;
    }>;
}
