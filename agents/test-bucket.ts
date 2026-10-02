import { getSupabase } from "./shared/supabase.ts"; (async () => { const sb = await getSupabase(); const { data } = await sb.storage.getBucket("post-images"); console.log(data); })();
