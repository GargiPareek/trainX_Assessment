import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
export declare class CashfreeWebhookService {
    private readonly config;
    private readonly payments;
    constructor(config: ConfigService, payments: PaymentsService);
    handle(rawBody: Buffer | undefined, timestamp: string | undefined, signature: string | undefined, providerEventKey: string | undefined, webhookVersion: string | undefined): Promise<{
        received: true;
        duplicate: boolean;
    }>;
}
