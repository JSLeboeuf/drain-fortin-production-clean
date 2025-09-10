-- Minimal tables used by Edge Function vapi-webhook
-- Idempotent creation to unblock production quickly

create extension if not exists pgcrypto;

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  call_id text,
  phone_number text,
  duration int,
  status text,
  transcript jsonb,
  summary text,
  analysis jsonb,
  tool_calls jsonb
);

create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  priority text,
  customer_name text,
  customer_phone text,
  service_type text,
  message text,
  recipients jsonb
);

