import crypto from 'crypto';
import { NewOrder as Order, OrderStatus } from '../models/newOrder.model.js';
import { withTransaction } from '../utils/withTransaction.js';
import { createStatusHistoryEntry } from '../services/orderUtils.js';


const normalizeShiprocketPayload = (raw) => {
  // Some payloads use current_status / shipment_status; prefer the most specific
  const status =
    raw.status || raw.current_status || raw.shipment_status || raw.current_status_id || raw.shipment_status_id;

  // Order identifiers can appear under different keys
  const order_id = raw.order_id || raw.external_order_id || raw.channel_order_id || raw.id || raw.orderid || null;

  // Shipment/Tracking identifiers
  const shipment_id = raw.shipment_id || raw.shipmentid || null;
  const tracking_number = raw.tracking_number || raw.tracking_id || raw.awb || raw.awb_code || String(raw.awb || '') || null;
  const awb_code = raw.awb_code || raw.awb || null;
  const courier_name = raw.courier_name || raw.courier || null;

  // Timestamps
  const updated_at = raw.updated_at || raw.current_timestamp || raw.etd || new Date().toISOString();

  // Build tracking_data from scans if provided
  const tracking_data = raw.tracking_data || (Array.isArray(raw.scans)
    ? {
        shipment_track_activities: raw.scans.map((s) => ({
          date: s.date,
          activity: s.activity,
          location: s.location
        })),
        track_url: raw.tracking_url || null,
        shipment_track: [
          {
            current_status: status || null
          }
        ]
      }
    : undefined);

  const reason = raw.reason || raw.remark || raw.comment || undefined;

  return {
    order_id,
    shipment_id,
    status,
    tracking_data,
    courier_name,
    awb_code,
    tracking_number,
    updated_at,
    reason
  };
};

// Shiprocket webhook signature verification
const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
};

// Map Shiprocket status to internal order status
const mapShiprocketStatus = (shiprocketStatus) => {
  const statusMap = {
    'NEW': OrderStatus.ORDERED.value,
    'PROCESSING': OrderStatus.ORDERED.value,
    'READY_TO_SHIP': OrderStatus.ORDERED.value,
    'SHIPPED': OrderStatus.SHIPPED.value,
    'DELIVERED': OrderStatus.DELIVERED.value,
    'CANCELLED': OrderStatus.CANCELLED.value,
    'RTO': OrderStatus.RETURNED.value,
    'RTO_DELIVERED': OrderStatus.RETURNED.value,
    'RTO_CANCELLED': OrderStatus.RETURN_CANCELLED.value,
    'LOST': OrderStatus.CANCELLED.value,
    'DAMAGED': OrderStatus.RETURNED.value,
    'RETURNED': OrderStatus.RETURNED.value,
    'REFUNDED': OrderStatus.REFUNDED.value,
  };
  
  return statusMap[shiprocketStatus] || OrderStatus.ORDERED.value;
};

// Get status note for history
const getStatusNote = (shiprocketStatus, trackingData = {}) => {
  const notes = {
    'NEW': 'Order received by Shiprocket',
    'PROCESSING': 'Order is being processed',
    'READY_TO_SHIP': 'Order is ready for shipment',
    'SHIPPED': `Order shipped via ${trackingData.courier_name || 'courier'}`,
    'DELIVERED': 'Order delivered successfully',
    'CANCELLED': 'Order cancelled',
    'RTO': 'Order returned to origin',
    'RTO_DELIVERED': 'Return order delivered',
    'RTO_CANCELLED': 'Return order cancelled',
    'LOST': 'Order lost in transit',
    'DAMAGED': 'Order damaged in transit',
    'RETURNED': 'Order returned',
    'REFUNDED': 'Order refunded',
  };
  
  return notes[shiprocketStatus] || 'Status updated';
};

/**
 * Main webhook handler for Shiprocket events
 * POST /api/webhooks/shiprocket
 */
