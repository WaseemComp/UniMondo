import { NextResponse, type NextRequest } from "next/server";
import { updateSessionAndGuardAdmin } from "@/lib/supabase/middleware";

/** Next.js 16 convention (replaces deprecated root `middleware.ts`). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return updateSessionAndGuardAdmin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
