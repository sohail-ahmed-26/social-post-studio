# Owner (Sohail): poora workflow, main branch par

Tum `main` par kaam karte ho. Contributors fork + PR se aate hain.

## Phase A: Repo ko tayyar karo (contributors se pehle, aaj)
1. Repo clone, phir kit ki files copy karo (README-KIT.md dekho), `gitignore-append.txt` .gitignore mein jodo.
2. **`.env` check:** GitHub par `.env` kholo. Sirf `VITE_SUPABASE_*` (URL, publishable key) hon to public mein chalega (anon key public-safe hai, asli hifazat RLS se). Koi `service_role`, secret ya token ho to wo key **abhi rotate** karo. Naye secrets sirf `agents/.env` mein.
3. `cd agents && npm install && npx playwright install chromium`, phir `npm run typecheck` pass hona chahiye.
4. Commit + push: `git add . && git commit -m "scaffold agents, docs, env examples" && git push`.
5. GitHub Settings:
   - **Collaborators:** dono add (issue assign ke liye)
   - **Branches/Rulesets:** main par "Require a pull request before merging"
   - **Labels:** `designer_agent`, `publisher_agent`
6. Issues theek karo: `docs/ISSUE-UPDATES.md`.
7. Supabase tayyari: `docs/DATABASE-ACCESS.md` ("Owner ko ek baar karna hai").
8. Contributors ko bhejo: apna-apna workflow doc + Supabase URL + anon key (private message mein).

## Phase B: Tumhara apna kaam (Issue #4)
Pehle audit: `src/routes/_authenticated/` mein dekho kaun se pages hain. Lovable ke credits khatam hue the, to create/calendar/accounts/logs adhoore ho sakte hain.

Antigravity prompts (ek ek karke):
1. *"Audit src/routes/_authenticated and src/integrations/supabase. List which routes (dashboard, create, calendar, library, accounts, logs) exist and which have TypeScript errors. Do not change anything."*
2. *"Complete the missing routes following the style of dashboard.tsx. Use supabase client and react-query, RLS-safe queries only. Run typecheck when done."*
3. *"In agents/main/src/index.ts implement runPipeline(postId): load post+brand, call Content Agent for caption/hashtags, call designPost() from agents/designer, create smm_schedules rows (status pending) per platform, set post status to scheduled. Keep signatures in agents/shared/types.ts."* (Designer abhi stub hai, mock return se test karo.)
4. *"Add a Content Agent in agents/main/content.ts that generates caption and hashtags with an LLM using brand tone. Key from env LLM_API_KEY."*

Phir: Accounts page par OAuth connect flow, README.md (abhi sirf Lovable prompt hai), CONTRIBUTING.md.
Status `queued` jaisa naya status chahiye ho to pehle Supabase mein check karo status text hai ya enum, aur migration banao.

## Phase C: Review aur merge
1. Contributor PR bheje: **Files changed** dekho (sirf unka folder, koi secret nahi).
2. Local test: `gh pr checkout <n>` ya unki branch fetch karke `npm run typecheck` aur flow chalao.
3. Merge order: **Designer pehle, phir Publisher** (Publisher ko images chahiye).
4. Merge ke baad contributors ko kaho `git fetch upstream && git merge upstream/main`.

## Phase D: Integration test (end to end)
1. Website par topic daalo -> Create -> post save.
2. `npm run main -- <post_id>` (runPipeline) -> caption, image, schedule rows.
3. `npm run scheduler` -> due schedule publish (pehle mock, phir test Facebook Page).
4. Logs page par result dekho.

## Rozana
Chota commit, push, PR review, aur issues par status comment.
