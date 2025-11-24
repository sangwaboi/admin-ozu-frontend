# Backend Fix Required: Duplicate Pickup Messages

## 🔴 Issue Reported

When a rider confirms they have picked up an order, they are receiving **2 identical "Package Picked Up!" messages** on WhatsApp.

**Evidence from Screenshot:**
- First message: "✅ Package Picked Up! 📦 Shipment #26... Track progress in your admin dashboard."
- Second message: Same "✅ Package Picked Up! 📦 Shipment #26..." (duplicate)
- Both messages sent at same timestamp: 10:39 PM

## 🔍 Root Cause

The duplicate message is likely caused by one of these scenarios:

### Scenario 1: Double Status Update
```python
# When rider confirms pickup, status might be updated twice
shipment.status = 'picked_up'
db.commit()
send_whatsapp_message(rider, "Package Picked Up!")  # ← First message

# Then somewhere else in code (webhook callback, etc.)
shipment.status = 'picked_up'  # Status already picked_up
db.commit()  
send_whatsapp_message(rider, "Package Picked Up!")  # ← Second message (duplicate)
```

### Scenario 2: Admin Notification Sent to Rider Too
```python
# Correct: Send to admin
send_whatsapp_message(admin_mobile, "Order picked up by rider")  # ✅

# Bug: Also sending to rider again
send_whatsapp_message(rider_mobile, "Package Picked Up!")  # ❌ Duplicate
```

### Scenario 3: Webhook Duplication
```python
# Twilio/WhatsApp webhooks might be triggering twice
@app.post("/whatsapp/webhook")
async def handle_pickup_response(request):
    if message_body.lower() == "picked up":
        update_status_and_notify()  # ← Called twice if webhook fires twice
```

## ✅ Solution

### 1. Add Status Change Check
Only send message if status actually changed:

```python
# Before updating status
old_status = shipment.status

# Update status
shipment.status = 'picked_up'
db.commit()

# Only send message if status actually changed
if old_status != 'picked_up':
    # Send confirmation to rider
    send_whatsapp_message(
        rider.mobile,
        f"✅ Package Picked Up!\n\n📦 Shipment #{shipment.id}\n..."
    )
    
    # Send notification to admin
    send_whatsapp_message(
        admin.mobile,
        f"📦 Order #{shipment.id} has been picked up by {rider.name}"
    )
```

### 2. Add Idempotency Check
Use a flag to prevent duplicate sends:

```python
# Add field to track if pickup message was sent
class Shipment(Base):
    # ... existing fields
    pickup_message_sent = Column(Boolean, default=False)

# When confirming pickup
if shipment.status != 'picked_up':
    shipment.status = 'picked_up'
    
    if not shipment.pickup_message_sent:
        send_whatsapp_message(rider.mobile, "Package Picked Up!")
        shipment.pickup_message_sent = True
        db.commit()
```

### 3. Use Database Transaction
Ensure atomic updates:

```python
from sqlalchemy.orm import Session

def confirm_pickup(shipment_id: int, db: Session):
    with db.begin():  # Transaction
        shipment = db.query(Shipment).filter(Shipment.id == shipment_id).with_for_update().first()
        
        # Check if already picked up
        if shipment.status == 'picked_up':
            return {"message": "Already picked up", "duplicate": True}
        
        # Update status
        shipment.status = 'picked_up'
        db.flush()  # Flush to DB
        
        # Send messages (only if we reach here)
        send_whatsapp_message(rider.mobile, "Package Picked Up!")
        
    return {"message": "Success", "duplicate": False}
```

## 🎯 Expected Messages Flow

### When Rider Confirms Pickup:

**To Rider (1 message only):**
```
✅ Package Picked Up!

📦 Shipment #26

Confirmed: Package collected from shop

📍 Now proceed to customer location:
123, Pondicherry, Puducherry, India
🗺️ Landmark: jeevitha garden

🔑 Customer: 8233758907

Safe travels! 🚗
```

**To Admin (1 message only):**
```
📦 Order Picked Up

Shipment #26
Rider: gk
📞 +918233758907

The rider has collected the package and is now heading to the customer.

Track progress in your admin dashboard.
```

## 🧪 Testing Steps

1. Create a new shipment
2. Rider accepts the order
3. Rider confirms "Picked Up"
4. **Verify:** Rider receives exactly **1** pickup confirmation message
5. **Verify:** Admin receives exactly **1** notification that order was picked up

## 📋 Files to Check

Look in your backend codebase for:
- `routes/shipment.py` or `shipments/routes.py`
- `webhooks/whatsapp.py` or `whatsapp/webhook.py`
- Any function named:
  - `confirm_pickup()`
  - `update_shipment_status()`
  - `handle_rider_response()`
  - `send_pickup_confirmation()`

## 🔍 Debugging Tips

Add logging to find where duplicate is happening:

```python
import logging
logger = logging.getLogger(__name__)

def confirm_pickup(shipment_id):
    logger.info(f"🔍 confirm_pickup called for shipment {shipment_id}")
    logger.info(f"Current status: {shipment.status}")
    
    # ... your code
    
    logger.info(f"✉️ Sending pickup message to rider")
    send_whatsapp_message(...)
    logger.info(f"✅ Message sent")
```

Then check logs to see if function is called twice.

## 🚨 Priority

**HIGH** - Users are getting spammed with duplicate messages, which is unprofessional and confusing.

## ✅ Success Criteria

- ✅ Rider receives exactly 1 "Package Picked Up" message
- ✅ Admin receives exactly 1 "Order Picked Up" notification
- ✅ No duplicate messages even if webhooks fire multiple times
- ✅ Status transitions correctly: `assigned` → `picked_up` → `delivered`

---

**Note:** The frontend is working correctly. This is purely a backend messaging issue.

