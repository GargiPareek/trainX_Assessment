"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("../auth/auth.module");
const mongo_replica_set_health_1 = require("../database/mongo-replica-set.health");
const payment_schemas_1 = require("./schemas/payment.schemas");
const cashfree_client_1 = require("./gateways/cashfree.client");
const cashfree_webhook_controller_1 = require("./controllers/cashfree-webhook.controller");
const cashfree_webhook_service_1 = require("./services/cashfree-webhook.service");
const erp_outbox_publisher_service_1 = require("./services/erp-outbox-publisher.service");
const payments_controller_1 = require("./controllers/payments.controller");
const payments_service_1 = require("./services/payments.service");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            mongoose_1.MongooseModule.forFeature([
                { name: payment_schemas_1.FeeInvoice.name, schema: payment_schemas_1.FeeInvoiceSchema },
                { name: payment_schemas_1.PaymentOrder.name, schema: payment_schemas_1.PaymentOrderSchema },
                { name: payment_schemas_1.PaymentAttempt.name, schema: payment_schemas_1.PaymentAttemptSchema },
                { name: payment_schemas_1.WebhookEvent.name, schema: payment_schemas_1.WebhookEventSchema },
                { name: payment_schemas_1.PaymentStatusHistory.name, schema: payment_schemas_1.PaymentStatusHistorySchema },
                { name: payment_schemas_1.OutboxEvent.name, schema: payment_schemas_1.OutboxEventSchema },
            ]),
        ],
        controllers: [payments_controller_1.PaymentsController, cashfree_webhook_controller_1.CashfreeWebhookController],
        providers: [payments_service_1.PaymentsService, cashfree_client_1.CashfreeClient, cashfree_webhook_service_1.CashfreeWebhookService, erp_outbox_publisher_service_1.ErpOutboxPublisher, mongo_replica_set_health_1.MongoReplicaSetHealth],
        exports: [payments_service_1.PaymentsService],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map