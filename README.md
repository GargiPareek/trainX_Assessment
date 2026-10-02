# UMS Cashfree Payments Backend

NestJS/TypeScript MVC payment module for a University Management System. It creates Cashfree sandbox orders, stores encrypted checkout sessions, records payment attempts, verifies Cashfree webhooks, and exposes internal ERP APIs. Persistence uses **MongoDB + Mongoose**.

## Stack and structure

- Node.js 20.11+, NestJS 11, TypeScript, MongoDB replica set, Mongoose.
- Controllers handle HTTP, services implement payment rules, Mongoose schemas describe collections/indexes, and `CashfreeClient` isolates Cashfree REST calls.
- `src/payments/` separates HTTP controllers, application services, DTOs, Mongo schemas, Cashfree gateway code, guards, security helpers, enums, and tests into dedicated folders.
- `src/payments/schemas/payment.schemas.ts` defines invoices, orders, attempts, webhook inbox, audit history, and outbox schemas.
- `src/database/migrations/` contains the versioned MongoDB schema/index migration; the runner records applied migrations in `schema_migrations`.
- Multi-document transactions are used to atomically record webhook event, payment status, invoice balance update, audit history, and ERP outbox record. MongoDB **must run as a replica set** even for local development.

## Setup

1. Install Node.js 20.11+ and Docker Desktop (or a MongoDB replica-set deployment).
2. Start the local replica-set container:

   ```sh
   docker compose up -d mongodb
   docker compose exec mongodb mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
   ```

   If it says the replica set is already initialized, continue. For an app running in another container on the same Compose network, use `mongodb://mongodb:27017/ums_payments?replicaSet=rs0` and configure the advertised replica-set host accordingly.

3. Install dependencies with `npm install`.
4. Copy `.env.example` to `.env`. Add your Cashfree **sandbox** client ID and client secret, public HTTPS API URL, and frontend return URL. The Cashfree PG client secret is also used to verify webhook signatures. Never commit `.env`.
5. Generate independent application secrets:

   ```sh
   openssl rand -base64 32
   openssl rand -hex 32
   ```

   Use the first value with a `base64:` prefix for `PAYMENT_SESSION_ENCRYPTION_KEY`; use the second for `JWT_SECRET`. Store secrets in a secrets manager in deployed environments.
6. Optionally configure both `ERP_PAYMENT_WEBHOOK_URL` and `ERP_PAYMENT_WEBHOOK_SECRET` to deliver successful-payment events to the ERP. The endpoint must be HTTPS; the backend signs requests with HMAC-SHA256. If they are unset, events remain in the outbox for a later integration.
7. Build and apply the MongoDB migration, then start the API:

   ```sh
   npm run db:migrate
   npm run start:dev
   ```

   `npm run build` compiles the app; `npm start` runs `dist/main.js`. Production disables Mongoose auto-index creation; apply `npm run db:migrate` as a deployment step before serving traffic. The migration runner refuses to run against a standalone MongoDB server.

The `fee_invoices` collection is a UMS billing read model. In a real ERP deployment, synchronize it from the billing domain or replace `FeeInvoice` queries with the ERP invoice adapter. Payment creation accepts only an invoice ID and reads amount/customer details from this trusted server-side record.

Example invoice document for local testing (insert into database `ums_payments`, collection `fee_invoices`):

```json
{
  "invoiceId": "af772d9f-22b0-4c2a-a00c-1948fc9948d2",
  "studentId": "student-1001",
  "studentName": "Test Student",
  "customerEmail": "student@example.edu",
  "customerPhone": "9876543210",
  "totalAmountMinor": 125000,
  "paidAmountMinor": 0,
  "currency": "INR",
  "active": true
}
```

Money uses integer paise internally; `125000` is INR 1,250.00.

## API

### Student account signup/login

- `POST /api/v1/auth/signup` — create a student account using `name`, `email`, `phone`, `studentId`, and `password`. Signup checks the supplied student ID and phone against UMS invoice data and, when present, requires the email to match too.
- `POST /api/v1/auth/login` — authenticate with `email` and `password`.

Signup request:

```json
{
   "name": "Test Student",
   "email": "student@example.edu",
   "phone": "9876543210",
   "studentId": "student-1001",
   "password": "a-long-unique-password"
}
```

Use the returned `accessToken` as `Authorization: Bearer <accessToken>` on payment API requests. The `studentId` must match an existing UMS invoice record; the API rejects attempts to initiate or view payments belonging to another account.

Both endpoints return a short-lived Bearer access token and safe account details. Passwords are hashed with bcrypt; password hashes are never returned. Student identity/contact verification by supplied invoice data is suitable only for this assessment—production enrollment should use UMS-issued invites or verified email/phone OTP.

All payment-management endpoints require `Authorization: Bearer <accessToken>` and are scoped to the authenticated student's `studentId` and account ID. Use a fresh `Idempotency-Key` per payment creation and reuse it for retries.

### Create payment

`POST /api/v1/payments`

```json
{ "invoiceId": "af772d9f-22b0-4c2a-a00c-1948fc9948d2" }
```

Required headers: `Authorization: Bearer <accessToken>`, `Idempotency-Key`.

