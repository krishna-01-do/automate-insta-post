-- Run this once on databases created before Reel support was added.
alter table public.posts add column if not exists video_url text;
alter table public.posts add column if not exists video_public_id text;
