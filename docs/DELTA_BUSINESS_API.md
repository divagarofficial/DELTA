# Delta Business Suite ($0 Free WhatsApp API Alternative)

**Delta Business** is an enterprise-grade messaging engine and API platform that provides 1:1 feature parity with the **WhatsApp Business Cloud API** without any per-message, conversation, or platform delivery charges (**₹0.00 / $0.00**).

---

## 🌟 The Problem Delta Business Solves

Meta has moved the WhatsApp Business Platform away from flat 24-hour conversation pricing to **Per-Message Pricing (PMP)**, drastically increasing costs:
* **Marketing broadcasts:** Billed at ~₹0.8631 ($0.055) *per delivered message*.
* **Multi-touch alerts (Order, Transit, Delivery):** Billed 3× per user journey instead of 1×.
* **Customer Support:** Free 24-hour service window sunsetted; replies billed after a small monthly tier.

**Delta Business** eliminates these costs by turning your self-hosted or managed Delta instance into a **private, sovereign WhatsApp Cloud API compatible provider**.

---

## 🚀 WhatsApp Business API Feature Parity Matrix

| Feature | Official Meta WhatsApp Cloud API | Delta Business Suite |
| :--- | :--- | :--- |
| **Delivery Cost** | 🔺 ₹0.115 – ₹0.8631 / msg | ⚡ **₹0.0000 (Forever Free)** |
| **Direct Text Messages** | Supported (`type: "text"`) | ✅ Fully Supported (`POST /api/v1/messages`) |
| **Template Messages** | Requires manual Meta review (hours/days) | ✅ **Instant Auto-Approval (`{{1}}`, `{{2}}` variables)** |
| **Interactive Buttons** | Quick Reply buttons (up to 3) | ✅ **Interactive Quick Replies with Click Callback** |
| **List Messages** | Up to 10 selectable items | ✅ **Interactive Section & Row Menus** |
| **Media Attachments** | Images, PDFs, Audio, Video | ✅ **Fully Supported with Signed URLs** |
| **Webhooks** | `sent`, `delivered`, `read` receipts | ✅ **Standard `hub.challenge` & Event Dispatch** |
| **Zero-Cost Ledger** | Not available (Bills your card) | ✅ **Real-Time Savings Ledger in INR & USD** |
| **Verified Green Tick** | Strict Meta approvals | ✅ **Official "Verified Delta Business" Badge** |

---

## 📡 REST API Specifications

Base URL: `http://localhost:3000/api/v1` (or your production Delta domain)  
Authentication: `Authorization: Bearer <dlt_live_your_api_key>`

### 1. Send Message (`POST /api/v1/messages`)

#### A. Send Template Message (Transactional / OTP / Marketing)
```bash
curl -X POST https://your-delta-domain.com/api/v1/messages \
  -H "Authorization: Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "delta",
    "to": "+919876543210",
    "type": "template",
    "template": {
      "name": "order_dispatched",
      "language": { "code": "en_US" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Priya Sharma" },
            { "type": "text", "text": "ORD-94821" },
            { "type": "text", "text": "6:00 PM" }
          ]
        }
      ]
    }
  }'
```

#### Response (100% WhatsApp Cloud API Compatible):
```json
{
  "messaging_product": "delta_business",
  "contacts": [
    {
      "input": "+919876543210",
      "delta_id": "usr_919876543210"
    }
  ],
  "messages": [
    {
      "id": "deltamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSRjQ1",
      "message_status": "accepted",
      "pricing": {
        "billable": false,
        "pricing_model": "delta_zero_charge",
        "category": "utility",
        "rate": "0.00",
        "currency": "INR",
        "saved_vs_whatsapp": "₹0.1150",
        "meta_equivalent_rate": "₹0.1150"
      }
    }
  ]
}
```

---

#### B. Send Interactive Quick Reply Buttons
```bash
curl -X POST https://your-delta-domain.com/api/v1/messages \
  -H "Authorization: Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "delta",
    "to": "+919876543210",
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": "Your order has arrived! Would you like contactless dropoff?"
      },
      "action": {
        "buttons": [
          { "type": "reply", "reply": { "id": "btn_yes", "title": "Leave at Door" } },
          { "type": "reply", "reply": { "id": "btn_no", "title": "Hand to Me" } }
        ]
      }
    }
  }'
```

---

### 2. Template Management (`GET` & `POST` `/api/v1/message_templates`)
* **List Templates:** `GET /api/v1/message_templates`
* **Create New Template:** `POST /api/v1/message_templates`
```json
{
  "name": "cart_recovery_offer",
  "category": "MARKETING",
  "language": "en_US",
  "header_type": "TEXT",
  "header_content": "🔥 Still thinking about it?",
  "body_text": "Hi {{1}}, items in your cart are selling out fast! Complete your purchase now and get {{2}}% off.",
  "footer_text": "Reply STOP to opt out",
  "buttons": [
    {
      "type": "URL",
      "text": "Checkout Now",
      "url": "https://apexlogistics.com/checkout/{{1}}"
    }
  ]
}
```
*Templates are instantly marked `APPROVED` upon creation.*

---

### 3. Webhooks & Event Subscriptions (`/api/v1/webhooks`)
* **Verification Challenge (Meta Protocol):**  
  `GET /api/v1/webhooks?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=your_verify_token`  
  Returns the exact `hub.challenge` string with HTTP 200.
* **Delivery Receipt Webhook Payload:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "phone_delta_1001",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "statuses": [
              {
                "id": "deltamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSRjQ1",
                "status": "delivered",
                "timestamp": "1730101800",
                "recipient_id": "+919876543210",
                "pricing": {
                  "billable": false,
                  "pricing_model": "delta_zero_charge",
                  "category": "utility"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

### 4. Zero-Cost Ledger & Analytics (`GET /api/v1/analytics/savings`)
Returns cumulative financial savings calculated against official Meta Cloud API rate cards:
```json
{
  "metrics": {
    "totalMessages": 148850,
    "breakdown": {
      "marketing": 38450,
      "utility": 84200,
      "auth": 16800,
      "service": 9400
    },
    "metaCostINR": 45869.25,
    "deltaCostINR": 0.00,
    "totalSavingsINR": 45869.25,
    "totalSavingsUSD": 551.31,
    "savedPercentage": 100
  },
  "billing_status": "ACTIVE_ZERO_CHARGE"
}
```

---

## 🖥️ Delta Business UI Overview

Access Delta Business by clicking the **Briefcase** icon in Delta's navigation rail (labeled with the **FREE** badge):
1. **Overview & Ledger:** Live KPI metrics, official category rate card comparison, and live transaction ledger.
2. **API Playground & Live Dispatch:** Test text, template variables, and interactive button dispatches with real-time mobile device preview.
3. **Template Studio:** Form builder for Marketing, Utility, and Authentication templates.
4. **API Keys & Webhooks:** Secret token generator (`dlt_live_...`) and webhook verification simulator.
5. **WhatsApp API Specs:** Ready-to-copy Node.js, Python, and cURL snippets for easy drop-in integration.
