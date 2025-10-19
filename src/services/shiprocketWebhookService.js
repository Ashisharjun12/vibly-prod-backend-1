import { createAdhocOrder, assignAWB, generatePickup } from './shiprocket.js';

/**
 * Shiprocket Webhook Configuration Service
 * Handles webhook setup and management
 */

// Webhook event types supported by Shiprocket
export const WEBHOOK_EVENTS = {
  ORDER_STATUS_UPDATE: 'order_status_update',
  TRACKING_UPDATE: 'tracking_update',
  RETURN_STATUS_UPDATE: 'return_status_update',
  REFUND_UPDATE: 'refund_update',
  PICKUP_UPDATE: 'pickup_update',
  DELIVERY_UPDATE: 'delivery_update'
};

// Webhook configuration for different environments
export const WEBHOOK_CONFIG = {
  development: {
    baseUrl: process.env.DEV_WEBHOOK_URL || 'http://localhost:3000',
    endpoints: {
      orderStatus: '/api/webhooks/shiprocket',
      returnStatus: '/api/webhooks/shiprocket/return',
      tracking: '/api/webhooks/shiprocket/tracking',
      test: '/api/webhooks/shiprocket/test'
    }
  },
  production: {
    baseUrl: process.env.PROD_WEBHOOK_URL || 'https://yourdomain.com',
    endpoints: {
      orderStatus: '/api/webhooks/shiprocket',
      returnStatus: '/api/webhooks/shiprocket/return',
      tracking: '/api/webhooks/shiprocket/tracking',
      test: '/api/webhooks/shiprocket/test'
    }
  }
};

/**
 * Get webhook configuration for current environment
 */
export const getWebhookConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return WEBHOOK_CONFIG[env];
};

/**
 * Generate webhook URLs for Shiprocket configuration
 */
export const generateWebhookUrls = () => {
  const config = getWebhookConfig();
  return {
    orderStatus: `${config.baseUrl}${config.endpoints.orderStatus}`,
    returnStatus: `${config.baseUrl}${config.endpoints.returnStatus}`,
    tracking: `${config.baseUrl}${config.endpoints.tracking}`,
    test: `${config.baseUrl}${config.endpoints.test}`
  };
};

/**
 * Validate webhook payload structure
 * @param {Object} payload - Webhook payload
 * @param {string} eventType - Type of webhook event
 */
export const validateWebhookPayload = (payload, eventType) => {
  const requiredFields = {
    [WEBHOOK_EVENTS.ORDER_STATUS_UPDATE]: ['order_id', 'status'],
    [WEBHOOK_EVENTS.TRACKING_UPDATE]: ['order_id', 'shipment_id'],
    [WEBHOOK_EVENTS.RETURN_STATUS_UPDATE]: ['return_order_id', 'original_order_id', 'status'],
    [WEBHOOK_EVENTS.REFUND_UPDATE]: ['order_id', 'refund_amount'],
    [WEBHOOK_EVENTS.PICKUP_UPDATE]: ['order_id', 'pickup_status'],
    [WEBHOOK_EVENTS.DELIVERY_UPDATE]: ['order_id', 'delivery_status']
  };

  const fields = requiredFields[eventType] || [];
  
  for (const field of fields) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return true;
};

/**
 * Process webhook event based on type
 * @param {Object} payload - Webhook payload
 * @param {string} eventType - Type of webhook event
 */
