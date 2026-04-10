import { type NextRequest } from "next/server";
import { updateSessionAndGuardAdmin } from "@/lib/supabase/middleware";

/** Next.js 16 convention (replaces deprecated root `middleware.ts`). */
export async function proxy(request: NextRequest) {
  return updateSessionAndGuardAdmin(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
