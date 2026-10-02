import { env } from "./env.ts";
import { sleep } from "./utils.ts";

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number } };
type ContainerStatus = { status_code?: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED"; status?: string };

function graphApiOrigin(): string {
  // Instagram Login tokens and Facebook Login/Page tokens are both valid for
  // publishing, but Meta requires them to be sent to different Graph domains.
  return env.instagramAccessToken().startsWith("IG")
    ? "https://graph.instagram.com"
    : "https://graph.facebook.com";
}

function endpoint(path: string) {
  return `${graphApiOrigin()}/${env.graphVersion()}/${path}`;
}

async function graph<T>(url: string, init?: RequestInit, timeoutMs = 30_000): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.json() as T & GraphError;
  if (!response.ok || body.error) {
    throw new Error(`Instagram API failed (${response.status}): ${body.error?.message || "Unknown error"}`);
  }
  return body;
}

export function formatInstagramCaption(caption: string, hashtags: string[]): string {
  return `${caption.trim()}\n\n${hashtags.join(" ")}`.trim();
}

type CatalogAudio = { audio_id?: string; title?: string; display_artist?: string; duration_in_ms?: number };

const AUDIO_SEARCHES: Record<string, string> = {
  "Savage dating": "Bollywood romance",
  "Relatable situationships": "Bollywood romance",
  "Relatives and wedding questions": "Bollywood wedding",
  "Indian family sarcasm": "Bollywood comedy",
  "Family WhatsApp groups": "Bollywood comedy",
  "College and exam chaos": "Bollywood youth",
};

function scoreAudio(audio: CatalogAudio, category: string): number {
  const label = `${audio.title || ""} ${audio.display_artist || ""}`.toLowerCase();
  const categoryWords = category.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
  return (label.includes("bollywood") ? 5 : 0) +
    (label.includes("hindi") ? 3 : 0) +
    categoryWords.filter((word) => label.includes(word)).length;
}

export async function findReelAudio(category: string, postId: string): Promise<string> {
  if (graphApiOrigin() !== "https://graph.facebook.com") {
    throw new Error("Meta catalog audio requires a Facebook Login/Page Instagram token");
  }
  const query = AUDIO_SEARCHES[category] || "Bollywood";
  for (const searchQuery of [query, "Hindi"]) {
    const params = new URLSearchParams({
      audio_type: "music", ig_user_id: env.instagramAccountId(),
      search_query: searchQuery, access_token: env.instagramAccessToken(),
    });
    const result = await graph<{ audio?: CatalogAudio[] }>(`${endpoint("ig_audio")}?${params}`, undefined, 8_000);
    const tracks = (result.audio || []).filter((item) => item.audio_id && (!item.duration_in_ms || item.duration_in_ms >= 10_000));
    if (tracks.length) {
      tracks.sort((a, b) => scoreAudio(b, category) - scoreAudio(a, category));
      const topScore = scoreAudio(tracks[0], category);
      const best = tracks.filter((item) => scoreAudio(item, category) === topScore);
      const index = parseInt(postId.slice(0, 8), 16) % best.length;
      return best[index].audio_id!;
    }
  }
  throw new Error(`No suitable Meta catalog track found for ${category}; Reel was not published`);
}

export async function findRecentPublishedByCaption(caption: string): Promise<string | null> {
  const params = new URLSearchParams({ fields: "id,caption", limit: "25", access_token: env.instagramAccessToken() });
  const result = await graph<{ data?: Array<{ id: string; caption?: string }> }>(`${endpoint(`${env.instagramAccountId()}/media`)}?${params}`);
  return result.data?.find((item) => item.caption?.trim() === caption.trim())?.id || null;
}

export async function createMediaContainer(videoUrl: string, caption: string, category: string, postId: string): Promise<string> {
  const audioId = await findReelAudio(category, postId);
  const body = new URLSearchParams({
    video_url: videoUrl,
    media_type: "REELS",
    share_to_feed: "true",
    audio_configuration: JSON.stringify({ audio_id: audioId, audio_volume: 85, video_volume: 0 }),
    caption,
    access_token: env.instagramAccessToken(),
  });
  const result = await graph<{ id: string }>(endpoint(`${env.instagramAccountId()}/media`), { method: "POST", body });
  if (!result.id) throw new Error("Instagram did not return a media container ID");
  return result.id;
}

export async function getContainerStatus(containerId: string): Promise<ContainerStatus> {
  const params = new URLSearchParams({ fields: "status_code,status", access_token: env.instagramAccessToken() });
  return graph<ContainerStatus>(`${endpoint(containerId)}?${params}`);
}

export async function waitUntilContainerReady(containerId: string): Promise<ContainerStatus["status_code"]> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const state = await getContainerStatus(containerId);
    if (state.status_code === "FINISHED" || state.status_code === "PUBLISHED") return state.status_code;
    if (state.status_code === "ERROR" || state.status_code === "EXPIRED") {
      throw new Error(`Instagram container ${state.status_code.toLowerCase()}: ${state.status || "no details"}`);
    }
    await sleep(2_000);
  }
  throw new Error("Instagram container was not ready before the polling timeout");
}

export async function publishMediaContainer(containerId: string): Promise<string> {
  const body = new URLSearchParams({ creation_id: containerId, access_token: env.instagramAccessToken() });
  const result = await graph<{ id: string }>(endpoint(`${env.instagramAccountId()}/media_publish`), { method: "POST", body });
  if (!result.id) throw new Error("Instagram did not return a published media ID");
  return result.id;
}
