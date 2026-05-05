# Payments API Reference

This document defines the request/response shape for all payment-related
endpoints (`approve-payment`, `complete-payment`, `payment-status`) and the
canonical naming for tracing identifiers.

> See also: [`docs/payments/tracing.md`](./tracing.md) for the underlying
> `lifecycle_id` design.

---

## Canonical vs Alias fields

| Field | Status | Type | Notes |
|---|---|---|---|
| `lifecycleId` | ✅ **Canonical** | `string` | The single source of truth. End-to-end trace ID for one payment attempt. |
| `correlationId` | ⚠️ **Alias only** | `string` | Backward-compat mirror of `lifecycleId`. **Always equals `lifecycleId`.** Read-only — never write a different value. |
| `x-lifecycle-id` (header) | ✅ Canonical | `string` | Preferred request/response header. |
| `x-correlation-id` (header) | ⚠️ Alias | `string` | Mirror header. Same value as `x-lifecycle-id`. |
| `paymentId` | ✅ Canonical | `string` | Pi Network payment identifier. |
| `txid` | ✅ Canonical | `string \| null` | Pi Network transaction ID. Set after `complete`. |
| `terminalReason` | ✅ Canonical | `'completed' \| 'cancelled' \| 'voided' \| 'error' \| 'timeout' \| null` | Final outcome of the payment. |
| `stage` | ✅ Canonical | `'validation' \| 'lookup' \| 'pi_api' \| 'db_write' \| 'transition' \| 'notify' \| 'done' \| 'error'` | Logging stage. |

### Rules for clients

1. **Generate** a `lifecycleId` once per payment attempt. Send it as
   `x-lifecycle-id` on every related request.
2. **Read** `lifecycleId` from responses. Treat `correlationId` as identical
   and prefer `lifecycleId` in new code.
3. **Never** generate a `correlationId` distinct from `lifecycleId`. If a value
   appears under `correlationId` and not `lifecycleId`, that is a bug — log it.

---

## Endpoints

### `POST /functions/v1/approve-payment`

**Headers**
```
Authorization: Bearer <user-access-token>
Content-Type: application/json
x-lifecycle-id: subpay_8b1f...           # canonical
x-correlation-id: subpay_8b1f...         # alias (optional, same value)
```

**Request body**
```json
{
  "paymentId": "abc123",
  "userId": "uuid-of-user",
  "amount": 12,
  "memo": "Small Business plan",
  "metadata": { "subscriptionTier": "small-business" }
}
```

**Success response (200)**
```json
{
  "success": true,
  "message": "Payment approved successfully",
  "paymentId": "abc123",
  "lifecycleId": "subpay_8b1f...",
  "correlationId": "subpay_8b1f..."
}
```

---

### `POST /functions/v1/complete-payment`

**Request body**
```json
{
  "paymentId": "abc123",
  "txid": "pi_tx_456",
  "userId": "uuid-of-user",
  "amount": 12,
  "memo": "Small Business plan",
  "metadata": { "subscriptionTier": "small-business" }
}
```

**Success response (200)**
```json
{
  "success": true,
  "message": "Payment completed successfully",
  "paymentId": "abc123",
  "txid": "pi_tx_456",
  "subscriptionCreated": true,
  "lifecycleId": "subpay_8b1f...",
  "correlationId": "subpay_8b1f..."
}
```

**Error response (502)**
```json
{
  "success": false,
  "message": "Payment completion failed. Please try again.",
  "lifecycleId": "subpay_8b1f...",
  "correlationId": "subpay_8b1f..."
}
```

---

### `POST /functions/v1/payment-status`

**Request body**
```json
{ "paymentId": "abc123" }
```

**Success response (200)**
```json
{
  "success": true,
  "message": "Payment status retrieved successfully",
  "paymentId": "abc123",
  "txid": "pi_tx_456",
  "status": {
    "approved": true,
    "verified": true,
    "completed": true,
    "cancelled": false,
    "voided": false
  },
  "terminalReason": "completed",
  "lifecycleId": "subpay_8b1f...",
  "correlationId": "subpay_8b1f..."
}
```

---

## Structured log shape (Edge Functions)

Every log line is a JSON object emitted to Edge Function logs:

```json
{
  "ts": "2026-05-05T14:07:03.421Z",
  "level": "info",
  "event": "complete-payment.transition",
  "fn": "complete-payment",
  "stage": "transition",
  "lifecycleId": "subpay_8b1f...",
  "paymentId": "abc123",
  "from": "approved",
  "to": "completed",
  "terminalReason": "completed"
}
```

`lifecycleId` is the only trace key indexed in DB (`payments.lifecycle_id`).
Search logs by `lifecycleId` to reconstruct an entire payment lifecycle.

---

## Tracing a payment end-to-end

```sql
-- Find the payment row
SELECT id, payment_id, txid, status, lifecycle_id, created_at, updated_at
FROM payments
WHERE lifecycle_id = 'subpay_8b1f...';
```

Then search Edge Function logs for the same `lifecycleId` value to see the
full approve → complete → status timeline.

---

## Deprecation policy

`correlationId` / `x-correlation-id` will remain as aliases indefinitely for
backward compatibility. They will not be removed without a formal deprecation
notice. Do not introduce new endpoints that emit only `correlationId` —
always emit `lifecycleId` (and the alias if convenient).
