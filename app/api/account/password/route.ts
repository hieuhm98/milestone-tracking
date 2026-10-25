import { NextResponse } from "next/server";
import { fail, isMissingColumn, requireActiveUser } from "@/lib/server/accountAdmin";
import { isValidPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in user's answer to "an admin set your password": send
 * `{ password }` to replace it, or `{ keep: true }` to keep the admin's one.
 * Either way the prompt is cleared.
 */
export async function POST(request: Request) {
  const caller = await requireActiveUser(request);

  if (caller instanceof NextResponse) return caller;

  const body = await request.json().catch(() => null);
  const keep = body?.keep === true;
  const password = body?.password;

  if (!keep && !isValidPassword(password)) return fail("invalid_password");

  const { supabase, user } = caller;

  if (!keep) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password });

    if (error) {
      console.error("[account/password] update failed", error);

      return fail(/weak|short|pwned/i.test(error.message) ? "weak_password" : "update_failed", error.status === 422 ? 422 : 500);
    }
  }

  const { error } = await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);

  // No column means the prompt could never have been shown — nothing to clear.
  if (error && !isMissingColumn(error)) {
    console.error("[account/password] clearing the flag failed", error);

    return fail("update_failed", 500);
  }

  return NextResponse.json({ ok: true, changed: !keep });
}
