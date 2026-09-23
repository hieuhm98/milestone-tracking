import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatPhone, normalizePhone, phoneToLoginEmail } from "@/lib/phone";
import { escapeHtml, notifyAdmin } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PASSWORD = 8;

function fail(error: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Names (never values) of the server-side variables sign-up needs. */
function missingConfig(): string[] {
  return ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((name) => !process.env[name]);
}

/**
 * Create a learner account. Runs server-side with the service role so the
 * account is created without a session: a new account is `draft` and must
 * not be able to sign in until an admin sets it to `active`.
 */
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    const missing = missingConfig();

    console.error("[signup] Supabase is not configured on the server; missing:", missing.join(", "));

    return fail("not_configured", 503, { missing });
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return fail("invalid_body");
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim().replace(/\s+/g, " ") : "";
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null;
  const password = typeof body.password === "string" ? body.password : "";
  const lang = body.lang === "en" ? "en" : "vi";

  if (fullName.length < 1 || fullName.length > 100) return fail("invalid_name");

  if (!phone) return fail("invalid_phone");

  if (password.length < MIN_PASSWORD || password.length > 72) return fail("invalid_password");

  const { data: existing } = await supabase.from("profiles").select("id").eq("phone", phone).maybeSingle();

  if (existing) return fail("phone_taken", 409);

  const { data, error } = await supabase.auth.admin.createUser({
    email: phoneToLoginEmail(phone),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, lang },
  });

  if (error || !data.user) {
    // The auth user can exist without a profile only if the trigger failed; the
    // email is unique per phone, so a duplicate still means the phone is taken.
    // The pre-check above can miss (its query is best effort), so a unique
    // violation from the profiles trigger means the same thing.
    if (error?.status === 422 || /already|duplicate key|profiles_phone_key/i.test(error?.message ?? "")) {
      return fail("phone_taken", 409);
    }

    console.error("[signup] createUser failed", error);

    return fail("signup_failed", 500);
  }

  await notifyAdmin(
    `🆕 <b>New sign-up waiting for approval</b>\n` +
      `Name: ${escapeHtml(fullName)}\n` +
      `Phone: ${escapeHtml(formatPhone(phone))}\n\n` +
      `Approve in Supabase → Table Editor → profiles: set <code>status</code> to <code>active</code>.`
  );

  return NextResponse.json({ ok: true, status: "draft" }, { status: 201 });
}
