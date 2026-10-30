import { MessageType, ReceiptStatus } from './index';

export type BusinessCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'SERVICE';
export type TemplateHeaderType = 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NONE';
export type TemplateButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

export interface TemplateButton {
  type: TemplateButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  payload?: string;
}

export interface BusinessTemplate {
  id: string;
  name: string;
  category: BusinessCategory;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  header_type: TemplateHeaderType;
  header_content?: string;
  body_text: string;
  footer_text?: string;
  buttons?: TemplateButton[];
  created_at: string;
  updated_at: string;
}

export interface BusinessApiKey {
  id: string;
  name: string;
  key: string;
  hint: string;
  created_at: string;
  last_used_at?: string | null;
  is_active: boolean;
}

export interface BusinessProfile {
  id: string;
  business_name: string;
  phone_number: string;
  verified_status: boolean;
  vertical: string; // e.g. "Retail", "Finance", "Healthcare", "E-commerce"
  about: string;
  description: string;
  email: string;
  websites: string[];
  avatar_url?: string;
}

export interface BusinessWebhookConfig {
  url: string;
  verify_token: string;
  is_active: boolean;
  events: string[];
  last_delivery_status?: 'success' | 'failed' | 'pending';
  last_delivery_at?: string;
}

export interface ZeroCostLedgerEntry {
  id: string;
  timestamp: string;
  recipient: string;
  category: BusinessCategory;
  message_type: string;
  meta_whatsapp_rate: number; // e.g. 0.8631
  delta_rate: number;         // Always 0.0000
  saved_amount: number;       // e.g. 0.8631
  currency: string;           // "INR" or "USD"
  status: 'delivered' | 'sent' | 'read';
  message_id?: string;
}

export interface InteractiveButtonComponent {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface InteractiveListSectionRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title: string;
  rows: InteractiveListSectionRow[];
}

export interface InteractiveMessagePayload {
  type: 'button' | 'list' | 'cta_url';
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    image?: { link: string };
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: {
    button?: string; // List button text
    buttons?: InteractiveButtonComponent[];
    sections?: InteractiveListSection[];
  };
}

export interface WhatsAppCompatibleSendMessageRequest {
  messaging_product?: 'delta' | 'whatsapp' | string;
  recipient_type?: 'individual';
  to?: string; // phone number (e.g. +919876543210) or user identifier (optional for status='read')
  status?: 'read';
  message_id?: string;
  context?: {
    message_id: string;
  };
  type?: 'text' | 'template' | 'interactive' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contacts' | 'reaction';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  reaction?: {
    message_id: string;
    emoji: string;
  };
  template?: {
    name: string;
    language: { code: string };
    components?: {
      type: 'header' | 'body' | 'button';
      sub_type?: 'url' | 'quick_reply';
      index?: number;
      parameters: {
        type: 'text' | 'currency' | 'date_time' | 'image' | 'document';
        text?: string;
        image?: { link: string };
      }[];
    }[];
  };
  interactive?: InteractiveMessagePayload;
  image?: { link?: string; id?: string; caption?: string };
  document?: { link?: string; id?: string; filename?: string; caption?: string };
  audio?: { link?: string; id?: string };
  video?: { link?: string; id?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: any[];
}

export interface WhatsAppCompatibleSendMessageResponse {
  messaging_product: 'delta_business';
  contacts: {
    input: string;
    delta_id: string;
    wa_id?: string;
  }[];
  messages: {
    id: string;
    message_status: 'accepted' | 'sent' | 'delivered';
    pricing: {
      billable: boolean;
      pricing_model: 'delta_zero_charge';
      category: BusinessCategory | string;
      rate: '0.00';
      currency: string;
      saved_vs_whatsapp: string;
      meta_equivalent_rate?: string;
    };
  }[];
}

export interface BusinessMediaItem {
  id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  url: string;
  data_base64?: string;
  created_at: string;
}

export interface QueuedBusinessApiMessage {
  id: string;
  to: string;
  content: string;
  type: string;
  metadata?: Record<string, any>;
  attachments?: any[];
  timestamp: string;
}

