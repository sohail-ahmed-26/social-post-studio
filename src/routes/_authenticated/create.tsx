import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { toPng, toJpeg, toBlob } from "html-to-image";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  PLATFORMS,
  PLATFORM_LABELS,
  extractHashtags,
  type Platform,
  type PostStatus,
} from "@/lib/posts";
import { useActiveBrand } from "@/lib/use-brand";
import { PostDesigner, type DesignSpec } from "@/components/post-designer";

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: (search: Record<string, unknown>): { post?: string } => {
    if (typeof search["post"] === "string") return { post: search["post"] };
    return {};
  },
  head: () => ({
    meta: [
      { title: "Create post — SocialPilot" },
      {
        name: "description",
        content:
          "Pick a brand, topic, platforms and template, write your caption and preview the post card.",
      },
      { property: "og:title", content: "Create post — SocialPilot" },
      {
        property: "og:description",
        content:
          "Pick a brand, topic, platforms and template, write your caption and preview the post card.",
      },
    ],
  }),
  component: CreatePage,
});

type Template = { id: string; name: string; category: string; html?: string };

function CreatePage() {
  const { post: postId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { brands, brand, brandId, select } = useActiveBrand();

  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram"]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  
  const [generating, setGenerating] = useState(false);
  const [generatingDesign, setGeneratingDesign] = useState(false);
  const [aiHeadline, setAiHeadline] = useState("");
  const [aiSubtext, setAiSubtext] = useState("");
  const [designSpec, setDesignSpec] = useState<DesignSpec | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  
  const previewRef = useRef<HTMLDivElement>(null);

  const downloadImage = async (format: "png" | "jpeg") => {
    if (!previewRef.current) return;
    try {
      const dataUrl = format === "png" 
        ? await toPng(previewRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
        : await toJpeg(previewRef.current, { quality: 0.95, cacheBust: true, backgroundColor: '#ffffff' });
      
      const link = document.createElement("a");
      link.download = `post-design.${format}`;
      link.href = dataUrl;
      link.click();
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error("Failed to download image");
      console.error(err);
    }
  };

  const saveAssetToDB = async () => {
    if (!previewRef.current || !postId) {
      toast.error("Save the post as a draft first to upload assets.");
      return;
    }
    toast.info("Saving design to storage...");
    try {
      const blob = await toBlob(previewRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
      if (!blob) throw new Error("Failed to capture image");
      
      const { data: userAuth } = await supabase.auth.getUser();
      const userId = userAuth.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const fileName = `${postId}-${Date.now()}.png`;

      const { error } = await supabase.storage
        .from("post-images")
        .upload(`${userId}/${fileName}`, blob, { contentType: 'image/png', upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from("post-images").getPublicUrl(`${userId}/${fileName}`);
      
      const { error: dbError } = await supabase
        .from("smm_post_assets")
        .insert({
          post_id: postId,
          image_url: publicUrlData.publicUrl,
        });
        
      if (dbError) throw dbError;
      toast.success("Design saved to assets!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to save asset: ${err.message}`);
    }
  };

  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await supabase
        .from("smm_templates")
        .select("id, name, category, html")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["post", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("smm_posts")
        .select("id, topic, caption, platforms, template_id, status")
        .eq("id", postId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!existing) return;
    setTopic(existing.topic ?? "");
    setCaption(existing.caption ?? "");
    setPlatforms((existing.platforms ?? []).filter((p): p is Platform =>
      (PLATFORMS as readonly string[]).includes(p),
    ));
    setTemplateId(existing.template_id ?? null);
    
    // Attempt to load existing image asset
    supabase.from("smm_post_assets").select("image_url").eq("post_id", postId!).order("created_at", { ascending: false }).limit(1).then(({ data }) => {
      if (data && data.length > 0) {
        setGeneratedImageUrl(data[0].image_url);
      }
    });
  }, [existing]);

  // Load DesignSpec if the selected template is AI_GENERATED
  useEffect(() => {
    if (templateId && templates) {
      const t = templates.find(t => t.id === templateId);
      if (t && t.category === "AI_GENERATED" && t.html) {
        try {
          const spec = JSON.parse(t.html) as DesignSpec;
          setDesignSpec(spec);
        } catch(e) {
          console.error("Failed to parse design spec", e);
        }
      } else {
        setDesignSpec(null);
      }
    }
  }, [templateId, templates]);

  function togglePlatform(platform: Platform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform],
    );
  }

  async function save(mode: "draft" | "schedule", skipNavigate = false): Promise<string | undefined> {
    if (!brandId) {
      toast.error("No brand selected yet.");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Pick at least one platform.");
      return;
    }
    if (mode === "schedule" && !scheduledAt) {
      toast.error("Choose a date and time to schedule.");
      return;
    }

    setBusy(true);
    try {
      const status: PostStatus =
        mode === "schedule" ? "scheduled" : templateId ? "designed" : "draft";
      const payload = {
        brand_id: brandId,
        topic,
        caption,
        hashtags: extractHashtags(caption),
        platforms,
        template_id: templateId,
        status,
      };

      let savedId = postId;
      if (savedId) {
        const { error } = await supabase.from("smm_posts").update(payload).eq("id", savedId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("smm_posts")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }

      if (mode === "schedule" && savedId) {
        await supabase.from("smm_schedules").delete().eq("post_id", savedId);
        const { error } = await supabase.from("smm_schedules").insert(
          platforms.map((platform) => ({
            post_id: savedId!,
            platform,
            scheduled_at: new Date(scheduledAt).toISOString(),
            status: "scheduled",
          })),
        );
        if (error) throw error;
      }

      await queryClient.invalidateQueries();
      if (!skipNavigate) {
        toast.success(mode === "schedule" ? "Post scheduled" : "Draft saved");
        navigate({ to: (mode === "schedule" ? "/calendar" : "/library") as any });
      }
      return savedId;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the post");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function generateWithAI() {
    if (!topic.trim()) {
      toast.error("Please enter a topic before generating with AI.");
      return;
    }
    setGenerating(true);
    try {
      const savedId = await save("draft", true);
      if (!savedId) return;

      const res = await fetch("http://127.0.0.1:8787/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: savedId }),
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Agent server not found");
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.caption) {
        let finalCaption = data.caption;
        if (data.hashtags && data.hashtags.length > 0) {
          const extraTags = data.hashtags
            .map((t: string) => (t.startsWith("#") ? t : `#${t}`))
            .filter((t: string) => !finalCaption.includes(t))
            .join(" ");
          if (extraTags) {
            finalCaption += `\n\n${extraTags}`;
          }
        }
        setCaption(finalCaption);
      }
      
      const head = data.headline || "";
      const sub = data.subtext || "";
      if (head) setAiHeadline(head);
      if (sub) setAiSubtext(sub);
      
      toast.success("AI Content generated! Generating image...");
      
      // Now call image agent
      const imgRes = await fetch("http://127.0.0.1:8787/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: savedId, topic, headline: head }),
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        if (imgData.imageUrl) setGeneratedImageUrl(imgData.imageUrl);
      }

      toast.success("AI Generation complete!");
    } catch (err: any) {
      if (err.message.includes("fetch failed") || err.message === "Failed to fetch") {
        toast.error("Start the agent server: cd agents && npm run agent:server");
      } else {
        toast.error(err.message || "Failed to generate content");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateDesign() {
    if (!postId || !aiHeadline) {
      toast.error("You need to generate content first before regenerating design.");
      return;
    }
    setGeneratingDesign(true);
    try {
      const savedId = await save("draft", true);
      if (!savedId) return;

      const imgRes = await fetch("http://127.0.0.1:8787/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: savedId, topic, headline: aiHeadline }),
      });
      if (!imgRes.ok) throw new Error("Failed to fetch image");
      
      const imgData = await imgRes.json();
      if (imgData.imageUrl) setGeneratedImageUrl(imgData.imageUrl);
      toast.success("Image regenerated!");
    } catch (err: any) {
      toast.error("Failed to regenerate design");
    } finally {
      setGeneratingDesign(false);
    }
  }

  async function publishNow() {
    const savedId = await save("draft", true);
    if (!savedId) return;

    setBusy(true);
    try {
      toast.info("Publishing to Facebook...");
      const res = await fetch("http://127.0.0.1:8787/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: savedId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to publish");
      
      toast.success(data.url ? `Published! ${data.url}` : "Published successfully!");
      navigate({ to: "/library" as any });
    } catch (err: any) {
      toast.error(err.message || "Failed to publish post");
    } finally {
      setBusy(false);
    }
  }

  const hashtags = extractHashtags(caption);

  return (
    <AppShell
      title={postId ? "Edit post" : "Create post"}
      description="Choose a brand and template, write the caption, and preview the card before scheduling."
    >
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="panel space-y-5 p-6 lg:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="eyebrow block" htmlFor="brand">
                Brand
              </label>
              <select
                id="brand"
                value={brand?.id ?? ""}
                onChange={(e) => select(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="eyebrow block" htmlFor="topic">
                Topic / idea
              </label>
              <input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Product launch"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={generating || busy}
                onClick={generateWithAI}
                className="mt-2 w-full rounded-lg border border-input bg-card py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
              >
                {generating ? "Generating..." : "Generate Content & Design"}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="eyebrow block">Platforms</span>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const active = platforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-accent text-accent-foreground ring-1 ring-primary/40"
                        : "border border-input bg-card text-muted-foreground"
                    }`}
                  >
                    {PLATFORM_LABELS[platform]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="eyebrow block">Template</span>
              <button onClick={regenerateDesign} disabled={generatingDesign || !aiHeadline} className="text-xs text-primary hover:underline disabled:opacity-50">
                {generatingDesign ? "Regenerating..." : "Regenerate AI Design"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-48 overflow-y-auto">
              {(templates ?? []).map((template) => {
                const active = templateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(active ? null : template.id)}
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      active ? "border-primary bg-accent/40" : "border-border"
                    }`}
                  >
                    <div className="aspect-4/5 rounded-md bg-secondary" />
                    <div className="mt-1.5 truncate text-[11px] font-medium">{template.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {template.category}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="eyebrow block" htmlFor="caption">
              Caption
            </label>
            <textarea
              id="caption"
              rows={5}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption. Add #hashtags inline."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              {caption.length} characters · {hashtags.length} hashtags
            </p>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <div className="panel space-y-6 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Live preview</h3>
              <span className="eyebrow">
                {platforms.map((p) => PLATFORM_LABELS[p]).join(" · ") || "No platform"}
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-3 p-4">
                <div className="size-10 rounded-full bg-secondary" />
                <div>
                  <div className="text-sm font-semibold">{brand?.name ?? "Your brand"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {PLATFORM_LABELS[platforms[0] ?? "instagram"]} · Preview
                  </div>
                </div>
              </div>
              
              {generatedImageUrl ? (
                <div className="relative aspect-square w-full bg-secondary">
                  <img src={generatedImageUrl} alt="Generated design" className="w-full h-full object-cover" />
                </div>
              ) : designSpec ? (
                <PostDesigner ref={previewRef} spec={designSpec} headline={aiHeadline} subtext={aiSubtext} />
              ) : (
                <div 
                  ref={previewRef} 
                  style={{ backgroundColor: '#f1f5f9' }}
                  className="relative overflow-hidden flex flex-col items-center justify-center aspect-square w-full p-8 text-center border-y border-border"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#e2e8f0] via-[#f8fafc] to-[#cbd5e1] opacity-70" />
                  
                  <div className="relative z-10 flex flex-col items-center justify-center space-y-4 w-full">
                    {aiHeadline ? (
                      <>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight" style={{ color: '#0f172a', textWrap: "balance" }}>
                          {aiHeadline}
                        </h2>
                        {aiSubtext && (
                          <p className="text-sm sm:text-base font-medium" style={{ color: '#475569', textWrap: "balance" }}>
                            {aiSubtext}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                        {templates?.find((t) => t.id === templateId)?.name ?? "Design Preview"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {caption || "Your caption will appear here."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-border pt-4">
              <div className="space-y-1.5">
                <label className="eyebrow block" htmlFor="when">
                  Schedule date & time
                </label>
                <input
                  id="when"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => downloadImage("png")}
                className="flex-1 rounded-lg border border-input bg-card py-2.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                Download PNG
              </button>
              <button
                type="button"
                onClick={saveAssetToDB}
                className="flex-1 rounded-lg border border-input bg-card py-2.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                Save to Assets
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => save("draft")}
                className="flex-1 rounded-lg border border-input bg-card py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-60 transition-colors"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => save("schedule")}
                className="flex-1 rounded-lg border border-primary text-primary py-2.5 text-sm font-medium hover:bg-primary/10 disabled:opacity-60 transition-colors"
              >
                Schedule
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={publishNow}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60 transition-colors"
              >
                Publish Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
