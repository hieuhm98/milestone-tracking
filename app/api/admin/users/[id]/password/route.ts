import { NextResponse } from "next/server";
import { fail, isMissingColumn, requireAdmin, SCHEMA_HINT } from "@/lib/server/accountAdmin";
import { isValidPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Set a new password for someone. Their account is flagged so that, after
 * they next sign in with it, the app asks them to change it or keep it.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const caller = await requireAdmin(request);

  if (caller instanceof NextResponse) return caller;

  if (!UUID.test(params.id)) return fail("invalid_id");

  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (!isValidPassword(password)) return fail("invalid_password");

  const { supabase } = caller;

  // An admin changing their own password chose it themselves — no prompt.
  const flag = params.id !== caller.user.id;

  // Flag first: if the column is missing, stop before the password changes,
  // otherwise the user would never be asked to replace it.
  const flagged = await supabase
    .from("profiles")
    .update({ must_change_password: flag })
    .eq("id", params.id)
    .select("id")
    .maybeSingle();

  if (isMissingColumn(flagged.error)) return fail(SCHEMA_HINT, 409);

  if (flagged.error) {
    console.error("[admin/users] flag update failed", flagged.error);

    return fail("update_failed", 500);
  }

  if (!flagged.data) return fail("not_found", 404);

  const { error } = await supabase.auth.admin.updateUserById(params.id, { password });

  if (error) {
    console.error("[admin/users] password update failed", error);

    // The password did not change, so there is nothing to ask them about.
    if (flag) await supabase.from("profiles").update({ must_change_password: false }).eq("id", params.id);

    return fail(/weak|short|pwned/i.test(error.message) ? "weak_password" : "update_failed", error.status === 422 ? 422 : 500);
  }

  return NextResponse.json({ ok: true, mustChangePassword: flag });
}
