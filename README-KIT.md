# SocialPilot kit: kaise lagana hai

Repo clone ke andar (root par) ye chalao (kit folder ka path badal lena):

```bash
cp -r /path/to/kit/. .
cat gitignore-append.txt >> .gitignore && rm gitignore-append.txt README-KIT.md
cd agents && npm install && npx playwright install chromium && npm run typecheck && cd ..
git add . && git commit -m "scaffold agents, docs, env examples" && git push
```
Phir `docs/WORKFLOW-OWNER.md` Phase A ke baaqi steps karo.
Agar root par `.env.example` pehle se ho to overwrite na karo, merge kar lo.
