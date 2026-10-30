import { Profile, Conversation, Message, DeltaStatus, Channel, Community } from '@/types';

/**
 * Delta AI System Profile
 * The built-in autonomous AI assistant for scheduling, smart replies, and NLP.
 */
export const DELTA_AI_PROFILE: Profile = {
  id: 'user-delta-ai',
  username: 'delta.ai',
  display_name: 'Delta AI',
  avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  phone_number: '+91 00000 00000',
  biography: 'Autonomous Delta AI Copilot. Natural language assistant, task scheduler, smart replies & translation.',
  status_message: 'Online ⚡ Autonomous Assistant & Task Scheduler',
  presence_status: 'online',
  last_seen_at: new Date().toISOString(),
  privacy_last_seen: 'everyone',
  privacy_read_receipts: true,
  privacy_profile_photo: 'everyone',
};

/**
 * Production initial states: 0 mock accounts, 0 mock conversations, 0 mock messages.
 * All user accounts are created via real Sign Up / Supabase Auth.
 */
export const DEMO_PROFILES: Profile[] = [];

export const DEMO_COMMUNITIES: Community[] = [];

export const DEMO_CHANNELS: Channel[] = [];

export const DEMO_STATUSES: DeltaStatus[] = [];

export const INITIAL_CONVERSATIONS: Conversation[] = [];

export const INITIAL_MESSAGES: Record<string, Message[]> = {};
