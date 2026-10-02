import 'reflect-metadata';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentOrderStatus } from '../enums/payment-status.enum';
export type FeeInvoiceDocument = HydratedDocument<FeeInvoice>;
export declare class FeeInvoice {
    invoiceId: string;
    studentId: string;
    studentName?: string;
    customerEmail?: string;
    customerPhone: string;
    totalAmountMinor: number;
    paidAmountMinor: number;
    currency: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FeeInvoiceSchema: import("mongoose").Schema<FeeInvoice, import("mongoose").Model<FeeInvoice, any, any, any, import("mongoose").Document<unknown, any, FeeInvoice, any, {}> & FeeInvoice & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FeeInvoice, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<FeeInvoice>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<FeeInvoice> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type PaymentOrderDocument = HydratedDocument<PaymentOrder>;
export declare class PaymentOrder {
    invoiceId: string;
    studentId: string;
    userId: string;
    orderId: string;
    cfOrderId: string | null;
    amountMinor: number;
    currency: string;
    status: PaymentOrderStatus;
    paymentSessionCiphertext: string | null;
    idempotencyKey: string;
    requestHash: string;
    gatewayIdempotencyKey: string;
    gatewayRequest: Record<string, unknown>;
    expiresAt: Date | null;
    paidAt: Date | null;
    lastError: string | null;
    activeSlot: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PaymentOrderSchema: import("mongoose").Schema<PaymentOrder, import("mongoose").Model<PaymentOrder, any, any, any, import("mongoose").Document<unknown, any, PaymentOrder, any, {}> & PaymentOrder & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PaymentOrder, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PaymentOrder>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PaymentOrder> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type PaymentAttemptDocument = HydratedDocument<PaymentAttempt>;
export declare class PaymentAttempt {
    paymentOrderId: string;
    attemptNumber: number;
    cfPaymentId: string;
    status: string;
    amountMinor: number;
    currency: string;
    paymentGroup: string | null;
    paymentTime: Date | null;
    completionTime: Date | null;
    errorDetails: Record<string, unknown> | null;
    safePaymentMetadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PaymentAttemptSchema: import("mongoose").Schema<PaymentAttempt, import("mongoose").Model<PaymentAttempt, any, any, any, import("mongoose").Document<unknown, any, PaymentAttempt, any, {}> & PaymentAttempt & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PaymentAttempt, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PaymentAttempt>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PaymentAttempt> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type WebhookEventDocument = HydratedDocument<WebhookEvent>;
export declare class WebhookEvent {
    eventKey: string;
    webhookVersion: string | null;
    eventType: string;
    orderId: string | null;
    cfPaymentId: string | null;
    rawPayload: Record<string, unknown>;
    payloadSha256: string;
    signatureVerified: boolean;
    processingError: string | null;
    processedAt: Date | null;
    receivedAt: Date;
}
export declare const WebhookEventSchema: import("mongoose").Schema<WebhookEvent, import("mongoose").Model<WebhookEvent, any, any, any, import("mongoose").Document<unknown, any, WebhookEvent, any, {}> & WebhookEvent & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WebhookEvent, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<WebhookEvent>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<WebhookEvent> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type PaymentStatusHistoryDocument = HydratedDocument<PaymentStatusHistory>;
export declare class PaymentStatusHistory {
    paymentOrderId: string;
    fromStatus: string | null;
    toStatus: string;
    source: string;
    sourceEventKey: string | null;
    details: Record<string, unknown> | null;
    createdAt: Date;
}
export declare const PaymentStatusHistorySchema: import("mongoose").Schema<PaymentStatusHistory, import("mongoose").Model<PaymentStatusHistory, any, any, any, import("mongoose").Document<unknown, any, PaymentStatusHistory, any, {}> & PaymentStatusHistory & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PaymentStatusHistory, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PaymentStatusHistory>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PaymentStatusHistory> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type OutboxEventDocument = HydratedDocument<OutboxEvent>;
export declare class OutboxEvent {
    _id: Types.ObjectId;
    aggregateId: string;
    eventType: string;
    deduplicationKey: string;
    payload: Record<string, unknown>;
    publishedAt: Date | null;
    availableAt: Date;
    attempts: number;
    lockedUntil: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const OutboxEventSchema: import("mongoose").Schema<OutboxEvent, import("mongoose").Model<OutboxEvent, any, any, any, import("mongoose").Document<unknown, any, OutboxEvent, any, {}> & OutboxEvent & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OutboxEvent, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<OutboxEvent>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<OutboxEvent> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
