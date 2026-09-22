import {
  createMediaContainer, findRecentPublishedByCaption, formatInstagramCaption,
  getContainerStatus, publishMediaContainer, waitUntilContainerReady,
} from "./instagram";
import { deleteQuoteImage } from "./cloudinary";
import { getSupabase } from "./supabase";
import type { PostRow } from "./types";
import { errorMessage } from "./utils";

async function removePublishedPost(post: PostRow): Promise<boolean> {
  const supabase = getSupabase();
  try {
    await deleteQuoteImage(post.id);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) throw error;
    return true;
  } catch (cleanupError) {
    const { error } = await supabase.from("posts").update({
      status: "pending",
      publishing_started_at: null,
      error_message: `Instagram published; cleanup will retry: ${errorMessage(cleanupError)}`.slice(0, 2_000),
    }).eq("id", post.id);
    if (error) throw error;
    return false;
  }
}

export async function runPublisher() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("claim_due_post");
  if (error) throw error;
  const post = (data?.[0] || null) as PostRow | null;
  if (!post) return { published: false, reason: "no_due_posts" };

  const fullCaption = formatInstagramCaption(post.caption, post.hashtags);
  try {
    if (!post.image_url) throw new Error(`Claimed post ${post.id} has no image URL`);
    if (post.retry_count > 0 || post.instagram_container_id) {
      const recoveredMediaId = await findRecentPublishedByCaption(fullCaption);
      if (recoveredMediaId) {
        const removed = await removePublishedPost(post);
        return { published: true, postId: post.id, mediaId: recoveredMediaId, recovered: true, removed };
      }
    }

    let containerId = post.instagram_container_id;
    if (containerId) {
      const state = await getContainerStatus(containerId);
      if (state.status_code === "EXPIRED" || state.status_code === "ERROR") containerId = null;
    }
    if (!containerId) {
      containerId = await createMediaContainer(post.image_url, fullCaption);
      const { error: saveError } = await supabase.from("posts")
        .update({ instagram_container_id: containerId }).eq("id", post.id).eq("status", "publishing");
      if (saveError) throw saveError;
    }

    const status = await waitUntilContainerReady(containerId);
    if (status === "PUBLISHED") {
      const recoveredMediaId = await findRecentPublishedByCaption(fullCaption);
      if (!recoveredMediaId) throw new Error("Container is published but matching Instagram media was not found");
      const removed = await removePublishedPost(post);
      return { published: true, postId: post.id, mediaId: recoveredMediaId, recovered: true, removed };
    }
    const mediaId = await publishMediaContainer(containerId);
    const removed = await removePublishedPost(post);
    return { published: true, postId: post.id, mediaId, recovered: false, removed };
  } catch (publishError) {
    const nextRetry = post.retry_count + 1;
    const { error: updateError } = await supabase.from("posts").update({
      retry_count: nextRetry,
      status: nextRetry >= 3 ? "failed" : "pending",
      publishing_started_at: null,
      error_message: errorMessage(publishError).slice(0, 2_000),
    }).eq("id", post.id).eq("status", "publishing");
    if (updateError) throw new Error(`${errorMessage(publishError)}; additionally failed to save retry state: ${updateError.message}`);
    throw publishError;
  }
}
