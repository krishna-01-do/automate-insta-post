import type { NextRequest } from "next/server";
import { env } from "./env";

export function isAuthorizedCron(request: NextRequest): boolean {
  return request.headers.get("authorization") === `Bearer ${env.cronSecret()}`;
}
