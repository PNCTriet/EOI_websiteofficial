import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isUserAdmin } from "@/lib/auth-helpers";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminArea = pathname.startsWith("/admin");
  const isAdminLogin = pathname === "/admin/login";
  const isStoreLogin = pathname === "/login";
  const isCheckout = pathname.startsWith("/checkout");
  const isAccount = pathname.startsWith("/account");

  if (isAdminArea && !isAdminLogin && !isUserAdmin(user)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (isAdminLogin && isUserAdmin(user)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  if ((isCheckout || isAccount) && !user) {
    const nextRaw = `${pathname}${request.nextUrl.search}`;
    const next = encodeURIComponent(nextRaw);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }
  if (isStoreLogin && user && !isUserAdmin(user)) {
    return NextResponse.redirect(new URL("/account", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/checkout/:path*", "/account/:path*"],
};
