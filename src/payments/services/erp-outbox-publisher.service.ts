import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac, randomUUID } from 'node:crypto';
import { Model } from 'mongoose';
import { OutboxEvent } from '../schemas/payment.schemas';

const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS = 12;
const LEASE_MS = 30_000;

@Injectable()
export class ErpOutboxPublisher implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ErpOutboxPublisher.name);
  private timer?: NodeJS.Timeout;
  private isPublishing = false;

  constructor(
    @InjectModel(OutboxEvent.name) private readonly outbox: Model<OutboxEvent>,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.get<string>('ERP_PAYMENT_WEBHOOK_URL')) {
      this.logger.warn('ERP payment webhook is not configured; payment-success outbox records will remain pending');
      return;
    }
    this.timer = setInterval(() => void this.publishBatch(), POLL_INTERVAL_MS);
    this.timer.unref();
    void this.publishBatch();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async publishBatch(): Promise<void> {
    if (this.isPublishing) return;
    this.isPublishing = true;
    try {
      for (let index = 0; index < 20; index += 1) {
        const now = new Date();
        const event = await this.outbox.findOneAndUpdate(
          {
            publishedAt: null,
            availableAt: { $lte: now },
            attempts: { $lt: MAX_ATTEMPTS },
            $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
          },
          {
            $set: { lockedUntil: new Date(now.getTime() + LEASE_MS) },
            $inc: { attempts: 1 },
          },
          { new: true, sort: { createdAt: 1 } },
        ).exec();
        if (!event) break;
        await this.deliver(event);
      }
    } catch (error) {
      this.logger.error(`ERP outbox polling failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      this.isPublishing = false;
    }
  }

  private async deliver(event: OutboxEvent): Promise<void> {
    const url = this.config.getOrThrow<string>('ERP_PAYMENT_WEBHOOK_URL');
    const secret = this.config.getOrThrow<string>('ERP_PAYMENT_WEBHOOK_SECRET');
    const timestamp = Date.now().toString();
    const deliveryId = randomUUID();
    const body = JSON.stringify(event.payload);
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(8_000),
        headers: {
          'content-type': 'application/json',
          'x-ums-event-id': event.deduplicationKey,
          'x-ums-delivery-id': deliveryId,
          'x-ums-timestamp': timestamp,
          'x-ums-signature': signature,
        },
        body,
      });
      if (!response.ok) throw new Error(`ERP endpoint returned HTTP ${response.status}`);
      await this.outbox.updateOne(
        { _id: event._id, publishedAt: null, lockedUntil: event.lockedUntil },
        { $set: { publishedAt: new Date(), lockedUntil: null, lastError: null } },
      ).exec();
    } catch (error) {
      const attempts = event.attempts ?? 1;
      const backoffMs = Math.min(60 * 60 * 1000, 1_000 * 2 ** Math.min(attempts, 12));
      await this.outbox.updateOne(
        { _id: event._id, publishedAt: null, lockedUntil: event.lockedUntil },
        {
          $set: {
            availableAt: new Date(Date.now() + backoffMs),
            lockedUntil: null,
            lastError: (error instanceof Error ? error.message : 'ERP delivery failed').slice(0, 500),
          },
        },
      ).exec();
      this.logger.warn(`ERP delivery failed for event ${event.deduplicationKey}; attempt ${attempts}`);
    }
  }
}
