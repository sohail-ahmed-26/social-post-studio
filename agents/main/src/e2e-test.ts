import { getSupabase } from "../../shared/supabase";

async function run() {
  const sb = await getSupabase();
  const { data: brand } = await sb.from("smm_brands").select("id").limit(1).single();
  
  if (!brand) throw new Error("No brand found");

  console.log("1. Creating dummy post");
  const { data: post, error: postErr } = await sb.from("smm_posts").insert({
    brand_id: brand.id,
    topic: "Test AI Workflow",
    caption: "Hello from the new fully automated E2E Facebook AI Content Agent!",
    hashtags: ["#test", "#ai"],
    platforms: ["facebook"],
    status: "draft"
  }).select("*").single();
  
  if (postErr) throw postErr;
  
  const postId = post.id;
  console.log(`Created post ${postId}`);
  
  console.log("2. Hitting /image endpoint");
  const imgRes = await fetch("http://127.0.0.1:8787/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, topic: "Futuristic landscape", headline: "Test Post" })
  });
  const imgData = await imgRes.json();
  if (!imgRes.ok) throw new Error(`Image Gen Error: ${JSON.stringify(imgData)}`);
  console.log(`Image generated: ${imgData.imageUrl}`);
  
  console.log("3. Hitting /publish endpoint (Publish Now)");
  const pubRes = await fetch("http://127.0.0.1:8787/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId })
  });
  const pubData = await pubRes.json();
  if (!pubRes.ok) throw new Error(`Publish Error: ${JSON.stringify(pubData)}`);
  console.log(`Published! URL: ${pubData.url}`);
}

run().catch(console.error);
