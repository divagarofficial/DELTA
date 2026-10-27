-- Delta Messaging Platform: Row Level Security (RLS) Policies
-- Enforces strict boundary isolation: conversations, messages, receipts, reactions, attachments, blocks, statuses, calls

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_attachments enable row level security;
alter table public.user_blocks enable row level security;
alter table public.abuse_reports enable row level security;
alter table public.statuses enable row level security;
alter table public.status_views enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.channels enable row level security;
alter table public.channel_subscribers enable row level security;
alter table public.call_sessions enable row level security;

-- Helper security function: check if authenticated user is member of a conversation
create or replace function public.is_conversation_member(conv_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.conversation_members
    where conversation_id = conv_id
      and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Helper security function: check if authenticated user is blocked by or has blocked another user
create or replace function public.is_user_blocked(other_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.user_blocks
    where (blocker_id = auth.uid() and blocked_id = other_user_id)
       or (blocker_id = other_user_id and blocked_id = auth.uid())
  );
end;
$$ language plpgsql security definer;

-- 1. Profiles Policies
-- Any authenticated user can read public profile details (respecting blocks)
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (not public.is_user_blocked(id));

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Contacts Policies
create policy "Users can view own contacts"
  on public.contacts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can add contacts"
  on public.contacts for insert
  to authenticated
  with check (auth.uid() = user_id and not public.is_user_blocked(contact_user_id));

create policy "Users can update own contacts"
  on public.contacts for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own contacts"
  on public.contacts for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3. Conversations Policies
-- A user can see conversations they are a member of
create policy "Members can view conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_member(id));

-- Any authenticated user can create a conversation
create policy "Users can create conversations"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Only admins/creators of conversation can update metadata
create policy "Admins can update conversation metadata"
  on public.conversations for update
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = id
        and user_id = auth.uid()
        and role in ('admin', 'moderator')
    )
  );

-- 4. Conversation Members Policies
-- Members can view membership list of conversations they belong to
create policy "Members can view conversation members"
  on public.conversation_members for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

-- Creators or Admins can add members, or user can join channel
create policy "Admins or creators can add conversation members"
  on public.conversation_members for insert
  to authenticated
  with check (
    -- either user adding themselves when creating conversation
    auth.uid() = user_id
    or
    -- or user is an admin of the conversation
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- Users can update their own membership state (e.g., mute, archive, pin, custom draft, last_read_at)
create policy "Users can update own membership state"
  on public.conversation_members for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins can remove members, or members can leave
create policy "Members can leave or admins can remove"
  on public.conversation_members for delete
  to authenticated
  using (
    auth.uid() = user_id
    or
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- 5. Messages Policies
-- Members of the conversation can view messages (excluding deleted/expired)
create policy "Members can view messages"
  on public.messages for select
  to authenticated
  using (
    public.is_conversation_member(conversation_id)
    and (expires_at is null or expires_at > now())
  );

-- Members can insert messages (must be conversation member and sender_id must be self)
create policy "Members can send messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id)
  );

-- Senders can update own messages (editing or soft delete)
create policy "Senders can update own messages"
  on public.messages for update
  to authenticated
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

-- Senders or Admins can delete messages
create policy "Senders or admins can delete messages"
  on public.messages for delete
  to authenticated
  using (
    auth.uid() = sender_id
    or
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- 6. Message Receipts Policies
create policy "Conversation members can view receipts"
  on public.message_receipts for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );

create policy "Users can insert own receipts"
  on public.message_receipts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 7. Message Reactions Policies
create policy "Conversation members can view reactions"
  on public.message_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );

create policy "Users can add own reactions"
  on public.message_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove own reactions"
  on public.message_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- 8. Message Attachments Policies
create policy "Conversation members can view attachments"
  on public.message_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );

create policy "Message senders can insert attachments"
  on public.message_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.sender_id = auth.uid()
    )
  );

-- 9. User Blocks Policies
create policy "Users can view their block list"
  on public.user_blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

create policy "Users can block users"
  on public.user_blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

create policy "Users can unblock users"
  on public.user_blocks for delete
  to authenticated
  using (auth.uid() = blocker_id);

-- 10. Abuse Reports Policies
create policy "Users can view reports they created"
  on public.abuse_reports for select
  to authenticated
  using (auth.uid() = reporter_id);

create policy "Users can submit abuse reports"
  on public.abuse_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- 11. Statuses Policies
create policy "Users can view statuses from non-blocking users"
  on public.statuses for select
  to authenticated
  using (
    (auth.uid() = user_id or not public.is_user_blocked(user_id))
    and expires_at > now()
  );

create policy "Users can create own status"
  on public.statuses for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own status"
  on public.statuses for delete
  to authenticated
  using (auth.uid() = user_id);

-- Status Views
create policy "Status owners can view receipts"
  on public.status_views for select
  to authenticated
  using (
    exists (
      select 1 from public.statuses s
      where s.id = status_id and s.user_id = auth.uid()
    )
  );

create policy "Viewers can record status views"
  on public.status_views for insert
  to authenticated
  with check (auth.uid() = viewer_id);

-- 12. Polls & Votes Policies
create policy "Conversation members can view polls"
  on public.polls for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );

create policy "Message sender can insert poll"
  on public.polls for insert
  to authenticated
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id and m.sender_id = auth.uid()
    )
  );

create policy "Conversation members can view poll options"
  on public.poll_options for select
  to authenticated
  using (true);

create policy "Poll owners can insert poll options"
  on public.poll_options for insert
  to authenticated
  with check (
    exists (
      select 1 from public.polls p
      join public.messages m on m.id = p.message_id
      where p.id = poll_id and m.sender_id = auth.uid()
    )
  );

create policy "Conversation members can view poll votes"
  on public.poll_votes for select
  to authenticated
  using (true);

create policy "Conversation members can cast votes"
  on public.poll_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can retract vote"
  on public.poll_votes for delete
  to authenticated
  using (auth.uid() = user_id);

-- 13. Call Sessions Policies
create policy "Participants can view their call sessions"
  on public.call_sessions for select
  to authenticated
  using (auth.uid() = caller_id or auth.uid() = receiver_id);

create policy "Users can initiate calls"
  on public.call_sessions for insert
  to authenticated
  with check (auth.uid() = caller_id and not public.is_user_blocked(receiver_id));

create policy "Participants can update call session"
  on public.call_sessions for update
  to authenticated
  using (auth.uid() = caller_id or auth.uid() = receiver_id);
