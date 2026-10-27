-- Delta Messaging Platform: Supabase Realtime Publication Configuration
-- Enables low-latency websocket broadcast for messaging, typing, presence, calls, reactions

begin;
  -- Add critical tables to supabase_realtime publication
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.message_receipts;
  alter publication supabase_realtime add table public.message_reactions;
  alter publication supabase_realtime add table public.conversations;
  alter publication supabase_realtime add table public.conversation_members;
  alter publication supabase_realtime add table public.profiles;
  alter publication supabase_realtime add table public.statuses;
  alter publication supabase_realtime add table public.call_sessions;
  alter publication supabase_realtime add table public.poll_votes;
commit;
