import { NextResponse } from "next/server";
import { buildOpenApi } from "@/lib/sandbox/openapi";

export const runtime = "nodejs";

/** The OpenAPI document for Scalar — and for importing into Postman or Insomnia. */
export function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "vi";

  return NextResponse.json(buildOpenApi(lang), {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" },
  });
}
