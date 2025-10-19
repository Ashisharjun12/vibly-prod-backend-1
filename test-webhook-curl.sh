#!/bin/bash

# Shiprocket Webhook Test Script using cURL
# Usage: ./test-webhook-curl.sh [BASE_URL]

BASE_URL=${1:-"http://localhost:3000"}
API_URL="${BASE_URL}/api"

echo "🚀 Testing Shiprocket Webhooks with cURL"
echo "========================================"
echo "🌐 Base URL: $BASE_URL"
echo "📡 API URL: $API_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test function
test_webhook() {
    local name="$1"
    local url="$2"
    local payload="$3"
    
    echo -e "${BLUE}🧪 Testing $name...${NC}"
    echo "📡 URL: $url"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "x-shiprocket-hmac-sha256: test-signature-for-local-development" \
        -d "$payload")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ Success! Status: $http_code${NC}"
    else
        echo -e "${RED}❌ Failed! Status: $http_code${NC}"
    fi
    
    echo "📄 Response: $body"
    echo ""
}

# Test 1: Order Status Update - SHIPPED
echo -e "${YELLOW}📦 Testing Order Status Update - SHIPPED${NC}"
test_webhook "Order Status: SHIPPED" \
    "$API_URL/webhooks/shiprocket" \
    '{
        "event_name": "ORDER_STATUS_UPDATE",
        "order_id": "TEST_ORDER_123",
        "external_order_id": "ORD-TEST-123",
        "current_status": "SHIPPED",
        "tracking_id": "TEST_TRACK_123",
        "courier_name": "Test Courier",
        "shipment_id": "TEST_SHIPMENT_123",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
        "customer_name": "Test Customer",
        "customer_phone": "+919876543210",
        "customer_email": "test@example.com",
        "shipping_address": {
            "name": "Test Customer",
            "phone": "+919876543210",
            "address": "123 Test Street",
            "city": "Test City",
            "state": "Test State",
            "pincode": "123456",
            "country": "India"
        }
    }'

# Test 2: Order Status Update - DELIVERED
echo -e "${YELLOW}📦 Testing Order Status Update - DELIVERED${NC}"
test_webhook "Order Status: DELIVERED" \
    "$API_URL/webhooks/shiprocket" \
    '{
        "event_name": "ORDER_STATUS_UPDATE",
        "order_id": "TEST_ORDER_456",
        "external_order_id": "ORD-TEST-456",
        "current_status": "DELIVERED",
        "tracking_id": "TEST_TRACK_456",
        "courier_name": "Test Courier",
        "shipment_id": "TEST_SHIPMENT_456",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }'

# Test 3: Return Status Update - RETURN_DELIVERED
echo -e "${YELLOW}🔄 Testing Return Status Update - RETURN_DELIVERED${NC}"
test_webhook "Return Status: RETURN_DELIVERED" \
    "$API_URL/webhooks/shiprocket/return" \
    '{
        "event_name": "RETURN_STATUS_UPDATE",
        "return_order_id": "TEST_RETURN_123",
        "external_order_id": "ORD-TEST-123",
        "current_status": "RETURN_DELIVERED",
        "tracking_id": "TEST_RETURN_TRACK_123",
        "courier_name": "Test Courier",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
        "return_reason": "Product not as described",
        "return_amount": 999.00
    }'

# Test 4: Order Status Update - CANCELLED
echo -e "${YELLOW}❌ Testing Order Status Update - CANCELLED${NC}"
test_webhook "Order Status: CANCELLED" \
    "$API_URL/webhooks/shiprocket" \
    '{
        "event_name": "ORDER_STATUS_UPDATE",
        "order_id": "TEST_ORDER_789",
        "external_order_id": "ORD-TEST-789",
        "current_status": "CANCELLED",
        "tracking_id": "TEST_TRACK_789",
        "courier_name": "Test Courier",
        "shipment_id": "TEST_SHIPMENT_789",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }'

# Test 5: Health Check
echo -e "${YELLOW}🏥 Testing Health Check${NC}"
test_webhook "Health Check" \
    "$API_URL/webhooks/health" \
    '{}'

# Test 6: Admin API - Get Webhook Config
echo -e "${YELLOW}⚙️ Testing Admin API - Get Webhook Config${NC}"
echo "📡 URL: $API_URL/admin/shiprocket/webhooks/config"
response=$(curl -s -w "\n%{http_code}" "$API_URL/admin/shiprocket/webhooks/config")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Success! Status: $http_code${NC}"
else
    echo -e "${RED}❌ Failed! Status: $http_code${NC}"
fi
echo "📄 Response: $body"
echo ""

# Test 7: Admin API - Test Local Webhook
echo -e "${YELLOW}🧪 Testing Admin API - Test Local Webhook${NC}"
test_webhook "Admin API - Test Local Webhook" \
    "$API_URL/admin/shiprocket/webhooks/test-local" \
    '{
        "eventType": "ORDER_STATUS_UPDATE",
        "orderId": "ORD-ADMIN-TEST-123",
        "status": "SHIPPED"
    }'

echo -e "${GREEN}🎉 All tests completed!${NC}"
echo ""
echo "💡 Tips:"
echo "  - Check your server logs for detailed webhook processing"
echo "  - Use the admin panel at http://localhost:5174/admin for interactive testing"
echo "  - Set up Cloudflare tunnel for external webhook testing"
echo "  - Configure webhook secret for production use"
