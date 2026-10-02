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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashfreeWebhookService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const payments_service_1 = require("./payments.service");
const webhook_signature_1 = require("../security/webhook-signature");
let CashfreeWebhookService = class CashfreeWebhookService {
    config;
    payments;
    constructor(config, payments) {
        this.config = config;
        this.payments = payments;
    }
    async handle(rawBody, timestamp, signature, providerEventKey, webhookVersion) {
        const valid = (0, webhook_signature_1.verifyCashfreeWebhookSignature)(this.config.getOrThrow('CASHFREE_CLIENT_SECRET'), timestamp, rawBody, signature);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid Cashfree webhook signature');
        if (!rawBody)
            throw new common_1.BadRequestException('Webhook body is required');
        let payload;
        try {
            payload = JSON.parse(rawBody.toString('utf8'));
        }
        catch {
            throw new common_1.BadRequestException('Webhook body must be valid JSON');
        }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new common_1.BadRequestException('Webhook body must be a JSON object');
        }
        const eventKey = providerEventKey && providerEventKey.length <= 128
            ? providerEventKey
            : (0, node_crypto_1.createHash)('sha256').update(rawBody).digest('hex');
        const result = await this.payments.applyCashfreeWebhook(payload, eventKey, webhookVersion?.slice(0, 32) ?? null);
        return { received: true, duplicate: result === 'duplicate' };
    }
};
exports.CashfreeWebhookService = CashfreeWebhookService;
exports.CashfreeWebhookService = CashfreeWebhookService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        payments_service_1.PaymentsService])
], CashfreeWebhookService);
//# sourceMappingURL=cashfree-webhook.service.js.map