# Contributor 1: Designer Agent (Issue #3)

**Tumhara kaam:** CSS/HTML templates se post ki image banana, PNG render karna, Supabase Storage mein upload karna.
**Branch:** `feature/designer-agent` | **Folder:** `agents/designer/`

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
git checkout -b feature/designer-agent
```
`git branch` se check karo ke `*` feature/designer-agent par hai. **main par kaam nahi.**

### 4. Kaam, commit, push
Antigravity mein folder kholo. Sirf apne folder(s) mein kaam: `agents/designer/`
```bash
git add .
git commit -m "chota saaf message"     # chote chote commits, baar baar
git push -u origin feature/designer-agent       # pehli baar; baad mein sirf git push
```

### 5. Pull Request
Apni fork par **Compare & pull request**. Check: base repository = https://github.com/sohail-ahmed-26/social-post-studio, base = `main`, compare = feature/designer-agent.
Description mein likho kya kiya, kaise test kiya, aur **Closes #3**. Review mein changes aayen to usi branch par naye commits push karo (naya PR nahi).

### 6. Owner ke updates lena (hafte mein 2 baar aur PR se pehle)
```bash
git fetch upstream
git checkout feature/designer-agent
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
npx playwright install chromium
cp .env.example .env     # values bharo (DATABASE-ACCESS.md)
npm run check:db
```

**Step 1: Templates** (`agents/designer/templates/`)
- `quote.html`, `announcement.html`, `product.html` (HTML + CSS ek file mein).
- Variables: `{{title}} {{body}} {{brand_color}} {{logo_url}} {{font}}`.
- Colors CSS variables se (`--brand-primary`), taake brand ke hisaab se badlen.
- `renderTemplate(name, data)` jo final HTML string de.
- Pehle browser mein seedha khol kar dekho.

**Step 2: PNG render** (Playwright)
- Sizes `IMAGE_SIZES` (agents/shared/types.ts) se: square 1080x1080, portrait 1080x1350, landscape 1200x630.
- Render se pehle fonts load hone ka wait (`document.fonts.ready`).
- Lamba title wrap ho, text overflow na ho.
- Local output `agents/output/` (gitignored).

**Step 3: Upload + DB**
- Bucket `post-images`, path **`<user_id>/<post_id>-<size>.png`** (user_id = login user ki id; storage policy yehi maangti hai).
- Public URL lo, `smm_post_assets` mein row (post_id, image_url, width, height).
- `smm_posts.status = 'designed'`.

**Step 4: Brand styling**
- `smm_brands.colors` (jsonb) aur `logo_url` se CSS variables set karo. Brand na ho to default theme.
- 3 templates `smm_templates` mein daalne ki SQL `supabase/seed_templates.sql` mein likho. **Chalaana owner karega**, tum file PR mein do.

**Step 5: Entry point**
- `agents/designer/src/index.ts` ka `designPost(postId, { size })` poora karo (signature wohi).
- Test: `npm run designer:test -- <post_id>` (post website se banao, Create page par).

**Done kab:** teeno templates teeno sizes mein sahi PNG; upload ke baad URL browser mein khule aur `smm_post_assets` mein row aaye; do brands ke colors alag aayen; typecheck pass; `agents/designer/README.md` mein naya template banane ka tareeqa likha ho.