The result includes `paymentId` (Mongo ObjectId), `orderId`, `amountMinor`, `currency`, `status`, and `paymentSessionId`. Pass the session ID to Cashfree's client-side checkout SDK; never send Cashfree API credentials to the browser. The payment session is encrypted at rest and only included in the create/replay response while the order is still payable.

### Check/reconcile status

- `GET /api/v1/payments/:paymentId` — local payment-order status with safe attempt summaries.
- `GET /api/v1/payments/invoices/:invoiceId` — payment orders and attempts for an invoice.
- `POST /api/v1/payments/:paymentId/refresh` — fetch order state from Cashfree and reconcile uncertain status.

### Webhook

`POST /api/v1/webhooks/cashfree` is public to Cashfree and authenticated by the signature, not the ERP API key. Configure this public HTTPS URL in the Cashfree sandbox dashboard, and subscribe to payment success, payment failed, user-dropped, and charges events. Choose a webhook payload version enabled for the Cashfree account.

The exact raw HTTP body is verified before JSON parsing. Cashfree events are recorded in a durable inbox with a unique event key; duplicates are safely acknowledged. If MongoDB cannot durably accept/process a webhook, the endpoint returns an error so Cashfree can retry.

## Payment lifecycle

1. UMS requests a payment for an invoice.
2. The backend reads trusted outstanding balance/customer details, reserves a payment order using unique indexes, and stores an immutable Cashfree request snapshot.
3. The backend calls Cashfree `POST /orders` using a stable order ID and provider idempotency key, then encrypts and stores `payment_session_id` for the frontend checkout.
4. Cashfree webhook signature is verified; order/payment identifiers, amount, and currency are checked before recording the payment attempt.
5. A successful event transactionally updates payment order and invoice read-model balance, appends status history, and writes an outbox notification. The ERP reads payment status from these APIs; browser redirects are not proof of payment.

Order statuses: `CREATING`, `PENDING`, `PAID`, `FAILED`, `CANCELLED`, `EXPIRED`, `RECONCILIATION_REQUIRED`. Attempt records preserve Cashfree values such as `SUCCESS`, `FAILED`, `PENDING`, `USER_DROPPED`, `CANCELLED`, `VOID`, `NOT_ATTEMPTED`, and unrecognized future states. A failed/dropped attempt does not close an order that may receive another successful attempt. A late failure cannot downgrade a paid order.

Cashfree requests use the sandbox API base `https://sandbox.cashfree.com/pg` and `x-api-version: 2026-01-01` (confirm this version is enabled for the merchant account). Signature verification uses Cashfree's documented HMAC-SHA256 over timestamp concatenated with raw payload bytes, compared in constant time.

## Mongo collections and reliability

- `fee_invoices`: UMS invoice read model; `invoiceId` is the business key.
- `users`: student account profile, normalized email/student ID indexes, and a bcrypt password hash excluded from normal query results.
- `payment_orders`: immutable amount/currency snapshot, idempotency key, provider request snapshot, and encrypted session.
- `payment_attempts`: individual Cashfree payment attempts.
- `webhook_events`: verified event inbox, provider event key/version/type, payload hash, and processing outcome.
- `payment_status_history`: append-only status transitions.
- `outbox_events`: retryable ERP notifications.

MongoDB unique indexes enforce API idempotency, Cashfree order/payment identity, event deduplication, and one open order per invoice. The invoice active-order index is a partial unique index on `{invoiceId}` where `activeSlot: true`. Multi-document transaction support requires a replica set; a standalone Mongo server is not supported. Webhook payloads include sensitive data: restrict DB access and retention, and never log raw bodies, credentials, or session values.

When configured, the outbox publisher leases pending events, delivers each with `x-ums-event-id`, `x-ums-delivery-id`, `x-ums-timestamp`, and an HMAC signature in `x-ums-signature`, then marks it published only after a 2xx response. Failed deliveries use exponential backoff; events exceeding the retry limit remain stored for operator review. The ERP should deduplicate by `x-ums-event-id` because a timeout can occur after ERP acceptance but before the sender receives the response.

MongoDB schema/index migration history is tracked in `schema_migrations`; apply new numbered migrations before deployment. MongoDB migrations are not SQL files, since this project uses MongoDB/Mongoose.

## Tests

```sh
npm test
npm run test:cov
```

MongoDB integration tests are skipped unless `MONGODB_TEST_URI` points to a **disposable replica-set database**. Then run:

```sh
npm run test:e2e
```

Unit tests cover password hashing/token issuance, UMS signup matching, raw-body signature acceptance/tampering, webhook authentication, idempotent request replay, cross-student access rejection, successful webhook processing with transactional invoice/outbox updates, and ERP event delivery. The integration test checks the one-active-order unique index and transaction support. For a sandbox smoke test, configure a public HTTPS tunnel in the Cashfree dashboard, add an invoice document, sign up with that student's matching contact data, start checkout with the returned token, and verify webhook-driven status through the API.

## Official Cashfree references

- [Create Order API](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order)
- [Get Order API](https://www.cashfree.com/docs/api-reference/payments/latest/orders/get-order)
- [Get Payment by ID API](https://www.cashfree.com/docs/api-reference/payments/latest/payments/get)
- [Webhook overview and signature verification](https://www.cashfree.com/docs/payments/online/webhooks)
- [Payment webhook payloads](https://www.cashfree.com/docs/api-reference/payments/latest/payments/webhooks)
