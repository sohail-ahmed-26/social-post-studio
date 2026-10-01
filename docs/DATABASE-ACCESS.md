# Database: ek Supabase (owner ka), sab localhost se

## Idea
- Database **sirf owner ka Supabase project** hai. Ek hi jagah, ek hi schema.
- Contributors apne computer par website aur agents **localhost** par chalate hain, aur usi Supabase se connect hote hain.
- Har banda website par **apna account sign up** karta hai. RLS ki wajah se har user ko sirf apna data nazar aata hai, is liye koi kisi ka data kharab nahi kar sakta.
- Agents bhi usi account se login karte hain (anon key + email/password). **service_role key kisi ko nahi di jati.**

## Kis ko kya milta hai
| Cheez | Owner | Contributors |
|---|---|---|
| Supabase URL + anon (publishable) key | haan | haan (public-safe hai) |
| service_role key | haan, sirf apne paas | **nahi, kabhi nahi** |
| Supabase dashboard / SQL editor | haan | nahi |
| Schema (tables) badalna | sirf owner | nahi, issue mein comment karen |
| Apna user + apna test data | haan | haan |

## Contributor setup (5 minute)
1. Repo clone karke website chalao (README / workflow doc dekho). Terminal mein jo localhost URL aaye wahan khol kar **Sign up** karo.
2. `agents/` mein: `cp .env.example .env`, phir bharo:
   - `SUPABASE_URL` aur `SUPABASE_ANON_KEY` (owner se)
   - `AGENT_EMAIL` / `AGENT_PASSWORD` = wohi account jo sign up kiya
3. `cd agents && npm install && npm run check:db`
   Sab `OK` aana chahiye. Koi `FAIL` ho to owner ko screenshot bhejo.
4. Website mein ek **Brand** banao (Create/Accounts page se). Test data isi mein banao.

## Owner ko ek baar karna hai
1. Supabase -> Authentication -> Providers -> Email: development ke liye **Confirm email** band karo (ya contributors ke email dashboard se manually confirm karo). Launch se pehle dobara on karna.
2. `docs/storage-policies.sql` SQL editor mein chalao.
3. Table Editor mein har `smm_` table par **RLS enabled** check karo, aur policies `auth.uid() = user_id` jaisi hon (brands par direct, baaqi tables brand/post ke zariye).
4. Schema badalna ho to **migration file** `supabase/migrations/` mein banao aur main par merge karo.

## Optional: bilkul alag local database (Docker)
Agar koi risky experiment karna ho (jaise schema badalna), apna alag Supabase local chalao:
```
npx supabase start      # Docker chahiye
npx supabase db reset   # repo ki migrations apply hoti hain
```
Phir `.env` mein local URL/key (jo `supabase start` dikhata hai) daalo. Is mein owner ka data bilkul safe rehta hai.

## Production note
Scheduler ko sab users ke schedules chalane hon to wo **server par owner ki service_role key** se chalega, kabhi bhi browser/repo mein nahi. Development mein contributors apne user ke schedules par test karte hain.
