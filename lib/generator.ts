import { uploadQuoteImage } from "./cloudinary";
import { generateUniquePosts } from "./gemini";
import { createQuoteSvg } from "./image";
import { createSchedule } from "./scheduler";
import { quoteHash } from "./similarity";
import { getSupabase } from "./supabase";
import type { PostRow } from "./types";
import { errorMessage, mapWithConcurrency } from "./utils";

const TARGET_QUEUE_SIZE = 20;

async function renderGeneratedPost(post: PostRow): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const svg = createQuoteSvg(post.quote, post.category, parseInt(post.id.slice(0, 8), 16));
    const imageUrl = await uploadQuoteImage(svg, post.id);
    const { error } = await supabase.from("posts").update({
      image_url: imageUrl, status: "pending", error_message: null,
    }).eq("id", post.id).eq("status", "generated");
    if (error) throw error;
    return true;
  } catch (error) {
    await supabase.from("posts").update({ error_message: errorMessage(error).slice(0, 2_000) }).eq("id", post.id);
    return false;
  }
}

export async function runGenerator() {
  const supabase = getSupabase();
  const { data: unfinished, error: unfinishedError } = await supabase
    .from("posts").select("*").eq("status", "generated").order("created_at", { ascending: true });
  if (unfinishedError) throw unfinishedError;
  const resumedResults = await mapWithConcurrency((unfinished || []) as PostRow[], 4, renderGeneratedPost);

  const { count, error: countError } = await supabase
    .from("posts").select("id", { count: "exact", head: true }).in("status", ["pending", "publishing"]);
  if (countError) throw countError;
  const needed = Math.max(0, TARGET_QUEUE_SIZE - (count || 0));
  if (!needed) return { generated: 0, resumed: resumedResults.filter(Boolean).length, queueSize: count || 0 };

  const [{ data: recent, error: recentError }, { data: scheduled, error: scheduleError }] = await Promise.all([
    supabase.from("posts").select("quote").order("created_at", { ascending: false }).limit(100),
    supabase.from("posts").select("scheduled_at").in("status", ["generated", "pending", "publishing"]),
  ]);
  if (recentError) throw recentError;
  if (scheduleError) throw scheduleError;

  const posts = await generateUniquePosts(needed, (recent || []).map((row) => row.quote));
  const times = createSchedule(needed, (scheduled || []).map((row) => row.scheduled_at));
  const rows = posts.map((post, index) => ({
    ...post,
    quote_hash: quoteHash(post.quote),
    status: "generated",
    scheduled_at: times[index],
    generated_at: new Date().toISOString(),
  }));
  const { data: inserted, error: insertError } = await supabase.from("posts").insert(rows).select("*");
  if (insertError) throw insertError;
  const rendered = await mapWithConcurrency((inserted || []) as PostRow[], 4, renderGeneratedPost);
  return {
    generated: inserted?.length || 0,
    imagesReady: rendered.filter(Boolean).length,
    imageFailures: rendered.filter((value) => !value).length,
    resumed: resumedResults.filter(Boolean).length,
    queueSize: (count || 0) + (inserted?.length || 0),
  };
}
