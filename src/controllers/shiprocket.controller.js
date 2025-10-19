export const loginToShiprocket = async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        const data = await response.json();
        console.log("[DEBUG] Login to Shiprocket successful", data);
        return res.status(200).json({ message: 'Login successful', data });
    } catch (error) {
        console.error('Error logging to Shiprocket:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const tokenLogoutFromShiprocket = async (req, res) => {
    try {
        const token = req.shiprocketToken;
        const response = await fetch('https://apiv2.shiprocket.in/v1/external/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': token
            }
        });
        const data = await response.json();
        console.log("[DEBUG] Logout from Shiprocket successful", data);
        return res.status(200).json({ message: 'Logout successful', data });
    } catch (error) {
        console.error('Error logging out from Shiprocket:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * Get webhook configuration and setup instructions
 * GET /api/admin/shiprocket/webhooks/config
 */
export const getWebhookConfig = async (req, res) => {
    try {
        const { getWebhookSetupInstructions } = await import('../services/shiprocketWebhookService.js');
        const config = getWebhookSetupInstructions();
        
        return res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Error getting webhook config:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get webhook configuration',
            error: error.message
        });
    }
}

/**
 * Test webhook endpoint
 * POST /api/admin/shiprocket/webhooks/test
 */
export const testWebhook = async (req, res) => {
    try {
        const { generateWebhookUrls } = await import('../services/shiprocketWebhookService.js');
        const urls = generateWebhookUrls();
        
        // Test each webhook endpoint
        const testResults = [];
        
        for (const [name, url] of Object.entries(urls)) {
            try {
                const testPayload = {
                    test: true,
                    endpoint: name,
                    timestamp: new Date().toISOString(),
                    data: {
                        order_id: 'TEST_ORDER_123',
                        status: 'TEST_STATUS',
                        message: 'This is a test webhook payload'
                    }
                };
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-shiprocket-hmac-sha256': 'test-signature'
                    },
                    body: JSON.stringify(testPayload)
                });
                
                testResults.push({
                    endpoint: name,
                    url,
                    status: response.status,
                    success: response.ok,
                    message: response.ok ? 'Webhook test successful' : 'Webhook test failed'
                });
            } catch (error) {
                testResults.push({
                    endpoint: name,
                    url,
                    status: 'error',
                    success: false,
                    message: error.message
                });
            }
        }
        
        return res.status(200).json({
            success: true,
            message: 'Webhook test completed',
            results: testResults
        });
    } catch (error) {
        console.error('Error testing webhooks:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to test webhooks',
            error: error.message
        });
    }
}

/**
 * Get order tracking information
 * GET /api/admin/shiprocket/orders/:orderId/tracking
 */
export const getOrderTracking = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { getOrderTrackingInfo } = await import('../services/shiprocketStatusService.js');
        
        const trackingInfo = await getOrderTrackingInfo(orderId);
        
        return res.status(200).json({
            success: true,
            data: trackingInfo
        });
    } catch (error) {
        console.error('Error getting order tracking:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get order tracking information',
            error: error.message
        });
    }
}

/**
 * Get orders by Shiprocket status
 * GET /api/admin/shiprocket/orders/status/:status
 */
export const getOrdersByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const { getOrdersByShiprocketStatus } = await import('../services/shiprocketStatusService.js');
        
        const orders = await getOrdersByShiprocketStatus(status);
        
        return res.status(200).json({
            success: true,
            data: {
                status,
                count: orders.length,
                orders
            }
        });
    } catch (error) {
        console.error('Error getting orders by status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get orders by status',
            error: error.message
        });
    }
}

/**
 * Manual status update for testing
 * POST /api/admin/shiprocket/orders/:orderId/status
 */
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, trackingData = {} } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        
        const { updateOrderStatus } = await import('../services/shiprocketStatusService.js');
        
        const result = await updateOrderStatus(orderId, status, trackingData);
        
        return res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
}

/**
 * Test webhook with custom payload for local development
 * POST /api/admin/shiprocket/webhooks/test-local
 */
