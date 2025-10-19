# Shiprocket Integration Documentation

This document provides comprehensive information about the Shiprocket integration implementation, including webhooks, status tracking, and API endpoints.

## Overview

The Shiprocket integration provides:
- Real-time order status updates via webhooks
- Automated shipping process management
- Order tracking and status monitoring
- Return and refund handling
- Admin dashboard for webhook management

## Architecture

### Backend Components

1. **Webhook Controllers** (`shiprocketWebhook.controller.js`)
   - Handles incoming webhook events from Shiprocket
   - Verifies webhook signatures for security
   - Updates order statuses based on webhook data

2. **Status Service** (`shiprocketStatusService.js`)
   - Maps Shiprocket statuses to internal order statuses
   - Manages order status transitions
   - Provides tracking information retrieval

3. **Webhook Service** (`shiprocketWebhookService.js`)
   - Manages webhook configuration
   - Validates webhook payloads
   - Processes different types of webhook events

4. **Shiprocket API Service** (`shipRocket.js`)
   - Handles Shiprocket API calls
   - Manages authentication tokens
   - Provides shipping operations

### Frontend Components

1. **Webhook Manager** (`ShiprocketWebhookManager.jsx`)
   - Admin interface for webhook configuration
   - Webhook testing and monitoring
   - Setup instructions and URL management

## API Endpoints

### Webhook Endpoints (No Authentication Required)

```
POST /api/webhooks/shiprocket
POST /api/webhooks/shiprocket/return
POST /api/webhooks/shiprocket/tracking
POST /api/webhooks/shiprocket/test
GET  /api/webhooks/health
```

### Admin Endpoints (Authentication Required)

```
GET  /api/admin/shiprocket/webhooks/config
POST /api/admin/shiprocket/webhooks/test
GET  /api/admin/shiprocket/orders/:orderId/tracking
GET  /api/admin/shiprocket/orders/status/:status
POST /api/admin/shiprocket/orders/:orderId/status
```

## Webhook Events

### Order Status Updates

**Endpoint:** `POST /api/webhooks/shiprocket`

**Payload Structure:**
```json
{
  "order_id": "SR_ORDER_123",
  "shipment_id": "SHIP_456",
  "status": "SHIPPED",
  "tracking_data": {
    "tracking_number": "TRK789",
    "courier_name": "Blue Dart",
    "awb_code": "AWB123"
  },
  "updated_at": "2024-01-15T10:30:00Z",
  "reason": "Order dispatched"
}
```

**Supported Statuses:**
- `NEW` → Ordered
- `PROCESSING` → Ordered
- `READY_TO_SHIP` → Ordered
- `SHIPPED` → Shipped
- `DELIVERED` → Delivered
- `CANCELLED` → Cancelled
- `RTO` → Returned
- `RTO_DELIVERED` → Returned
- `RTO_CANCELLED` → Return Cancelled
- `LOST` → Cancelled
- `DAMAGED` → Returned
- `RETURNED` → Returned
- `REFUNDED` → Refunded

### Return Status Updates

**Endpoint:** `POST /api/webhooks/shiprocket/return`

**Payload Structure:**
```json
{
  "return_order_id": "RET_ORDER_123",
  "original_order_id": "SR_ORDER_123",
  "status": "RETURNED",
  "tracking_data": {
    "tracking_number": "RET_TRK789",
    "courier_name": "Blue Dart",
    "awb_code": "RET_AWB123"
  },
  "updated_at": "2024-01-15T10:30:00Z",
  "reason": "Return completed"
}
```

### Tracking Updates

**Endpoint:** `POST /api/webhooks/shiprocket/tracking`

**Payload Structure:**
```json
{
  "order_id": "SR_ORDER_123",
  "shipment_id": "SHIP_456",
  "tracking_number": "TRK789",
  "courier_name": "Blue Dart",
  "status": "IN_TRANSIT",
  "tracking_data": {
    "current_location": "Mumbai",
    "estimated_delivery": "2024-01-16T14:00:00Z"
  },
  "updated_at": "2024-01-15T10:30:00Z"
}
```

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Shiprocket Configuration
SHIPROCKET_WEBHOOK_SECRET=your_webhook_secret_here
DEV_WEBHOOK_URL=http://localhost:3000
PROD_WEBHOOK_URL=https://yourdomain.com

