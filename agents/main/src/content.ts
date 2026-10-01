import { getSupabase } from '../../shared/supabase';
import { askJson } from './llm';

// TODO: The smm_posts table currently does not have 'headline' or 'subtext' columns.
// Change this to true and update the database logic once those columns exist.
const SAVE_HEADLINE_COLUMNS = false;

interface GeneratedContent {
  headline: string;
  subtext: string;
  caption: string;
  hashtags: string[];
}

interface Idea {
  topic: string;
  angle: string;
}

export async function generateContent(postId: string): Promise<GeneratedContent> {
  const supabase = await getSupabase();

  // Load the post and its brand
  const { data: post, error: postError } = await supabase
    .from('smm_posts')
    .select('*, brand:smm_brands(*)')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    throw new Error(`Failed to load post: ${postError?.message || 'Not found'}`);
  }

  // Define platforms context
  const platforms = Array.isArray(post.platforms) ? post.platforms.join(', ') : 'any';
  
  const systemPrompt = `You are an expert social media manager.
Create content for a brand named "${post.brand.name}".
The brand's tone is: ${post.brand.tone || 'neutral'}.
The post topic is: "${post.topic}".
The target platforms are: ${platforms}.

Respect these platform guidelines if applicable:
- Instagram: caption max 2200 chars, use engaging tone.
- LinkedIn: professional, valuable insights.
- Facebook: casual, conversational.

Return ONLY a JSON object with the following schema:
{
  "headline": "Short punchy headline (max 60 chars)",
  "subtext": "Brief subtext or hook (max 140 chars)",
  "caption": "The main body of the post",
  "hashtags": ["list", "of", "5_to_10", "hashtags", "without", "hash_symbol"]
}`;

  const userPrompt = `Generate the post content now.`;

  const rawOutput = await askJson(systemPrompt, userPrompt) as any;

  // Manual validation
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw new Error("LLM did not return a valid JSON object.");
  }

  const headline = typeof rawOutput.headline === 'string' ? rawOutput.headline.slice(0, 60) : '';
  const subtext = typeof rawOutput.subtext === 'string' ? rawOutput.subtext.slice(0, 140) : '';
  const caption = typeof rawOutput.caption === 'string' ? rawOutput.caption : '';
  let hashtags: string[] = [];

  if (Array.isArray(rawOutput.hashtags)) {
    hashtags = rawOutput.hashtags.filter((h: any) => typeof h === 'string').map((h: string) => h.replace(/^#/, ''));
  }

  // Update only caption and hashtags
  const { error: updateError } = await supabase
    .from('smm_posts')
    .update({ caption, hashtags })
    .eq('id', postId);

  if (updateError) {
    throw new Error(`Failed to update post: ${updateError.message}`);
  }

  return { headline, subtext, caption, hashtags };
}

export async function generateIdeas(brandId: string, count: number = 5): Promise<Idea[]> {
  const supabase = await getSupabase();

  const { data: brand, error: brandError } = await supabase
    .from('smm_brands')
    .select('*')
    .eq('id', brandId)
    .single();

  if (brandError || !brand) {
    throw new Error(`Failed to load brand: ${brandError?.message || 'Not found'}`);
  }

  const systemPrompt = `You are a creative social media strategist.
Create ${count} content ideas for a brand named "${brand.name}".
The brand's tone is: ${brand.tone || 'neutral'}.

Return ONLY a JSON object with the following schema:
{
  "ideas": [
    {
      "topic": "The main topic or subject",
      "angle": "The specific angle or approach to take"
    }
  ]
}`;

  const userPrompt = `Generate ${count} ideas now.`;

  const rawOutput = await askJson(systemPrompt, userPrompt) as any;

  if (!rawOutput || !Array.isArray(rawOutput.ideas)) {
    throw new Error("LLM did not return a valid JSON object with an 'ideas' array.");
  }

  const ideas: Idea[] = rawOutput.ideas.map((idea: any) => ({
    topic: typeof idea.topic === 'string' ? idea.topic : '',
    angle: typeof idea.angle === 'string' ? idea.angle : '',
  }));

  return ideas.slice(0, count);
}