export const handleShiprocketWebhook = async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-api-key'];
    const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    
    // Verify webhook signature if secret is provided
    if (webhookSecret !== signature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }
    
    const webhookData = normalizeShiprocketPayload(req.body);
    console.log('Shiprocket webhook received:', JSON.stringify(webhookData, null, 2));
    
    // Extract order information from webhook
    const {
      order_id,
      shipment_id,
      status,
      tracking_data = {},
      courier_name,
      awb_code,
      tracking_number,
      rto_awb,
      rto_courier_name,
      rto_tracking_number,
      updated_at,
      reason
    } = webhookData;
    
    if (!order_id || !status) {
      console.error('Missing required webhook data:', { order_id, status });
      return res.status(400).json({ success: false, message: 'Missing required data' });
    }
    
    // Find the order by Shiprocket order ID
    const order = await Order.findOne({
      'items.shiprocket.orderId': order_id
    });
    
    if (!order) {
      console.error('Order not found for Shiprocket order ID:', order_id);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Update order items with new status
    await withTransaction(async (session) => {
      const newStatus = mapShiprocketStatus(status);
      const statusNote = getStatusNote(status, tracking_data);
      
      // Find items with this Shiprocket order ID
      const itemsToUpdate = order.items.filter(
        item => item.shiprocket?.orderId === order_id
      );
      
      if (itemsToUpdate.length === 0) {
        console.error('No items found with Shiprocket order ID:', order_id);
        throw new Error('No items found for this Shiprocket order');
      }
      
      // Update each item
      for (const item of itemsToUpdate) {
        const itemIndex = order.items.findIndex(
          orderItem => orderItem._id.toString() === item._id.toString()
        );
        
        if (itemIndex !== -1) {
          const orderItem = order.items[itemIndex];
          
          // Check if status transition is valid
          if (orderItem.orderStatus !== newStatus) {
            // Update order status
            orderItem.orderStatus = newStatus;
            
            // Add status history entry
            orderItem.statusHistory.push(
              createStatusHistoryEntry(newStatus, statusNote)
            );
            
            // Update specific timestamps based on status
            if (newStatus === OrderStatus.SHIPPED.value) {
              orderItem.shippedAt = new Date();
            } else if (newStatus === OrderStatus.DELIVERED.value) {
              orderItem.deliveredAt = new Date();
            } else if (newStatus === OrderStatus.RETURNED.value) {
              orderItem.returnedAt = new Date();
            }
          }
          
          // Update Shiprocket tracking data
          if (!orderItem.shiprocket) {
            orderItem.shiprocket = {};
          }
          
          orderItem.shiprocket = {
            ...orderItem.shiprocket,
            orderId: order_id,
            shipmentId: shipment_id,
            trackingNumber: tracking_number || orderItem.shiprocket.trackingNumber,
            courierName: courier_name || orderItem.shiprocket.courierName,
            awbCode: awb_code || orderItem.shiprocket.awbCode,
            lastUpdated: new Date(updated_at || new Date()),
            status: status,
            reason: reason || orderItem.shiprocket.reason,
            // RTO data
            ...(rto_awb && { rtoAwb: rto_awb }),
            ...(rto_courier_name && { rtoCourierName: rto_courier_name }),
            ...(rto_tracking_number && { rtoTrackingNumber: rto_tracking_number }),
          };
        }
      }
      
      await order.save({ session });
      console.log(`Updated order ${order.orderId} with status ${newStatus} for Shiprocket order ${order_id}`);
    });
    
    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    
  } catch (error) {
    console.error('Shiprocket webhook processing error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Webhook processing failed',
      error: error.message 
    });
  }
};

/**
 * Handle return/refund webhook events
 * POST /api/webhooks/shiprocket/return
 */
export const handleShiprocketReturnWebhook = async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-shiprocket-hmac-sha256'] || req.headers['x-shiphero-hmac-sha256'];
    const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    
    // Verify webhook signature if secret is provided
    if (webhookSecret && signature) {
      if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
        console.error('Invalid return webhook signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
    }
    
    const webhookData = normalizeShiprocketPayload(req.body);
    console.log('Shiprocket return webhook received:', JSON.stringify(webhookData, null, 2));
    
    const {
      return_order_id,
      original_order_id,
      status,
      tracking_data = {},
      courier_name,
      awb_code,
      tracking_number,
      updated_at,
      reason,
      refund_amount
    } = webhookData;
    
    if (!return_order_id || !status) {
      console.error('Missing required return webhook data:', { return_order_id, status });
      return res.status(400).json({ success: false, message: 'Missing required data' });
    }
    
    // Find the order by original order ID
    const order = await Order.findOne({
      'items.shiprocket.orderId': original_order_id
    });
    
    if (!order) {
      console.error('Order not found for original order ID:', original_order_id);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Update order items with return status
    await withTransaction(async (session) => {
      const newStatus = mapShiprocketStatus(status);
      const statusNote = `Return ${getStatusNote(status, tracking_data)}`;
      
      // Find items with this Shiprocket order ID
      const itemsToUpdate = order.items.filter(
        item => item.shiprocket?.orderId === original_order_id
      );
      
      if (itemsToUpdate.length === 0) {
        console.error('No items found with original order ID:', original_order_id);
        throw new Error('No items found for this order');
      }
      
      // Update each item
      for (const item of itemsToUpdate) {
        const itemIndex = order.items.findIndex(
          orderItem => orderItem._id.toString() === item._id.toString()
        );
        
        if (itemIndex !== -1) {
          const orderItem = order.items[itemIndex];
          
          // Update order status
          orderItem.orderStatus = newStatus;
          
          // Add status history entry
          orderItem.statusHistory.push(
            createStatusHistoryEntry(newStatus, statusNote)
          );
          
          // Update specific timestamps
          if (newStatus === OrderStatus.RETURNED.value) {
            orderItem.returnedAt = new Date();
          } else if (newStatus === OrderStatus.REFUNDED.value) {
            orderItem.refundProcessedAt = new Date();
            if (refund_amount) {
              orderItem.refundAmount = refund_amount;
            }
          }
          
          // Update Shiprocket return data
          if (!orderItem.shiprocket) {
            orderItem.shiprocket = {};
          }
          
          orderItem.shiprocket = {
            ...orderItem.shiprocket,
            returnOrderId: return_order_id,
            returnTrackingNumber: tracking_number || orderItem.shiprocket.returnTrackingNumber,
            returnCourierName: courier_name || orderItem.shiprocket.returnCourierName,
            returnAwbCode: awb_code || orderItem.shiprocket.returnAwbCode,
            returnLastUpdated: new Date(updated_at || new Date()),
            returnStatus: status,
            returnReason: reason || orderItem.shiprocket.returnReason,
          };
        }
      }
      
      await order.save({ session });
      console.log(`Updated return for order ${order.orderId} with status ${newStatus} for return order ${return_order_id}`);
    });
    
    return res.status(200).json({ success: true, message: 'Return webhook processed successfully' });
    
  } catch (error) {
    console.error('Shiprocket return webhook processing error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Return webhook processing failed',
      error: error.message 
    });
  }
};

