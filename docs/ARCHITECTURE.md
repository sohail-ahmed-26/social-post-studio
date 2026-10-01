# Architecture aur contract

```
Website (Lovable) -> Supabase <- Agents (localhost, agents/)
                                   Main -> Content -> Designer -> (schedule) -> Scheduler -> Publisher
```

## Status flow (smm_posts.status)
draft -> designed -> scheduled -> publishing -> published | failed

## Kaun kya likhta hai
| Agent | Parhta hai | Likhta hai |
|---|---|---|
| Content (owner) | smm_posts, smm_brands | smm_posts.caption, hashtags |
| Designer (C1) | smm_posts, smm_brands, smm_templates | Storage post-images, smm_post_assets, status = designed |
| Main (owner) | sab | smm_schedules (status pending), status = scheduled |
| Scheduler + Publisher (C2) | smm_schedules, smm_posts, smm_post_assets, smm_social_accounts | smm_schedules.status/attempts, smm_publish_logs, status = published/failed |

## Function contract (signature na badlen)
- `agents/designer/src/index.ts`: `designPost(postId, { size? }) -> { imageUrl, width, height }`
- `agents/publisher/src/index.ts`: `getAdapter(platform)`, `publishSchedule(scheduleId)`
- `agents/scheduler/src/worker.ts`: `runOnce()`
- `agents/main/src/index.ts`: `runPipeline(postId)`
Types `agents/shared/types.ts` mein hain. Wo file owner ki hai.

## Folder ownership (dusre ke folder mein changes nahi)
- Owner: `src/` (website), `agents/main`, `agents/shared`, `supabase/`, `docs/`
- Contributor 1: `agents/designer/`
- Contributor 2: `agents/publisher/`, `agents/scheduler/`
