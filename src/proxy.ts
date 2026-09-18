import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseConfig } from "./lib/supabase/config";
export async function proxy(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.next();
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of items)
          response.cookies.set(
            name,
            value,
            request.cookies.get("tt-remember")?.value === "no" && value
              ? { ...options, maxAge: undefined, expires: undefined }
              : options,
          );
      },
    },
  });
  // Verify JWT and refresh cookie state; application services independently use getUser().
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/reports/:path*",
    "/profile/:path*",
    "/api/:path*",
    "/auth/:path*",
    "/reset-password",
  ],
};
