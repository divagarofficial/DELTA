-- Delta Messaging Platform: Initial Database Schema
-- Compatible with PostgreSQL 15+ and Supabase

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. Profiles Table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  phone_number text,
  biography text default '',
  status_message text default 'Hey there! I am using Delta.',
  presence_status text default 'offline' check (presence_status in ('online', 'offline', 'away', 'busy')),
  last_seen_at timestamptz default now(),
  privacy_last_seen text default 'everyone' check (privacy_last_seen in ('everyone', 'contacts', 'nobody')),
  privacy_read_receipts boolean default true,
  privacy_profile_photo text default 'everyone' check (privacy_profile_photo in ('everyone', 'contacts', 'nobody')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for username lookups and profile queries
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_phone on public.profiles(phone_number);

-- 2. Contact Relationships
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_user_id uuid not null references public.profiles(id) on delete cascade,
  nickname text,
  created_at timestamptz default now(),
  constraint uq_contacts_pair unique (user_id, contact_user_id),
  constraint chk_no_self_contact check (user_id != contact_user_id)
);

create index if not exists idx_contacts_user on public.contacts(user_id);
create index if not exists idx_contacts_contact on public.contacts(contact_user_id);

-- 3. Communities
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  avatar_url text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Community Members
create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'moderator', 'member')),
  joined_at timestamptz default now(),
  constraint uq_community_member unique (community_id, user_id)
);

-- 4. Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct', 'group', 'channel')),
  title text,
  description text default '',
  avatar_url text,
  created_by uuid references public.profiles(id) on delete set null,
  community_id uuid references public.communities(id) on delete set null,
  disappearing_duration_seconds int default 0,
  pinned_message_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_conversations_type on public.conversations(type);
create index if not exists idx_conversations_updated on public.conversations(updated_at desc);

-- 5. Conversation Members
create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'moderator', 'member')),
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  is_muted boolean default false,
  is_archived boolean default false,
  is_pinned boolean default false,
  custom_draft text default '',
  constraint uq_conversation_member unique (conversation_id, user_id)
);

create index if not exists idx_conversation_members_user on public.conversation_members(user_id);
create index if not exists idx_conversation_members_conv on public.conversation_members(conversation_id);

-- 6. Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  content text not null,
  type text not null default 'text' check (type in ('text', 'image', 'document', 'audio', 'video', 'poll', 'system', 'call')),
  reply_to_message_id uuid references public.messages(id) on delete set null,
  forwarded_from_id uuid references public.messages(id) on delete set null,
  is_edited boolean default false,
  edited_at timestamptz,
  is_deleted boolean default false,
  deleted_at timestamptz,
  expires_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_messages_conv_created on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_reply_to on public.messages(reply_to_message_id);

-- 7. Message Receipts (Sent, Delivered, Read)
create table if not exists public.message_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('sent', 'delivered', 'read')),
  timestamp timestamptz default now(),
  constraint uq_message_receipt unique (message_id, user_id, status)
);

create index if not exists idx_receipts_message on public.message_receipts(message_id);
create index if not exists idx_receipts_user on public.message_receipts(user_id);

-- 8. Message Reactions
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  constraint uq_message_reaction unique (message_id, user_id, emoji)
);

create index if not exists idx_reactions_message on public.message_reactions(message_id);

-- 9. Message Attachments
create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  duration_seconds numeric,
  thumbnail_url text,
  created_at timestamptz default now()
);

create index if not exists idx_attachments_message on public.message_attachments(message_id);

-- 10. User Blocks
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  constraint uq_user_block unique (blocker_id, blocked_id),
  constraint chk_no_self_block check (blocker_id != blocked_id)
);

create index if not exists idx_blocks_blocker on public.user_blocks(blocker_id);
create index if not exists idx_blocks_blocked on public.user_blocks(blocked_id);

-- 11. Abuse Reports
create table if not exists public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at timestamptz default now()
);

-- 12. Delta Status (24-hour stories)
create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  media_url text,
  media_type text default 'text' check (media_type in ('text', 'image', 'video')),
  background_color text default '#4F46E5',
  caption text,
  privacy text default 'contacts' check (privacy in ('everyone', 'contacts', 'nobody')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz default now()
);

create index if not exists idx_statuses_user on public.statuses(user_id);
create index if not exists idx_statuses_expires on public.statuses(expires_at);

-- Status Views
create table if not exists public.status_views (
  id uuid primary key default gen_random_uuid(),
  status_id uuid not null references public.statuses(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz default now(),
  constraint uq_status_view unique (status_id, viewer_id)
);

-- 13. Polls
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  question text not null,
  is_multiple boolean default false,
  is_anonymous boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_text text not null,
  order_index int default 0
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  constraint uq_poll_vote unique (poll_id, option_id, user_id)
);

-- 14. Channels & Channel Subscribers
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  handle text unique not null,
  description text default '',
  avatar_url text,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  is_verified boolean default false,
  subscribers_count int default 0,
  created_at timestamptz default now()
);

create table if not exists public.channel_subscribers (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscribed_at timestamptz default now(),
  constraint uq_channel_sub unique (channel_id, user_id)
);

-- 15. Call Sessions (WebRTC Signaling)
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  call_type text not null default 'audio' check (call_type in ('audio', 'video')),
  status text not null default 'offering' check (status in ('offering', 'ringing', 'connected', 'ended', 'rejected', 'busy', 'missed')),
  sdp_offer jsonb,
  sdp_answer jsonb,
  ice_candidates jsonb default '[]'::jsonb,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds int default 0
);

create index if not exists idx_calls_receiver on public.call_sessions(receiver_id, status);
create index if not exists idx_calls_caller on public.call_sessions(caller_id);

-- Trigger for automatically updating updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tr_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger tr_conversations_updated_at
  before update on public.conversations
  for each row execute function public.handle_updated_at();

-- Trigger for automatically creating profile when auth.user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', 'Delta Member'),
    new.raw_user_meta_data->>'avatar_url',
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Auth hook trigger
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