/**

 * POST /api/webhooks/shiprocket/tracking
......
 */
export const handleShiprocketTrackingWebhook = async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-shiprocket-hmac-sha256'] || req.headers['x-shiphero-hmac-sha256'];
    const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    
    // Verify webhook signature if secret is provided
    if (webhookSecret && signature) {
      if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
        console.error('Invalid tracking webhook signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
    }
    
    const webhookData = normalizeShiprocketPayload(req.body);
    console.log('Shiprocket tracking webhook received:', JSON.stringify(webhookData, null, 2));
    
    const {
      order_id,
      shipment_id,
      tracking_number,
      courier_name,
      status,
      tracking_data = {},
      updated_at
    } = webhookData;
    
    if (!order_id || !shipment_id) {
      console.error('Missing required tracking data:', { order_id, shipment_id });
      return res.status(400).json({ success: false, message: 'Missing required data' });
    }
    
    // Find the order by Shiprocket order ID
    const order = await Order.findOne({
      'items.shiprocket.orderId': order_id
    });
    
    if (!order) {
      console.error('Order not found for tracking update:', order_id);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Update tracking information
    await withTransaction(async (session) => {
      // Find items with this Shiprocket order ID
      const itemsToUpdate = order.items.filter(
        item => item.shiprocket?.orderId === order_id
      );
      
      if (itemsToUpdate.length === 0) {
        console.error('No items found for tracking update:', order_id);
        throw new Error('No items found for this order');
      }
      
      // Update tracking data for each item
      for (const item of itemsToUpdate) {
        const itemIndex = order.items.findIndex(
          orderItem => orderItem._id.toString() === item._id.toString()
        );
        
        if (itemIndex !== -1) {
          const orderItem = order.items[itemIndex];
          
          // Update Shiprocket tracking data
          if (!orderItem.shiprocket) {
            orderItem.shiprocket = {};
          }
          
          orderItem.shiprocket = {
            ...orderItem.shiprocket,
            orderId: order_id,
            shipmentId: shipment_id,
            trackingNumber: tracking_number || orderItem.shiprocket.trackingNumber,
            courierName: courier_name || orderItem.shiprocket.courierName,
            lastUpdated: new Date(updated_at || new Date()),
            status: status || orderItem.shiprocket.status,
            trackingData: tracking_data || orderItem.shiprocket.trackingData,
          };
        }
      }
      
      await order.save({ session });
      console.log(`Updated tracking for order ${order.orderId} with Shiprocket order ${order_id}`);
    });
    
    return res.status(200).json({ success: true, message: 'Tracking webhook processed successfully' });
    
  } catch (error) {
    console.error('Shiprocket tracking webhook processing error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Tracking webhook processing failed',
      error: error.message 
    });
  }
};

/**
 * Test webhook endpoint for development
 * POST /api/webhooks/shiprocket/test
 */
export const testShiprocketWebhook = async (req, res) => {
  try {
    console.log('Test webhook received:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', req.headers);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Test webhook received successfully',
      receivedAt: new Date().toISOString(),
      data: req.body
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Test webhook failed',
      error: error.message 
    });
  }
};
