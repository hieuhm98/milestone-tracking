"use client";

import { useLang } from "@/context/lang";
import { DEMO_ACCOUNTS, MISTAKES, SANDBOX_KEY_HEADER } from "@/lib/sandbox/catalog";
import type { WorkedExample } from "@/lib/sandbox/examples";
import { cn } from "@/lib/utils";
import ExampleView, { JsonBlock, MethodBadge, statusTone, useOrigin } from "./ExampleView";

type Pick = (vi: string, en: string) => string;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card space-y-3 scroll-mt-20">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const P = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{children}</p>;

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 font-mono text-[12px] text-zinc-800 dark:text-zinc-200">{children}</code>
);

// ------------------------------------------------------------------ URL anatomy

function UrlAnatomy({ pick }: { pick: Pick }) {
  const host = useOrigin().origin;
  const parts = [
    { text: host, label: pick("Giao thức + máy chủ", "Scheme + host"), tone: "border-transparent text-zinc-500" },
    { text: "/api/sandbox/v1", label: pick("Base path (phiên bản v1)", "Base path (version v1)"), tone: "border-zinc-300 text-zinc-500 dark:border-zinc-600" },
    { text: "/authors/", label: pick("Tài nguyên", "Resource"), tone: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300" },
    { text: "1", label: "Path param {id}", tone: "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30" },
    { text: "/books", label: pick("Tài nguyên con", "Sub-resource"), tone: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300" },
    { text: "?sort=price&limit=2", label: "Query params", tone: "border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300" },
  ];

  // The URL stays one unbroken line; the legend underneath names each coloured part.
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <code className="block min-w-max font-mono text-[13px]">
          {parts.map((part) => (
            <span key={part.label} className={cn("border-b-2 py-1", part.tone)}>{part.text}</span>
          ))}
        </code>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {parts.slice(1).map((part) => (
          <span key={part.label} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className={cn("inline-block h-0.5 w-4 border-b-2", part.tone)} />
            {part.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ raw HTTP

function RawRequest({ example, pick }: { example: WorkedExample; pick: Pick }) {
  const { request } = example;
  const { host } = useOrigin();
  const body = request.body === undefined ? null : JSON.stringify(request.body, null, 2);
  const short = (v: string) => (v.length > 44 ? `${v.slice(0, 41)}…` : v);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-100">
        <span className="text-emerald-400 font-bold">{request.method}</span> <span className="text-sky-300">{request.url}</span> <span className="text-zinc-500">HTTP/1.1</span>
        {"\n"}
        <span className="text-zinc-400">Host:</span> {host}
        {request.headers.map(([name, value]) => (
          <span key={name}>
            {"\n"}
            <span className="text-amber-300">{name}:</span> {short(value)}
          </span>
        ))}
        {"\n"}
        <span className="text-zinc-600">{pick("(một dòng trống — hết phần header)", "(a blank line — end of headers)")}</span>
        {body && (
          <>
            {"\n"}
            <span className="text-violet-300">{body}</span>
          </>
        )}
      </pre>
      <ol className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
        <li><b className="text-emerald-600 dark:text-emerald-400">1 · Method</b> — {pick("bạn muốn làm gì (POST = tạo mới).", "what you want to do (POST = create).")}</li>
        <li><b className="text-sky-600 dark:text-sky-400">2 · URL</b> — {pick("làm với tài nguyên nào.", "which resource.")}</li>
        <li><b className="text-amber-600 dark:text-amber-400">3 · Headers</b> — {pick("thông tin đi kèm: bạn là ai (key, token), body thuộc kiểu gì.", "metadata: who you are (key, token) and what the body is.")}</li>
        <li><b className="text-violet-600 dark:text-violet-400">4 · Body</b> — {pick("dữ liệu gửi lên, dạng JSON. GET và DELETE thường không có.", "the data you send, as JSON. GET and DELETE usually have none.")}</li>
      </ol>
    </div>
  );
}

function RawResponse({ example, pick }: { example: WorkedExample; pick: Pick }) {
  const { response } = example;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-100">
        <span className="text-zinc-500">HTTP/1.1</span> <span className="text-emerald-400 font-bold">{response.status} {response.statusText}</span>
        {response.headers.map(([name, value]) => (
          <span key={name}>
            {"\n"}
            <span className="text-amber-300">{name}:</span> {value}
          </span>
        ))}
        {"\n\n"}
        <span className="text-violet-300">{JSON.stringify(response.body, null, 2)}</span>
      </pre>
      <ol className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
        <li><b className="text-emerald-600 dark:text-emerald-400">1 · Status</b> — {pick("kết quả bằng một con số. 201 = đã tạo.", "the outcome as a number. 201 = created.")}</li>
        <li><b className="text-amber-600 dark:text-amber-400">2 · Headers</b> — {pick("Location cho biết URL của đơn mới.", "Location gives the new order's URL.")}</li>
        <li><b className="text-violet-600 dark:text-violet-400">3 · Body</b> — {pick("bản ghi đã tạo. Chú ý id, status và total_amount do server điền — bạn không gửi chúng.", "the created row. Note id, status and total_amount came from the server — you didn't send them.")}</li>
      </ol>
    </div>
  );
}

// ------------------------------------------------------------------ JWT

function decodePart(part: string): unknown {
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const text = decodeURIComponent(
      Array.from(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")))
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );

    return JSON.parse(text);
  } catch {
    return null;
  }
}

function JwtAnatomy({ token, pick }: { token: string; pick: Pick }) {
  const [head, payload, sig] = token.split(".");

  return (
    <div className="space-y-3">
      <p className="break-all rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 font-mono text-[12px]">
        <span className="text-rose-600 dark:text-rose-400">{head}</span>.<span className="text-violet-600 dark:text-violet-400">{payload}</span>.<span className="text-sky-600 dark:text-sky-400">{sig}</span>
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">Header</div>
          <JsonBlock value={decodePart(head)} />
          <p className="text-[11px] text-zinc-500">{pick("Thuật toán ký.", "The signing algorithm.")}</p>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">Payload (claims)</div>
          <JsonBlock value={decodePart(payload)} />
          <p className="text-[11px] text-zinc-500">
            {pick("sub = id người dùng, role = quyền, exp = hết hạn (giây Unix), sbx = sandbox. Ai cũng đọc được — đừng để bí mật trong JWT.", "sub = user id, role = permissions, exp = expiry (Unix seconds), sbx = sandbox. Anyone can read this — never put secrets in a JWT.")}
          </p>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-sky-600 dark:text-sky-400">Signature</div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            {pick("Chữ ký bằng khoá bí mật của server. Sửa một ký tự trong payload (ví dụ đổi role thành admin) là chữ ký không khớp nữa → 401 invalid_token. Hãy thử!", "A signature made with the server's secret. Change one character of the payload (say, role to admin) and it no longer matches → 401 invalid_token. Try it!")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ tab

export default function GuideTab({
  operations,
  mistakes,
  apiKey,
  openOperation,
  openClient,
}: {
  operations: Record<string, WorkedExample>;
  mistakes: Record<string, WorkedExample>;
  apiKey: string | null;
  openOperation: (id: string) => void;
  openClient: () => void;
}) {
  const { pick } = useLang();
  const order = operations.createOrder;
  const loginToken = (operations.login.response.body as { access_token: string }).access_token;

  const methods: [string, string, string][] = [
    ["GET", pick("Đọc dữ liệu. Không thay đổi gì, gọi bao nhiêu lần cũng được.", "Read. Changes nothing, safe to repeat."), "GET /books"],
    ["POST", pick("Tạo mới, hoặc thực hiện một hành động (đăng nhập, thanh toán, hoàn tiền).", "Create, or perform an action (log in, pay, refund)."), "POST /orders"],
    ["PUT", pick("Thay TOÀN BỘ một bản ghi. Trường bỏ trống bị đặt lại.", "Replace a WHOLE row. Missing fields are reset."), "PUT /books/11"],
    ["PATCH", pick("Sửa MỘT PHẦN — chỉ các trường gửi lên.", "Change PART of a row — only the fields sent."), "PATCH /books/1"],
    ["DELETE", pick("Xoá. Thành công trả 204, không có body.", "Delete. Success is 204 with no body."), "DELETE /authors/9"],
  ];

  const statuses: [number, string][] = [
    [200, pick("OK — thành công, có body.", "OK — success, with a body.")],
    [201, pick("Created — đã tạo, header Location chỉ tới bản ghi mới.", "Created — the Location header points at the new row.")],
    [204, pick("No Content — thành công, không có body (thường là DELETE).", "No Content — success, no body (usually DELETE).")],
    [400, pick("Bad Request — request sai: thiếu trường, sai kiểu, JSON hỏng.", "Bad Request — missing field, wrong type, broken JSON.")],
    [401, pick("Unauthorized — chưa xác thực: thiếu/sai/hết hạn token.", "Unauthorized — not authenticated: token missing, wrong or expired.")],
    [402, pick("Payment Required — thanh toán bị từ chối (giả lập).", "Payment Required — payment declined (simulated).")],
    [403, pick("Forbidden — biết bạn là ai, nhưng bạn không có quyền.", "Forbidden — we know who you are; you're not allowed.")],
    [404, pick("Not Found — không có bản ghi/đường dẫn này.", "Not Found — no such row or path.")],
    [405, pick("Method Not Allowed — URL có, nhưng không nhận method này.", "Method Not Allowed — the URL exists, not with this method.")],
    [409, pick("Conflict — xung đột với dữ liệu hiện tại (trùng email, sai trạng thái…).", "Conflict — clashes with current data (duplicate email, wrong status…).")],
    [422, pick("Unprocessable — đúng dạng nhưng sai quy tắc nghiệp vụ (hết hàng, sai số tiền…).", "Unprocessable — well-formed but breaks a business rule (no stock, wrong amount…).")],
  ];

  const mission: { op: string; text: string; expect: string }[] = [
    { op: "getApiInfo", text: pick("Gọi GET / để chắc key của bạn hoạt động.", "Call GET / to check your key works."), expect: "200" },
    { op: "listBooks", text: pick("Tìm sách công nghệ còn hàng: genre=technology&in_stock=true.", "Find technology books in stock: genre=technology&in_stock=true."), expect: "200" },
    { op: "listOrders", text: pick("Gọi GET /orders khi CHƯA đăng nhập.", "Call GET /orders WITHOUT logging in."), expect: "401" },
    { op: "login", text: pick("Đăng nhập bằng mai.tran@example.com và copy access_token.", "Log in as mai.tran@example.com and copy the access_token."), expect: "200" },
    { op: "me", text: pick("Dán token vào ô Bearer Token (phần Authentication), gọi GET /auth/me.", "Paste the token into the Bearer Token box (under Authentication), call GET /auth/me."), expect: "200" },
    { op: "createOrder", text: pick("Đặt 2 cuốn sách. Ghi lại id và total_amount.", "Order 2 books. Note the id and total_amount."), expect: "201" },
    { op: "createPayment", text: pick("Thanh toán với amount sai một đồng.", "Pay with an amount one đồng off."), expect: "422" },
    { op: "createPayment", text: pick("Thanh toán đúng số tiền — xem hoá đơn trong response.", "Pay the right amount — find the invoice in the response."), expect: "201" },
    { op: "listUsers", text: pick("Vẫn là Mai, gọi GET /users.", "Still as Mai, call GET /users."), expect: "403" },
    { op: "updateOrder", text: pick("Đăng nhập admin, chuyển đơn của bạn sang shipped.", "Log in as admin, move your order to shipped."), expect: "200" },
    { op: "getSandbox", text: pick("Xem số dòng đã thay đổi; muốn làm lại thì POST /sandbox/reset.", "See the counts change; to start over, POST /sandbox/reset."), expect: "200" },
  ];

  return (
    <div className="space-y-6">
      <Section id="what" title={pick("1 · API là gì?", "1 · What is an API?")}>
        <P>
          {pick(
            "API là cách một chương trình nói chuyện với chương trình khác. Ứng dụng (client) gửi một request — “cho tôi danh sách sách” — và server trả về một response chứa dữ liệu hoặc một lỗi. Giống như gọi món: bạn (client) nói với người phục vụ (API) theo một mẫu cố định, bếp (server + database) làm, rồi món ăn (response) được mang ra.",
            "An API is how one program talks to another. The app (the client) sends a request — “give me the list of books” — and the server sends back a response holding the data or an error. Like ordering food: you (client) tell the waiter (API) in a fixed format, the kitchen (server + database) does the work, and the dish (response) comes back."
          )}
        </P>
        <P>
          {pick(
            "Sân tập này là API của một cửa hàng sách: tác giả, sách, người dùng, đơn hàng, thanh toán, hoá đơn. Dữ liệu là của riêng bạn — cứ thêm, sửa, xoá thoải mái. 00:00 mỗi ngày (giờ Việt Nam) mọi thứ tự quay về dữ liệu mẫu.",
            "This playground is a bookstore's API: authors, books, users, orders, payments, invoices. The data is yours alone — add, change and delete freely. At 00:00 each day (Vietnam time) everything returns to the sample data."
          )}
        </P>
      </Section>

      <Section id="url" title={pick("2 · Giải phẫu một URL", "2 · Anatomy of a URL")}>
        <UrlAnatomy pick={pick} />
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <li>
            <b>Path param</b> — {pick("một phần của đường dẫn, chỉ đích danh MỘT bản ghi:", "part of the path that names ONE specific row:")} <Code>/authors/1</Code> = {pick("tác giả số 1. Trong tài liệu viết là", "author number 1. Docs write it as")} <Code>{"/authors/{id}"}</Code>.
          </li>
          <li>
            <b>Query params</b> — {pick("sau dấu", "after the")} <Code>?</Code>, {pick("dạng", "as")} <Code>key=value</Code> {pick("nối bằng", "joined by")} <Code>&</Code>. {pick("Không đổi tài nguyên, chỉ lọc / sắp xếp / phân trang.", "They don't change the resource — they filter, sort and page it.")}
          </li>
          <li>
            {pick("Quy tắc đặt tên REST: danh từ số nhiều cho tài nguyên (", "REST naming: plural nouns for resources (")}<Code>/books</Code>{pick("), method nói lên hành động — không viết", "), the method says the action — never")} <Code>/getBooks</Code> {pick("hay", "or")} <Code>/deleteBook</Code>.
          </li>
        </ul>
      </Section>

      <Section id="request" title={pick("3 · Một request gồm những gì", "3 · What a request contains")}>
        <P>{pick("Đây là request đặt hàng thật, đúng như trình duyệt gửi đi:", "Here's a real order request, exactly as it goes over the wire:")}</P>
        <RawRequest example={order} pick={pick} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {methods.map(([method, meaning, sample]) => (
                <tr key={method} className="border-t border-zinc-100 dark:border-zinc-800 first:border-t-0">
                  <td className="py-2 pr-3 w-20"><MethodBadge method={method} /></td>
                  <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">{meaning}</td>
                  <td className="py-2 font-mono text-xs text-zinc-500 whitespace-nowrap hidden sm:table-cell">{sample}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="response" title={pick("4 · Một response gồm những gì", "4 · What a response contains")}>
        <RawResponse example={order} pick={pick} />
        <P>
          {pick("Lỗi luôn có cùng một dạng, để code phía client xử lý dễ dàng:", "Errors always share one shape, so client code can handle them uniformly:")}{" "}
          <Code>{'{ "error": { "code": "…", "message": "…", "details": … } }'}</Code>
        </P>
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {statuses.map(([code, meaning]) => (
            <div key={code} className="flex gap-3 text-sm py-1 border-t border-zinc-100 dark:border-zinc-800">
              <span className={cn("font-mono font-semibold w-9 shrink-0", statusTone(code))}>{code}</span>
              <span className="text-zinc-600 dark:text-zinc-400">{meaning}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="auth" title={pick("5 · Xác thực: hai header khác nhau", "5 · Authentication: two different headers")}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-1">
            <div className="font-mono text-sm font-semibold">{SANDBOX_KEY_HEADER}</div>
            <p className="text-xs text-zinc-500">{pick("Loại: API key", "Kind: API key")}</p>
            <P>{pick("Chọn sandbox nào — cái của riêng bạn. Gửi kèm MỌI request. Trang này và Scalar điền sẵn cho bạn.", "Picks which sandbox — yours. Sent with EVERY request. This page and Scalar fill it in for you.")}</P>
          </div>
          <div className="rounded-lg border border-blue-200 dark:border-blue-900 p-3 space-y-1">
            <div className="font-mono text-sm font-semibold">Authorization: Bearer &lt;token&gt;</div>
            <p className="text-xs text-zinc-500">{pick("Loại: token đăng nhập (JWT)", "Kind: login token (JWT)")}</p>
            <P>{pick("Bạn là người dùng nào của cửa hàng. Lấy từ POST /auth/login, hết hạn sau 1 giờ. Chỉ các API 🔑 và 👑 cần nó.", "Which bookstore user you are. Comes from POST /auth/login and expires after 1 hour. Only 🔑 and 👑 endpoints need it.")}</P>
          </div>
        </div>

        <ol className="grid gap-2 sm:grid-cols-4 text-sm">
          {[
            pick("POST /auth/login với email + mật khẩu", "POST /auth/login with email + password"),
            pick("Server trả về access_token", "The server returns an access_token"),
            pick("Gửi kèm Authorization: Bearer <token>", "Send Authorization: Bearer <token>"),
            pick("Server đọc token → biết bạn là ai và có quyền gì", "The server reads it → knows who you are and what you may do"),
          ].map((step, i) => (
            <li key={i} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{i + 1}</div>
              <div className="text-zinc-700 dark:text-zinc-300">{step}</div>
            </li>
          ))}
        </ol>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500">
                <th className="py-1 pr-3 font-medium">{pick("Mức", "Level")}</th>
                <th className="py-1 pr-3 font-medium">{pick("Cần gì", "Needs")}</th>
                <th className="py-1 font-medium">{pick("Ví dụ", "Examples")}</th>
              </tr>
            </thead>
            <tbody className="text-zinc-600 dark:text-zinc-400">
              <tr className="border-t border-zinc-100 dark:border-zinc-800"><td className="py-2 pr-3">🔓 {pick("Công khai", "Public")}</td><td className="py-2 pr-3">{pick("chỉ key", "key only")}</td><td className="py-2 font-mono text-xs">GET /books, GET /authors, POST /auth/login</td></tr>
              <tr className="border-t border-zinc-100 dark:border-zinc-800"><td className="py-2 pr-3">🔑 {pick("Đăng nhập", "Login")}</td><td className="py-2 pr-3">{pick("token bất kỳ", "any token")}</td><td className="py-2 font-mono text-xs">/orders, /payments, /invoices, /auth/me</td></tr>
              <tr className="border-t border-zinc-100 dark:border-zinc-800"><td className="py-2 pr-3">👑 Admin</td><td className="py-2 pr-3">{pick("token admin", "admin token")}</td><td className="py-2 font-mono text-xs">POST /books, GET /users, POST /payments/{"{id}"}/refund</td></tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{pick("Tài khoản mẫu", "Sample accounts")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {DEMO_ACCOUNTS.map((a) => (
                  <tr key={a.email} className="border-t border-zinc-100 dark:border-zinc-800 first:border-t-0">
                    <td className="py-1.5 pr-3 font-mono text-xs">{a.email}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{a.password}</td>
                    <td className="py-1.5 pr-3 text-xs">{a.role}</td>
                    <td className="py-1.5 text-xs text-zinc-500 hidden sm:table-cell">{a.name} · user {a.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{pick("Bên trong một token (JWT)", "Inside a token (JWT)")}</h3>
          <P>{pick("access_token là một JWT: ba phần base64 nối bằng dấu chấm. Đây là token thật của Mai, đã giải mã:", "The access_token is a JWT: three base64 parts joined by dots. Here's a real token for Mai, decoded:")}</P>
          <JwtAnatomy token={loginToken} pick={pick} />
        </div>
      </Section>

      <Section id="client" title={pick("6 · Gọi thử API bằng Scalar", "6 · Calling the API with Scalar")}>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>{pick("Mở tab Thử API (Scalar). Bên trái là danh sách API theo nhóm, giữa là mô tả, bên phải là ví dụ request (curl) và response.", "Open the Try it (Scalar) tab. On the left, the endpoints by group; in the middle, the description; on the right, a sample request (curl) and response.")}</li>
          <li>{pick("Chọn Auth → Đăng nhập → bấm Test Request. Cửa sổ client mở ra, chia request thành từng phần: Authentication, Headers, Query Parameters, Request Body.", "Pick Auth → Log in → click Test Request. The client opens with the request split into its parts: Authentication, Headers, Query Parameters, Request Body.")}</li>
          <li>{pick("Ở phần Authentication, X-Sandbox-Key đã được điền sẵn. Sửa email/mật khẩu trong Request Body nếu muốn, rồi bấm Send.", "Under Authentication, X-Sandbox-Key is already filled in. Edit the email/password in the Request Body if you like, then click Send.")}</li>
          <li>{pick("Copy giá trị access_token ở khung Response (không lấy dấu ngoặc kép), dán vào ô Bearer Token trong phần Authentication. Scalar tự thêm chữ “Bearer ”, và giữ token cho mọi API khác.", "Copy the access_token value from the Response pane (without the quotes) and paste it into the Bearer Token box under Authentication. Scalar adds “Bearer ” itself and keeps the token for every other endpoint.")}</li>
          <li>{pick("Mở API bất kỳ → Test Request → điền path/query params hoặc sửa body JSON → Send (hoặc Ctrl + Enter).", "Open any endpoint → Test Request → fill path/query params or edit the JSON body → Send (or Ctrl + Enter).")}</li>
          <li>{pick("Đọc khung Response: status, thời gian, headers và body. Đổi ví dụ code ở góc trên (Shell Curl, JavaScript, Python…) để xem cùng request đó viết bằng ngôn ngữ khác.", "Read the Response pane: status, timing, headers and body. Switch the code sample at the top (Shell Curl, JavaScript, Python…) to see the same request in another language.")}</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openClient} className="btn-primary text-sm">{pick("Mở Scalar →", "Open Scalar →")}</button>
          <a href="/api/sandbox/openapi.json" target="_blank" rel="noreferrer" className="btn-secondary text-sm">openapi.json</a>
        </div>
        <P>
          {pick("Muốn dùng Postman hoặc Insomnia? Import file openapi.json ở trên, đặt header", "Prefer Postman or Insomnia? Import the openapi.json above and set the header")} <Code>{SANDBOX_KEY_HEADER}</Code> {pick("bằng key của bạn. Mỗi ví dụ ở tab API cũng có nút “Copy lệnh curl”.", "to your key. Every example in the Endpoints tab also has a “Copy as curl” button.")}
        </P>
      </Section>

      <Section id="mission" title={pick("7 · Nhiệm vụ: một vòng mua hàng hoàn chỉnh", "7 · Mission: one full purchase")}>
        <P>{pick("Làm lần lượt trong Scalar. Cột phải là status bạn nên nhận được — nhận khác thì đọc error.message.", "Do these in order in Scalar. The right column is the status you should get — if not, read error.message.")}</P>
        <ol className="space-y-1">
          {mission.map((step, i) => (
            <li key={i} className="flex items-center gap-3 border-t border-zinc-100 dark:border-zinc-800 first:border-t-0 py-1.5 text-sm">
              <span className="w-5 shrink-0 text-xs font-bold text-zinc-400">{i + 1}</span>
              <button type="button" onClick={() => openOperation(step.op)} className="text-left text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400">
                {step.text}
              </button>
              <span className={cn("ml-auto font-mono text-xs font-semibold", statusTone(Number(step.expect)))}>{step.expect}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="mistakes" title={pick("8 · Lỗi thường gặp (và response thật của chúng)", "8 · Common mistakes (and their real responses)")}>
        <div className="space-y-2">
          {MISTAKES.map((m) => {
            const ex = mistakes[m.id];
            const err = (ex.response.body as { error?: { code: string; message: string } })?.error;

            return (
              <details key={m.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <span className={cn("font-mono text-sm font-semibold w-9", statusTone(ex.response.status))}>{ex.response.status}</span>
                  <span className="text-sm font-medium">{pick(m.title.vi, m.title.en)}</span>
                  <span className="font-mono text-xs text-zinc-500">{err?.code}</span>
                  <span className="ml-auto text-zinc-400 transition-transform group-open:rotate-90" aria-hidden>›</span>
                </summary>
                <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 p-3">
                  <P>{pick(m.lesson.vi, m.lesson.en)}</P>
                  <ExampleView example={ex} apiKey={apiKey} />
                </div>
              </details>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
