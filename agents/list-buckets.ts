import { getSupabase } from "./shared/supabase.ts"; (async () => { const sb = await getSupabase(); const { data, error } = await sb.storage.listBuckets(); console.log("Buckets:", data, error); })();
