# ApplyVelocity X automation

This is an independent, text-only Vercel app. It does not import or modify the Instagram app. Ten daily cron routes write original X posts of at most 260 weighted characters (below the requested 280-character limit). The current mix is **2 founder connection prompts, 4 ApplyVelocity posts, 3 broader founder/startup/AI posts, and 1 practical prospecting tip**. Edit `lib/plan.js` to change that mix or the angles.

Posts are generated with Gemini at each scheduled slot, checked against recent content, sent through X's `POST /2/tweets`, and recorded in `public.x_posts`. A post with an uncertain X response is held for manual review to avoid accidental duplicates. The two connection posts take inspiration from the supplied examples without copying them repeatedly. Images are omitted for simplicity.

## Setup

1. Create a **separate Supabase project**. Run `supabase/migration.sql` in its SQL Editor. Copy its project URL and **service_role** key. This keeps X post records separate from Instagram.
2. In the [X Developer Console](https://console.x.com/), create or select an app, enable **Read and Write** permissions, and generate the app **API Key and Secret** plus the posting account's **Access Token and Access Token Secret**. Regenerate the user token after changing app permissions. A bearer-only app token cannot post on behalf of your account. Check that your X API credit balance and spending limit cover your intended volume.
3. In Vercel, import the **same Git repository as a new project**, with **Root Directory** set to `x-automation`. Leave the existing Instagram project and its Root Directory untouched. Choose the **Other** framework preset. This folder has no npm dependencies or build step.
4. Add every key from `.env.example` to the new Vercel project's **Production** environment. `CRON_SECRET` should be a long random string and must be unique to this project. `GEMINI_API_KEY` may use the same Google key if you choose, but set it separately in this Vercel project. The `SUPABASE_*` values must point to the separate X Supabase project.
5. Deploy this new Vercel project. Verify its 10 jobs in **Settings → Cron Jobs**. Production deployment activates the schedule.

The slots run in UTC at 02:00, 04:00, 05:00, 07:00, 08:00, 10:00, 11:00, 13:00, 15:00, and 17:00. These correspond to approximately 07:30 through 22:30 IST. Vercel Hobby may start each job anywhere within its scheduled UTC hour, so the exact post time varies.

## Test and operation

Run `npm test` locally. To test a deployed slot, send `GET https://YOUR-X-PROJECT.vercel.app/api/cron/1` with `Authorization: Bearer YOUR_CRON_SECRET`. The JSON must say `published: true` and include `postId` to confirm publication. A successful second call for the same date and slot returns the saved result without posting again. Do not share the secret or X tokens in screenshots.

Check `public.x_posts` for status and content. `posted` has a `tweet_id`. `failed` can be retried by calling the same slot route again after fixing the problem. `sending` or `uncertain` means the X request may have reached the platform: **check the X profile before manually changing that row or retrying**. This avoids duplicate posts when a network response is lost. Each slot is scheduled once per day; an API failure can cause that day's slot to be missed until manually retried.

X charges for API writes. At the [published rates](https://docs.x.com/x-api/getting-started/pricing), text-only posts without links cost less than posts containing a URL, so the generator includes the ApplyVelocity link only when it is genuinely useful. Review current rates and set a spending limit in the X Developer Console. X's [automation rules](https://help.x.com/en/rules-and-policies/x-automation) also prohibit duplicative or spammy posts; review the generated posts and adjust the content plan if they become repetitive.
