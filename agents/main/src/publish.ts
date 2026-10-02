import { getSupabase } from "../../shared/supabase";
import { publishToFacebook } from "../../publisher/src/facebook-publish";
import { Buffer } from "buffer";

export async function publishPost(postId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  console.log(`Publishing post ${postId}...`);
  const sb = await getSupabase();
  
  // 1. Fetch post details
  const { data: post, error: postErr } = await sb
    .from("smm_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (postErr || !post) {
    throw new Error(`Post not found: ${postErr?.message}`);
  }

  // 2. Fetch image asset if any
  const { data: assets } = await sb
    .from("smm_post_assets")
    .select("image_url")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(1);

  let imageBuffer: Buffer | undefined;
  let imageMime: string | undefined;

  const imageUrl = assets && assets.length > 0 ? assets[0].image_url : undefined;
  if (imageUrl) {
    // Extract file path from url
    let filePath = "";
    if (imageUrl.includes("?path=")) {
      const urlParts = imageUrl.split("?path=");
      if (urlParts.length > 1) {
        filePath = decodeURIComponent(urlParts[1]);
      }
    } else if (imageUrl.includes("/post-images/")) {
      const urlParts = imageUrl.split("/post-images/");
      if (urlParts.length > 1) {
        filePath = decodeURIComponent(urlParts[1]);
      }
    }

    if (filePath) {
      const { data: fileData, error: downloadErr } = await sb.storage.from("post-images").download(filePath);
      if (!downloadErr && fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        imageMime = fileData.type;
      } else {
        console.error("Failed to download image from Supabase storage:", downloadErr?.message);
      }
    }
  }

  // 3. Check platform
  if (!post.platforms || !post.platforms.includes("facebook")) {
    throw new Error("This post is not configured for facebook platform.");
  }

  const message = [post.caption, ...(post.hashtags || []).map((h: string) => h.startsWith('#') ? h : `#${h}`)].filter(Boolean).join('\n\n');

  try {
    const result = await publishToFacebook(message, imageBuffer, imageMime);
    
    // Update post status
    await sb.from("smm_posts").update({ status: "published" }).eq("id", postId);
    
    // Check if there is a schedule, update it
    const { data: schedules } = await sb.from("smm_schedules").select("id").eq("post_id", postId).eq("platform", "facebook");
    if (schedules && schedules.length > 0) {
      const schedId = schedules[0].id;
      await sb.from("smm_schedules").update({ status: "published" }).eq("id", schedId);
      
      // Add log
      await sb.from("smm_publish_logs").insert({
        schedule_id: schedId,
        platform: "facebook",
        response: { id: result.id, url: result.url }
      });
    }

    return { success: true, url: result.url };
  } catch (error: any) {
    console.error(`Failed to publish: ${error.message}`);
    // Update schedule to failed if exists
    const { data: schedules } = await sb.from("smm_schedules").select("id").eq("post_id", postId).eq("platform", "facebook");
    if (schedules && schedules.length > 0) {
      const schedId = schedules[0].id;
      await sb.from("smm_schedules").update({ status: "failed" }).eq("id", schedId);
      
      // Add log
      await sb.from("smm_publish_logs").insert({
        schedule_id: schedId,
        platform: "facebook",
        error: error.message
      });
    }

    return { success: false, error: error.message };
  }
}
