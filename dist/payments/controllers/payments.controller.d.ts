import { AuthenticatedRequest } from '../../auth/jwt-auth.guard';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentResponse, PaymentsService } from '../services/payments.service';
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    create(dto: CreatePaymentDto, request: AuthenticatedRequest, idempotencyKey?: string): Promise<PaymentResponse>;
    listByInvoice(invoiceId: string, request: AuthenticatedRequest): Promise<PaymentResponse[]>;
    get(id: string, request: AuthenticatedRequest): Promise<PaymentResponse>;
    refresh(id: string, request: AuthenticatedRequest): Promise<PaymentResponse>;
}