# Optional: For webhook signature verification
SHIPROCKET_WEBHOOK_SECRET=your_shared_secret
```

## Setup Instructions

### 1. Backend Setup

1. **Install Dependencies**
   ```bash
   npm install crypto
   ```

2. **Configure Environment Variables**
   - Set webhook URLs for your environment
   - Configure webhook secret for signature verification

3. **Start the Server**
   ```bash
   npm start
   ```

### 2. Shiprocket Dashboard Configuration

1. **Log in to Shiprocket Dashboard**
   - Go to Settings > API > Webhook

2. **Add Webhook URLs**
   - Order Status Updates: `https://yourdomain.com/api/webhooks/shiprocket`
   - Return Status Updates: `https://yourdomain.com/api/webhooks/shiprocket/return`
   - Tracking Updates: `https://yourdomain.com/api/webhooks/shiprocket/tracking`

3. **Select Events to Track**
   - Order Status Changes
   - Tracking Updates
   - Return Status Changes
   - Delivery Updates

4. **Set Webhook Secret**
   - Use the same secret in your environment variables

### 3. Frontend Setup

1. **Add Webhook Manager Component**
   ```jsx
   import ShiprocketWebhookManager from './components/ShiprocketWebhookManager';
   ```

2. **Configure API Endpoints**
   - Ensure API base URL is correctly configured
   - Test webhook endpoints from admin panel

## Security

### Webhook Signature Verification

The integration includes HMAC-SHA256 signature verification for webhook security:

```javascript
const verifyWebhookSignature = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(expectedSignature, 'base64')
  );
};
```

### Headers Required

- `x-shiprocket-hmac-sha256` or `x-shiphero-hmac-sha256`
- `Content-Type: application/json`

## Testing

### 1. Test Webhook Endpoints

Use the admin panel or make direct API calls:

```bash
# Test webhook endpoint
curl -X POST https://yourdomain.com/api/webhooks/shiprocket/test \
  -H "Content-Type: application/json" \
  -d '{"test": true, "message": "Test webhook"}'
```

### 2. Test Order Status Updates

```bash
# Test order status update
curl -X POST https://yourdomain.com/api/webhooks/shiprocket \
  -H "Content-Type: application/json" \
  -H "x-shiprocket-hmac-sha256: your_signature" \
  -d '{
    "order_id": "TEST_ORDER_123",
    "status": "SHIPPED",
    "tracking_data": {
      "tracking_number": "TRK123",
      "courier_name": "Test Courier"
    }
  }'
```

## Monitoring and Debugging

### 1. Webhook Logs

Check server logs for webhook processing:
```bash
tail -f logs/combined.log | grep "webhook"
```

### 2. Admin Dashboard

Use the webhook manager in the admin panel to:
- View webhook configuration
- Test webhook endpoints
- Monitor webhook status
- View setup instructions

### 3. Database Queries

Check order status updates in the database:
```javascript
// Find orders with Shiprocket data
db.orders.find({
  "items.shiprocket": { $exists: true }
});

// Find orders by Shiprocket status
db.orders.find({
  "items.shiprocket.status": "SHIPPED"
});
```

## Error Handling

### Common Issues

1. **Webhook Signature Verification Failed**
   - Check webhook secret configuration
   - Verify signature header format

2. **Order Not Found**
   - Ensure Shiprocket order ID matches database
   - Check order creation process

3. **Status Transition Invalid**
   - Verify status mapping configuration
   - Check order current status

### Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Performance Considerations

1. **Webhook Processing**
   - Use database transactions for consistency
   - Implement retry logic for failed webhooks
   - Monitor webhook processing time

2. **Database Optimization**
   - Index Shiprocket order IDs
   - Optimize status history queries
   - Consider archiving old webhook data

## Troubleshooting

### Webhook Not Receiving Data

1. Check webhook URL configuration in Shiprocket
2. Verify server is accessible from Shiprocket
3. Check firewall and network settings
4. Review webhook logs for errors

### Status Updates Not Reflecting

1. Verify webhook payload structure
2. Check status mapping configuration
3. Review order data in database
4. Check webhook processing logs

### Authentication Issues

1. Verify Shiprocket API credentials
2. Check token expiration (10 days)
3. Review authentication middleware
4. Test API endpoints manually

## Support

For issues and questions:
1. Check server logs for error details
2. Review webhook payload structure
3. Test with webhook test endpoint
4. Contact development team with specific error messages

## Changelog

### Version 1.0.0
- Initial Shiprocket integration
- Webhook support for order status updates
- Admin dashboard for webhook management
- Comprehensive status mapping
- Security features and signature verification
