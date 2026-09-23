import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDailyDigest } from "@/lib/dailyDigest";
import { emptyProgress, normalize } from "@/lib/progress";
import { escapeHtml, sendTelegramMessage, siteUrl } from "@/lib/telegram";

export interface DigestRecipient {
  id: string;
  full_name: string;
  lang: string;
  telegram_chat_id: number;
}

export type DeliveryOutcome = "sent" | "failed" | "unlinked";

/**
 * Build and send one learner's digest. A 403 from Telegram means the learner
 * blocked the bot, so the link is dropped rather than retried every morning.
 */
export async function deliverDigest(supabase: SupabaseClient, recipient: DigestRecipient): Promise<DeliveryOutcome> {
  const { data: row } = await supabase
    .from("user_progress")
    .select("data")
    .eq("user_id", recipient.id)
    .maybeSingle();

  const html = buildDailyDigest({
    name: escapeHtml(recipient.full_name),
    lang: recipient.lang === "en" ? "en" : "vi",
    data: row?.data ? normalize(row.data) : emptyProgress(),
    link: siteUrl,
  });

  const result = await sendTelegramMessage(recipient.telegram_chat_id, html);

  if (result.ok) return "sent";

  if (result.errorCode === 403) {
    await supabase.from("profiles").update({ telegram_chat_id: null }).eq("id", recipient.id);

    return "unlinked";
  }

  console.error("[digest] send failed", recipient.id, result.description);

  return "failed";
}
