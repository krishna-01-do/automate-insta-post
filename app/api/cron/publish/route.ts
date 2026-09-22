import type { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/auth";
import { runPublisher } from "@/lib/publisher";
import { errorMessage } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ ok: true, ...(await runPublisher()) });
  } catch (error) {
    console.error("Publisher failed", error);
    return Response.json({ ok: false, error: errorMessage(error) }, { status: 500 });
  }
}
