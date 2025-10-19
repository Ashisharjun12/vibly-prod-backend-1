# Shiprocket Webhook Testing Guide

This guide helps you set up and test Shiprocket webhooks with your local development server using Cloudflare tunnel.

## 🚀 Quick Start

### 1. Start Your Backend Server
```bash
cd backend
npm start
# Server will run on http://localhost:3000
```

### 2. Set Up Cloudflare Tunnel
```bash
# Install Cloudflare tunnel
npm install -g cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create shiprocket-webhook

# Start the tunnel
cloudflared tunnel run shiprocket-webhook --url http://localhost:3000
```

### 3. Test Webhooks
```bash
# Run the test script
cd backend
node test-webhook.js

# Or use the admin panel
# Go to http://localhost:5174/admin
# Navigate to Shiprocket Webhook Tester
```

## 📡 Webhook Endpoints

### Order Status Webhook
- **URL**: `https://your-tunnel-domain.com/api/webhooks/shiprocket`
- **Method**: POST
- **Headers**: 
  - `Content-Type: application/json`
  - `x-shiprocket-hmac-sha256: your-webhook-secret`

### Return Status Webhook
- **URL**: `https://your-tunnel-domain.com/api/webhooks/shiprocket/return`
- **Method**: POST
- **Headers**: 
  - `Content-Type: application/json`
  - `x-shiprocket-hmac-sha256: your-webhook-secret`

## 🧪 Testing Methods

### 1. Admin Panel Testing
Access the webhook tester at: `http://localhost:5174/admin`

Features:
- **Local Webhook Test**: Test with custom payloads
- **Webhook Simulation**: Simulate realistic Shiprocket calls
- **Tunnel URL Generator**: Get Cloudflare tunnel URLs
- **Test Status**: View test results and statistics

### 2. API Testing
Use the following API endpoints for testing:

#### Test Local Webhook
```bash
curl -X POST http://localhost:3000/api/admin/shiprocket/webhooks/test-local \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "ORDER_STATUS_UPDATE",
    "orderId": "ORD-TEST-123",
    "status": "SHIPPED"
  }'
```

#### Simulate Webhook
```bash
curl -X POST http://localhost:3000/api/admin/shiprocket/webhooks/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "ORDER_STATUS_UPDATE",
    "orderId": "ORD-SIMULATE-123",
    "status": "SHIPPED",
    "trackingId": "TRACK-SIM-123",
    "courierName": "Test Courier"
  }'
```

#### Get Tunnel URLs
```bash
curl http://localhost:3000/api/admin/shiprocket/webhooks/tunnel-urls
```

### 3. Test Script
Run the comprehensive test script:

```bash
cd backend
node test-webhook.js
```

This will test:
- All order statuses (NEW, PROCESSING, SHIPPED, etc.)
- All return statuses (RETURN_REQUESTED, RETURN_DELIVERED, etc.)
- Custom webhook payloads
- Error handling

## 📋 Webhook Payload Examples

### Order Status Update
```json
{
  "event_name": "ORDER_STATUS_UPDATE",
  "order_id": "SR_ORDER_123",
  "external_order_id": "ORD-123",
  "current_status": "SHIPPED",
  "tracking_id": "TRACK123",
  "courier_name": "Blue Dart",
  "shipment_id": "SHIP123",
  "timestamp": "2024-01-15T10:30:00Z",
  "customer_name": "John Doe",
  "customer_phone": "+919876543210",
  "customer_email": "john@example.com",
  "shipping_address": {
    "name": "John Doe",
    "phone": "+919876543210",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

### Return Status Update
```json
{
  "event_name": "RETURN_STATUS_UPDATE",
  "return_order_id": "RETURN_123",
  "external_order_id": "ORD-123",
  "current_status": "RETURN_DELIVERED",
  "tracking_id": "RETURN_TRACK123",
  "courier_name": "Blue Dart",
  "timestamp": "2024-01-15T10:30:00Z",
  "return_reason": "Product not as described",
  "return_amount": 999.00
}
```

## 🔧 Configuration

### Environment Variables
Add these to your `.env` file:

```env
# Backend URL (for webhook generation)
BACKEND_URL=https://your-tunnel-domain.com

# Shiprocket Webhook Secret (for signature verification)
SHIPROCKET_WEBHOOK_SECRET=your-webhook-secret

# Server Port
PORT=3000
```

### Cloudflare Tunnel Configuration
Create a `config.yml` file for your tunnel:

```yaml
tunnel: shiprocket-webhook
credentials-file: /path/to/credentials.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
```

## 🐛 Troubleshooting

### Common Issues

1. **Tunnel Not Working**
   - Check if Cloudflare tunnel is running
   - Verify domain configuration
   - Check firewall settings

2. **Webhook Not Receiving**
   - Verify webhook URL in Shiprocket dashboard
   - Check webhook secret configuration
   - Review server logs

3. **Signature Verification Failed**
   - Ensure webhook secret matches
   - Check HMAC-SHA256 header
   - Verify payload format

### Debug Commands

```bash
# Check if server is running
curl http://localhost:3000/api/webhooks/health

# Test webhook endpoint directly
curl -X POST http://localhost:3000/api/webhooks/shiprocket \
  -H "Content-Type: application/json" \
  -H "x-shiprocket-hmac-sha256: test-signature" \
  -d '{"test": true}'

# Check tunnel status
cloudflared tunnel list
```

## 📊 Monitoring

### Logs
Check your server logs for webhook activity:

```bash
# Backend logs
tail -f backend/logs/combined.log

# Or check console output
npm start
```

### Test Results
View test results in the admin panel or check the API response:

```bash
curl http://localhost:3000/api/admin/shiprocket/webhooks/test-status
```

## 🔐 Security

### Webhook Signature Verification
The webhook endpoints verify HMAC-SHA256 signatures:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('base64');
  return digest === signature;
}
```

### Rate Limiting
Consider implementing rate limiting for webhook endpoints:

```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/webhooks', webhookLimiter);
```

## 📚 Additional Resources

- [Shiprocket Webhook Documentation](https://docs.shiprocket.in/webhook)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Express.js Webhook Handling](https://expressjs.com/en/guide/writing-middleware.html)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for errors
3. Test with the provided test script
4. Verify Cloudflare tunnel configuration
5. Check Shiprocket webhook configuration

For additional help, refer to the project documentation or create an issue in the repository.
