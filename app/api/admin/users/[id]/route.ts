import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/server/accountAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["draft", "active", "disabled"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Change an account's status: approve (active), block (disabled) or send back to waiting (draft). */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const caller = await requireAdmin(request);

  if (caller instanceof NextResponse) return caller;

  if (!UUID.test(params.id)) return fail("invalid_id");

  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (!STATUSES.includes(status)) return fail("invalid_status");

  // An admin who disables themselves is locked out with nobody to let them back in.
  if (params.id === caller.user.id) return fail("cannot_change_self", 409);

  const { data, error } = await caller.supabase
    .from("profiles")
    .update({ status })
    .eq("id", params.id)
    .select("id, status, approved_at")
    .maybeSingle();

  if (error) {
    console.error("[admin/users] status update failed", error);

    return fail("update_failed", 500);
  }

  if (!data) return fail("not_found", 404);

  return NextResponse.json({ user: data });
}
