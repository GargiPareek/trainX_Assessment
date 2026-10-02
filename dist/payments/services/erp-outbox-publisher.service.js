"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ErpOutboxPublisher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpOutboxPublisher = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const node_crypto_1 = require("node:crypto");
const mongoose_2 = require("mongoose");
const payment_schemas_1 = require("../schemas/payment.schemas");
const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS = 12;
const LEASE_MS = 30_000;
let ErpOutboxPublisher = ErpOutboxPublisher_1 = class ErpOutboxPublisher {
    outbox;
    config;
    logger = new common_1.Logger(ErpOutboxPublisher_1.name);
    timer;
    isPublishing = false;
    constructor(outbox, config) {
        this.outbox = outbox;
        this.config = config;
    }
    onApplicationBootstrap() {
        if (!this.config.get('ERP_PAYMENT_WEBHOOK_URL')) {
            this.logger.warn('ERP payment webhook is not configured; payment-success outbox records will remain pending');
            return;
        }
        this.timer = setInterval(() => void this.publishBatch(), POLL_INTERVAL_MS);
        this.timer.unref();
        void this.publishBatch();
    }
    onApplicationShutdown() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async publishBatch() {
        if (this.isPublishing)
            return;
        this.isPublishing = true;
        try {
            for (let index = 0; index < 20; index += 1) {
                const now = new Date();
                const event = await this.outbox.findOneAndUpdate({
                    publishedAt: null,
                    availableAt: { $lte: now },
                    attempts: { $lt: MAX_ATTEMPTS },
                    $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
                }, {
                    $set: { lockedUntil: new Date(now.getTime() + LEASE_MS) },
                    $inc: { attempts: 1 },
                }, { new: true, sort: { createdAt: 1 } }).exec();
                if (!event)
                    break;
                await this.deliver(event);
            }
        }
        catch (error) {
            this.logger.error(`ERP outbox polling failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
        finally {
            this.isPublishing = false;
        }
    }
    async deliver(event) {
        const url = this.config.getOrThrow('ERP_PAYMENT_WEBHOOK_URL');
        const secret = this.config.getOrThrow('ERP_PAYMENT_WEBHOOK_SECRET');
        const timestamp = Date.now().toString();
        const deliveryId = (0, node_crypto_1.randomUUID)();
        const body = JSON.stringify(event.payload);
        const signature = (0, node_crypto_1.createHmac)('sha256', secret)
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
            if (!response.ok)
                throw new Error(`ERP endpoint returned HTTP ${response.status}`);
            await this.outbox.updateOne({ _id: event._id, publishedAt: null, lockedUntil: event.lockedUntil }, { $set: { publishedAt: new Date(), lockedUntil: null, lastError: null } }).exec();
        }
        catch (error) {
            const attempts = event.attempts ?? 1;
            const backoffMs = Math.min(60 * 60 * 1000, 1_000 * 2 ** Math.min(attempts, 12));
            await this.outbox.updateOne({ _id: event._id, publishedAt: null, lockedUntil: event.lockedUntil }, {
                $set: {
                    availableAt: new Date(Date.now() + backoffMs),
                    lockedUntil: null,
                    lastError: (error instanceof Error ? error.message : 'ERP delivery failed').slice(0, 500),
                },
            }).exec();
            this.logger.warn(`ERP delivery failed for event ${event.deduplicationKey}; attempt ${attempts}`);
        }
    }
};
exports.ErpOutboxPublisher = ErpOutboxPublisher;
exports.ErpOutboxPublisher = ErpOutboxPublisher = ErpOutboxPublisher_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(payment_schemas_1.OutboxEvent.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_1.ConfigService])
], ErpOutboxPublisher);
//# sourceMappingURL=erp-outbox-publisher.service.js.map