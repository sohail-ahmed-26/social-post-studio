import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SocialPilot" },
      {
        name: "description",
        content: "Draft, scheduled, published and failed post counts across your channels.",
      },
      { property: "og:title", content: "Dashboard — SocialPilot" },
      {
        property: "og:description",
        content: "Draft, scheduled, published and failed post counts across your channels.",
      },
    ],
  }),
  component: DashboardPage,
});

type PostRow = {
  id: string;
  topic: string;
  caption: string;
  status: string;
  platforms: string[];
  created_at: string;
};

const HEADLINE: PostStatus[] = ["draft", "scheduled", "published", "failed"];

function DashboardPage() {
  const { brandId, brand } = useActiveBrand();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", brandId],
    enabled: !!brandId,
    queryFn: async (): Promise<PostRow[]> => {
      const { data, error } = await supabase
        .from("smm_posts")
        .select("id, topic, caption, status, platforms, created_at")
        .eq("brand_id", brandId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PostRow[];
    },
  });

  const counts = POST_STATUSES.reduce<Record<PostStatus, number>>(
    (acc, status) => {
      acc[status] = (posts ?? []).filter((p) => p.status === status).length;
      return acc;
    },
    {
      draft: 0,
      designed: 0,
      scheduled: 0,
      publishing: 0,
      published: 0,
      failed: 0,
    },
  );

  return (
    <AppShell
      title="Dashboard"
      description={`Review the queue and recent activity for ${brand?.name ?? "your brand"}.`}
      action={
        <Link
          to="/create"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          New post
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {HEADLINE.map((status) => (
          <div key={status} className="panel p-5">
            <span className={`eyebrow ${status === "draft" ? "" : `text-${status}`}`}>
              {STATUS_LABELS[status]}
            </span>
            <div className="mt-1 text-2xl font-semibold">{counts[status]}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(["designed", "publishing", "published"] as PostStatus[]).map((status) => (
          <div key={status} className="panel p-5">
            <span className="eyebrow">{STATUS_LABELS[status]}</span>
            <div className="mt-1 text-xl font-semibold">{counts[status]}</div>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-medium">Recent posts</h3>
          <Link to="/library" className="text-xs font-medium text-primary">
            Open library
          </Link>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading posts…</p>
        ) : (posts ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No posts yet. Create your first post to get started.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="eyebrow px-5 py-3">Post</th>
                <th className="eyebrow hidden px-5 py-3 sm:table-cell">Platforms</th>
                <th className="eyebrow px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(posts ?? []).slice(0, 6).map((post) => {
                const status = isPostStatus(post.status) ? post.status : "draft";
                return (
                  <tr key={post.id}>
                    <td className="px-5 py-4">
                      <div className="max-w-[260px] truncate text-sm font-medium">
                        {post.topic || post.caption || "Untitled post"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 text-xs text-muted-foreground sm:table-cell">
                      {post.platforms
                        .map((p) => PLATFORM_LABELS[p as Platform] ?? p)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[status]}`}
                      >
                        {STATUS_LABELS[status]}
                      </span>
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
