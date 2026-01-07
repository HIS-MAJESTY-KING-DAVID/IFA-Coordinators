begin;
create extension if not exists pgcrypto;

create table if not exists public.coordinators (
  id text primary key default gen_random_uuid(),
  name text not null,
  stars integer not null default 1 check (stars >= 0),
  available boolean not null default true,
  phone text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  month_start date not null unique check (extract(day from month_start) = 1),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  date date not null,
  type text not null check (type in ('Friday','Sunday')),
  coordinator_id text references public.coordinators(id),
  is_joined boolean not null default false,
  created_at timestamp with time zone not null default now(),
  unique (board_id, date)
);

create index if not exists assignments_board_id_idx on public.assignments(board_id);
create index if not exists assignments_coordinator_id_idx on public.assignments(coordinator_id);
commit;
