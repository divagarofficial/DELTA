import { NextRequest, NextResponse } from 'next/server';
import { businessStore } from '@/lib/business/businessStore';
import { buildWhatsAppWebhookPayload, dispatchWebhookEvent } from '@/lib/business/webhookDispatcher';

// WhatsApp Webhook Hub Verification Endpoint
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const config = businessStore.getWebhookConfig();

  if (mode === 'subscribe' && token === config.verify_token) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json(
    { error: 'Verification token mismatch or invalid hub.mode' },
    { status: 403 }
  );
}

// Inbound Webhook event receiver or test simulator
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // If it's a test event request
    if (body.action === 'simulate_test_event') {
      const config = businessStore.getWebhookConfig();
      const simulatedPayload = buildWhatsAppWebhookPayload('phone_delta_1001', {
        statuses: [
          {
            id: `deltamid.${Date.now()}`,
            status: 'delivered',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            recipient_id: '+919876543210',
            pricing: {
              billable: false,
              pricing_model: 'delta_zero_charge',
              category: 'service',
            },
          },
        ],
      });

      let dispatchResult = { success: true, status: 200, note: 'Local simulation successful' };
      if (config.is_active && config.url && config.url.startsWith('http') && !config.url.includes('example.com')) {
        try {
          const res = await dispatchWebhookEvent(config.url, simulatedPayload, config.verify_token);
          dispatchResult = { success: res.success, status: res.status || 500, note: res.error || 'Dispatched' };
        } catch (e: any) {
          dispatchResult = { success: false, status: 500, note: e.message };
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Simulated WhatsApp webhook event created successfully',
        payload: simulatedPayload,
        dispatchResult,
      });
    }

    // Acknowledge incoming event
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
