# Delta Production Readiness & Deployment Checklist

## 1. Security & Data Protection

- [x] **Row Level Security (RLS) on all tables:** Every application table enforces strict authorization policies in `supabase/migrations/20261027000002_rls_policies.sql`.
- [x] **No Leaked Service Role Keys:** Only `NEXT_PUBLIC_SUPABASE_ANON_KEY` is exposed in the browser; `SUPABASE_SERVICE_ROLE_KEY` is strictly reserved for server-side operations.
- [x] **Secure Session Handling:** Server-side auth verification via `@supabase/ssr` cookies with HTTP-only cookies in production.
- [x] **Input Validation:** Input sanitization and username format enforcement (`[a-z0-9_]`).
- [x] **Abuse Mitigation:** User blocking and abuse reporting persistence in `user_blocks` and `abuse_reports`.

---

## 2. Performance & High Concurrency

- [x] **Database Indexing:**
  - `idx_conversation_members_user` & `idx_conversation_members_conv` for sub-millisecond membership checks.
  - `idx_messages_conv_created` for chronological message paging.
  - `idx_profiles_username` for fast contact discovery.
- [x] **Optimistic UI:** Instant message appending with rollback handling on network failure.
- [x] **Realtime WebSocket Cleanups:** Subscriptions are cleaned up on component unmount to prevent connection leaks.
- [x] **Asset Optimization:** Next.js static asset optimization with SVG vector icons and responsive image loading.

---

## 3. Deployment Guide

### Option A: Next.js on Vercel + Supabase Cloud (Recommended)
1. Push repository to GitHub or GitLab.
2. Link project to [Vercel](https://vercel.com).
3. Set the following environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_APP_URL`: `https://your-delta-domain.com`
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<your-supabase-anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-supabase-service-role-key>`
   - `NEXT_PUBLIC_ENABLE_DEMO_MODE`: `false` (for live production mode)
4. Run migrations in your Supabase SQL Editor:
   - Execute `supabase/migrations/20261027000001_initial_schema.sql`
   - Execute `supabase/migrations/20261027000002_rls_policies.sql`
   - Execute `supabase/migrations/20261027000003_storage_buckets.sql`
   - Execute `supabase/migrations/20261027000004_realtime_setup.sql`
5. Deploy!

### Option B: Docker Self-Hosted Container
Build production Docker image:
```bash
docker build -t delta-messaging:latest .
docker run -p 3000:3000 --env-file .env.production delta-messaging:latest
```

---

## 4. STUN & TURN Infrastructure for Calls

- Standard Google STUN (`stun:stun.l.google.com:19302`) provides NAT traversal for 85%+ of residential broadband networks.
- For enterprise firewalls and restrictive mobile networks in India (e.g., symmetric NAT on cellular data), configure a coturn TURN server:
  - Set `TURN_SERVER_URL=turn:turn.delta-app.in:3478`
  - Set `TURN_USERNAME` and `TURN_CREDENTIAL`.
