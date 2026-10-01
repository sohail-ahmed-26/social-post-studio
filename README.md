# Social Post Studio

Build a web app called "SocialPilot" – a social media post maker and

scheduler dashboard. Stack: React + TypeScript + Tailwind + Supabase.

Pages:

1. Dashboard: counts of drafts, scheduled, published, failed posts.

2. Create Post: choose brand, topic/idea, platforms (Instagram, Facebook,

   LinkedIn), choose a template, caption editor, preview of the post card.

3. Calendar: monthly/weekly view of scheduled posts, click to edit.

4. Posts Library: table with status filters (draft, designed, scheduled,

   publishing, published, failed).

5. Accounts: connect/disconnect social accounts (UI only for now,

   show connection status per platform).

6. Logs: publish attempts with error messages.

Supabase (use Auth with email login + RLS per user). Create tables

with prefix smm_:

- smm_brands(id, user_id, name, tone, colors jsonb, logo_url)

- smm_social_accounts(id, brand_id, platform, account_name,

  external_id, access_token_encrypted, expires_at, status)

- smm_posts(id, brand_id, topic, caption, hashtags text[], platforms text[],

  template_id, status, created_at)

- smm_post_assets(id, post_id, image_url, width, height)

- smm_schedules(id, post_id, platform, scheduled_at, status, attempts)

- smm_publish_logs(id, schedule_id, platform, response jsonb, error, created_at)

- smm_templates(id, name, html, css, category)

Create a public Storage bucket "post-images".

Design: clean, modern, dark/light toggle, responsive.

Do not hardcode any secrets; use environment variables.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3864b651-7de5-4a11-b41e-f004e58c451e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
