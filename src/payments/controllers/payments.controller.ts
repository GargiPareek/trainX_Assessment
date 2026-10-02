import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentResponse, PaymentsService } from '../services/payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePaymentDto,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PaymentResponse> {
    return this.payments.createPayment(dto, idempotencyKey, request.user);
  }

  @Get('invoices/:invoiceId')
  listByInvoice(
    @Param('invoiceId') invoiceId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaymentResponse[]> {
    return this.payments.listInvoicePayments(invoiceId, request.user);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<PaymentResponse> {
    return this.payments.getPayment(id, request.user);
  }

  @Post(':id/refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<PaymentResponse> {
    return this.payments.refreshPayment(id, request.user);
  }
}
