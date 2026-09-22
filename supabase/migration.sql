create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  quote text not null,
  quote_hash text not null unique,
  caption text not null,
  hashtags jsonb not null default '[]'::jsonb check (jsonb_typeof(hashtags) = 'array'),
  image_url text,
  status text not null check (status in ('generated', 'pending', 'publishing', 'failed')),
  scheduled_at timestamptz not null,
  generated_at timestamptz not null default now(),
  instagram_container_id text,
  retry_count integer not null default 0 check (retry_count >= 0),
  error_message text,
  publishing_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_scheduled_at_idx on public.posts (scheduled_at);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_due_idx on public.posts (scheduled_at, created_at)
  where status in ('pending', 'publishing');

alter table public.posts enable row level security;

create or replace function public.set_posts_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_posts_updated_at();

create or replace function public.claim_due_post()
returns setof public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  select id into claimed_id
  from public.posts
  where retry_count < 3
    and scheduled_at <= now()
    and (
      status = 'pending'
      or (status = 'publishing' and publishing_started_at < now() - interval '15 minutes')
    )
  order by scheduled_at asc, created_at asc
  for update skip locked
  limit 1;

  if claimed_id is null then return; end if;

  return query
  update public.posts
  set status = 'publishing', publishing_started_at = now(), error_message = null
  where id = claimed_id
  returning *;
end;
$$;

revoke all on function public.claim_due_post() from public, anon, authenticated;
grant execute on function public.claim_due_post() to service_role;
