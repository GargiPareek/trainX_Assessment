import { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { OutboxEvent } from '../schemas/payment.schemas';
export declare class ErpOutboxPublisher implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly outbox;
    private readonly config;
    private readonly logger;
    private timer?;
    private isPublishing;
    constructor(outbox: Model<OutboxEvent>, config: ConfigService);
    onApplicationBootstrap(): void;
    onApplicationShutdown(): void;
    publishBatch(): Promise<void>;
    private deliver;
}
