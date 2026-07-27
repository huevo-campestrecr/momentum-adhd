-- ============================================================
-- Momentum ADHD — Supabase Schema
-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Habits ───────────────────────────────────────────────────
create table habits (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  cat         text not null check (cat in ('health','home','prod')),
  emoji       text not null default '⭐',
  pts         int not null default 5,
  days        int[] not null default '{}',  -- empty = every day
  time        text not null default '08:00',
  created_at  timestamptz default now()
);

alter table habits enable row level security;
create policy "Users manage own habits"
  on habits for all using (auth.uid() = user_id);

-- ─── Completions ─────────────────────────────────────────────
create table completions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  habit_id      uuid references habits(id) on delete cascade not null,
  completed_on  date not null,
  created_at    timestamptz default now(),
  unique(habit_id, completed_on)
);

alter table completions enable row level security;
create policy "Users manage own completions"
  on completions for all using (auth.uid() = user_id);

-- ─── User state ───────────────────────────────────────────────
-- Stores grumpy meter, pending treats, earned achievements,
-- sprint count, and other counters that need to persist
create table user_state (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  grumpy_meter        int not null default 25,
  pending_treats      int not null default 0,
  earned_achievements text[] not null default '{}',
  total_sprints       int not null default 0,
  total_habits        int not null default 0,
  water_count         int not null default 0,
  bed_count           int not null default 0,
  plan_count          int not null default 0,
  full_days_count     int not null default 0,
  updated_at          timestamptz default now()
);

alter table user_state enable row level security;
create policy "Users manage own state"
  on user_state for all using (auth.uid() = user_id);

-- ─── Sprints log (optional, for future analytics) ─────────────
create table sprints (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  mins        int not null,
  task        text,
  completed   boolean not null default true,
  created_at  timestamptz default now()
);

alter table sprints enable row level security;
create policy "Users manage own sprints"
  on sprints for all using (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────
create index on habits(user_id);
create index on completions(user_id, completed_on);
create index on sprints(user_id, created_at);
