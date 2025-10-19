#!/usr/bin/env node

/**
 * Shiprocket Webhook Test Script
 * 
 * This script helps you test your Shiprocket webhook endpoints locally
 * Run with: node test-webhook.js
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test configurations
const testConfigs = {
  orderStatus: {
    url: `${API_URL}/webhooks/shiprocket`,
    payload: {
      event_name: 'ORDER_STATUS_UPDATE',
      order_id: 'TEST_ORDER_123',
      external_order_id: 'ORD-TEST-123',
      current_status: 'SHIPPED',
      tracking_id: 'TEST_TRACK_123',
      courier_name: 'Test Courier',
      shipment_id: 'TEST_SHIPMENT_123',
      timestamp: new Date().toISOString(),
      customer_name: 'Test Customer',
      customer_phone: '+919876543210',
      customer_email: 'test@example.com',
      shipping_address: {
        name: 'Test Customer',
        phone: '+919876543210',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        country: 'India'
      }
    }
  },
  returnStatus: {
    url: `${API_URL}/webhooks/shiprocket/return`,
    payload: {
      event_name: 'RETURN_STATUS_UPDATE',
      return_order_id: 'TEST_RETURN_123',
      external_order_id: 'ORD-TEST-123',
      current_status: 'RETURN_DELIVERED',
      tracking_id: 'TEST_RETURN_TRACK_123',
      courier_name: 'Test Courier',
      timestamp: new Date().toISOString(),
      return_reason: 'Product not as described',
      return_amount: 999.00
    }
  }
};

// Test different order statuses
const orderStatuses = [
  'NEW', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 
  'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 
  'CANCELLED', 'RTO_INITIATED', 'RTO_DELIVERED', 
  'LOST', 'DAMAGED'
];

// Test different return statuses
const returnStatuses = [
  'RETURN_REQUESTED', 'RETURN_PICKUP_GENERATED', 
  'RETURN_IN_TRANSIT', 'RETURN_DELIVERED', 
  'RETURN_CANCELLED', 'REFUND_PROCESSED'
];

async function testWebhook(config, testName) {
  console.log(`\n🧪 Testing ${testName}...`);
  console.log(`📡 URL: ${config.url}`);
  
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shiprocket-hmac-sha256': 'test-signature-for-local-development'
      },
      body: JSON.stringify(config.payload)
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    
    if (response.ok) {
      console.log(`✅ Success! Status: ${response.status}`);
      console.log(`📄 Response:`, JSON.stringify(responseData, null, 2));
    } else {
      console.log(`❌ Failed! Status: ${response.status}`);
      console.log(`📄 Response:`, JSON.stringify(responseData, null, 2));
    }
    
    return { success: response.ok, status: response.status, data: responseData };
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAllOrderStatuses() {
  console.log('\n🚀 Testing All Order Statuses...');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const status of orderStatuses) {
    const config = {
      ...testConfigs.orderStatus,
      payload: {
        ...testConfigs.orderStatus.payload,
        current_status: status,
        order_id: `TEST_ORDER_${status}_${Date.now()}`,
        external_order_id: `ORD-TEST-${status}-${Date.now()}`
      }
    };
    
    const result = await testWebhook(config, `Order Status: ${status}`);
    results.push({ status, ...result });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

async function testAllReturnStatuses() {
  console.log('\n🔄 Testing All Return Statuses...');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const status of returnStatuses) {
    const config = {
      ...testConfigs.returnStatus,
      payload: {
        ...testConfigs.returnStatus.payload,
        current_status: status,
        return_order_id: `TEST_RETURN_${status}_${Date.now()}`,
        external_order_id: `ORD-TEST-RETURN-${Date.now()}`
      }
    };
    
    const result = await testWebhook(config, `Return Status: ${status}`);
    results.push({ status, ...result });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

async function testCustomWebhook() {
  console.log('\n🎯 Testing Custom Webhook...');
  console.log('=' .repeat(50));
  
  const customConfig = {
    url: `${API_URL}/webhooks/shiprocket`,
    payload: {
      event_name: 'ORDER_STATUS_UPDATE',
      order_id: `CUSTOM_ORDER_${Date.now()}`,
      external_order_id: 'ORD-CUSTOM-123',
      current_status: 'SHIPPED',
      tracking_id: 'CUSTOM_TRACK_123',
      courier_name: 'Custom Courier',
      shipment_id: 'CUSTOM_SHIPMENT_123',
      timestamp: new Date().toISOString(),
      customer_name: 'Custom Customer',
      customer_phone: '+919876543210',
      customer_email: 'custom@example.com',
      shipping_address: {
        name: 'Custom Customer',
        phone: '+919876543210',
        address: '456 Custom Street',
        city: 'Custom City',
        state: 'Custom State',
        pincode: '654321',
        country: 'India'
      },
      order_details: {
        total_amount: 1999.00,
        currency: 'INR',
        payment_method: 'Online',
        order_date: new Date().toISOString()
      }
    }
  };
  
  return await testWebhook(customConfig, 'Custom Webhook Test');
}

async function runAllTests() {
  console.log('🚀 Starting Shiprocket Webhook Tests');
  console.log('=' .repeat(50));
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📡 API URL: ${API_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  const allResults = [];
  
  // Test basic webhooks
  console.log('\n📋 Testing Basic Webhooks...');
  const orderResult = await testWebhook(testConfigs.orderStatus, 'Order Status Webhook');
  const returnResult = await testWebhook(testConfigs.returnStatus, 'Return Status Webhook');
  
  allResults.push({ test: 'Order Status Basic', ...orderResult });
  allResults.push({ test: 'Return Status Basic', ...returnResult });
  
  // Test all order statuses
  const orderStatusResults = await testAllOrderStatuses();
  allResults.push(...orderStatusResults.map(r => ({ test: `Order Status: ${r.status}`, ...r })));
  
  // Test all return statuses
  const returnStatusResults = await testAllReturnStatuses();
  allResults.push(...returnStatusResults.map(r => ({ test: `Return Status: ${r.status}`, ...r })));
  
  // Test custom webhook
  const customResult = await testCustomWebhook();
  allResults.push({ test: 'Custom Webhook', ...customResult });
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(50));
  
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  const total = allResults.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${Math.round((successful / total) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    allResults.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.test}: ${r.error || r.status}`);
    });
  }
  
  console.log(`\n⏰ Completed at: ${new Date().toISOString()}`);
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testWebhook,
  testAllOrderStatuses,
  testAllReturnStatuses,
  testCustomWebhook,
  runAllTests
};