export const testWebhookLocal = async (req, res) => {
    try {
        const { eventType = 'ORDER_STATUS_UPDATE', orderId = 'ORD-TEST-123', status = 'SHIPPED' } = req.body;
        
        // Generate test payload based on event type
        let testPayload;
        
        if (eventType === 'ORDER_STATUS_UPDATE') {
            testPayload = {
                event_name: 'ORDER_STATUS_UPDATE',
                order_id: `TEST_ORDER_${Date.now()}`,
                external_order_id: orderId,
                current_status: status,
                tracking_id: `TEST_TRACK_${Date.now()}`,
                courier_name: 'Test Courier',
                shipment_id: `TEST_SHIPMENT_${Date.now()}`,
                timestamp: new Date().toISOString(),
                // Additional test data
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
            };
        } else if (eventType === 'RETURN_STATUS_UPDATE') {
            testPayload = {
                event_name: 'RETURN_STATUS_UPDATE',
                return_order_id: `TEST_RETURN_${Date.now()}`,
                external_order_id: orderId,
                current_status: status,
                tracking_id: `TEST_RETURN_TRACK_${Date.now()}`,
                courier_name: 'Test Courier',
                timestamp: new Date().toISOString(),
                // Additional test data
                return_reason: 'Product not as described',
                return_amount: 999.00
            };
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid event type. Use ORDER_STATUS_UPDATE or RETURN_STATUS_UPDATE'
            });
        }
        
        // Generate webhook URLs
        const { generateWebhookUrls } = await import('../services/shiprocketWebhookService.js');
        const webhookUrls = generateWebhookUrls();
        
        const targetUrl = eventType === 'ORDER_STATUS_UPDATE' ? webhookUrls.orderStatus : webhookUrls.returnStatus;
        
        console.log(`[WEBHOOK TEST] Testing ${eventType} webhook:`, {
            url: targetUrl,
            payload: testPayload
        });
        
        // Send test webhook
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-shiprocket-hmac-sha256': 'test-signature-for-local-development'
            },
            body: JSON.stringify(testPayload)
        });
        
        const responseData = await response.text();
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(responseData);
        } catch (e) {
            parsedResponse = responseData;
        }
        
        return res.status(200).json({
            success: true,
            message: 'Local webhook test completed',
            testData: {
                eventType,
                orderId,
                status,
                webhookUrl: targetUrl,
                payload: testPayload
            },
            response: {
                status: response.status,
                statusText: response.statusText,
                data: parsedResponse
            }
        });
        
    } catch (error) {
        console.error('Error in local webhook test:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to test local webhook',
            error: error.message
        });
    }
}

/**
 * Get webhook test status and recent webhook calls
 * GET /api/admin/shiprocket/webhooks/test-status
 */
export const getWebhookTestStatus = async (req, res) => {
    try {
        // This would typically come from a database or log file
        // For now, we'll return a mock status
        const status = {
            webhookEndpoint: 'Active',
            lastTestTime: new Date().toISOString(),
            totalTests: Math.floor(Math.random() * 100) + 1,
            successfulTests: Math.floor(Math.random() * 80) + 10,
            failedTests: Math.floor(Math.random() * 5),
            recentWebhooks: [
                {
                    timestamp: new Date(Date.now() - 60000).toISOString(),
                    eventType: 'ORDER_STATUS_UPDATE',
                    orderId: 'ORD-TEST-123',
                    status: 'SHIPPED',
                    success: true
                },
                {
                    timestamp: new Date(Date.now() - 120000).toISOString(),
                    eventType: 'RETURN_STATUS_UPDATE',
                    orderId: 'ORD-TEST-456',
                    status: 'RETURN_DELIVERED',
                    success: true
                }
            ]
        };
        
        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting webhook test status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get webhook test status',
            error: error.message
        });
    }
}

/**
 * Simulate Shiprocket webhook call for testing
 * POST /api/admin/shiprocket/webhooks/simulate
 */
