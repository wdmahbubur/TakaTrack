import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabaseConfig } from "./config";
export async function serverSupabase() {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient<Database>(url, key, {
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items) {
            const opts =
              store.get("tt-remember")?.value === "no" && value
                ? { ...options, maxAge: undefined, expires: undefined }
                : options;
            store.set(name, value, opts);
          }
        } catch {
          // Server Components cannot write cookies. src/proxy.ts refreshes before rendering.
        }
      },
    },
  });
}
