// CONTRIBUTOR 1 (Issue #3). Yeh function signature mat badlo, Main Agent isay import karta hai.
import type { DesignResult, ImageSize } from "../../shared/types";

export async function designPost(postId: string, opts?: { size?: ImageSize }): Promise<DesignResult> {
  throw new Error(`designPost not implemented yet (post ${postId}, size ${opts?.size ?? "square"})`);
}
