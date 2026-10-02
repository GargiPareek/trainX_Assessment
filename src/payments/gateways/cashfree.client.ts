import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

export interface CashfreeOrderResponse {
  order_id: string;
  cf_order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: string;
  payment_session_id?: string;
  order_expiry_time?: string;
}

export interface CashfreeCreateOrderRequest {
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_details: {
    customer_id: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone: string;
  };
  order_meta: { return_url: string; notify_url: string };
  order_expiry_time: string;
  order_note: string;
}

export class CashfreeApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = 'CashfreeApiError';
  }
}

@Injectable()
export class CashfreeClient {
  constructor(private readonly config: ConfigService) {}

  async createOrder(
    payload: CashfreeCreateOrderRequest,
    idempotencyKey: string,
  ): Promise<CashfreeOrderResponse> {
    return this.request<CashfreeOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'x-idempotency-key': idempotencyKey },
    });
  }

  async getOrder(orderId: string): Promise<CashfreeOrderResponse> {
    return this.request<CashfreeOrderResponse>(`/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: { 'x-request-id': randomUUID() },
    });
  }

  private async request<T>(path: string, init: RequestInit & { headers: Record<string, string> }): Promise<T> {
    const baseUrl = this.config.getOrThrow<string>('CASHFREE_BASE_URL').replace(/\/$/, '');
    const url = `${baseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(10_000),
        headers: {
          'content-type': 'application/json',
          'x-api-version': this.config.getOrThrow<string>('CASHFREE_API_VERSION'),
          'x-client-id': this.config.getOrThrow<string>('CASHFREE_CLIENT_ID'),
          'x-client-secret': this.config.getOrThrow<string>('CASHFREE_CLIENT_SECRET'),
          ...init.headers,
        },
      });
    } catch (error) {
      throw new CashfreeApiError(
        error instanceof Error ? `Cashfree request failed: ${error.message}` : 'Cashfree request failed',
      );
    }

    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new CashfreeApiError('Cashfree returned a non-JSON response', response.status);
    }
    if (!response.ok) {
      throw new CashfreeApiError(`Cashfree API returned HTTP ${response.status}`, response.status, body);
    }
    return body as T;
  }
}

export function toCashfreeAmount(amountMinor: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 100) {
    throw new ServiceUnavailableException('Stored invoice amount is invalid');
  }
  return Number((amountMinor / 100).toFixed(2));
}
