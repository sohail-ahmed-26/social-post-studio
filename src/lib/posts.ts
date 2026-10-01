export const PLATFORMS = ["instagram", "facebook", "linkedin"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export const POST_STATUSES = [
  "draft",
  "designed",
  "scheduled",
  "publishing",
  "published",
  "failed",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Draft",
  designed: "Designed",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
};

/** Semantic token classes per status — no raw colors in components. */
export const STATUS_CLASSES: Record<PostStatus, string> = {
  draft: "bg-draft-soft text-draft",
  designed: "bg-designed-soft text-designed",
  scheduled: "bg-scheduled-soft text-scheduled",
  publishing: "bg-publishing-soft text-publishing",
  published: "bg-published-soft text-published",
  failed: "bg-failed-soft text-failed",
};

export const STATUS_DOT: Record<PostStatus, string> = {
  draft: "bg-draft",
  designed: "bg-designed",
  scheduled: "bg-scheduled",
  publishing: "bg-publishing",
  published: "bg-published",
  failed: "bg-failed",
};

export function extractHashtags(caption: string): string[] {
  return Array.from(new Set(caption.match(/#[\p{L}\p{N}_]+/gu) ?? [])).map((t) => t.slice(1));
}

export function isPostStatus(value: string): value is PostStatus {
  return (POST_STATUSES as readonly string[]).includes(value);
}
