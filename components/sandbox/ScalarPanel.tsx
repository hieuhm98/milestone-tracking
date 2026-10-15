"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { useTheme } from "@/context/theme";

/**
 * The Scalar API reference + request client, loaded only in the browser (the
 * page imports this with next/dynamic, ssr: false). The sandbox key is filled
 * in for the learner; the Bearer token is theirs to paste after logging in,
 * which is the lesson. It follows the site's light/dark theme.
 */
export default function ScalarPanel({ apiKey, lang }: { apiKey: string; lang: "vi" | "en" }) {
  const { theme } = useTheme();

  return (
    <div className="scalar-panel overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <ApiReferenceReact
        configuration={{
          url: `/api/sandbox/openapi.json?lang=${lang}`,
          forceDarkModeState: theme,
          hideDarkModeToggle: true,
          persistAuth: true,
          withDefaultFonts: false,
          // A learner's page: no AI chat, no Scalar dev toolbar, no usage pings.
          agent: { disabled: true },
          showDeveloperTools: "never",
          telemetry: false,
          defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
          // Both schemes at once (AND): the key on every call, the token when the learner adds one.
          authentication: {
            preferredSecurityScheme: [["sandboxKey", "bearerAuth"]],
            securitySchemes: { sandboxKey: { value: apiKey } },
          },
        }}
      />
    </div>
  );
}
