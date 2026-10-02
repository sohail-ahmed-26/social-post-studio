import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  PLATFORM_LABELS,
  POST_STATUSES,
  STATUS_CLASSES,
  STATUS_LABELS,
  type Platform,
  type PostStatus,
  isPostStatus,
} from "@/lib/posts";
import { useActiveBrand } from "@/lib/use-brand";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Posts library — SocialPilot" },
      {
        name: "description",
        content: "Every post you've made, filterable by draft, scheduled, published or failed.",
      },
      { property: "og:title", content: "Posts library — SocialPilot" },
      {
        property: "og:description",
        content: "Every post you've made, filterable by draft, scheduled, published or failed.",
      },
    ],
  }),
  component: LibraryPage,
});

type PostRow = {
  id: string;
  topic: string;
  caption: string;
  status: string;
  platforms: string[];
  hashtags: string[];
  created_at: string;
};

function LibraryPage() {
  const { brandId } = useActiveBrand();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<PostStatus | "all">("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", brandId],
    enabled: !!brandId,
    queryFn: async (): Promise<PostRow[]> => {
      const { data, error } = await supabase
        .from("smm_posts")
        .select("id, topic, caption, status, platforms, hashtags, created_at")
        .eq("brand_id", brandId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PostRow[];
    },
  });

  async function retryPost(postId: string) {
    setRetrying(postId);
    try {
      const res = await fetch("http://127.0.0.1:8787/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to retry publish");
      toast.success(data.url ? `Published! ${data.url}` : "Published successfully!");
      queryClient.invalidateQueries({ queryKey: ["posts", brandId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to retry publish");
    } finally {
      setRetrying(null);
    }
  }

  const rows = (posts ?? []).filter((p) => filter === "all" || p.status === filter);

  return (
    <AppShell title="Posts library" description="Filter by status and open any post to edit it.">
      <div className="flex flex-wrap gap-1.5">
        {(["all", ...POST_STATUSES] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === status
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-card text-muted-foreground"
            }`}
          >
            {status === "all" ? "All" : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="panel overflow-x-auto">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading posts…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No posts with this status.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="eyebrow px-5 py-3">Post</th>
                <th className="eyebrow hidden px-5 py-3 md:table-cell">Platforms</th>
                <th className="eyebrow hidden px-5 py-3 md:table-cell">Created</th>
                <th className="eyebrow px-5 py-3">Status</th>
                <th className="eyebrow px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((post) => {
                const status = isPostStatus(post.status) ? post.status : "draft";
                return (
                  <tr key={post.id}>
                    <td className="px-5 py-4">
                      <div className="max-w-[320px] truncate text-sm font-medium">
                        {post.topic || "Untitled post"}
                      </div>
                      <div className="max-w-[320px] truncate text-xs text-muted-foreground">
                        {post.caption || "No caption yet"}
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 text-xs text-muted-foreground md:table-cell">
                      {post.platforms
                        .map((p) => PLATFORM_LABELS[p as Platform] ?? p)
                        .join(", ") || "—"}
                    </td>
                    <td className="hidden px-5 py-4 text-xs text-muted-foreground md:table-cell">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[status]}`}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-3">
                      {status === "failed" && (
                        <button
                          onClick={() => retryPost(post.id)}
                          disabled={retrying === post.id}
                          className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                        >
                          {retrying === post.id ? "Retrying..." : "Retry"}
                        </button>
                      )}
                      <Link
                        to="/create"
                        search={{ post: post.id }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
