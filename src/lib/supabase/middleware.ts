import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/auth/admin";

export async function updateSessionAndGuardAdmin(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin") && path !== "/admin/login" && path !== "/admin/login/") {
    if (!user || !(await isAdminUser(user))) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }

  if (path === "/admin/login" || path === "/admin/login/") {
    if (user && (await isAdminUser(user))) {
      const rawNext = request.nextUrl.searchParams.get("next")?.trim() ?? "";
      const safeDest =
        rawNext.startsWith("/admin") && !rawNext.includes("://") && !rawNext.includes("..") ? rawNext : "/admin/dashboard";
      return NextResponse.redirect(new URL(safeDest, request.url));
    }
    if (user && !(await isAdminUser(user))) {
      return NextResponse.redirect(new URL("/?error=not_admin", request.url));
    }
  }

  return supabaseResponse;
}
