import { NewOrder as Order, OrderStatus } from '../models/newOrder.model.js';
import { createStatusHistoryEntry } from './orderUtils.js';

/**
 * Shiprocket Status Tracking Service
 * Handles status updates and tracking information from Shiprocket
 */

// Shiprocket status mapping to internal order statuses
export const SHIPROCKET_STATUS_MAP = {
  'NEW': {
    status: OrderStatus.ORDERED.value,
    note: 'Order received by Shiprocket',
    updateFields: {}
  },
  'PROCESSING': {
    status: OrderStatus.ORDERED.value,
    note: 'Order is being processed',
    updateFields: {}
  },
  'READY_TO_SHIP': {
    status: OrderStatus.ORDERED.value,
    note: 'Order is ready for shipment',
    updateFields: {}
  },
  'SHIPPED': {
    status: OrderStatus.SHIPPED.value,
    note: 'Order shipped',
    updateFields: {
      shippedAt: new Date()
    }
  },
  'DELIVERED': {
    status: OrderStatus.DELIVERED.value,
    note: 'Order delivered successfully',
    updateFields: {
      deliveredAt: new Date()
    }
  },
  'CANCELLED': {
    status: OrderStatus.CANCELLED.value,
    note: 'Order cancelled',
    updateFields: {
      cancelledAt: new Date()
    }
  },
  'RTO': {
    status: OrderStatus.RETURNED.value,
    note: 'Order returned to origin',
    updateFields: {
      returnedAt: new Date()
    }
  },
  'RTO_DELIVERED': {
    status: OrderStatus.RETURNED.value,
    note: 'Return order delivered',
    updateFields: {
      returnedAt: new Date()
    }
  },
  'RTO_CANCELLED': {
    status: OrderStatus.RETURN_CANCELLED.value,
    note: 'Return order cancelled',
    updateFields: {}
  },
  'LOST': {
    status: OrderStatus.CANCELLED.value,
    note: 'Order lost in transit',
    updateFields: {
      cancelledAt: new Date()
    }
  },
  'DAMAGED': {
    status: OrderStatus.RETURNED.value,
    note: 'Order damaged in transit',
    updateFields: {
      returnedAt: new Date()
    }
  },
  'RETURNED': {
    status: OrderStatus.RETURNED.value,
    note: 'Order returned',
    updateFields: {
      returnedAt: new Date()
    }
  },
  'REFUNDED': {
    status: OrderStatus.REFUNDED.value,
    note: 'Order refunded',
    updateFields: {
      refundProcessedAt: new Date()
    }
  }
};

/**
 * Update order status based on Shiprocket webhook data
 * @param {string} orderId - Shiprocket order ID
 * @param {string} status - Shiprocket status
 * @param {Object} trackingData - Additional tracking data
 * @param {Object} options - Additional options
 */
