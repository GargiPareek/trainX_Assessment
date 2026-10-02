"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrationId = void 0;
exports.up = up;
const mongoose_1 = __importDefault(require("mongoose"));
const payment_schemas_1 = require("../../payments/schemas/payment.schemas");
const user_schema_1 = require("../../users/schemas/user.schema");
exports.migrationId = '001-payment-collections';
async function up() {
    const schemas = [
        [payment_schemas_1.FeeInvoice, payment_schemas_1.FeeInvoiceSchema],
        [payment_schemas_1.PaymentOrder, payment_schemas_1.PaymentOrderSchema],
        [payment_schemas_1.PaymentAttempt, payment_schemas_1.PaymentAttemptSchema],
        [payment_schemas_1.WebhookEvent, payment_schemas_1.WebhookEventSchema],
        [payment_schemas_1.PaymentStatusHistory, payment_schemas_1.PaymentStatusHistorySchema],
        [payment_schemas_1.OutboxEvent, payment_schemas_1.OutboxEventSchema],
        [user_schema_1.User, user_schema_1.UserSchema],
    ];
    for (const [modelClass, schema] of schemas) {
        const model = mongoose_1.default.model(modelClass.name, schema);
        await model.createIndexes();
        console.info(`Created/verified indexes for ${schema.options.collection}`);
    }
}
//# sourceMappingURL=001-payment-collections.js.map