import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { updateSessionAndGuardAdmin } from "@/lib/supabase/middleware";
import { locales, defaultLocale } from "../i18n";

/** Next.js 16 convention (replaces deprecated root `middleware.ts`). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return updateSessionAndGuardAdmin(request);
  }

  const intlMiddleware = createIntlMiddleware({
    locales,
    defaultLocale,
    localePrefix: "always",
  });

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
