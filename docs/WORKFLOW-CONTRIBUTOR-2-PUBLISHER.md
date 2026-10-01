# Contributor 2: Publisher + Scheduler (Issue #2)

**Tumhara kaam:** Instagram / Facebook / LinkedIn adapters aur scheduled upload worker.
**Branch:** `feature/publisher-scheduler` | **Folders:** `agents/publisher/`, `agents/scheduler/`

Pehle parho: `docs/ARCHITECTURE.md` aur `docs/DATABASE-ACCESS.md` (setup + `npm run check:db` pehle chalao).

## Git workflow (fork -> branch -> PR)

### 0. Pehle install
Git, Node.js (LTS), Antigravity. Check: `git --version`, `node -v`.
GitHub par apne account se login rakho.

### 1. Fork
Browser: https://github.com/sohail-ahmed-26/social-post-studio -> upar right **Fork** -> **Create fork**.

### 2. Clone (APNI fork)
```bash
git clone https://github.com/<TUMHARA-USERNAME>/social-post-studio.git
cd social-post-studio
git remote add upstream https://github.com/sohail-ahmed-26/social-post-studio.git
git remote -v        # origin (tumhari fork) + upstream (owner) dikhne chahiye
```

### 3. Apni branch
```bash
git checkout -b feature/publisher-scheduler
```
`git branch` se check karo ke `*` feature/publisher-scheduler par hai. **main par kaam nahi.**

### 4. Kaam, commit, push
Antigravity mein folder kholo. Sirf apne folder(s) mein kaam: `agents/publisher/` aur `agents/scheduler/`
```bash
git add .
git commit -m "chota saaf message"     # chote chote commits, baar baar
git push -u origin feature/publisher-scheduler       # pehli baar; baad mein sirf git push
```

### 5. Pull Request
Apni fork par **Compare & pull request**. Check: base repository = https://github.com/sohail-ahmed-26/social-post-studio, base = `main`, compare = feature/publisher-scheduler.
Description mein likho kya kiya, kaise test kiya, aur **Closes #2**. Review mein changes aayen to usi branch par naye commits push karo (naya PR nahi).

### 6. Owner ke updates lena (hafte mein 2 baar aur PR se pehle)
```bash
git fetch upstream
git checkout feature/publisher-scheduler
git merge upstream/main
```
Conflict aaye to `<<<<<<<` wale hisse theek karo, `git add .`, `git commit`. Samajh na aaye to owner se poochho.

### Rules
1. main par direct push nahi. PR hi.
2. `.env`, keys, tokens, passwords kabhi commit nahi. Secrets sirf `agents/.env` mein.
3. service_role key kisi ke paas nahi, kabhi mat maango.
4. Ek PR = ek issue.
5. PR se pehle: `cd agents && npm run typecheck` pass ho.
6. Schema badalna ho to owner ko issue mein comment karo, khud mat badlo.
7. `agents/shared/*` aur function signatures mat badlo.

---
## Tumhara task-by-task plan

**Setup**
```bash
cd agents
npm install
cp .env.example .env     # values bharo (DATABASE-ACCESS.md)
npm run check:db
```

**Step 1: Mock se shuru (asli API ke bagair)**
- `PlatformAdapter` interface `agents/shared/types.ts` mein hai.
- `MockAdapter` banao (sirf log kare) aur `getAdapter(platform)` factory.
- `publishSchedule(scheduleId)`: schedule + post + asset + account uthao -> validate -> publish -> `smm_publish_logs` mein likho -> status update (`published` ya `failed`).

**Step 2: Scheduler worker** (`agents/scheduler/src/worker.ts`)
- Har 1 minute: `smm_schedules` jahan `scheduled_at <= now()` aur status `pending`.
- **Double-publish se bachao:** pehle `update ... set status='publishing' where id=? and status='pending'` karo; row na badle to skip (lock).
- Fail par `attempts + 1`, retry max 3 (1, 5, 15 minute backoff), phir `failed`.
- `runOnce()` aur loop dono; `npm run scheduler`.
- Test: mock adapter ke saath 3 schedules, aur 2 worker ek saath chala kar dekho post do baar na jaye.

**Step 3: Instagram adapter (Meta Graph API)**
1. `POST /{ig-user-id}/media` (image_url, caption) -> container id
2. `GET /{container}?fields=status_code` jab tak `FINISHED`
3. `POST /{ig-user-id}/media_publish` (creation_id)
- Image URL **public** honi chahiye (Supabase public bucket).
- 24 ghante mein max 100 API posts; Meta ke error codes ko saaf message mein badlo.
- Zaroori: Instagram **Business/Creator** account, Facebook Page se linked. Owner tumhe Meta app mein **Tester** role dega. Pehle Facebook Page par test karna aasan hai.

**Step 4: Facebook Page + LinkedIn adapters**
- Dono `validate()` mein caption length check; token expire par saaf error.
- LinkedIn ki approval/scopes alag hoti hain. Jo scope na mile to issue mein comment karo, mock par kaam jari rakho.

**Step 5: Secrets**
- Test tokens sirf `agents/.env` mein ya apni `smm_social_accounts` row mein (apne user ki). Repo mein kabhi nahi.

**Done kab:** mock ke saath poora flow; test account par post ho; do workers par bhi post ek baar; 3 retry ke baad `failed` + log mein error; typecheck pass.
