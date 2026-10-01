// npm run check:db  -> login + tables + storage check
import { getSupabase } from "./supabase";

const tables = ["smm_brands", "smm_social_accounts", "smm_posts", "smm_post_assets", "smm_schedules", "smm_publish_logs", "smm_templates"];

const sb = await getSupabase();
console.log("Login OK");
for (const t of tables) {
  const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
  console.log(error ? `FAIL ${t}: ${error.message}` : `OK   ${t} (${count} rows visible)`);
}
const { data: files, error: se } = await sb.storage.from("post-images").list("", { limit: 1 });
console.log(se ? `FAIL storage post-images: ${se.message}` : `OK   storage post-images (${files?.length ?? 0} item)`);
