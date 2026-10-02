import { generateImage } from "../../designer/src/gemini-image";
import { getSupabase } from "../../shared/supabase";
import { Buffer } from "buffer";

export async function generateAndUploadImage(postId: string, topic: string, headline: string): Promise<{ imageUrl: string }> {
  console.log(`Generating image for post ${postId}, topic: ${topic}`);
  const prompt = `A professional, engaging social media image about: ${topic}. ${headline ? 'Context: ' + headline : ''}. Style: modern, vibrant, high-quality, clean. No text overlay.`;
  
  const result = await generateImage(prompt, { aspectRatio: '1:1' });
  const ext = result.mimeType.split('/')[1] || 'png';
  const fileName = `${postId}-${Date.now()}.${ext}`;

  const sb = await getSupabase();
  const { data: userAuth } = await sb.auth.getUser();
  const userId = userAuth.user?.id || 'unknown';

  const filePath = `${userId}/${fileName}`;
  
  console.log(`Uploading to Supabase storage: ${filePath}`);
  const { error } = await sb.storage
    .from("post-images")
    .upload(filePath, result.buffer, { contentType: result.mimeType, upsert: true });

  if (error) {
    throw new Error(`Failed to upload image to Supabase: ${error.message}`);
  }

  const localUrl = `http://127.0.0.1:8787/image/render?path=${encodeURIComponent(filePath)}`;

  // Save to assets DB
  const { error: dbError } = await sb
    .from("smm_post_assets")
    .insert({
      post_id: postId,
      image_url: localUrl,
    });
    
  if (dbError) {
    console.error(`Warning: Failed to insert to smm_post_assets: ${dbError.message}`);
  }

  return { imageUrl: localUrl };
}
