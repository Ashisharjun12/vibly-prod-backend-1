export const createReturnOrder = async (orderData, token) => {
    try {
        const response = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/return", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error("Error creating return order:", error);
        return {
            success: false,
            error: error.response?.data?.message || "Failed to create return order"
        };
    }
};

export const createAdhocOrder = async (orderData, token) => {
    try {
        const response = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        const data = await response.json();
        console.log("data : ", data);
        return { success: data.order_id ? true : false, data };
    } catch (error) {
        console.error("Error creating adhoc order:", error);
        return {
            success: false,
            error: error.response?.data?.message || "Failed to create order"
        };
    }
};

export const assignAWB = async (shipmentId, token) => {
    try {
        const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/assign/awb`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ shipment_id: shipmentId }),
        });
        const data = await response.json();
        console.log("[assignAWB] data : ", JSON.stringify(data, null, 2));
        return { success: data?.awb_assign_status === 1 ? true : false, data };
    } catch (error) {
        console.error("Error assigning AWB:", error);
        return {
            success: false,
            error: error.response?.data?.message || "Failed to assign AWB"
        };
    }
};


export const generatePickup = async (shipmentId, token) => {
    try {
        const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/generate/pickup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ shipment_id: shipmentId })
        });
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error("Error generating pickup:", error);
        return {
            success: false,
            error: error.response?.data?.message || "Failed to generate pickup"
        };
    }
};

export const fetchAddress = async (token) => {
    try {
        const response = await fetch(`https://apiv2.shiprocket.in/v1/external/settings/company/pickup`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        console.log("data : ", data.data.shipping_address[0]);
        return { success: true, data: data.data.shipping_address[0] };
    } catch (error) {
        console.error("Error fetching address:", error);
        return {
            success: false,
            error: error.response?.data?.message || "Failed to fetch address"
        };
    }
}
