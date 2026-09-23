// Register (or remove) the Telegram webhook for this deployment.
//
//   node --env-file=.env.local scripts/telegram-webhook.mjs            # set
//   node --env-file=.env.local scripts/telegram-webhook.mjs --delete   # remove
//
// Needs TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_SITE_URL
// (the public https URL — Telegram cannot reach localhost).

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
const remove = process.argv.includes("--delete");

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const api = (method, body) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then((res) => res.json());

if (remove) {
  console.log(await api("deleteWebhook"));
  process.exit(0);
}

if (!secret || !site.startsWith("https://")) {
  console.error("TELEGRAM_WEBHOOK_SECRET and an https NEXT_PUBLIC_SITE_URL are required");
  process.exit(1);
}

console.log(
  await api("setWebhook", {
    url: `${site}/api/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  })
);

console.log(
  await api("setMyCommands", {
    commands: [
      { command: "today", description: "Bản tin học tập hôm nay / Today's learning update" },
      { command: "stop", description: "Ngừng nhận tin / Stop daily messages" },
    ],
  })
);

console.log(await api("getWebhookInfo"));
