export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
export type PrivacySetting = 'everyone' | 'contacts' | 'nobody';
export type ConversationType = 'direct' | 'group' | 'channel';
export type MemberRole = 'admin' | 'moderator' | 'member';
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'poll' | 'system' | 'call';
export type ReceiptStatus = 'sent' | 'delivered' | 'read';
export type CallType = 'audio' | 'video';
export type CallStatus = 'offering' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'busy' | 'missed';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  biography?: string | null;
  status_message?: string | null;
  presence_status?: PresenceStatus;
  last_seen_at?: string;
  privacy_last_seen?: PrivacySetting;
  privacy_read_receipts?: boolean;
  privacy_profile_photo?: PrivacySetting;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  nickname?: string | null;
  created_at: string;
  profile?: Profile;
}

export interface SyncedPhoneContact {
  id: string;
  name: string;
  phone_number: string;
  normalized_phone: string;
  is_on_delta: boolean;
  delta_user_id?: string;
  delta_profile?: Profile;
  synced_at: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  created_by?: string | null;
  community_id?: string | null;
  disappearing_duration_seconds?: number;
  pinned_message_id?: string | null;
  created_at: string;
  updated_at: string;
  // Augmented UI fields
  last_message?: Message | null;
  unread_count?: number;
  members?: ConversationMember[];
  is_muted?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
  draft?: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  last_read_at?: string;
  is_muted?: boolean;
  is_archived?: boolean;
  is_pinned?: boolean;
  custom_draft?: string;
  profile?: Profile;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  duration_seconds?: number | null;
  thumbnail_url?: string | null;
  created_at?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user_profile?: Profile;
}

export interface MessageReceipt {
  id: string;
  message_id: string;
  user_id: string;
  status: ReceiptStatus;
  timestamp: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  order_index: number;
  votes_count?: number;
  has_voted?: boolean;
}

export interface Poll {
  id: string;
  message_id: string;
  question: string;
  is_multiple: boolean;
  is_anonymous: boolean;
  options: PollOption[];
  total_votes?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id?: string | null;
  content: string;
  type: MessageType;
  reply_to_message_id?: string | null;
  forwarded_from_id?: string | null;
  is_edited?: boolean;
  edited_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  // Augmented UI fields
  sender?: Profile | null;
  reply_to?: Message | null;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  receipts?: MessageReceipt[];
  poll?: Poll | null;
  status?: ReceiptStatus; // Sender's perspective: sent, delivered, read
  is_optimistic?: boolean;
  has_failed?: boolean;
}

export interface DeltaStatus {
  id: string;
  user_id: string;
  content?: string | null;
  media_url?: string | null;
  media_type: 'text' | 'image' | 'video';
  background_color?: string;
  caption?: string | null;
  privacy?: PrivacySetting;
  expires_at: string;
  created_at: string;
  user?: Profile;
  views_count?: number;
  has_viewed?: boolean;
  views?: { viewer_id: string; viewed_at: string; viewer?: Profile }[];
}

export interface Community {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  members_count?: number;
  groups_count?: number;
}

export interface Channel {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  avatar_url?: string | null;
  creator_id: string;
  is_verified?: boolean;
  subscribers_count: number;
  created_at: string;
  is_subscribed?: boolean;
}

export interface CallSession {
  id: string;
  caller_id: string;
  receiver_id: string;
  conversation_id?: string | null;
  call_type: CallType;
  status: CallStatus;
  sdp_offer?: any;
  sdp_answer?: any;
  ice_candidates?: any[];
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
  caller?: Profile;
  receiver?: Profile;
}
