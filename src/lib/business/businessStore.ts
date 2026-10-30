import {
  BusinessProfile,
  BusinessTemplate,
  BusinessApiKey,
  BusinessWebhookConfig,
  ZeroCostLedgerEntry,
  BusinessCategory,
  BusinessMediaItem,
  QueuedBusinessApiMessage,
} from '@/types/business';
import { calculateMessageSavings } from './costLedger';
import { createAdminClient } from '@/lib/supabase/admin';

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  id: 'biz-apex-01',
  business_name: 'Apex Retail & Logistics',
  phone_number: '+919876500000',
  verified_status: true,
  vertical: 'E-commerce & Logistics',
  about: 'Leading omnichannel retail and lightning delivery network.',
  description:
    'Apex Logistics uses Delta Business to power customer notifications, OTPs, tracking links, and interactive live support with 0% delivery markup.',
  email: 'support@apexlogistics.com',
  websites: ['https://apexlogistics.com', 'https://track.apexlogistics.com'],
  avatar_url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=200&auto=format&fit=crop&q=80',
};

export const INITIAL_BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: 'tmpl-order-01',
    name: 'order_dispatched',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    header_type: 'TEXT',
    header_content: '📦 Shipment Out for Delivery',
    body_text: 'Hi {{1}}, your order #{{2}} from Apex Retail is out for delivery! Estimated arrival is {{3}}.',
    footer_text: 'Delta Zero-Charge Delivery • Fast & Free',
    buttons: [
      {
        type: 'URL',
        text: 'Live Track Package',
        url: 'https://track.apexlogistics.com/shipment/{{1}}',
      },
      {
        type: 'QUICK_REPLY',
        text: 'Reschedule Dropoff',
        payload: 'RESCHEDULE_ORDER_{{2}}',
      },
    ],
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'tmpl-otp-02',
    name: 'otp_login_verification',
    category: 'AUTHENTICATION',
    language: 'en_US',
    status: 'APPROVED',
    header_type: 'NONE',
    body_text: '{{1}} is your one-time verification code for Apex account access. Valid for 10 minutes. Do not share this code with anyone.',
    footer_text: 'Security Alert • Apex Logistics',
    buttons: [
      {
        type: 'QUICK_REPLY',
        text: 'Copy Verification Code',
        payload: 'COPY_OTP',
      },
    ],
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'tmpl-promo-03',
    name: 'festive_super_sale',
    category: 'MARKETING',
    language: 'en_US',
    status: 'APPROVED',
    header_type: 'IMAGE',
    header_content: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
    body_text: 'Exclusive for {{1}}: Get up to {{2}}% off during the Mega Sale! Use coupon code {{3}} at checkout.',
    footer_text: 'Reply STOP to unsubscribe',
    buttons: [
      {
        type: 'URL',
        text: 'Claim Offer Online',
        url: 'https://apexlogistics.com/deals/festive',
      },
      {
        type: 'QUICK_REPLY',
        text: 'View Top Deals',
        payload: 'VIEW_DEALS',
      },
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'tmpl-feedback-04',
    name: 'customer_feedback_survey',
    category: 'SERVICE',
    language: 'en_US',
    status: 'APPROVED',
    header_type: 'TEXT',
    header_content: '⭐ How was your delivery experience?',
    body_text: 'Hi {{1}}, your package was successfully delivered. Please take 5 seconds to rate our courier agent {{2}}.',
    footer_text: 'Apex Customer Satisfaction Team',
    buttons: [
      {
        type: 'QUICK_REPLY',
        text: '⭐⭐⭐⭐⭐ Excellent',
        payload: 'RATING_5',
      },
      {
        type: 'QUICK_REPLY',
        text: '⭐⭐⭐ Average',
        payload: 'RATING_3',
      },
      {
        type: 'QUICK_REPLY',
        text: '⚠️ Report Issue',
        payload: 'RATING_ISSUE',
      },
    ],
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

export const INITIAL_API_KEYS: BusinessApiKey[] = [
  {
    id: 'key-live-01',
    name: 'Production Cloud API (ERP & Checkout)',
    key: 'dlt_live_9a2f7c01b4e6d38a529f60bc914e',
    hint: 'dlt_live_...914e',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    last_used_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    is_active: true,
  },
  {
    id: 'key-test-02',
    name: 'Staging & Sandbox Key',
    key: 'dlt_test_3c8e1a90f7d2b54881023a9d7211',
    hint: 'dlt_test_...7211',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    last_used_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    is_active: true,
  },
];

export const INITIAL_WEBHOOK_CONFIG: BusinessWebhookConfig = {
  url: 'https://api.apexlogistics.com/v1/integrations/delta/webhooks',
  verify_token: 'apex_delta_verify_secret_token_99',
  is_active: true,
  events: ['messages', 'message_status', 'reactions'],
  last_delivery_status: 'success',
  last_delivery_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
};

// Generate seeded zero-cost ledger entries
export const INITIAL_LEDGER_ENTRIES: ZeroCostLedgerEntry[] = [
  {
    id: 'led-01',
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    recipient: '+919876543210 (Priya Sharma)',
    category: 'UTILITY',
    message_type: 'template:order_dispatched',
    meta_whatsapp_rate: 0.115,
    delta_rate: 0.0,
    saved_amount: 0.115,
    currency: 'INR',
    status: 'read',
  },
  {
    id: 'led-02',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    recipient: '+919811223344 (Aarav Patel)',
    category: 'MARKETING',
    message_type: 'template:festive_super_sale',
    meta_whatsapp_rate: 0.8631,
    delta_rate: 0.0,
    saved_amount: 0.8631,
    currency: 'INR',
    status: 'delivered',
  },
  {
    id: 'led-03',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    recipient: '+919822334455 (Vikram Malhotra)',
    category: 'AUTHENTICATION',
    message_type: 'template:otp_login_verification',
    meta_whatsapp_rate: 0.115,
    delta_rate: 0.0,
    saved_amount: 0.115,
    currency: 'INR',
    status: 'read',
  },
  {
    id: 'led-04',
    timestamp: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    recipient: '+919833445566 (Ananya Sen)',
    category: 'SERVICE',
    message_type: 'interactive:quick_replies',
    meta_whatsapp_rate: 0.115,
    delta_rate: 0.0,
    saved_amount: 0.115,
    currency: 'INR',
    status: 'read',
  },
  {
    id: 'led-05',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    recipient: '+919844556677 (Rohan Gupta)',
    category: 'MARKETING',
    message_type: 'template:festive_super_sale',
    meta_whatsapp_rate: 0.8631,
    delta_rate: 0.0,
    saved_amount: 0.8631,
    currency: 'INR',
    status: 'delivered',
  },
];

export const INITIAL_MEDIA_ITEMS: BusinessMediaItem[] = [
  {
    id: 'media_delta_default',
    filename: 'apex_catalog.jpg',
    mime_type: 'image/jpeg',
    file_size: 142000,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

class BusinessStore {
  private profile: BusinessProfile = { ...INITIAL_BUSINESS_PROFILE };
  private templates: BusinessTemplate[] = [...INITIAL_BUSINESS_TEMPLATES];
  private apiKeys: BusinessApiKey[] = [...INITIAL_API_KEYS];
  private webhookConfig: BusinessWebhookConfig = { ...INITIAL_WEBHOOK_CONFIG };
  private ledger: ZeroCostLedgerEntry[] = [...INITIAL_LEDGER_ENTRIES];
  private mediaItems: BusinessMediaItem[] = [...INITIAL_MEDIA_ITEMS];
  private incomingMessageQueue: QueuedBusinessApiMessage[] = [];

  // Aggregated pre-seeded stats to represent realistic production usage
  private baseStats = {
    marketingCount: 38450,
    utilityCount: 84200,
    authCount: 16800,
    serviceCount: 9400,
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const storedProfile = localStorage.getItem('delta_biz_profile');
      if (storedProfile) this.profile = JSON.parse(storedProfile);

      const storedTemplates = localStorage.getItem('delta_biz_templates');
      if (storedTemplates) this.templates = JSON.parse(storedTemplates);

      const storedKeys = localStorage.getItem('delta_biz_keys');
      if (storedKeys) this.apiKeys = JSON.parse(storedKeys);

      const storedWebhook = localStorage.getItem('delta_biz_webhook');
      if (storedWebhook) this.webhookConfig = JSON.parse(storedWebhook);

      const storedLedger = localStorage.getItem('delta_biz_ledger');
      if (storedLedger) this.ledger = JSON.parse(storedLedger);

      const storedMedia = localStorage.getItem('delta_biz_media');
      if (storedMedia) this.mediaItems = JSON.parse(storedMedia);
    } catch (e) {
      console.warn('Error loading Delta Business state:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('delta_biz_profile', JSON.stringify(this.profile));
      localStorage.setItem('delta_biz_templates', JSON.stringify(this.templates));
      localStorage.setItem('delta_biz_keys', JSON.stringify(this.apiKeys));
      localStorage.setItem('delta_biz_webhook', JSON.stringify(this.webhookConfig));
      localStorage.setItem('delta_biz_ledger', JSON.stringify(this.ledger));
      localStorage.setItem('delta_biz_media', JSON.stringify(this.mediaItems));
    } catch (e) {
      console.warn('Error persisting Delta Business state:', e);
    }
  }

  public getProfile(): BusinessProfile {
    return this.profile;
  }

  public updateProfile(updates: Partial<BusinessProfile>): BusinessProfile {
    this.profile = { ...this.profile, ...updates };
    this.saveToStorage();

    // Persist to Supabase if available
    try {
      const admin = createAdminClient();
      if (admin) {
        admin.from('business_accounts').upsert({
          business_name: this.profile.business_name,
          phone_number: this.profile.phone_number,
          vertical: this.profile.vertical,
          about: this.profile.about,
          description: this.profile.description,
          email: this.profile.email,
          websites: this.profile.websites,
          avatar_url: this.profile.avatar_url,
          is_verified: this.profile.verified_status,
          updated_at: new Date().toISOString(),
        }).then();
      }
    } catch (e) {
      // Ignore in demo mode
    }

    return this.profile;
  }

  public getTemplates(): BusinessTemplate[] {
    return this.templates;
  }

  public getTemplateByName(name: string): BusinessTemplate | undefined {
    return this.templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
  }

  public addTemplate(templateData: Omit<BusinessTemplate, 'id' | 'created_at' | 'updated_at' | 'status'>): BusinessTemplate {
    const newTemplate: BusinessTemplate = {
      ...templateData,
      id: `tmpl-${Date.now()}`,
      status: 'APPROVED', // Instant approval on Delta (No Meta delays!)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.templates.unshift(newTemplate);
    this.saveToStorage();

    // Persist to Supabase if available
    try {
      const admin = createAdminClient();
      if (admin) {
        admin.from('business_message_templates').insert({
          name: newTemplate.name,
          category: newTemplate.category,
          language: newTemplate.language,
          status: newTemplate.status,
          header_type: newTemplate.header_type,
          header_content: newTemplate.header_content,
          body_text: newTemplate.body_text,
          footer_text: newTemplate.footer_text,
          buttons: newTemplate.buttons || [],
        }).then();
      }
    } catch (e) {
      // Ignore in demo mode
    }

    return newTemplate;
  }

  public deleteTemplate(id: string): boolean {
    this.templates = this.templates.filter((t) => t.id !== id);
    this.saveToStorage();

    try {
      const admin = createAdminClient();
      if (admin) {
        admin.from('business_message_templates').delete().eq('id', id).then();
      }
    } catch (e) {}

    return true;
  }

  public getApiKeys(): BusinessApiKey[] {
    return this.apiKeys;
  }

  public generateApiKey(name: string): BusinessApiKey {
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const fullKey = `dlt_live_${randomHex}`;
    const newKey: BusinessApiKey = {
      id: `key-${Date.now()}`,
      name: name || 'API Secret Key',
      key: fullKey,
      hint: `dlt_live_...${randomHex.slice(-4)}`,
      created_at: new Date().toISOString(),
      last_used_at: null,
      is_active: true,
    };
    this.apiKeys.unshift(newKey);
    this.saveToStorage();

    // Persist to Supabase if available
    try {
      const admin = createAdminClient();
      if (admin) {
        admin.from('business_api_keys').insert({
          key_name: newKey.name,
          api_key: newKey.key,
          key_hint: newKey.hint,
          is_active: true,
        }).then();
      }
    } catch (e) {}

    return newKey;
  }

  public revokeApiKey(id: string): boolean {
    this.apiKeys = this.apiKeys.filter((k) => k.id !== id);
    this.saveToStorage();

    try {
      const admin = createAdminClient();
      if (admin) {
        admin.from('business_api_keys').update({ is_active: false }).eq('id', id).then();
      }
    } catch (e) {}

    return true;
  }

  public validateApiKey(providedKey: string): boolean {
    if (!providedKey) return false;
    const cleanKey = providedKey.replace(/^(Bearer|OAuth)\s+/i, '').trim();

    // Check environment variable if configured
    if (process.env.DELTA_API_KEY && cleanKey === process.env.DELTA_API_KEY) {
      return true;
    }

    return this.apiKeys.some((k) => k.key === cleanKey && k.is_active);
  }

  public getWebhookConfig(): BusinessWebhookConfig {
    return this.webhookConfig;
  }

  public updateWebhookConfig(updates: Partial<BusinessWebhookConfig>): BusinessWebhookConfig {
    this.webhookConfig = { ...this.webhookConfig, ...updates };
    this.saveToStorage();

    try {
      const admin = createAdminClient();
      if (admin) {
        admin.from('business_webhooks').upsert({
          url: this.webhookConfig.url,
          verify_token: this.webhookConfig.verify_token,
          is_active: this.webhookConfig.is_active,
          events: this.webhookConfig.events,
          last_delivery_status: this.webhookConfig.last_delivery_status,
          last_delivery_at: this.webhookConfig.last_delivery_at,
        }).then();
      }
    } catch (e) {}

    return this.webhookConfig;
  }

  public recordLedgerEntry(params: {
    recipient: string;
    category: BusinessCategory;
    message_type: string;
    currency?: 'INR' | 'USD';
    message_id?: string;
  }): ZeroCostLedgerEntry {
    const currency = params.currency || 'INR';
    const savings = calculateMessageSavings(params.category, currency);

    const entry: ZeroCostLedgerEntry = {
      id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      recipient: params.recipient,
      category: params.category,
      message_type: params.message_type,
      meta_whatsapp_rate: savings.whatsappRate,
      delta_rate: 0.0,
      saved_amount: savings.saved,
      currency,
      status: 'delivered',
      message_id: params.message_id,
    };

    this.ledger.unshift(entry);
    if (this.ledger.length > 50) this.ledger = this.ledger.slice(0, 50);
    this.saveToStorage();

    // Persist to Supabase if available
    try {
      const admin = createAdminClient();
      if (admin) {
        admin.from('business_api_ledger').insert({
          recipient_phone: params.recipient,
          message_id: params.message_id || entry.id,
          category: params.category,
          message_type: params.message_type,
          meta_whatsapp_rate: savings.whatsappRate,
          delta_rate: 0.0,
          cost_saved: savings.saved,
          currency,
          status: 'delivered',
        }).then();
      }
    } catch (e) {}

    return entry;
  }

  public updateLedgerStatus(messageIdOrLedgerId: string, status: 'delivered' | 'sent' | 'read'): boolean {
    const entry = this.ledger.find(
      (e) => e.message_id === messageIdOrLedgerId || e.id === messageIdOrLedgerId
    );
    if (entry) {
      entry.status = status;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public getLedger(): ZeroCostLedgerEntry[] {
    return this.ledger;
  }

  public getCumulativeSavings() {
    // Combine base production stats with live ledger entries
    const marketing = this.baseStats.marketingCount + this.ledger.filter((l) => l.category === 'MARKETING').length;
    const utility = this.baseStats.utilityCount + this.ledger.filter((l) => l.category === 'UTILITY').length;
    const auth = this.baseStats.authCount + this.ledger.filter((l) => l.category === 'AUTHENTICATION').length;
    const service = this.baseStats.serviceCount + this.ledger.filter((l) => l.category === 'SERVICE').length;

    const totalMessages = marketing + utility + auth + service;

    // Rates in INR
    const metaCost =
      marketing * 0.8631 +
      utility * 0.115 +
      auth * 0.115 +
      service * 0.115;

    const deltaCost = 0.0;
    const totalSavings = metaCost - deltaCost;

    return {
      totalMessages,
      breakdown: {
        marketing,
        utility,
        auth,
        service,
      },
      metaCostINR: metaCost,
      deltaCostINR: 0.0,
      totalSavingsINR: totalSavings,
      totalSavingsUSD: totalSavings / 83.2,
      savedPercentage: 100,
    };
  }

  // --- Media Management ---
  public saveMedia(media: BusinessMediaItem): BusinessMediaItem {
    this.mediaItems.unshift(media);
    if (this.mediaItems.length > 100) this.mediaItems = this.mediaItems.slice(0, 100);
    this.saveToStorage();
    return media;
  }

  public getMedia(id: string): BusinessMediaItem | undefined {
    return this.mediaItems.find((m) => m.id === id);
  }

  public deleteMedia(id: string): boolean {
    const prevLen = this.mediaItems.length;
    this.mediaItems = this.mediaItems.filter((m) => m.id !== id);
    this.saveToStorage();
    return this.mediaItems.length < prevLen;
  }

  // --- Realtime Incoming API Message Queue ---
  public queueIncomingMessage(msg: QueuedBusinessApiMessage): void {
    this.incomingMessageQueue.push(msg);
    // Keep max 100 in queue
    if (this.incomingMessageQueue.length > 100) {
      this.incomingMessageQueue = this.incomingMessageQueue.slice(-100);
    }
  }

  public getPendingIncomingMessages(sinceTimestamp?: string): QueuedBusinessApiMessage[] {
    if (!sinceTimestamp) return [...this.incomingMessageQueue];
    const sinceTime = new Date(sinceTimestamp).getTime();
    return this.incomingMessageQueue.filter((m) => new Date(m.timestamp).getTime() > sinceTime);
  }

  public clearPendingIncomingMessages(): void {
    this.incomingMessageQueue = [];
  }
}

// Preserve singleton across server-side hot-reloads in Next.js
const globalAny = globalThis as any;
if (!globalAny.__delta_business_store) {
  globalAny.__delta_business_store = new BusinessStore();
}

export const businessStore: BusinessStore = globalAny.__delta_business_store;

