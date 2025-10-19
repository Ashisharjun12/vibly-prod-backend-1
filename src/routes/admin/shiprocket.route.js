import {Router} from 'express';
import { shiprocketMiddleware } from '../../middleware/shiprocketMiddleware.js';
import { 
    loginToShiprocket, 
    tokenLogoutFromShiprocket,
    getWebhookConfig,
    testWebhook,
    testWebhookLocal,
    getWebhookTestStatus,
    simulateWebhook,
    getTunnelWebhookUrls,
    getOrderTracking,
    getOrdersByStatus,
    updateOrderStatus
} from '../../controllers/shiprocket.controller.js';

const router = Router();

// Authentication routes
router.post('/generate-token', loginToShiprocket);
router.post('/token-logout', shiprocketMiddleware, tokenLogoutFromShiprocket);

// Webhook management routes
router.get('/webhooks/config', getWebhookConfig);
router.post('/webhooks/test', testWebhook);
router.post('/webhooks/test-local', testWebhookLocal);
router.get('/webhooks/test-status', getWebhookTestStatus);
router.post('/webhooks/simulate', simulateWebhook);
router.get('/webhooks/tunnel-urls', getTunnelWebhookUrls);

// Order tracking and status management routes
router.get('/orders/:orderId/tracking', getOrderTracking);
router.get('/orders/status/:status', getOrdersByStatus);
router.post('/orders/:orderId/status', updateOrderStatus);

export default router;