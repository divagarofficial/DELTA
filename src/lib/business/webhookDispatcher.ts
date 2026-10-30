import crypto from 'crypto';
import { businessStore } from './businessStore';

export interface WebhookStatusPayload {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: 'user_initiated' | 'business_initiated';
    };
  };
  pricing?: {
    billable: false;
    pricing_model: 'delta_zero_charge';
    category: string;
  };
}

export interface WebhookIncomingMessagePayload {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'image' | 'audio' | 'reaction';
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  reaction?: { message_id: string; emoji: string };
}

export function buildWhatsAppWebhookPayload(
  phone_number_id: string,
  event: {
    statuses?: WebhookStatusPayload[];
    messages?: WebhookIncomingMessagePayload[];
    contacts?: { profile: { name: string }; wa_id: string }[];
  }
) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: phone_number_id,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+91 98765 00000',
                phone_number_id: phone_number_id,
              },
              contacts: event.contacts || [],
              messages: event.messages || [],
              statuses: event.statuses || [],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

export function computeWebhookSignature(payloadString: string, secret: string): string {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  } catch (e) {
    return '';
  }
}

export async function dispatchWebhookEvent(
  webhookUrl: string,
  payload: any,
  secretToken?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return { success: false, error: 'Invalid or missing webhook URL' };
    }

    const payloadStr = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Delta-Business-Webhook/1.0',
    };

    const token = secretToken || businessStore.getWebhookConfig().verify_token;
    if (token) {
      const sig = computeWebhookSignature(payloadStr, token);
      if (sig) {
        headers['X-Hub-Signature-256'] = sig;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: payloadStr,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const isOk = response.ok;
    businessStore.updateWebhookConfig({
      last_delivery_status: isOk ? 'success' : 'failed',
      last_delivery_at: new Date().toISOString(),
    });

    return {
      success: isOk,
      status: response.status,
    };
  } catch (err: any) {
    businessStore.updateWebhookConfig({
      last_delivery_status: 'failed',
      last_delivery_at: new Date().toISOString(),
    });
    return {
      success: false,
      error: err.message || 'Failed to dispatch webhook',
    };
  }
}

export async function notifyMessageStatusWebhook(params: {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  recipientPhone: string;
  category?: string;
}) {
  const config = businessStore.getWebhookConfig();
  if (!config.is_active || !config.url) return;

  const payload = buildWhatsAppWebhookPayload('phone_delta_1001', {
    statuses: [
      {
        id: params.messageId,
        status: params.status,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        recipient_id: params.recipientPhone,
        pricing: {
          billable: false,
          pricing_model: 'delta_zero_charge',
          category: params.category || 'service',
        },
      },
    ],
  });

  return dispatchWebhookEvent(config.url, payload, config.verify_token);
}

export async function notifyIncomingMessageWebhook(params: {
  senderPhone: string;
  senderName: string;
  messageId: string;
  text?: string;
  buttonReply?: { id: string; title: string };
  listReply?: { id: string; title: string; description?: string };
}) {
  const config = businessStore.getWebhookConfig();
  if (!config.is_active || !config.url) return;

  const payload = buildWhatsAppWebhookPayload('phone_delta_1001', {
    contacts: [
      {
        profile: { name: params.senderName },
        wa_id: params.senderPhone.replace(/[^0-9]/g, ''),
      },
    ],
    messages: [
      {
        from: params.senderPhone.replace(/[^0-9]/g, ''),
        id: params.messageId,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: params.buttonReply || params.listReply ? 'interactive' : 'text',
        text: params.text ? { body: params.text } : undefined,
        interactive: params.buttonReply
          ? { type: 'button_reply', button_reply: params.buttonReply }
          : params.listReply
          ? { type: 'list_reply', list_reply: params.listReply }
          : undefined,
      },
    ],
  });

  return dispatchWebhookEvent(config.url, payload, config.verify_token);
}
