import { describe, it, expect, beforeEach } from 'vitest';
import { businessStore, INITIAL_BUSINESS_TEMPLATES } from '@/lib/business/businessStore';
import { calculateMessageSavings, getWhatsAppRate } from '@/lib/business/costLedger';
import { renderTemplate, interpolateText } from '@/lib/business/templateEngine';
import { buildWhatsAppWebhookPayload, computeWebhookSignature } from '@/lib/business/webhookDispatcher';
import { BusinessTemplate } from '@/types/business';

describe('Delta Business Suite & WhatsApp Cloud API Compatibility Engine', () => {
  describe('Zero-Cost Ledger & Rate Card Comparison', () => {
    it('accurately benchmarks WhatsApp rates against Delta zero-fee policy in INR', () => {
      const marketingSavings = calculateMessageSavings('MARKETING', 'INR');
      expect(marketingSavings.whatsappRate).toBe(0.8631);
      expect(marketingSavings.deltaRate).toBe(0.0);
      expect(marketingSavings.saved).toBe(0.8631);
      expect(marketingSavings.formattedSaved).toBe('₹0.8631');

      const utilitySavings = calculateMessageSavings('UTILITY', 'INR');
      expect(utilitySavings.whatsappRate).toBe(0.115);
      expect(utilitySavings.deltaRate).toBe(0.0);
      expect(utilitySavings.saved).toBe(0.115);
      expect(utilitySavings.formattedSaved).toBe('₹0.1150');

      const authSavings = calculateMessageSavings('AUTHENTICATION', 'INR');
      expect(authSavings.whatsappRate).toBe(0.115);
      expect(authSavings.deltaRate).toBe(0.0);
    });

    it('correctly benchmarks WhatsApp rates in USD for international clients', () => {
      const marketingUSD = calculateMessageSavings('MARKETING', 'USD');
      expect(marketingUSD.whatsappRate).toBe(0.055);
      expect(marketingUSD.deltaRate).toBe(0.0);
      expect(marketingUSD.formattedSaved).toBe('$0.0550');
    });

    it('records zero-cost ledger entries with 100% saved amount', () => {
      const entry = businessStore.recordLedgerEntry({
        recipient: '+919988776655',
        category: 'MARKETING',
        message_type: 'template:festive_offer',
        currency: 'INR',
      });

      expect(entry.delta_rate).toBe(0.0);
      expect(entry.meta_whatsapp_rate).toBe(0.8631);
      expect(entry.saved_amount).toBe(0.8631);
      expect(entry.recipient).toBe('+919988776655');
    });

    it('computes cumulative savings metrics across millions of simulated messages', () => {
      const metrics = businessStore.getCumulativeSavings();
      expect(metrics.totalMessages).toBeGreaterThan(100000);
      expect(metrics.metaCostINR).toBeGreaterThan(40000);
      expect(metrics.deltaCostINR).toBe(0.0);
      expect(metrics.savedPercentage).toBe(100);
    });
  });

  describe('Template Interpolation Engine', () => {
    it('interpolates multiple placeholders {{1}}, {{2}}, {{3}} into body text', () => {
      const rawText = 'Hello {{1}}, your order {{2}} arrives on {{3}}.';
      const interpolated = interpolateText(rawText, [
        { type: 'text', text: 'Aarav' },
        { type: 'text', text: 'ORD-101' },
        { type: 'text', text: 'Friday' },
      ]);

      expect(interpolated).toBe('Hello Aarav, your order ORD-101 arrives on Friday.');
    });

    it('renders a full BusinessTemplate with header, body interpolation, and dynamic button URLs', () => {
      const template: BusinessTemplate = {
        id: 'test-tmpl-01',
        name: 'test_shipment',
        category: 'UTILITY',
        language: 'en_US',
        status: 'APPROVED',
        header_type: 'TEXT',
        header_content: 'Shipment Alert for {{1}}',
        body_text: 'Dear {{1}}, package #{{2}} is on the way.',
        footer_text: 'Delta Free API',
        buttons: [
          {
            type: 'URL',
            text: 'Track Now',
            url: 'https://track.delta.io/{{1}}',
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const rendered = renderTemplate(template, [
        {
          type: 'header',
          parameters: [{ type: 'text', text: 'Aarav' }],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Aarav' },
            { type: 'text', text: 'PKG-777' },
          ],
        },
        {
          type: 'button',
          index: 0,
          parameters: [{ type: 'text', text: 'PKG-777' }],
        },
      ]);

      expect(rendered.header).toBe('Shipment Alert for Aarav');
      expect(rendered.body).toBe('Dear Aarav, package #PKG-777 is on the way.');
      expect(rendered.footer).toBe('Delta Free API');
      expect(rendered.buttons[0].url).toBe('https://track.delta.io/PKG-777');
    });
  });

  describe('WhatsApp Webhook Dispatcher & HMAC-SHA256 Signatures', () => {
    it('constructs a 100% compliant WhatsApp Business Cloud API webhook payload', () => {
      const payload = buildWhatsAppWebhookPayload('phone_number_id_999', {
        statuses: [
          {
            id: 'deltamid.123456789',
            status: 'delivered',
            timestamp: '1730100000',
            recipient_id: '+919876543210',
            pricing: {
              billable: false,
              pricing_model: 'delta_zero_charge',
              category: 'utility',
            },
          },
        ],
        contacts: [
          {
            profile: { name: 'Priya Sharma' },
            wa_id: '919876543210',
          },
        ],
      });

      expect(payload.object).toBe('whatsapp_business_account');
      expect(payload.entry[0].id).toBe('phone_number_id_999');
      expect(payload.entry[0].changes[0].field).toBe('messages');
      expect(payload.entry[0].changes[0].value.messaging_product).toBe('whatsapp');
      expect(payload.entry[0].changes[0].value.statuses[0].status).toBe('delivered');
      expect(payload.entry[0].changes[0].value.statuses[0].pricing?.billable).toBe(false);
    });

    it('computes accurate HMAC-SHA256 signature matching X-Hub-Signature-256 standard', () => {
      const payloadStr = JSON.stringify({ event: 'test_payload' });
      const secret = 'apex_secret_key_123';
      const signature = computeWebhookSignature(payloadStr, secret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('verifies hub.challenge parameter on GET /api/v1/webhooks', async () => {
      const { GET } = await import('@/app/api/v1/webhooks/route');
      const challengeToken = '1158201444';
      const verifyToken = businessStore.getWebhookConfig().verify_token;

      const req = new Request(
        `http://localhost:3000/api/v1/webhooks?hub.mode=subscribe&hub.challenge=${challengeToken}&hub.verify_token=${verifyToken}`,
        { method: 'GET' }
      );

      const res = await GET(req as any);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe(challengeToken);
    });
  });

  describe('API Key Authentication & Management', () => {
    it('generates secure dlt_live_... API keys with unique hints', () => {
      const key = businessStore.generateApiKey('Payment Gateway Microservice');
      expect(key.key).toMatch(/^dlt_live_[a-f0-9]{32}$/);
      expect(key.hint).toMatch(/^dlt_live_\.\.\.[a-f0-9]{4}$/);
      expect(key.is_active).toBe(true);

      const isValid = businessStore.validateApiKey(key.key);
      expect(isValid).toBe(true);

      const isInvalid = businessStore.validateApiKey('dlt_live_fakefakefake');
      expect(isInvalid).toBe(false);
    });

    it('revokes API keys correctly', () => {
      const key = businessStore.generateApiKey('Temporary Key');
      expect(businessStore.validateApiKey(key.key)).toBe(true);

      businessStore.revokeApiKey(key.id);
      expect(businessStore.validateApiKey(key.key)).toBe(false);
    });

    it('rejects unauthorized requests with HTTP 401 when API key is missing or invalid', async () => {
      const { POST } = await import('@/app/api/v1/messages/route');

      // Missing header
      const reqMissing = new Request('http://localhost:3000/api/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: '+919876543210', type: 'text', text: { body: 'Hello' } }),
      });
      const resMissing = await POST(reqMissing as any);
      expect(resMissing.status).toBe(401);

      // Invalid header
      const reqInvalid = new Request('http://localhost:3000/api/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dlt_live_completely_fake_key_99999',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: '+919876543210', type: 'text', text: { body: 'Hello' } }),
      });
      const resInvalid = await POST(reqInvalid as any);
      expect(resInvalid.status).toBe(401);
    });
  });

  describe('Direct WhatsApp Drop-In Route Handler', () => {
    it('processes standard WhatsApp Cloud API payload and returns wamid and wa_id with zero rate', async () => {
      const { POST } = await import('@/app/[version]/[id]/messages/route');
      const req = new Request('http://localhost:3000/v19.0/1000948291/messages', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '+919876543210',
          type: 'text',
          text: { body: 'Test drop-in WhatsApp notification' },
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.messaging_product).toBe('whatsapp');
      expect(data.contacts[0].wa_id).toBe('919876543210');
      expect(data.messages[0].id).toMatch(/^wamid\.HBgM/);
      expect(data.messages[0].pricing.rate).toBe('0.00');
    });

    it('queues incoming messages for realtime client display in web app', async () => {
      const { GET } = await import('@/app/api/v1/messages/route');
      const req = new Request('http://localhost:3000/api/v1/messages', { method: 'GET' });
      const res = await GET(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.messaging_product).toBe('delta_business');
      expect(Array.isArray(data.messages)).toBe(true);
    });
  });

  describe('Media API Lifecycle (Upload, Retrieve, Delete)', () => {
    it('handles media upload and returns WhatsApp-compatible media ID', async () => {
      const { POST, GET, DELETE } = await import('@/app/api/v1/media/route');

      // 1. Upload
      const uploadReq = new Request('http://localhost:3000/api/v1/media', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: 'invoice_march.pdf',
          mime_type: 'application/pdf',
          file_size: 204800,
          url: 'https://track.apexlogistics.com/docs/invoice_march.pdf',
        }),
      });

      const uploadRes = await POST(uploadReq as any);
      const uploadData = await uploadRes.json();

      expect(uploadRes.status).toBe(200);
      expect(uploadData.id).toMatch(/^media_delta_/);
      expect(uploadData.messaging_product).toBe('whatsapp');

      // 2. Retrieve
      const getReq = new Request(`http://localhost:3000/api/v1/media?id=${uploadData.id}`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e' },
      });
      const getRes = await GET(getReq as any);
      const getData = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getData.id).toBe(uploadData.id);
      expect(getData.mime_type).toBe('application/pdf');

      // 3. Delete
      const deleteReq = new Request(`http://localhost:3000/api/v1/media?id=${uploadData.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e' },
      });
      const deleteRes = await DELETE(deleteReq as any);
      const deleteData = await deleteRes.json();
      expect(deleteRes.status).toBe(200);
      expect(deleteData.success).toBe(true);
    });
  });

  describe('Template Management CRUD', () => {
    it('creates, retrieves, and deletes WhatsApp templates via API', async () => {
      const { POST, GET, DELETE } = await import('@/app/api/v1/message_templates/route');

      // 1. Create Template
      const createReq = new Request('http://localhost:3000/api/v1/message_templates', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'flash_sale_march',
          category: 'MARKETING',
          language: 'en_US',
          header_type: 'TEXT',
          header_content: '⚡ Flash Sale Alert',
          body_text: 'Hi {{1}}, get {{2}}% off today only!',
          footer_text: 'Apex Store',
        }),
      });

      const createRes = await POST(createReq as any);
      const createData = await createRes.json();

      expect(createRes.status).toBe(200);
      expect(createData.status).toBe('APPROVED');
      expect(createData.category).toBe('MARKETING');

      // 2. List Templates
      const listReq = new Request('http://localhost:3000/api/v1/message_templates?name=flash_sale_march', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e' },
      });
      const listRes = await GET(listReq as any);
      const listData = await listRes.json();

      expect(listRes.status).toBe(200);
      expect(listData.data.some((t: any) => t.name === 'flash_sale_march')).toBe(true);

      // 3. Delete Template
      const deleteReq = new Request(`http://localhost:3000/api/v1/message_templates?id=${createData.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e' },
      });
      const deleteRes = await DELETE(deleteReq as any);
      const deleteData = await deleteRes.json();

      expect(deleteRes.status).toBe(200);
      expect(deleteData.success).toBe(true);
    });
  });

  describe('Business AI Services (Sentiment, Summarize, Template Suggest)', () => {
    it('analyzes sentiment on /api/v1/ai/sentiment', async () => {
      const { POST } = await import('@/app/api/v1/ai/sentiment/route');
      const req = new Request('http://localhost:3000/api/v1/ai/sentiment', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Thank you so much! The delivery arrived super fast and the packaging was excellent.',
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sentiment).toBe('positive');
      expect(data.score).toBeGreaterThan(0.5);
    });

    it('summarizes conversation threads on /api/v1/ai/summarize', async () => {
      const { POST } = await import('@/app/api/v1/ai/summarize/route');
      const req = new Request('http://localhost:3000/api/v1/ai/summarize', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Order Status Query',
          messages: [
            { sender: 'Customer', content: 'Where is my order #ORD-991?' },
            { sender: 'Agent', content: 'It is out for delivery today by 5 PM.' },
            { sender: 'Customer', content: 'Great, thank you!' },
          ],
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary).toBeDefined();
      expect(data.summary.executiveSummary).toBeDefined();
    });

    it('suggests optimized WhatsApp message templates on /api/v1/ai/templates/suggest', async () => {
      const { POST } = await import('@/app/api/v1/ai/templates/suggest/route');
      const req = new Request('http://localhost:3000/api/v1/ai/templates/suggest', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          use_case: 'abandoned cart discount',
          category: 'MARKETING',
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.template.name).toBeDefined();
      expect(data.template.body_text).toContain('{{1}}');
    });
  });

  describe('WhatsApp Drop-In Replacement & Zero-Code-Change Compatibility', () => {
    const validKey = 'dlt_live_9a2f7c01b4e6d38a529f60bc914e';
    const testPhoneId = '104829104859102';

    it('handles POST /v19.0/{id}/messages with messaging_product="whatsapp"', async () => {
      const { POST } = await import('@/app/[version]/[id]/messages/route');
      const req = new Request(`http://localhost:3000/v19.0/${testPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: '+919876543210',
          type: 'text',
          text: { preview_url: false, body: 'Testing zero-change drop-in' },
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.messaging_product).toBe('whatsapp');
      expect(data.contacts[0].wa_id).toBe('919876543210');
      expect(data.messages[0].id).toMatch(/^wamid\./);
      expect(data.messages[0].pricing.billable).toBe(false);
      expect(data.messages[0].pricing.rate).toBe('0.00');
    });

    it('auto-provisions and approves customer templates on-the-fly without 404', async () => {
      const { POST } = await import('@/app/[version]/[id]/messages/route');
      const req = new Request(`http://localhost:3000/v19.0/${testPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '+919876543210',
          type: 'template',
          template: {
            name: 'unregistered_legacy_client_template',
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: 'Rahul' },
                  { type: 'text', text: 'INV-4091' },
                ],
              },
            ],
          },
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.messages[0].id).toBeDefined();
      expect(businessStore.getTemplateByName('unregistered_legacy_client_template')).toBeDefined();
    });

    it('handles WhatsApp reaction messages (type: "reaction")', async () => {
      const { POST } = await import('@/app/[version]/[id]/messages/route');
      const req = new Request(`http://localhost:3000/v19.0/${testPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: '+919876543210',
          type: 'reaction',
          reaction: {
            message_id: 'wamid.HBgM9198765432101234567890abcdef',
            emoji: '👍',
          },
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.messages[0].id).toBeDefined();
    });

    it('handles WhatsApp mark-as-read status updates without error', async () => {
      const { POST } = await import('@/app/[version]/[id]/messages/route');
      const req = new Request(`http://localhost:3000/v19.0/${testPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: 'wamid.HBgM9198765432101234567890abcdef',
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('authenticates using access_token in URL query parameters', async () => {
      const { POST } = await import('@/app/[version]/[id]/messages/route');
      const req = new Request(`http://localhost:3000/v19.0/${testPhoneId}/messages?access_token=${validKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '+919876543210',
          type: 'text',
          text: { body: 'Testing URL query parameter token' },
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.messages[0].id).toBeDefined();
    });

    it('resolves phone number metadata on GET /v19.0/{phone_number_id}', async () => {
      const { GET } = await import('@/app/[version]/[id]/route');
      const req = new Request(`http://localhost:3000/v19.0/${testPhoneId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${validKey}` },
      });

      const res = await GET(req as any, { params: Promise.resolve({ version: 'v19.0', id: testPhoneId }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.code_verification_status).toBe('VERIFIED');
      expect(data.quality_rating).toBe('GREEN');
      expect(data.id).toBe(testPhoneId);
    });

    it('resolves and deletes media on GET & DELETE /v19.0/{media_id}', async () => {
      const { GET, DELETE } = await import('@/app/[version]/[id]/route');
      const mediaId = 'media_delta_default';

      const getReq = new Request(`http://localhost:3000/v19.0/${mediaId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${validKey}` },
      });

      const getRes = await GET(getReq as any, { params: Promise.resolve({ version: 'v19.0', id: mediaId }) });
      const getData = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getData.url).toBeDefined();
      expect(getData.mime_type).toBe('image/jpeg');

      const delReq = new Request(`http://localhost:3000/v19.0/${mediaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${validKey}` },
      });

      const delRes = await DELETE(delReq as any, { params: Promise.resolve({ version: 'v19.0', id: mediaId }) });
      const delData = await delRes.json();

      expect(delRes.status).toBe(200);
      expect(delData.success).toBe(true);
    });

    it('creates templates using Meta official components format', async () => {
      const { POST, GET } = await import('@/app/[version]/[id]/message_templates/route');
      const req = new Request(`http://localhost:3000/v19.0/waba_01/message_templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'meta_format_seasonal_offer',
          category: 'MARKETING',
          language: 'en_US',
          components: [
            { type: 'HEADER', format: 'TEXT', text: 'Special Deal for {{1}}' },
            { type: 'BODY', text: 'Hello {{1}}, claim {{2}}% off today!' },
            { type: 'FOOTER', text: 'Delta Zero-Charge' },
            { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Claim Now' }] },
          ],
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('APPROVED');

      // Verify GET returns official components structure
      const listReq = new Request(`http://localhost:3000/v19.0/waba_01/message_templates?name=meta_format_seasonal_offer`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${validKey}` },
      });

      const listRes = await GET(listReq as any);
      const listData = await listRes.json();

      const created = listData.data.find((t: any) => t.name === 'meta_format_seasonal_offer');
      expect(created).toBeDefined();
      expect(created.components).toBeDefined();
      expect(created.components.some((c: any) => c.type === 'BODY')).toBe(true);
      expect(created.components.some((c: any) => c.type === 'HEADER')).toBe(true);
    });
  });
});
