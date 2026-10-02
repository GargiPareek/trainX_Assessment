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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const mongoose_2 = require("mongoose");
const payment_schemas_1 = require("../schemas/payment.schemas");
const payment_status_enum_1 = require("../enums/payment-status.enum");
const cashfree_client_1 = require("../gateways/cashfree.client");
const payment_session_crypto_1 = require("../security/payment-session-crypto");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    orders;
    invoices;
    attempts;
    webhookEvents;
    statusHistory;
    outbox;
    connection;
    cashfree;
    config;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(orders, invoices, attempts, webhookEvents, statusHistory, outbox, connection, cashfree, config) {
        this.orders = orders;
        this.invoices = invoices;
        this.attempts = attempts;
        this.webhookEvents = webhookEvents;
        this.statusHistory = statusHistory;
        this.outbox = outbox;
        this.connection = connection;
        this.cashfree = cashfree;
        this.config = config;
    }
    async createPayment(dto, idempotencyKey, principal) {
        if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
            throw new common_1.BadRequestException('A unique Idempotency-Key header (8-128 characters) is required');
        }
        const requestHash = (0, node_crypto_1.createHash)('sha256')
            .update(`invoice:${dto.invoiceId}|user:${principal.userId}|student:${principal.studentId}`)
            .digest('hex');
        let order = await this.orders.findOne({ idempotencyKey }).select('+paymentSessionCiphertext +gatewayRequest').exec();
        if (order) {
            this.assertOwner(order, principal);
            this.assertSameRequest(order, requestHash);
            if (order.paymentSessionCiphertext)
                return this.toResponse(order, true);
            if (this.isTerminal(order.status))
                return this.toResponse(order, false);
            return this.provisionCashfreeOrder(order);
        }
        const invoice = await this.invoices.findOne({
            invoiceId: dto.invoiceId,
            studentId: principal.studentId,
            active: true,
        }).exec();
        if (!invoice)
            throw new common_1.NotFoundException('Active fee invoice not found');
        if (!invoice.customerPhone || !invoice.studentId) {
            throw new common_1.BadRequestException('The invoice is missing Cashfree customer details');
        }
        const amountMinor = invoice.totalAmountMinor - invoice.paidAmountMinor;
        if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
            throw new common_1.ConflictException('The invoice has no outstanding balance');
        }
        if (amountMinor < 100)
            throw new common_1.BadRequestException('Cashfree INR orders must be at least INR 1.00');
        const currency = invoice.currency.trim().toUpperCase();
        if (currency !== 'INR')
            throw new common_1.BadRequestException('This payment module currently supports INR invoices only');
        const activeOrder = await this.orders.findOne({
            invoiceId: invoice.invoiceId,
            activeSlot: true,
        })
            .select('+paymentSessionCiphertext +gatewayRequest').exec();
        if (activeOrder) {
            this.assertOwner(activeOrder, principal);
            if (activeOrder.requestHash !== requestHash) {
                throw new common_1.ConflictException('An active payment already exists for this invoice');
            }
            if (activeOrder.paymentSessionCiphertext)
                return this.toResponse(activeOrder, true);
            return this.provisionCashfreeOrder(activeOrder);
        }
        const orderId = `ums_${(0, node_crypto_1.randomUUID)()}`;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const orderData = {
            invoiceId: invoice.invoiceId,
            studentId: invoice.studentId,
            userId: principal.userId,
            orderId,
            amountMinor,
            currency,
            status: payment_status_enum_1.PaymentOrderStatus.CREATING,
            paymentSessionCiphertext: null,
            idempotencyKey,
            requestHash,
            gatewayIdempotencyKey: (0, node_crypto_1.randomUUID)(),
            gatewayRequest: this.buildCashfreeOrderRequest(invoice, orderId, expiresAt),
            expiresAt,
            paidAt: null,
            lastError: null,
            activeSlot: true,
        };
        try {
            const created = await this.withTransaction(async (session) => {
                const [newOrder] = await this.orders.create([orderData], { session });
                await this.statusHistory.create([{
                        paymentOrderId: newOrder._id.toString(),
                        fromStatus: null,
                        toStatus: payment_status_enum_1.PaymentOrderStatus.CREATING,
                        source: 'API',
                        sourceEventKey: null,
                        details: { invoiceId: invoice.invoiceId },
                    }], { session });
                return newOrder;
            });
            return this.provisionCashfreeOrder(created);
        }
        catch (error) {
            if (!this.isDuplicateKey(error))
                throw error;
            order = await this.orders.findOne({ idempotencyKey }).select('+paymentSessionCiphertext +gatewayRequest').exec();
            if (order) {
                this.assertOwner(order, principal);
                this.assertSameRequest(order, requestHash);
                if (order.paymentSessionCiphertext)
                    return this.toResponse(order, true);
                if (this.isTerminal(order.status))
                    return this.toResponse(order, false);
                return this.provisionCashfreeOrder(order);
            }
            const competingOrder = await this.orders.findOne({ invoiceId: invoice.invoiceId, activeSlot: true })
                .select('+paymentSessionCiphertext +gatewayRequest').exec();
            if (!competingOrder || competingOrder.requestHash !== requestHash) {
                throw new common_1.ConflictException('A conflicting payment request already exists for this invoice');
            }
            if (competingOrder.paymentSessionCiphertext)
                return this.toResponse(competingOrder, true);
            return this.provisionCashfreeOrder(competingOrder);
        }
    }
    async getPayment(id, principal) {
        if (!(0, mongoose_2.isValidObjectId)(id))
            throw new common_1.NotFoundException('Payment not found');
        const order = await this.orders.findOne({
            _id: id,
            userId: principal.userId,
            studentId: principal.studentId,
        }).exec();
        if (!order)
            throw new common_1.NotFoundException('Payment not found');
        const attempts = await this.attempts.find({ paymentOrderId: order._id.toString() }).sort({ attemptNumber: 1 }).lean().exec();
        return { ...this.toResponse(order, false), attempts: attempts.map((attempt) => this.toAttemptResponse(attempt)) };
    }
    async listInvoicePayments(invoiceId, principal) {
        const invoice = await this.invoices.findOne({ invoiceId, studentId: principal.studentId }).exec();
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        const orders = await this.orders.find({ invoiceId, userId: principal.userId }).sort({ createdAt: -1 }).exec();
        return Promise.all(orders.map(async (order) => {
            const attempts = await this.attempts.find({ paymentOrderId: order._id.toString() }).sort({ attemptNumber: 1 }).lean().exec();
            return { ...this.toResponse(order, false), attempts: attempts.map((attempt) => this.toAttemptResponse(attempt)) };
        }));
    }
    async refreshPayment(id, principal) {
        if (!(0, mongoose_2.isValidObjectId)(id))
            throw new common_1.NotFoundException('Payment not found');
        const order = await this.orders.findOne({
            _id: id,
            userId: principal.userId,
            studentId: principal.studentId,
        }).exec();
        if (!order)
            throw new common_1.NotFoundException('Payment not found');
        if (this.isTerminal(order.status))
            return this.getPayment(id, principal);
        const gatewayOrder = await this.cashfree.getOrder(order.orderId);
        if (Math.round(Number(gatewayOrder.order_amount) * 100) !== order.amountMinor ||
            gatewayOrder.order_currency.toUpperCase() !== order.currency)
            throw new common_1.ConflictException('Cashfree order amount/currency does not match the local payment record');
        const normalized = gatewayOrder.order_status.toUpperCase();
        let nextStatus = order.status;
        if (normalized === 'PAID')
            nextStatus = payment_status_enum_1.PaymentOrderStatus.PAID;
        else if (normalized === 'EXPIRED')
            nextStatus = payment_status_enum_1.PaymentOrderStatus.EXPIRED;
        else if (normalized === 'TERMINATED')
            nextStatus = payment_status_enum_1.PaymentOrderStatus.CANCELLED;
        else if (normalized === 'ACTIVE')
            nextStatus = payment_status_enum_1.PaymentOrderStatus.PENDING;
        if (nextStatus !== order.status) {
            await this.transitionOrder(order, nextStatus, 'RECONCILIATION', null, { cashfreeOrderStatus: normalized });
        }
        return this.getPayment(id, principal);
    }
    async applyCashfreeWebhook(payload, eventKey, webhookVersion) {
        const data = payload.data ?? {};
        const providerOrderId = data.order?.order_id;
        const payment = data.payment;
        const cfPaymentId = payment?.cf_payment_id === undefined ? null : String(payment.cf_payment_id);
        const eventType = typeof payload.type === 'string' ? payload.type : 'UNKNOWN';
        const payloadHash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(payload)).digest('hex');
        try {
            await this.withTransaction(async (session) => {
                const existingEvent = await this.webhookEvents.findOne({ eventKey }).session(session).exec();
                if (existingEvent)
                    throw new DuplicateWebhookError();
                const [event] = await this.webhookEvents.create([{
                        eventKey,
                        webhookVersion,
                        eventType,
                        orderId: typeof providerOrderId === 'string' ? providerOrderId : null,
                        cfPaymentId,
                        rawPayload: payload,
                        payloadSha256: payloadHash,
                        signatureVerified: true,
                        processingError: null,
                        processedAt: null,
                    }], { session });
                if (typeof providerOrderId !== 'string') {
                    event.processingError = 'Webhook did not contain data.order.order_id';
                    event.processedAt = new Date();
                    await event.save({ session });
                    return;
                }
                const order = await this.orders.findOne({ orderId: providerOrderId }).session(session)
                    .select('+paymentSessionCiphertext').exec();
                if (!order) {
                    event.processingError = 'No local payment order matches the Cashfree order ID';
                    event.processedAt = new Date();
                    await event.save({ session });
                    return;
                }
                if (payment && cfPaymentId) {
                    const incomingStatus = String(payment.payment_status ?? 'UNKNOWN').toUpperCase();
                    const amountValue = Number(payment.payment_amount ?? data.order?.order_amount ?? 0);
                    const incomingAmountMinor = Number.isFinite(amountValue) ? Math.round(amountValue * 100) : -1;
                    const incomingCurrency = String(payment.payment_currency ?? data.order?.order_currency ?? '').toUpperCase();
                    if (incomingAmountMinor !== order.amountMinor || incomingCurrency !== order.currency) {
                        event.processingError = 'Webhook amount/currency does not match the payment order';
                        event.processedAt = new Date();
                        await event.save({ session });
                        this.logger.error(`Payment webhook mismatch for order ${order.orderId}`);
                        return;
                    }
                    let attempt = await this.attempts.findOne({ cfPaymentId }).session(session).exec();
                    if (attempt && attempt.paymentOrderId !== order._id.toString()) {
                        event.processingError = 'Cashfree payment ID is already associated with a different local order';
                        event.processedAt = new Date();
                        await event.save({ session });
                        return;
                    }
                    if (!attempt) {
                        const attemptNumber = await this.attempts.countDocuments({ paymentOrderId: order._id.toString() }).session(session).exec() + 1;
                        [attempt] = await this.attempts.create([{
                                paymentOrderId: order._id.toString(),
                                attemptNumber,
                                cfPaymentId,
                                status: incomingStatus,
                                amountMinor: incomingAmountMinor,
                                currency: incomingCurrency,
                                paymentGroup: typeof payment.payment_group === 'string' ? payment.payment_group : null,
                                paymentTime: this.parseDate(payment.payment_time),
                                completionTime: this.parseDate(payment.payment_completion_time),
                                errorDetails: data.error_details ?? null,
                                safePaymentMetadata: this.safePaymentMetadata(payment),
                            }], { session });
                    }
                    else if (incomingStatus === 'SUCCESS' || !this.isTerminalAttempt(attempt.status)) {
                        attempt.status = incomingStatus;
                        attempt.paymentTime = this.parseDate(payment.payment_time) ?? attempt.paymentTime;
                        attempt.completionTime = this.parseDate(payment.payment_completion_time) ?? attempt.completionTime;
                        attempt.errorDetails = data.error_details ?? attempt.errorDetails;
                        attempt.safePaymentMetadata = this.safePaymentMetadata(payment) ?? attempt.safePaymentMetadata;
                        await attempt.save({ session });
                    }
                    if (incomingStatus === 'SUCCESS' && order.status !== payment_status_enum_1.PaymentOrderStatus.PAID) {
                        await this.transitionWithSession(session, order, payment_status_enum_1.PaymentOrderStatus.PAID, 'WEBHOOK', eventKey, { cfPaymentId });
                    }
                    else if (incomingStatus === 'SUCCESS') {
                        this.logger.warn(`Additional successful attempt recorded for already-paid order ${order.orderId}`);
                    }
                }
                event.processedAt = new Date();
                await event.save({ session });
            });
            return 'processed';
        }
        catch (error) {
            if (error instanceof DuplicateWebhookError || this.isDuplicateKey(error))
                return 'duplicate';
            throw error;
        }
    }
    async provisionCashfreeOrder(order) {
        try {
            const request = order.gatewayRequest;
            if (!request)
                throw new cashfree_client_1.CashfreeApiError('Payment order has no saved Cashfree request for retry');
            const response = await this.cashfree.createOrder(request, order.gatewayIdempotencyKey);
            if (!response.payment_session_id || response.order_id !== order.orderId || !response.cf_order_id) {
                throw new cashfree_client_1.CashfreeApiError('Cashfree response is missing required order/session fields');
            }
            await this.withTransaction(async (session) => {
                const current = await this.orders.findById(order._id).session(session).select('+paymentSessionCiphertext').exec();
                if (!current || this.isTerminal(current.status))
                    return;
                const previous = current.status;
                current.cfOrderId = response.cf_order_id;
                current.paymentSessionCiphertext = (0, payment_session_crypto_1.encryptPaymentSession)(response.payment_session_id);
                current.expiresAt = response.order_expiry_time ? this.parseDate(response.order_expiry_time) : current.expiresAt;
                current.status = payment_status_enum_1.PaymentOrderStatus.PENDING;
                current.lastError = null;
                await current.save({ session });
                await this.statusHistory.create([{
                        paymentOrderId: current._id.toString(),
                        fromStatus: previous,
                        toStatus: payment_status_enum_1.PaymentOrderStatus.PENDING,
                        source: 'CASHFREE_API',
                        sourceEventKey: null,
                        details: { cfOrderId: response.cf_order_id },
                    }], { session });
            });
            const saved = await this.orders.findById(order._id).select('+paymentSessionCiphertext').exec();
            if (!saved)
                throw new common_1.NotFoundException('Payment order was not persisted');
            return this.toResponse(saved, true);
        }
        catch (error) {
            const message = error instanceof cashfree_client_1.CashfreeApiError
                ? `Cashfree order creation failed${error.statusCode ? ` (${error.statusCode})` : ''}`
                : 'Cashfree order creation failed';
            await this.orders.updateOne({ _id: order._id, status: { $nin: [payment_status_enum_1.PaymentOrderStatus.PAID, payment_status_enum_1.PaymentOrderStatus.CANCELLED, payment_status_enum_1.PaymentOrderStatus.EXPIRED] } }, { $set: { status: payment_status_enum_1.PaymentOrderStatus.RECONCILIATION_REQUIRED, lastError: message } }).exec();
            this.logger.error(`${message}; order=${order.orderId}`);
            throw new common_1.ServiceUnavailableException('Payment initialization is being reconciled. Retry with the same Idempotency-Key.');
        }
    }
    async transitionOrder(order, status, source, sourceEventKey, details) {
        await this.withTransaction((session) => this.transitionWithSession(session, order, status, source, sourceEventKey, details));
    }
    async transitionWithSession(session, order, status, source, sourceEventKey, details) {
        const previous = order.status;
        if (previous === status || (previous === payment_status_enum_1.PaymentOrderStatus.PAID && status !== payment_status_enum_1.PaymentOrderStatus.PAID))
            return;
        order.status = status;
        if (status === payment_status_enum_1.PaymentOrderStatus.PAID) {
            order.paidAt = new Date();
            order.activeSlot = false;
            order.paymentSessionCiphertext = null;
            const invoice = await this.invoices.findOne({ invoiceId: order.invoiceId }).session(session).exec();
            if (!invoice || invoice.paidAmountMinor + order.amountMinor > invoice.totalAmountMinor) {
                throw new common_1.ConflictException('Invoice balance reconciliation failed after payment confirmation');
            }
            const invoiceUpdate = await this.invoices.updateOne({ invoiceId: order.invoiceId, paidAmountMinor: invoice.paidAmountMinor }, { $inc: { paidAmountMinor: order.amountMinor } }, { session }).exec();
            if (!invoiceUpdate.matchedCount) {
                throw new common_1.ConflictException('Invoice balance reconciliation failed after payment confirmation');
            }
        }
        if ([payment_status_enum_1.PaymentOrderStatus.CANCELLED, payment_status_enum_1.PaymentOrderStatus.EXPIRED].includes(status)) {
            order.activeSlot = false;
            order.paymentSessionCiphertext = null;
        }
        await order.save({ session });
        const paymentOrderId = order._id.toString();
        await this.statusHistory.create([{
                paymentOrderId,
                fromStatus: previous,
                toStatus: status,
                source,
                sourceEventKey,
                details,
            }], { session });
        if (status === payment_status_enum_1.PaymentOrderStatus.PAID) {
            await this.outbox.updateOne({ deduplicationKey: `payment-succeeded:${paymentOrderId}` }, {
                $setOnInsert: {
                    aggregateId: paymentOrderId,
                    eventType: 'PAYMENT_SUCCEEDED',
                    deduplicationKey: `payment-succeeded:${paymentOrderId}`,
                    payload: {
                        paymentId: paymentOrderId,
                        invoiceId: order.invoiceId,
                        studentId: order.studentId,
                        orderId: order.orderId,
                        amountMinor: order.amountMinor,
                        currency: order.currency,
                        paidAt: order.paidAt?.toISOString(),
                    },
                    publishedAt: null,
                    availableAt: new Date(),
                    attempts: 0,
                    lockedUntil: null,
                    lastError: null,
                },
            }, { upsert: true, session }).exec();
        }
    }
    async withTransaction(callback) {
        const session = await this.connection.startSession();
        try {
            let result;
            await session.withTransaction(async () => {
                result = await callback(session);
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
            return result;
        }
        catch (error) {
            if (error instanceof mongoose_2.mongo.MongoError && error.hasErrorLabel('TransientTransactionError')) {
                throw new common_1.ServiceUnavailableException('MongoDB transaction could not be completed; retry safely');
            }
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    buildCashfreeOrderRequest(invoice, orderId, expiresAt) {
        const returnUrl = new URL(this.config.getOrThrow('FRONTEND_RETURN_URL'));
        returnUrl.searchParams.set('order_id', orderId);
        const apiUrl = this.config.getOrThrow('PUBLIC_API_URL').replace(/\/$/, '');
        return {
            order_id: orderId,
            order_amount: (0, cashfree_client_1.toCashfreeAmount)(invoice.totalAmountMinor - invoice.paidAmountMinor),
            order_currency: invoice.currency.trim().toUpperCase(),
            customer_details: {
                customer_id: (0, node_crypto_1.createHash)('sha256').update(invoice.studentId).digest('hex').slice(0, 32),
                customer_name: invoice.studentName ?? undefined,
                customer_email: invoice.customerEmail ?? undefined,
                customer_phone: invoice.customerPhone,
            },
            order_meta: {
                return_url: returnUrl.toString(),
                notify_url: `${apiUrl}/api/v1/webhooks/cashfree`,
            },
            order_expiry_time: expiresAt.toISOString(),
            order_note: `University fee invoice ${invoice.invoiceId}`.slice(0, 200),
        };
    }
    assertSameRequest(order, requestHash) {
        if (order.requestHash !== requestHash) {
            throw new common_1.ConflictException('Idempotency-Key was already used for a different payment request');
        }
    }
    assertOwner(order, principal) {
        if (order.userId !== principal.userId || order.studentId !== principal.studentId) {
            throw new common_1.NotFoundException('Payment not found');
        }
    }
    toResponse(order, includeSession) {
        const terminal = this.isTerminal(order.status);
        let paymentSessionId = null;
        if (includeSession && !terminal && order.paymentSessionCiphertext) {
            paymentSessionId = (0, payment_session_crypto_1.decryptPaymentSession)(order.paymentSessionCiphertext);
        }
        return {
            paymentId: order._id.toString(),
            invoiceId: order.invoiceId,
            studentId: order.studentId,
            orderId: order.orderId,
            cfOrderId: order.cfOrderId ?? null,
            amountMinor: order.amountMinor,
            currency: order.currency,
            status: order.status,
            paymentSessionId,
            expiresAt: order.expiresAt ?? null,
            createdAt: order.createdAt,
            attempts: [],
        };
    }
    toAttemptResponse(attempt) {
        return {
            cfPaymentId: attempt.cfPaymentId,
            status: attempt.status,
            amountMinor: attempt.amountMinor,
            currency: attempt.currency,
            paymentGroup: attempt.paymentGroup ?? null,
            paymentTime: attempt.paymentTime ?? null,
            completionTime: attempt.completionTime ?? null,
        };
    }
    safePaymentMetadata(payment) {
        return {
            paymentGroup: typeof payment.payment_group === 'string' ? payment.payment_group : null,
            paymentMethodType: payment.payment_method && typeof payment.payment_method === 'object'
                ? Object.keys(payment.payment_method).slice(0, 1)[0] ?? null
                : null,
        };
    }
    parseDate(value) {
        if (typeof value !== 'string')
            return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    isTerminal(status) {
        return [payment_status_enum_1.PaymentOrderStatus.PAID, payment_status_enum_1.PaymentOrderStatus.FAILED, payment_status_enum_1.PaymentOrderStatus.CANCELLED, payment_status_enum_1.PaymentOrderStatus.EXPIRED]
            .includes(status);
    }
    isTerminalAttempt(status) {
        return ['SUCCESS', 'FAILED', 'CANCELLED', 'USER_DROPPED', 'VOID'].includes(status);
    }
    isDuplicateKey(error) {
        return error instanceof mongoose_2.mongo.MongoServerError && error.code === 11000;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(payment_schemas_1.PaymentOrder.name)),
    __param(1, (0, mongoose_1.InjectModel)(payment_schemas_1.FeeInvoice.name)),
    __param(2, (0, mongoose_1.InjectModel)(payment_schemas_1.PaymentAttempt.name)),
    __param(3, (0, mongoose_1.InjectModel)(payment_schemas_1.WebhookEvent.name)),
    __param(4, (0, mongoose_1.InjectModel)(payment_schemas_1.PaymentStatusHistory.name)),
    __param(5, (0, mongoose_1.InjectModel)(payment_schemas_1.OutboxEvent.name)),
    __param(6, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Connection,
        cashfree_client_1.CashfreeClient,
        config_1.ConfigService])
], PaymentsService);
class DuplicateWebhookError extends Error {
}
//# sourceMappingURL=payments.service.js.map