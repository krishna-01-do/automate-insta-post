import type { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/auth";
import { runGenerator } from "@/lib/generator";
import { errorMessage } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ ok: true, ...(await runGenerator()) });
  } catch (error) {
    console.error("Generator failed", error);
    return Response.json({ ok: false, error: errorMessage(error) }, { status: 500 });
  }
}
