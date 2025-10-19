import express from 'express';
import {
  handleShiprocketWebhook,
  handleShiprocketReturnWebhook,
  handleShiprocketTrackingWebhook,
  testShiprocketWebhook
} from '../controllers/shiprocketWebhook.controller.js';

const router = express.Router();

// Middleware to parse JSON for webhooks
router.use(express.json({ limit: '10mb' }));

/**
 * Shiprocket Webhook Routes
 * These endpoints receive webhook notifications from Shiprocket
 */

// Main webhook handler for order status updates
router.post('/shiprocket', handleShiprocketWebhook);

// Return/refund webhook handler
router.post('/shiprocket/return', handleShiprocketReturnWebhook);

// Tracking updates webhook handler
router.post('/shiprocket/tracking', handleShiprocketTrackingWebhook);

// Test webhook endpoint for development
router.post('/shiprocket/test', testShiprocketWebhook);

// Health check for webhook endpoints
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Webhook endpoints are healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/webhooks/shiprocket',
      'POST /api/webhooks/shiprocket/return',
      'POST /api/webhooks/shiprocket/tracking',
      'POST /api/webhooks/shiprocket/test'
    ]
  });
});

export default router;
