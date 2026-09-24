import { env } from "./env";
import { sleep } from "./utils";

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

async function graph<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  const body = await response.json() as T & GraphError;
  if (!response.ok || body.error) {
    throw new Error(`Instagram API failed (${response.status}): ${body.error?.message || "Unknown error"}`);
  }
  return body;
}

export function formatInstagramCaption(caption: string, hashtags: string[]): string {
  return `${caption.trim()}\n\n${hashtags.join(" ")}`.trim();
}

export async function findRecentPublishedByCaption(caption: string): Promise<string | null> {
  const params = new URLSearchParams({ fields: "id,caption", limit: "25", access_token: env.instagramAccessToken() });
  const result = await graph<{ data?: Array<{ id: string; caption?: string }> }>(`${endpoint(`${env.instagramAccountId()}/media`)}?${params}`);
  return result.data?.find((item) => item.caption?.trim() === caption.trim())?.id || null;
}

export async function createMediaContainer(imageUrl: string, caption: string): Promise<string> {
  const body = new URLSearchParams({
    image_url: imageUrl,
    media_type: "IMAGE",
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