export const processWebhookEvent = async (payload, eventType) => {
  try {
    // Validate payload
    validateWebhookPayload(payload, eventType);

    switch (eventType) {
      case WEBHOOK_EVENTS.ORDER_STATUS_UPDATE:
        return await processOrderStatusUpdate(payload);
      
      case WEBHOOK_EVENTS.TRACKING_UPDATE:
        return await processTrackingUpdate(payload);
      
      case WEBHOOK_EVENTS.RETURN_STATUS_UPDATE:
        return await processReturnStatusUpdate(payload);
      
      case WEBHOOK_EVENTS.REFUND_UPDATE:
        return await processRefundUpdate(payload);
      
      case WEBHOOK_EVENTS.PICKUP_UPDATE:
        return await processPickupUpdate(payload);
      
      case WEBHOOK_EVENTS.DELIVERY_UPDATE:
        return await processDeliveryUpdate(payload);
      
      default:
        throw new Error(`Unknown webhook event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event ${eventType}:`, error);
    throw error;
  }
};

/**
 * Process order status update webhook
 */
const processOrderStatusUpdate = async (payload) => {
  const { order_id, status, tracking_data = {} } = payload;
  
  console.log(`Processing order status update: ${order_id} -> ${status}`);
  
  // Import here to avoid circular dependency
  const { updateOrderStatus } = await import('./shiprocketStatusService.js');
  
  return await updateOrderStatus(order_id, status, tracking_data);
};

/**
 * Process tracking update webhook
 */
const processTrackingUpdate = async (payload) => {
  const { order_id, shipment_id, tracking_number, courier_name } = payload;
  
  console.log(`Processing tracking update: ${order_id} -> ${tracking_number}`);
  
  // Import here to avoid circular dependency
  const { updateOrderStatus } = await import('./shiprocketStatusService.js');
  
  return await updateOrderStatus(order_id, 'SHIPPED', {
    shipment_id,
    tracking_number,
    courier_name
  });
};

/**
 * Process return status update webhook
 */
const processReturnStatusUpdate = async (payload) => {
  const { return_order_id, original_order_id, status, tracking_data = {} } = payload;
  
  console.log(`Processing return status update: ${return_order_id} -> ${status}`);
  
  // Import here to avoid circular dependency
  const { updateReturnStatus } = await import('./shiprocketStatusService.js');
  
  return await updateReturnStatus(return_order_id, original_order_id, status, tracking_data);
};

/**
 * Process refund update webhook
 */
const processRefundUpdate = async (payload) => {
  const { order_id, refund_amount, refund_status } = payload;
  
  console.log(`Processing refund update: ${order_id} -> ${refund_amount}`);
  
  // Import here to avoid circular dependency
  const { updateOrderStatus } = await import('./shiprocketStatusService.js');
  
  return await updateOrderStatus(order_id, 'REFUNDED', {
    refund_amount,
    refund_status
  });
};

/**
 * Process pickup update webhook
 */
const processPickupUpdate = async (payload) => {
  const { order_id, pickup_status, pickup_time } = payload;
  
  console.log(`Processing pickup update: ${order_id} -> ${pickup_status}`);
  
  // Import here to avoid circular dependency
  const { updateOrderStatus } = await import('./shiprocketStatusService.js');
  
  return await updateOrderStatus(order_id, 'READY_TO_SHIP', {
    pickup_status,
    pickup_time
  });
};

/**
 * Process delivery update webhook
 */
const processDeliveryUpdate = async (payload) => {
  const { order_id, delivery_status, delivery_time, delivery_proof } = payload;
  
  console.log(`Processing delivery update: ${order_id} -> ${delivery_status}`);
  
  // Import here to avoid circular dependency
  const { updateOrderStatus } = await import('./shiprocketStatusService.js');
  
  return await updateOrderStatus(order_id, 'DELIVERED', {
    delivery_status,
    delivery_time,
    delivery_proof
  });
};

/**
 * Get webhook setup instructions for Shiprocket dashboard
 */
export const getWebhookSetupInstructions = () => {
  const urls = generateWebhookUrls();
  
  return {
    instructions: [
      '1. Log in to your Shiprocket dashboard',
      '2. Navigate to Settings > API > Webhook',
      '3. Add the following webhook URLs:',
      `   - Order Status Updates: ${urls.orderStatus}`,
      `   - Return Status Updates: ${urls.returnStatus}`,
      `   - Tracking Updates: ${urls.tracking}`,
      '4. Select the events you want to track:',
      '   - Order Status Changes',
      '   - Tracking Updates',
      '   - Return Status Changes',
      '   - Delivery Updates',
      '5. Set the webhook secret in your environment variables:',
      '   SHIPROCKET_WEBHOOK_SECRET=your_secret_here',
      '6. Test the webhook using the test endpoint:',
      `   POST ${urls.test}`
    ],
    urls,
    events: Object.values(WEBHOOK_EVENTS),
    environment: process.env.NODE_ENV || 'development'
  };
};
