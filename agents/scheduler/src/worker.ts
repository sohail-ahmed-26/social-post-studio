import { getSupabase } from "../../shared/supabase";
import { publishPost } from "../../main/src/publish";

export async function runOnce(): Promise<void> {
  const sb = await getSupabase();
  const now = new Date().toISOString();

  // Fetch pending schedules
  const { data: schedules, error } = await sb
    .from("smm_schedules")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  if (error) {
    console.error("Error fetching schedules:", error.message);
    return;
  }

  if (!schedules || schedules.length === 0) {
    return;
  }

  console.log(`Found ${schedules.length} posts to publish...`);

  for (const schedule of schedules) {
    try {
      console.log(`Publishing schedule ${schedule.id} for post ${schedule.post_id} (${schedule.platform})...`);
      
      // Update status to publishing to prevent duplicate execution
      await sb.from("smm_schedules").update({ status: "publishing", attempts: (schedule.attempts || 0) + 1 }).eq("id", schedule.id);

      if (schedule.platform !== "facebook") {
        console.log(`Skipping platform ${schedule.platform} (not implemented yet).`);
        await sb.from("smm_schedules").update({ status: "failed" }).eq("id", schedule.id);
        continue;
      }

      await publishPost(schedule.post_id);
      
      console.log(`Finished processing schedule ${schedule.id}`);
    } catch (e: any) {
      console.error(`Failed to publish schedule ${schedule.id}:`, e.message);
    }
  }
}

async function startWorker() {
  console.log("Starting scheduler worker... Polling every 10 seconds.");
  while (true) {
    await runOnce();
    await new Promise(r => setTimeout(r, 10000));
  }
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  startWorker();
}
