import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deliverDigest, type DigestRecipient } from "@/lib/server/digestDelivery";
import { escapeHtml, sendTelegramMessage, siteUrl } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    text?: string;
  };
}

const HELP =
  "Milestone Tracking bot\n\n" +
  "/today — gửi bản tin học tập ngay / send today's update now\n" +
  "/stop — ngừng nhận tin / stop daily messages\n\n" +
  `Kết nối tài khoản trong ứng dụng / connect from the app: ${siteUrl()}`;

/**
 * Telegram webhook. Registered with a secret token (scripts/telegram-webhook.mjs),
 * which Telegram echoes in a header on every call — anything without it is dropped.
 */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;

  // Always 200 for updates we ignore, or Telegram keeps redelivering them.
  if (!supabase || !message?.text || message.chat.type !== "private") return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const [command, arg] = message.text.trim().split(/\s+/, 2);

  if (command === "/start" && arg) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, lang, status, telegram_link_expires")
      .eq("telegram_link_code", arg)
      .maybeSingle();

    const expired = !profile?.telegram_link_expires || new Date(profile.telegram_link_expires).getTime() < Date.now();

    if (!profile || expired || profile.status !== "active") {
      await sendTelegramMessage(chatId, "⚠️ Liên kết đã hết hạn hoặc không hợp lệ. Hãy bấm lại \"Kết nối Telegram\" trong ứng dụng.\nThis link has expired or is invalid — press \"Connect Telegram\" in the app again.");

      return NextResponse.json({ ok: true });
    }

    // One chat ↔ one account: release this chat from any account it was on.
    await supabase.from("profiles").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId);
    await supabase
      .from("profiles")
      .update({ telegram_chat_id: chatId, telegram_link_code: null, telegram_link_expires: null })
      .eq("id", profile.id);

    const name = escapeHtml(profile.full_name);

    await sendTelegramMessage(
      chatId,
      profile.lang === "en"
        ? `✅ Connected, <b>${name}</b>! You'll get a learning update every morning at 8:00.\nSend /today to see it now, /stop to unsubscribe.`
        : `✅ Đã kết nối, <b>${name}</b>! Bạn sẽ nhận bản tin học tập lúc 8:00 mỗi sáng.\nGửi /today để xem ngay, /stop để ngừng nhận.`
    );

    return NextResponse.json({ ok: true });
  }

  if (command === "/stop") {
    await supabase.from("profiles").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId);
    await sendTelegramMessage(chatId, "👋 Đã ngừng gửi bản tin. / Daily messages stopped.");

    return NextResponse.json({ ok: true });
  }

  if (command === "/today") {
    const { data: recipient } = await supabase
      .from("profiles")
      .select("id, full_name, lang, telegram_chat_id")
      .eq("telegram_chat_id", chatId)
      .eq("status", "active")
      .maybeSingle();

    if (recipient) {
      await deliverDigest(supabase, recipient as DigestRecipient);
    } else {
      await sendTelegramMessage(chatId, HELP);
    }

    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, HELP);

  return NextResponse.json({ ok: true });
}