export const simulateWebhook = async (req, res) => {
    try {
        const { 
            eventType = 'ORDER_STATUS_UPDATE',
            orderId = 'ORD-SIMULATE-123',
            status = 'SHIPPED',
            trackingId = 'TRACK-SIM-123',
            courierName = 'Test Courier'
        } = req.body;
        
        // Create a realistic webhook payload
        const webhookPayload = {
            event_name: eventType,
            order_id: `SIM_ORDER_${Date.now()}`,
            external_order_id: orderId,
            current_status: status,
            tracking_id: trackingId,
            courier_name: courierName,
            shipment_id: `SIM_SHIPMENT_${Date.now()}`,
            timestamp: new Date().toISOString(),
            // Additional realistic data
            customer_details: {
                name: 'Simulation Customer',
                phone: '+919876543210',
                email: 'simulation@example.com'
            },
            shipping_address: {
                name: 'Simulation Customer',
                phone: '+919876543210',
                address: '456 Simulation Street',
                city: 'Simulation City',
                state: 'Simulation State',
                pincode: '654321',
                country: 'India'
            },
            order_details: {
                total_amount: 1299.00,
                currency: 'INR',
                payment_method: 'Online',
                order_date: new Date().toISOString()
            }
        };
        
        // Generate webhook URLs
        const { generateWebhookUrls } = await import('../services/shiprocketWebhookService.js');
        const webhookUrls = generateWebhookUrls();
        
        const targetUrl = eventType === 'ORDER_STATUS_UPDATE' ? webhookUrls.orderStatus : webhookUrls.returnStatus;
        
        console.log(`[WEBHOOK SIMULATION] Simulating ${eventType} webhook:`, {
            url: targetUrl,
            payload: webhookPayload
        });
        
        // Call the webhook endpoint directly (internal call)
        const webhookResponse = await fetch(`http://localhost:${process.env.PORT || 3000}${targetUrl.replace(/^https?:\/\/[^\/]+/, '')}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-shiprocket-hmac-sha256': 'simulation-signature'
            },
            body: JSON.stringify(webhookPayload)
        });
        
        const webhookData = await webhookResponse.text();
        let parsedWebhookData;
        try {
            parsedWebhookData = JSON.parse(webhookData);
        } catch (e) {
            parsedWebhookData = webhookData;
        }
        
        return res.status(200).json({
            success: true,
            message: 'Webhook simulation completed',
            simulation: {
                eventType,
                orderId,
                status,
                webhookUrl: targetUrl,
                payload: webhookPayload
            },
            webhookResponse: {
                status: webhookResponse.status,
                statusText: webhookResponse.statusText,
                data: parsedWebhookData
            }
        });
        
    } catch (error) {
        console.error('Error simulating webhook:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to simulate webhook',
            error: error.message
        });
    }
}

/**
 * Get Cloudflare tunnel webhook URLs for testing
 * GET /api/admin/shiprocket/webhooks/tunnel-urls
 */
export const getTunnelWebhookUrls = async (req, res) => {
    try {
        const { generateWebhookUrls } = await import('../services/shiprocketWebhookService.js');
        const webhookUrls = generateWebhookUrls();
        
        // Instructions for setting up Cloudflare tunnel
        const tunnelInstructions = {
            title: "Cloudflare Tunnel Setup for Shiprocket Webhooks",
            description: "Use these URLs with your Cloudflare tunnel to test webhooks locally",
            steps: [
                "1. Install Cloudflare tunnel: npm install -g cloudflared",
                "2. Login to Cloudflare: cloudflared tunnel login",
                "3. Create a tunnel: cloudflared tunnel create shiprocket-webhook",
                "4. Configure tunnel: cloudflared tunnel route dns shiprocket-webhook your-domain.com",
                "5. Start tunnel: cloudflared tunnel run shiprocket-webhook",
                "6. Use the tunnel URLs below in Shiprocket webhook configuration"
            ],
            webhookUrls: webhookUrls,
            tunnelCommand: `cloudflared tunnel run shiprocket-webhook --url http://localhost:${process.env.PORT || 3000}`,
            testUrls: {
                orderStatus: `${webhookUrls.orderStatus}`,
                returnStatus: `${webhookUrls.returnStatus}`
            }
        };
        
        return res.status(200).json({
            success: true,
            data: tunnelInstructions
        });
    } catch (error) {
        console.error('Error getting tunnel webhook URLs:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get tunnel webhook URLs',
            error: error.message
        });
    }
}