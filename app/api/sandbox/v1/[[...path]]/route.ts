import { NextResponse } from "next/server";
import { verifySandboxKey } from "@/lib/sandbox/auth";
import { handleSandboxRequest, isWrite } from "@/lib/sandbox/engine";
import { loadSandbox, SandboxStorageError, sandboxDay, sandboxResetsAt, saveSandbox } from "@/lib/sandbox/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20 * 1024;
const SAVE_ATTEMPTS = 6;

// The sandbox key is a header, not a cookie, so allowing any origin is safe and
// lets learners call the API from their own pages or tools.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Sandbox-Key",
  "Access-Control-Expose-Headers": "Location, Allow, WWW-Authenticate, X-Sandbox-Day, X-Sandbox-Resets-At",
};

function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
  const all = { ...CORS, ...headers };

  // 204 No Content must not carry a body.
  return status === 204 ? new NextResponse(null, { status, headers: all }) : NextResponse.json(body, { status, headers: all });
}

const error = (status: number, code: string, message: string) => reply(status, { error: { code, message } });

async function readBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; res: NextResponse }> {
  const text = await request.text();

  if (text.length > MAX_BODY_BYTES) return { ok: false, res: error(413, "payload_too_large", `The body may be at most ${MAX_BODY_BYTES / 1024} KB.`) };

  if (text.trim() === "") return { ok: true, body: undefined };

  const type = request.headers.get("content-type") ?? "";

  if (!type.toLowerCase().includes("application/json")) {
    return { ok: false, res: error(415, "unsupported_media_type", "Send JSON with the header  Content-Type: application/json.") };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, res: error(400, "invalid_json", "The body is not valid JSON — check for a missing quote, comma or brace.") };
  }
}

async function handle(request: Request, { params }: { params: { path?: string[] } }) {
  const key = request.headers.get("x-sandbox-key");
  const owner = verifySandboxKey(key);

  if (!owner) {
    return key
      ? error(401, "invalid_sandbox_key", "The X-Sandbox-Key header is not a key this site issued. Copy yours from /practice/api.")
      : error(401, "sandbox_key_missing", "Every request needs your personal X-Sandbox-Key header. Copy it from /practice/api.");
  }

  const parsed = await readBody(request);

  if (!parsed.ok) return parsed.res;

  const url = new URL(request.url);
  const path = (params.path ?? []).map((part) => decodeURIComponent(part));
  const writes = isWrite(request.method, path);

  for (let attempt = 0; attempt < SAVE_ATTEMPTS; attempt++) {
    const now = new Date();
    const day = sandboxDay(now);
    const resetsAt = sandboxResetsAt(now);
    const loaded = await loadSandbox(owner, day);
    const result = handleSandboxRequest(loaded.data, {
      method: request.method,
      path,
      query: url.searchParams,
      body: parsed.body,
      authorization: request.headers.get("authorization"),
      owner,
      now,
      day,
      resetsAt,
    });

    // Only a write that actually changed something is saved; reads never create a row.
    // Lost a race: back off a random, growing moment so the retries spread out.
    if (writes && result.changed && !(await saveSandbox(owner, day, loaded, result.data))) {
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1) + Math.random() * 40));

      continue;
    }

    return reply(result.response.status, result.response.body, {
      ...result.response.headers,
      "X-Sandbox-Day": day,
      "X-Sandbox-Resets-At": resetsAt,
    });
  }

  return error(409, "concurrent_update", "Another request changed your sandbox at the same moment. Send this one again.");
}

async function safeHandle(request: Request, ctx: { params: { path?: string[] } }) {
  try {
    return await handle(request, ctx);
  } catch (err) {
    console.error("[sandbox]", err);

    // The usual first-deploy failure: the table was never created. Say so, so
    // the operator doesn't have to dig through function logs.
    if (err instanceof SandboxStorageError) {
      return err.missingTable
        ? error(503, "sandbox_not_set_up", "Sandbox storage is not set up: the api_sandboxes table is missing. Run supabase/schema.sql in the Supabase SQL Editor.")
        : error(503, "sandbox_storage_unavailable", "The sandbox database did not answer. Try again in a moment.");
    }

    return error(500, "internal_error", "The sandbox hit an unexpected error. Try again in a moment.");
  }
}

export const GET = safeHandle;
export const POST = safeHandle;
export const PUT = safeHandle;
export const PATCH = safeHandle;
export const DELETE = safeHandle;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
