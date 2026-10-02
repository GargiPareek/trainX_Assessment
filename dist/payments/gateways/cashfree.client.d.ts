import { ConfigService } from '@nestjs/config';
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
    order_meta: {
        return_url: string;
        notify_url: string;
    };
    order_expiry_time: string;
    order_note: string;
}
export declare class CashfreeApiError extends Error {
    readonly statusCode?: number | undefined;
    readonly responseBody?: unknown | undefined;
    constructor(message: string, statusCode?: number | undefined, responseBody?: unknown | undefined);
}
export declare class CashfreeClient {
    private readonly config;
    constructor(config: ConfigService);
    createOrder(payload: CashfreeCreateOrderRequest, idempotencyKey: string): Promise<CashfreeOrderResponse>;
    getOrder(orderId: string): Promise<CashfreeOrderResponse>;
    private request;
}
export declare function toCashfreeAmount(amountMinor: number): number;
