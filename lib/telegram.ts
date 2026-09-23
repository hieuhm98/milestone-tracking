import "server-only";

const API = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Escape text for Telegram's HTML parse mode. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface SendResult {
  ok: boolean;
  /** Telegram's error code — 403 means the user blocked the bot or deleted the chat. */
  errorCode?: number;
  description?: string;
}

export async function sendTelegramMessage(chatId: number | string, html: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) return { ok: false, description: "TELEGRAM_BOT_TOKEN is not set" };

  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      }),
    });
    const json = await res.json().catch(() => null);

    if (json?.ok) return { ok: true };

    return { ok: false, errorCode: json?.error_code ?? res.status, description: json?.description };
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : String(error) };
  }
}

let cachedUsername: string | null = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || null;

/** The bot's @username, from env or (once) from getMe. */
export async function getBotUsername(): Promise<string | null> {
  if (cachedUsername) return cachedUsername;

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) return null;

  try {
    const res = await fetch(`${API}/bot${token}/getMe`);
    const json = await res.json();

    cachedUsername = json?.result?.username ?? null;
  } catch {
    cachedUsername = null;
  }

  return cachedUsername;
}

/** Ping the admin chat, if one is configured. Never throws. */
export async function notifyAdmin(html: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!chatId || !isTelegramConfigured()) return;

  await sendTelegramMessage(chatId, html);
}

/** Absolute site URL for links inside messages. */
export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

  return `${base}${path}`;
}
