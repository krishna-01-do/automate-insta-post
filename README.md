# Instagram Text Post Automation

A private Next.js service that generates a temporary queue of original text posts, renders each one as a 1080×1350 image, and publishes due posts to one Instagram professional account. There is no dashboard, authentication, billing, multi-account layer, or permanent post archive.

## How it works

- At approximately **05:30–06:29 IST** (`00:00 UTC` cron window), `/api/cron/generate` makes sure the queue contains 20 posts. It retries unfinished image work first, asks Gemini for any missing posts, rejects recent duplicates, assigns IST posting slots, renders SVG templates, uploads JPEG renditions to Cloudinary, and marks them pending.
- Ten once-daily publisher cron jobs run roughly 1–2 hours apart. Each calls a numbered path such as `/api/cron/publish/1`, atomically claims the oldest due post, creates or resumes its Instagram media container, waits until it is ready, and publishes it.
- After Instagram confirms publication, the service deletes the Cloudinary image and its Supabase row. Supabase therefore contains only queued, retrying, or failed work—not published-post history.
- Failed Instagram attempts return the same post to the queue. After three attempts it is marked `failed`. A saved container ID and a recent-caption lookup let the service recover safely from most interrupted requests without creating a second Instagram post.

This configuration works on **Vercel Hobby**: every individual cron job runs only once per day. Hobby timing is approximate, so Vercel may invoke a job at any point within its scheduled UTC hour.

## 1. Install

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
cp .env.example .env.local
```

## 2. Supabase

1. Create a Supabase project.
2. Open **SQL Editor**, paste `supabase/migration.sql`, and run it once.
3. From **Project Settings → API**, copy the project URL and `service_role` key into `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

The service-role key is server-only. Never expose it through a `NEXT_PUBLIC_` variable. Row Level Security is enabled and no public table policies are created.

The migration creates one `posts` queue table, indexes, validation constraints, a unique normalized quote hash, timestamps, and the `claim_due_post()` function used to prevent concurrent cron runs from publishing the same row.

## 3. Gemini

1. Create an API key in Google AI Studio.
2. Set `GEMINI_API_KEY`.
3. `GEMINI_MODEL` defaults to the fast, cost-efficient `gemini-3.5-flash-lite`; change it only to a model available to your key that supports structured JSON output.

The generator supplies the latest 100 quotes to Gemini, validates its JSON, and rejects exact or strongly overlapping results locally. The database hash is the final exact-duplicate safeguard.

## 4. Cloudinary

Create a Cloudinary account and copy the cloud name, API key, and API secret into the three `CLOUDINARY_*` variables. The backend uploads an SVG data URI with a signed server-side request and eagerly renders a public 1080×1350 JPEG URL for Instagram.

## 5. Instagram Graph API

You need an Instagram **Professional** account (Business or Creator) connected according to Meta's Instagram API setup, a Meta app with content-publishing access, the Instagram account ID, and a long-lived access token with the required publishing permissions. The integration automatically supports both Meta token families: Instagram Login tokens (`IG…`) use `graph.instagram.com`, while Facebook Login/Page tokens (`EAA…`) use `graph.facebook.com`.

Set:

```env
INSTAGRAM_ACCOUNT_ID=your_instagram_professional_account_id
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token
META_GRAPH_API_VERSION=v23.0
```

Meta access tokens expire or can be revoked. “No manual work” remains true only while the credentials and connected account remain valid. Use a Graph API version supported by your Meta app; update `META_GRAPH_API_VERSION` when you deliberately upgrade.

## 6. Environment variables

Copy `.env.example` to `.env.local` for local work. Generate `CRON_SECRET` as a random value of at least 32 characters. Add the same values to the Vercel project's Production environment.

Never commit `.env.local`, the Supabase service-role key, the Cloudinary API secret, or the Instagram token.

## 7. Local validation and testing

Run static checks and tests:

```bash
npm run typecheck
npm test
npm run build
```

Start the app:

```bash
npm run dev
```

Call the protected routes with your local secret:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/generate
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/publish/1
```

The publish route does nothing successfully when no post is due. For a controlled live test, set one row's `scheduled_at` to the past in Supabase, keep its status `pending`, then call the publish route once.

## 8. Deploy to Vercel

1. Push this directory to a Git repository and import it into Vercel.
2. The Vercel Hobby plan is sufficient for this schedule.
3. Add every `.env.example` value under **Project Settings → Environment Variables** for Production.
4. Deploy. Vercel reads both jobs from `vercel.json` automatically.
5. In **Settings → Cron Jobs**, verify the generator and all ten numbered publisher jobs are active.

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` to cron routes. Both handlers reject requests without the exact header.

## 9. Schedule

Posts target these Asia/Kolkata windows: 08:30, 10:30, 12:30, 14:30, 16:30, 17:30, 19:30, 21:30, 22:30, and 23:30. The stored due time is randomly moved 5–20 minutes earlier so the post is already eligible if Vercel invokes the cron at the beginning of its hour. Final timestamps are stored as UTC `timestamptz` values in Supabase.

On Hobby, actual publication can be up to roughly 59 minutes later than the target time. This is a Vercel scheduling limitation, not an application delay. The intervals therefore remain approximate.

## 10. Operations and retry behavior

- Gemini generation makes at most three attempts with increasing delays. Timeouts, network errors, and temporary 429/5xx responses are retried; the final attempt uses an alternate stable model. A batch that still cannot supply enough unique posts fails without publishing partial AI output.
- Cloudinary uploads retry three times. A row remains `generated` after a persistent image failure and is retried by the next generator run.
- Instagram failures increment `retry_count`; the same row and image are retried later. At three failures the row becomes `failed` with `error_message` preserved.
- A publishing claim becomes recoverable after 15 minutes if a function stops unexpectedly.
- If Instagram accepted a publish but cleanup was interrupted, the next attempt searches recent account media for the exact caption instead of publishing it again, then completes deletion.
- Published images and rows are deleted automatically. Only queued, retrying, and failed rows consume storage.

Check Vercel function logs and the Supabase `posts` table if a post reaches `failed`. After fixing the underlying credential/API problem, reset that row to `pending`, set `retry_count` to `0`, and clear `error_message` to retry it.

## Important platform limits

The Instagram API applies account and publishing limits. Ten feed posts per day is below the commonly documented 24-hour content-publishing limit, but Meta can change limits and permissions. Cloudinary transformations, Gemini calls, Vercel functions, and Supabase also remain subject to their plan quotas.
