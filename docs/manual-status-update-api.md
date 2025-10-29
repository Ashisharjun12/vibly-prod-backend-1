# Manual Order Status Update API

This document describes the manual order status update functionality for admin users in the ecommerce system.

## Overview

The manual status update feature allows admin users to manually change the status of order items with proper validation to ensure only valid status transitions are allowed. This provides flexibility alongside the automated Shiprocket integration.

## API Endpoints

### 1. Get Available Status Transitions

**Endpoint:** `GET /api/admin/newOrders/items/:itemId/available-transitions`

**Description:** Returns the possible status transitions for a specific order item.

**Parameters:**
- `itemId` (path): The ID of the order item

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStatus": {
      "value": "Ordered",
      "label": "Ordered"
    },
    "availableTransitions": [
      {
        "value": "Shipped",
        "label": "Shipped",
        "description": "Order has been shipped"
      },
      {
        "value": "Cancelled",
        "label": "Cancelled", 
        "description": "Order has been cancelled"
      }
    ],
    "itemDetails": {
      "productName": "T-Shirt",
      "size": "M",
      "color": "Blue",
      "quantity": 2
    }
  }
}
```

### 2. Update Order Item Status

**Endpoint:** `PUT /api/admin/newOrders/items/:itemId/update-status`

**Description:** Manually updates the status of an order item with validation.

**Parameters:**
- `itemId` (path): The ID of the order item

**Request Body:**
```json
{
  "status": "Shipped",
  "note": "Order shipped via manual update",
  "quantity": 1
}
```

**Fields:**
- `status` (required): The new status to set
- `note` (optional): Admin note for the status change
- `quantity` (optional): Quantity to update (for partial updates). Defaults to full quantity.

**Response:**
```json
{
  "success": true,
  "message": "Order item status updated successfully to Shipped",
  "data": {
    "itemId": "64a1b2c3d4e5f6789012345",
    "newStatus": "Shipped",
    "note": "Order shipped via manual update"
  }
}
```

## Status Transition Rules

The system enforces strict status transition rules to maintain data integrity:

### Valid Transitions:
- **Ordered** → Shipped, Cancelled
- **Shipped** → Delivered, Return Requested
- **Delivered** → Return Requested
- **Return Requested** → Returned, Return Cancelled, Departed For Returning
- **Departed For Returning** → Returned
- **Returned** → Refunded
- **Cancelled** → (No further transitions)

### Invalid Transitions (Examples):
- Shipped → Ordered (Cannot go backwards)
- Delivered → Shipped (Cannot go backwards)
- Returned → Shipped (Cannot go backwards)

## Features

### 1. Status Validation
- Validates that the requested status transition is allowed
- Prevents invalid transitions (e.g., going from "Shipped" back to "Ordered")
- Returns clear error messages with available transitions

### 2. Partial Quantity Updates
- Supports updating only a portion of an item's quantity
- Automatically splits items when partial updates are made
- Maintains proper quantity tracking

### 3. Automatic Timestamp Management
- Automatically sets relevant timestamps based on status:
  - `shippedAt` for "Shipped" status
  - `deliveredAt` for "Delivered" status
  - `cancelledAt` for "Cancelled" status
  - `returnRequestedAt` for "Return Requested" status
  - `returnedAt` for "Returned" status

### 4. Status History Tracking
- Maintains complete history of all status changes
- Includes admin notes and timestamps
- Provides audit trail for order management

### 5. Return ID Generation
- Automatically generates unique return IDs for return-related statuses
- Ensures proper tracking of return requests

## Error Handling

### Common Error Responses:

**Invalid Status Transition:**
```json
{
  "success": false,
  "message": "Cannot transition from \"Shipped\" to \"Ordered\". Available transitions: Delivered, Return Requested"
}
```

**Item Not Found:**
```json
{
  "success": false,
  "message": "Order item not found"
}
```

**Invalid Status:**
```json
{
  "success": false,
  "message": "Invalid status. Valid statuses are: Ordered, Shipped, Delivered, Cancelled, Return Requested, Returned, Refunded"
}
```

**Quantity Exceeded:**
```json
{
  "success": false,
  "message": "Update quantity exceeds item quantity"
}
```

## Usage Examples

### Example 1: Mark Order as Shipped
```bash
curl -X PUT /api/admin/newOrders/items/64a1b2c3d4e5f6789012345/update-status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Shipped",
    "note": "Order shipped via manual update"
  }'
```

### Example 2: Partial Status Update
```bash
curl -X PUT /api/admin/newOrders/items/64a1b2c3d4e5f6789012345/update-status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Delivered",
    "note": "Partial delivery completed",
    "quantity": 1
  }'
```

### Example 3: Check Available Transitions
```bash
curl -X GET /api/admin/newOrders/items/64a1b2c3d4e5f6789012345/available-transitions
```

## Integration with Shiprocket

This manual status update system works alongside the existing Shiprocket integration:

1. **Shiprocket Integration**: Use the 3-step Shiprocket process for automated shipping
2. **Manual Updates**: Use manual status updates for:
   - Override automated statuses when needed
   - Handle special cases
   - Update statuses for non-Shiprocket orders
   - Correct any status discrepancies

## Security Considerations

- All endpoints require admin authentication
- Status transitions are validated server-side
- Complete audit trail maintained for all changes
- No direct database access required

## Database Impact

- Updates are performed within database transactions
- Maintains data consistency
- Preserves complete order history
- Handles partial quantity updates correctly
