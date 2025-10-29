import express from 'express';
import {
  handleShiprocketWebhook,
  handleShiprocketReturnWebhook,
  handleShiprocketTrackingWebhook,
  testShiprocketWebhook
} from '../controllers/shiprocketWebhook.controller.js';

const router = express.Router();

router.use(express.json({ limit: '10mb' }));

router.post('/shiprocket', handleShiprocketWebhook);

router.post('/shiprocket/return', handleShiprocketReturnWebhook);

router.post('/shiprocket/tracking', handleShiprocketTrackingWebhook);

router.post('/shiprocket/test', testShiprocketWebhook);

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

// Lightweight GET responders for Shiprocket console URL checks
router.get('/shiprocket', (req, res) => {
  res.status(200).json({ success: true, message: 'Shiprocket webhook URL active' });
});
router.get('/shiprocket/return', (req, res) => {
  res.status(200).json({ success: true, message: 'Shiprocket return webhook URL active' });
});
router.get('/shiprocket/tracking', (req, res) => {
  res.status(200).json({ success: true, message: 'Shiprocket tracking webhook URL active' });
});

export default router;
