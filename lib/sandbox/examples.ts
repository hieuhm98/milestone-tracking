import "server-only";
import { API_BASE_PATH, DEMO_ACCOUNTS, MISTAKES, OPERATIONS, SANDBOX_KEY_HEADER, type Actor, type ExampleCall } from "./catalog";
import { handleSandboxRequest, ROUTE_ACCESS, type SandboxResponse } from "./engine";
import { seedData } from "./seed";
import { sandboxResetsAt } from "./store";
import type { SandboxData } from "./types";

// Runs every worked example through the real engine, each on a fresh copy of
// the default data, so the guide and Scalar show responses the API actually
// gives — they can't drift from the code the way hand-written samples do.

export interface ShownRequest {
  method: string;
  url: string;
  pathParams: Record<string, string>;
  query: Record<string, string>;
  headers: [string, string][];
  body?: unknown;
}

export interface ShownResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  body?: unknown;
}

export interface WorkedExample {
  request: ShownRequest;
  response: ShownResponse;
  /** The login that produced the token, when the example needed one. */
  loggedInAs?: string;
}

const EXAMPLE_NOW = new Date("2026-10-15T03:00:00.000Z");
const EXAMPLE_OWNER = "example";
/** Stands in for the learner's own key, which the page swaps in. */
export const KEY_PLACEHOLDER = "<your-sandbox-key>";

export const STATUS_TEXT: Record<number, string> = {
  200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 402: "Payment Required",
  403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 409: "Conflict", 413: "Payload Too Large",
  415: "Unsupported Media Type", 422: "Unprocessable Entity", 500: "Internal Server Error",
};

function run(data: SandboxData, call: ExampleCall, authorization: string | null) {
  return handleSandboxRequest(data, {
    method: call.method,
    path: call.path.split("/").filter(Boolean),
    query: new URLSearchParams(call.query ?? {}),
    body: call.body,
    authorization,
    owner: EXAMPLE_OWNER,
    now: EXAMPLE_NOW,
    day: "2026-10-15",
    resetsAt: sandboxResetsAt(EXAMPLE_NOW),
  });
}

function tokenFor(data: SandboxData, actor: Actor): { token: string; email: string } | null {
  if (!actor) return null;

  const account = DEMO_ACCOUNTS.find((a) => a.role === actor)!;
  const login = run(data, { as: null, method: "POST", path: "/auth/login", body: { email: account.email, password: account.password } }, null);

  return { token: (login.response.body as { access_token: string }).access_token, email: account.email };
}

function pathParams(template: string | undefined, path: string): Record<string, string> {
  if (!template) return {};

  const want = template.split("/");
  const got = path.split("/");
  const out: Record<string, string> = {};

  want.forEach((part, i) => {
    if (part.startsWith("{")) out[part.slice(1, -1)] = got[i];
  });

  return out;
}

function show(call: ExampleCall, authorization: string | null, response: SandboxResponse, template?: string): WorkedExample["request"] & { _res: ShownResponse } {
  const qs = new URLSearchParams(call.query ?? {}).toString();
  const headers: [string, string][] = [[SANDBOX_KEY_HEADER, KEY_PLACEHOLDER]];

  if (authorization) headers.push(["Authorization", authorization]);

  if (call.body !== undefined) headers.push(["Content-Type", "application/json"]);

  const resHeaders: [string, string][] = response.status === 204 ? [] : [["Content-Type", "application/json"]];

  for (const [name, value] of Object.entries(response.headers ?? {})) resHeaders.push([name, value]);

  return {
    method: call.method,
    url: `${API_BASE_PATH}${call.path === "/" ? "" : call.path}${qs ? `?${qs}` : ""}`,
    pathParams: pathParams(template, call.path),
    query: call.query ?? {},
    headers,
    body: call.body,
    _res: { status: response.status, statusText: STATUS_TEXT[response.status] ?? "", headers: resHeaders, body: response.body },
  };
}

function runExample(call: ExampleCall, setup: ExampleCall[] = [], template?: string, rawAuthorization?: string): WorkedExample {
  let data = seedData();

  for (const step of setup) {
    const login = tokenFor(data, step.as);

    data = run(data, step, login ? `Bearer ${login.token}` : null).data;
  }

  const login = tokenFor(data, call.as);
  const authorization = rawAuthorization ?? (login ? `Bearer ${login.token}` : null);
  const result = run(data, call, authorization);
  const { _res, ...request } = show(call, authorization, result.response, template);

  return { request, response: _res, loggedInAs: login?.email };
}

/** The catalogue documents every engine route, with the same access level — or the build stops. */
function assertCatalogMatchesEngine() {
  const documented = new Map(OPERATIONS.map((op) => [`${op.method} ${op.path}`, op.access]));
  const problems: string[] = [];

  for (const [route, access] of Object.entries(ROUTE_ACCESS)) {
    if (!documented.has(route)) problems.push(`undocumented route ${route}`);
    else if (documented.get(route) !== access) problems.push(`${route}: catalogue says ${documented.get(route)}, engine says ${access}`);
  }

  for (const route of Array.from(documented.keys())) {
    if (!(route in ROUTE_ACCESS)) problems.push(`catalogue lists ${route}, which the engine does not serve`);
  }

  if (problems.length > 0) throw new Error(`Sandbox catalogue out of sync:\n${problems.join("\n")}`);
}

let cache: { operations: Record<string, WorkedExample>; mistakes: Record<string, WorkedExample> } | null = null;

export function workedExamples() {
  if (!cache) {
    assertCatalogMatchesEngine();
    cache = {
      operations: Object.fromEntries(OPERATIONS.map((op) => [op.id, runExample(op.example, op.setup, op.path)])),
      mistakes: Object.fromEntries(MISTAKES.map((m) => [m.id, runExample(m.call, [], undefined, m.rawAuthorization)])),
    };
  }

  return cache;
}
