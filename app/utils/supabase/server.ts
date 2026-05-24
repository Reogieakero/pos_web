import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  // Pointing to your specific environment variable names
  const supabaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_DATABASE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL and Key are missing from environment variables.");
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component cookie handling
          }
        },
      },
    }
  );
}