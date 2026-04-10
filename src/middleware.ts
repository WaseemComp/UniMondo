import { type NextRequest } from "next/server";
import { updateSessionAndGuardAdmin } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSessionAndGuardAdmin(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
