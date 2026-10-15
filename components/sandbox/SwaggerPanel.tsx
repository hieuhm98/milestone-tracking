"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

type SwaggerSystem = { preauthorizeApiKey: (name: string, value: string) => void };

/**
 * Swagger UI, loaded only in the browser (the page imports this with
 * next/dynamic, ssr: false). The sandbox key is filled in for the learner; the
 * Bearer token is theirs to paste after logging in, which is the lesson.
 * Swagger UI has no dark theme, so it sits on a white panel in both themes.
 */
export default function SwaggerPanel({ apiKey, lang }: { apiKey: string; lang: "vi" | "en" }) {
  return (
    <div className="swagger-panel rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white text-zinc-900 overflow-hidden">
      <SwaggerUI
        url={`/api/sandbox/openapi.json?lang=${lang}`}
        deepLinking
        tryItOutEnabled
        displayRequestDuration
        persistAuthorization
        filter
        defaultModelsExpandDepth={0}
        docExpansion="list"
        onComplete={(system: SwaggerSystem) => system.preauthorizeApiKey("sandboxKey", apiKey)}
      />
    </div>
  );
}
