import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: (search: Record<string, unknown>): { post?: string } => ({
    post: typeof search.post === "string" ? search.post : undefined,
  }),
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

type Template = { id: string; name: string; category: string };

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

  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await supabase
        .from("smm_templates")
        .select("id, name, category")
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
  }, [existing]);

  function togglePlatform(platform: Platform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform],
    );
  }

  async function save(mode: "draft" | "schedule") {
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
      toast.success(mode === "schedule" ? "Post scheduled" : "Draft saved");
      navigate({ to: mode === "schedule" ? "/calendar" : "/library" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the post");
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
            <span className="eyebrow block">Template</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              <div className="grid aspect-square w-full place-items-center bg-secondary">
                <span className="eyebrow">
                  {templates?.find((t) => t.id === templateId)?.name ?? "No template"}
                </span>
              </div>
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

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => save("draft")}
                className="flex-1 rounded-lg border border-input bg-card py-2.5 text-sm font-medium disabled:opacity-60"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => save("schedule")}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
