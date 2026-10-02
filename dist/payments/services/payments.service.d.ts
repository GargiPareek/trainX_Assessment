import { ConfigService } from '@nestjs/config';
import { Connection, Model } from 'mongoose';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { FeeInvoice, OutboxEvent, PaymentAttempt, PaymentOrder, PaymentStatusHistory, WebhookEvent } from '../schemas/payment.schemas';
import { PaymentOrderStatus } from '../enums/payment-status.enum';
import { CashfreeClient } from '../gateways/cashfree.client';
import { AuthenticatedPrincipal } from '../../auth/jwt-auth.guard';
export interface PaymentAttemptResponse {
    cfPaymentId: string;
    status: string;
    amountMinor: number;
    currency: string;
    paymentGroup: string | null;
    paymentTime: Date | null;
    completionTime: Date | null;
}
export interface PaymentResponse {
    paymentId: string;
    invoiceId: string;
    studentId: string;
    orderId: string;
    cfOrderId: string | null;
    amountMinor: number;
    currency: string;
    status: PaymentOrderStatus;
    paymentSessionId: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    attempts: PaymentAttemptResponse[];
}
export declare class PaymentsService {
    private readonly orders;
    private readonly invoices;
    private readonly attempts;
    private readonly webhookEvents;
    private readonly statusHistory;
    private readonly outbox;
    private readonly connection;
    private readonly cashfree;
    private readonly config;
    private readonly logger;
    constructor(orders: Model<PaymentOrder>, invoices: Model<FeeInvoice>, attempts: Model<PaymentAttempt>, webhookEvents: Model<WebhookEvent>, statusHistory: Model<PaymentStatusHistory>, outbox: Model<OutboxEvent>, connection: Connection, cashfree: CashfreeClient, config: ConfigService);
    createPayment(dto: CreatePaymentDto, idempotencyKey: string | undefined, principal: AuthenticatedPrincipal): Promise<PaymentResponse>;
    getPayment(id: string, principal: AuthenticatedPrincipal): Promise<PaymentResponse>;
    listInvoicePayments(invoiceId: string, principal: AuthenticatedPrincipal): Promise<PaymentResponse[]>;
    refreshPayment(id: string, principal: AuthenticatedPrincipal): Promise<PaymentResponse>;
    applyCashfreeWebhook(payload: Record<string, any>, eventKey: string, webhookVersion: string | null): Promise<'processed' | 'duplicate'>;
    private provisionCashfreeOrder;
    private transitionOrder;
    private transitionWithSession;
    private withTransaction;
    private buildCashfreeOrderRequest;
    private assertSameRequest;
    private assertOwner;
    private toResponse;
    private toAttemptResponse;
    private safePaymentMetadata;
    private parseDate;
    private isTerminal;
    private isTerminalAttempt;
    private isDuplicateKey;
}
