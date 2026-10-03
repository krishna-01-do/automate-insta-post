create extension if not exists pgcrypto;

create table if not exists public.x_posts (
  post_date date not null,
  slot smallint not null check (slot between 1 and 10),
  kind text not null,
  content text,
  status text not null check (status in ('working', 'sending', 'posted', 'failed', 'uncertain')),
  lease_id uuid not null default gen_random_uuid(),
  started_at timestamptz not null default now(),
  tweet_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_date, slot)
);

create index if not exists x_posts_created_at_idx on public.x_posts (created_at desc);
alter table public.x_posts enable row level security;

create or replace function public.claim_x_slot(p_date date, p_slot smallint, p_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_row public.x_posts%rowtype;
begin
  if p_slot < 1 or p_slot > 10 then raise exception 'Invalid slot'; end if;
  insert into public.x_posts (post_date, slot, kind, status)
  values (p_date, p_slot, p_kind, 'working')
  on conflict do nothing returning * into v_row;
  if found then return jsonb_build_object('claimed', true, 'post', to_jsonb(v_row)); end if;

  select * into v_row from public.x_posts
  where post_date = p_date and slot = p_slot for update;

  if v_row.status = 'failed'
     or (v_row.status = 'working' and v_row.started_at < now() - interval '15 minutes') then
    update public.x_posts set status = 'working', lease_id = gen_random_uuid(),
      started_at = now(), error_message = null, updated_at = now()
    where post_date = p_date and slot = p_slot returning * into v_row;
    return jsonb_build_object('claimed', true, 'post', to_jsonb(v_row));
  end if;

  return jsonb_build_object('claimed', false, 'post', to_jsonb(v_row));
end;
$$;

revoke all on function public.claim_x_slot(date, smallint, text) from public, anon, authenticated;
grant execute on function public.claim_x_slot(date, smallint, text) to service_role;
