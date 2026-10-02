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
exports.CashfreeClient = exports.CashfreeApiError = void 0;
exports.toCashfreeAmount = toCashfreeAmount;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
class CashfreeApiError extends Error {
    statusCode;
    responseBody;
    constructor(message, statusCode, responseBody) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        this.name = 'CashfreeApiError';
    }
}
exports.CashfreeApiError = CashfreeApiError;
let CashfreeClient = class CashfreeClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async createOrder(payload, idempotencyKey) {
        return this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'x-idempotency-key': idempotencyKey },
        });
    }
    async getOrder(orderId) {
        return this.request(`/orders/${encodeURIComponent(orderId)}`, {
            method: 'GET',
            headers: { 'x-request-id': (0, node_crypto_1.randomUUID)() },
        });
    }
    async request(path, init) {
        const baseUrl = this.config.getOrThrow('CASHFREE_BASE_URL').replace(/\/$/, '');
        const url = `${baseUrl}${path}`;
        let response;
        try {
            response = await fetch(url, {
                ...init,
                signal: AbortSignal.timeout(10_000),
                headers: {
                    'content-type': 'application/json',
                    'x-api-version': this.config.getOrThrow('CASHFREE_API_VERSION'),
                    'x-client-id': this.config.getOrThrow('CASHFREE_CLIENT_ID'),
                    'x-client-secret': this.config.getOrThrow('CASHFREE_CLIENT_SECRET'),
                    ...init.headers,
                },
            });
        }
        catch (error) {
            throw new CashfreeApiError(error instanceof Error ? `Cashfree request failed: ${error.message}` : 'Cashfree request failed');
        }
        const text = await response.text();
        let body;
        try {
            body = text ? JSON.parse(text) : {};
        }
        catch {
            throw new CashfreeApiError('Cashfree returned a non-JSON response', response.status);
        }
        if (!response.ok) {
            throw new CashfreeApiError(`Cashfree API returned HTTP ${response.status}`, response.status, body);
        }
        return body;
    }
};
exports.CashfreeClient = CashfreeClient;
exports.CashfreeClient = CashfreeClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CashfreeClient);
function toCashfreeAmount(amountMinor) {
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100) {
        throw new common_1.ServiceUnavailableException('Stored invoice amount is invalid');
    }
    return Number((amountMinor / 100).toFixed(2));
}
//# sourceMappingURL=cashfree.client.js.map