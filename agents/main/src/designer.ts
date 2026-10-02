import { getSupabase } from '../../shared/supabase';
import { askJson } from './llm';

export interface DesignSpec {
  compositionFamily: "editorial" | "infographic" | "typography-led" | "split" | "data-viz" | "comparison" | "timeline" | "diagram" | "promotional";
  layout: {
    type: "centered" | "split-left" | "split-right" | "card-overlay" | "grid";
    alignment: "left" | "center" | "right";
    padding: string; // e.g., '32px', '48px'
  };
  colors: {
    background: string; // CSS background (can be hex or linear-gradient)
    surface: string; // CSS background for cards/overlays
    primaryText: string; // Hex color
    secondaryText: string; // Hex color
    accent: string; // Hex color for lines/icons
  };
  typography: {
    fontFamily: "sans" | "serif" | "mono";
    headlineScale: string; // e.g., '2.5rem', '3rem'
    subtextScale: string; // e.g., '1rem', '1.25rem'
  };
  elements: {
    showCard: boolean;
    shapes: ("circle" | "dots" | "waves" | "grid")[];
    icon?: string; // name of a lucide icon (e.g., 'Zap', 'Star', 'TrendingUp')
    decorativeLine: boolean;
  };
  dimensions: {
    aspectRatio: "1/1" | "4/5" | "16/9";
  };
}

export async function generateDesignSpec(postId: string, headline: string, subtext: string): Promise<{ spec: DesignSpec, templateId: string }> {
  const supabase = await getSupabase();

  const { data: post, error: postError } = await supabase
    .from('smm_posts')
    .select('*, brand:smm_brands(*)')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    throw new Error(`Failed to load post: ${postError?.message || 'Not found'}`);
  }

  const systemPrompt = `You are an elite AI Creative Director and Design Engineer.
Your job is to analyze the content, topic, and brand, and produce a premium, strictly structured design specification for a social media graphic.

Brand Name: ${post.brand.name}
Brand Tone: ${post.brand.tone || 'neutral'}
Topic: ${post.topic}
Headline: ${headline}
Subtext: ${subtext}

Based on the topic and content structure, choose an appropriate compositionFamily (e.g., 'promotional' for ads, 'typography-led' for quotes, 'split' for feature highlights, 'infographic' for data).
Pick modern, premium colors (use hex codes or valid CSS gradients like 'linear-gradient(...)'). Ensure high contrast between background and text.
For 'layout.type', choose one of: 'centered', 'split-left', 'split-right', 'card-overlay', 'grid'.

Return ONLY a JSON object exactly matching this TypeScript interface:
{
  compositionFamily: "editorial" | "infographic" | "typography-led" | "split" | "data-viz" | "comparison" | "timeline" | "diagram" | "promotional";
  layout: { type: "centered" | "split-left" | "split-right" | "card-overlay" | "grid", alignment: "left" | "center" | "right", padding: string };
  colors: { background: string, surface: string, primaryText: string, secondaryText: string, accent: string };
  typography: { fontFamily: "sans" | "serif" | "mono", headlineScale: string, subtextScale: string };
  elements: { showCard: boolean, shapes: string[], icon?: string, decorativeLine: boolean };
  dimensions: { aspectRatio: "1/1" | "4/5" | "16/9" };
}`;

  const userPrompt = `Create a unique design specification for this post.`;

  const rawOutput = await askJson(systemPrompt, userPrompt) as DesignSpec;

  if (!rawOutput || !rawOutput.compositionFamily || !rawOutput.layout) {
    throw new Error("LLM did not return a valid DesignSpec JSON object.");
  }

  // Create a new template row to store this AI-generated spec
  const { data: template, error: templateError } = await supabase
    .from('smm_templates')
    .insert({
      name: `AI Design - ${rawOutput.compositionFamily}`,
      category: 'AI_GENERATED',
      html: JSON.stringify(rawOutput), // Store the JSON spec here
      css: '', // Not used for AI specs
    })
    .select('id')
    .single();

  if (templateError || !template) {
    throw new Error(`Failed to save AI design template: ${templateError?.message}`);
  }

  // Link it to the post
  await supabase
    .from('smm_posts')
    .update({ template_id: template.id })
    .eq('id', postId);

  return { spec: rawOutput, templateId: template.id };
}
