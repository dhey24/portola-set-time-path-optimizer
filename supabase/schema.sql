-- Run this once in the Supabase SQL editor for your project.
-- Portola Set-Time Path Optimizer schema.

create extension if not exists pgcrypto;

create table if not exists crews (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists crew_members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews(id) on delete cascade,
  display_name text not null,
  session_token uuid not null default gen_random_uuid(),
  attending_saturday boolean not null default true,
  attending_sunday boolean not null default true,
  ticket_type text not null default 'GA' check (ticket_type in ('GA', 'VIP')),
  created_at timestamptz not null default now(),
  unique (crew_id, display_name)
);

create table if not exists allocations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references crew_members(id) on delete cascade,
  day text not null check (day in ('saturday', 'sunday')),
  picks jsonb not null default '{}'::jsonb,
  locked boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (member_id, day)
);

-- Row Level Security: all access goes through the server using the service-role
-- key (see src/lib/store/supabaseStore.ts), so no anon-key policies are defined.
alter table crews enable row level security;
alter table crew_members enable row level security;
alter table allocations enable row level security;
