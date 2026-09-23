import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/**
 * Service-role client for API routes only. It bypasses RLS, so it must never
 * be imported from a client component — `server-only` makes that a build error.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  if (!admin) {
    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return admin;
}

/** Resolve the signed-in user from an `Authorization: Bearer <access token>` header. */
export async function userFromRequest(request: Request) {
  const supabase = getSupabaseAdmin();
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!supabase || !token) return null;

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}
