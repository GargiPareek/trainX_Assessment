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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashfreeWebhookController = void 0;
const common_1 = require("@nestjs/common");
const cashfree_webhook_service_1 = require("../services/cashfree-webhook.service");
let CashfreeWebhookController = class CashfreeWebhookController {
    webhooks;
    constructor(webhooks) {
        this.webhooks = webhooks;
    }
    handle(request, timestamp, signature, eventKey, webhookVersion) {
        return this.webhooks.handle(request.rawBody, timestamp, signature, eventKey, webhookVersion);
    }
};
exports.CashfreeWebhookController = CashfreeWebhookController;
__decorate([
    (0, common_1.Post)('cashfree'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-webhook-timestamp')),
    __param(2, (0, common_1.Headers)('x-webhook-signature')),
    __param(3, (0, common_1.Headers)('x-idempotency-key')),
    __param(4, (0, common_1.Headers)('x-webhook-version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CashfreeWebhookController.prototype, "handle", null);
exports.CashfreeWebhookController = CashfreeWebhookController = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [cashfree_webhook_service_1.CashfreeWebhookService])
], CashfreeWebhookController);
//# sourceMappingURL=cashfree-webhook.controller.js.map