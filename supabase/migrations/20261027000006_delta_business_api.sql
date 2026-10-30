-- Delta Business Suite: Enterprise API, WhatsApp Compatibility Layer, & Zero-Charge Ledger
-- Compatible with PostgreSQL 15+ and Supabase

-- 1. Business Profiles & Accounts
create table if not exists public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  phone_number text not null,
  vertical text not null default 'Technology',
  about text default 'Verified Delta Business Partner',
  description text default '',
  email text not null,
  websites text[] default array[]::text[],
  avatar_url text,
  is_verified boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_business_account_user unique (user_id)
);

create index if not exists idx_business_phone on public.business_accounts(phone_number);

-- 2. Business API Keys (dlt_live_...)
create table if not exists public.business_api_keys (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  key_name text not null,
  api_key text unique not null,
  key_hint text not null,
  is_active boolean default true,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_business_api_keys_lookup on public.business_api_keys(api_key);

-- 3. Message Templates (Marketing, Utility, Authentication)
create table if not exists public.business_message_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  name text not null,
  category text not null check (category in ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  language text not null default 'en',
  status text not null default 'APPROVED' check (status in ('APPROVED', 'PENDING', 'REJECTED')),
  header_type text not null default 'NONE' check (header_type in ('TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO', 'NONE')),
  header_content text,
  body_text text not null,
  footer_text text,
  buttons jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_business_template_name_lang unique (business_id, name, language)
);

create index if not exists idx_business_templates_search on public.business_message_templates(business_id, name);

-- 4. Business Webhooks
create table if not exists public.business_webhooks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  url text not null,
  verify_token text not null,
  is_active boolean default true,
  events text[] default array['messages', 'message_status', 'reactions']::text[],
  last_delivery_status text default 'pending',
  last_delivery_at timestamptz,
  created_at timestamptz default now()
);

-- 5. Zero-Cost Ledger (Real-time tracking of savings vs Meta WhatsApp Business API)
create table if not exists public.business_api_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  recipient_phone text not null,
  message_id text not null,
  category text not null check (category in ('MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE')),
  message_type text not null default 'text',
  meta_whatsapp_rate numeric(10, 4) not null,
  delta_rate numeric(10, 4) not null default 0.0000,
  cost_saved numeric(10, 4) not null,
  currency text not null default 'INR',
  status text not null default 'delivered',
  created_at timestamptz default now()
);

create index if not exists idx_ledger_business on public.business_api_ledger(business_id, created_at desc);

-- 6. Helper Function: Calculate Cumulative Savings
create or replace function public.get_business_savings(b_id uuid)
returns table (
  total_messages bigint,
  total_meta_cost numeric(12, 2),
  total_delta_cost numeric(12, 2),
  total_savings numeric(12, 2),
  currency text
) as $$
begin
  return query
  select 
    count(l.id) as total_messages,
    coalesce(sum(l.meta_whatsapp_rate), 0.00) as total_meta_cost,
    coalesce(sum(l.delta_rate), 0.00) as total_delta_cost,
    coalesce(sum(l.cost_saved), 0.00) as total_savings,
    coalesce(max(l.currency), 'INR') as currency
  from public.business_api_ledger l
  where l.business_id = b_id;
end;
$$ language plpgsql security definer;
