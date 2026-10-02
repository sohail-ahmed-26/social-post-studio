// OWNER ki file: agents ke darmiyan contract.
export type PostStatus = "draft" | "designed" | "scheduled" | "publishing" | "published" | "failed";
export type Platform = "instagram" | "facebook" | "linkedin" | "threads" | "x";
export type ImageSize = "square" | "portrait" | "landscape";

export const IMAGE_SIZES: Record<ImageSize, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1200, height: 630 },
};

// Designer Agent output
export type DesignResult = { imageUrl: string; width: number; height: number };

// Publisher adapters
export type PublishInput = {
  caption: string;
  hashtags: string[];
  imageUrl: string;
};
export type PublishResult = { externalId: string; url?: string };
export interface PlatformAdapter {
  platform: Platform;
  validate(input: PublishInput): string[]; // errors ki list, khaali = theek
  publish(input: PublishInput, account: { external_id: string; access_token: string }): Promise<PublishResult>;
}