export const updateOrderStatus = async (orderId, status, trackingData = {}, options = {}) => {
  try {
    const statusConfig = SHIPROCKET_STATUS_MAP[status];
    if (!statusConfig) {
      throw new Error(`Unknown Shiprocket status: ${status}`);
    }

    const order = await Order.findOne({
      'items.shiprocket.orderId': orderId
    });

    if (!order) {
      throw new Error(`Order not found for Shiprocket order ID: ${orderId}`);
    }

    // Find items with this Shiprocket order ID
    const itemsToUpdate = order.items.filter(
      item => item.shiprocket?.orderId === orderId
    );

    if (itemsToUpdate.length === 0) {
      throw new Error(`No items found for Shiprocket order ID: ${orderId}`);
    }

    // Update each item
    for (const item of itemsToUpdate) {
      const itemIndex = order.items.findIndex(
        orderItem => orderItem._id.toString() === item._id.toString()
      );

      if (itemIndex !== -1) {
        const orderItem = order.items[itemIndex];
        
        // Check if status transition is valid
        if (orderItem.orderStatus !== statusConfig.status) {
          // Update order status
          orderItem.orderStatus = statusConfig.status;
          
          // Add status history entry
          const note = trackingData.courier_name 
            ? `${statusConfig.note} via ${trackingData.courier_name}`
            : statusConfig.note;
            
          orderItem.statusHistory.push(
            createStatusHistoryEntry(statusConfig.status, note)
          );
          
          // Update specific fields based on status
          Object.assign(orderItem, statusConfig.updateFields);
        }
        
        // Update Shiprocket tracking data
        if (!orderItem.shiprocket) {
          orderItem.shiprocket = {};
        }
        
        orderItem.shiprocket = {
          ...orderItem.shiprocket,
          orderId: orderId,
          shipmentId: trackingData.shipment_id || orderItem.shiprocket.shipmentId,
          trackingNumber: trackingData.tracking_number || orderItem.shiprocket.trackingNumber,
          courierName: trackingData.courier_name || orderItem.shiprocket.courierName,
          awbCode: trackingData.awb_code || orderItem.shiprocket.awbCode,
          lastUpdated: new Date(),
          status: status,
          reason: trackingData.reason || orderItem.shiprocket.reason,
          trackingData: trackingData || orderItem.shiprocket.trackingData,
        };
      }
    }

    await order.save();
    console.log(`Updated order ${order.orderId} with status ${statusConfig.status} for Shiprocket order ${orderId}`);
    
    return {
      success: true,
      orderId: order.orderId,
      updatedItems: itemsToUpdate.length,
      newStatus: statusConfig.status
    };
    
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

/**
 * Update return status based on Shiprocket return webhook data
 * @param {string} returnOrderId - Shiprocket return order ID
 * @param {string} originalOrderId - Original Shiprocket order ID
 * @param {string} status - Shiprocket return status
 * @param {Object} trackingData - Additional tracking data
 */
export const updateReturnStatus = async (returnOrderId, originalOrderId, status, trackingData = {}) => {
  try {
    const statusConfig = SHIPROCKET_STATUS_MAP[status];
    if (!statusConfig) {
      throw new Error(`Unknown Shiprocket return status: ${status}`);
    }

    const order = await Order.findOne({
      'items.shiprocket.orderId': originalOrderId
    });

    if (!order) {
      throw new Error(`Order not found for original order ID: ${originalOrderId}`);
    }

    // Find items with this Shiprocket order ID
    const itemsToUpdate = order.items.filter(
      item => item.shiprocket?.orderId === originalOrderId
    );

    if (itemsToUpdate.length === 0) {
      throw new Error(`No items found for original order ID: ${originalOrderId}`);
    }

    // Update each item
    for (const item of itemsToUpdate) {
      const itemIndex = order.items.findIndex(
        orderItem => orderItem._id.toString() === item._id.toString()
      );

      if (itemIndex !== -1) {
        const orderItem = order.items[itemIndex];
        
        // Update order status
        orderItem.orderStatus = statusConfig.status;
        
        // Add status history entry
        const note = `Return ${statusConfig.note}`;
        orderItem.statusHistory.push(
          createStatusHistoryEntry(statusConfig.status, note)
        );
        
        // Update specific fields based on status
        Object.assign(orderItem, statusConfig.updateFields);
        
        // Update Shiprocket return data
        if (!orderItem.shiprocket) {
          orderItem.shiprocket = {};
        }
        
        orderItem.shiprocket = {
          ...orderItem.shiprocket,
          returnOrderId: returnOrderId,
          returnTrackingNumber: trackingData.tracking_number || orderItem.shiprocket.returnTrackingNumber,
          returnCourierName: trackingData.courier_name || orderItem.shiprocket.returnCourierName,
          returnAwbCode: trackingData.awb_code || orderItem.shiprocket.returnAwbCode,
          returnLastUpdated: new Date(),
          returnStatus: status,
          returnReason: trackingData.reason || orderItem.shiprocket.returnReason,
        };
      }
    }

    await order.save();
    console.log(`Updated return for order ${order.orderId} with status ${statusConfig.status} for return order ${returnOrderId}`);
    
    return {
      success: true,
      orderId: order.orderId,
      updatedItems: itemsToUpdate.length,
      newStatus: statusConfig.status
    };
    
  } catch (error) {
    console.error('Error updating return status:', error);
    throw error;
  }
};

/**
 * Get order tracking information
 * @param {string} orderId - Internal order ID
 */
export const getOrderTrackingInfo = async (orderId) => {
  try {
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Find items with Shiprocket data
    const itemsWithTracking = order.items.filter(item => item.shiprocket);
    
    if (itemsWithTracking.length === 0) {
      return {
        hasTracking: false,
        message: 'No tracking information available'
      };
    }

    // Get tracking info from first item with Shiprocket data
    const firstItem = itemsWithTracking[0];
    const shiprocketData = firstItem.shiprocket;

    return {
      hasTracking: true,
      orderId: order.orderId,
      shiprocketOrderId: shiprocketData.orderId,
      shipmentId: shiprocketData.shipmentId,
      trackingNumber: shiprocketData.trackingNumber,
      courierName: shiprocketData.courierName,
      status: shiprocketData.status,
      lastUpdated: shiprocketData.lastUpdated,
      trackingData: shiprocketData.trackingData,
      items: itemsWithTracking.map(item => ({
        itemId: item._id,
        productName: item.product.name,
        quantity: item.quantity,
        status: item.orderStatus,
        shiprocket: item.shiprocket
      }))
    };
    
  } catch (error) {
    console.error('Error getting order tracking info:', error);
    throw error;
  }
};

/**
 * Get all orders with specific Shiprocket status
 * @param {string} status - Shiprocket status to filter by
 */
export const getOrdersByShiprocketStatus = async (status) => {
  try {
    const orders = await Order.find({
      'items.shiprocket.status': status
    });

    return orders.map(order => ({
      orderId: order.orderId,
      items: order.items.filter(item => 
        item.shiprocket?.status === status
      ).map(item => ({
        itemId: item._id,
        productName: item.product.name,
        quantity: item.quantity,
        status: item.orderStatus,
        shiprocket: item.shiprocket
      }))
    }));
    
  } catch (error) {
    console.error('Error getting orders by Shiprocket status:', error);
    throw error;
  }
};
