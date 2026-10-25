"use client";

// Admin-only account management: see every account, approve / disable them,
// and set a new password. A user whose password was set here is asked to
// change or keep it right after their next sign-in (see AuthGate).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, type AccountRole, type AccountStatus } from "@/context/auth";
import { useLang } from "@/context/lang";
import SearchField from "@/components/SearchField";
import { formatPhone } from "@/lib/phone";
import { generatePassword, isValidPassword, MAX_PASSWORD, MIN_PASSWORD } from "@/lib/password";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  full_name: string;
  phone: string;
  role: AccountRole;
  status: AccountStatus;
  created_at: string;
  approved_at: string | null;
  must_change_password: boolean;
}

type Filter = AccountStatus | "all";

const FILTERS: { id: Filter; vi: string; en: string }[] = [
  { id: "active", vi: "Đang hoạt động", en: "Active" },
  { id: "draft", vi: "Chờ duyệt", en: "Waiting approval" },
  { id: "disabled", vi: "Đã khoá", en: "Disabled" },
  { id: "all", vi: "Tất cả", en: "All" },
];

const STATUS_LABEL: Record<AccountStatus, [string, string]> = {
  active: ["Đang hoạt động", "Active"],
  draft: ["Chờ duyệt", "Waiting approval"],
  disabled: ["Đã khoá", "Disabled"],
};

const STATUS_BADGE: Record<AccountStatus, string> = {
  active: "bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300",
  draft: "bg-amber-100 dark:bg-amber-600/20 text-amber-700 dark:text-amber-300",
  disabled: "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300",
};

const ROLE_BADGE: Record<AccountRole, string> = {
  admin: "bg-rose-100 dark:bg-rose-600/20 text-rose-700 dark:text-rose-300",
  teacher: "bg-violet-100 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300",
  learner: "bg-sky-100 dark:bg-sky-600/20 text-sky-700 dark:text-sky-300",
};

const ERRORS: Record<string, [string, string]> = {
  forbidden: ["Chỉ quản trị viên mới dùng được trang này.", "Only admins can use this page."],
  unauthorized: ["Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.", "Your session has expired. Please sign in again."],
  not_configured: ["Máy chủ chưa cấu hình Supabase (SUPABASE_SERVICE_ROLE_KEY).", "The server has no Supabase service key (SUPABASE_SERVICE_ROLE_KEY)."],
  cannot_change_self: ["Bạn không thể đổi trạng thái của chính mình.", "You can't change your own status."],
  invalid_password: [
    `Mật khẩu cần từ ${MIN_PASSWORD} đến ${MAX_PASSWORD} ký tự.`,
    `The password needs ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`,
  ],
  weak_password: ["Mật khẩu quá yếu, hãy chọn mật khẩu khác.", "That password is too weak — pick another one."],
  schema_outdated: [
    "Cơ sở dữ liệu chưa có cột must_change_password. Hãy chạy lại supabase/schema.sql trong SQL Editor.",
    "The database has no must_change_password column yet. Re-run supabase/schema.sql in the SQL Editor.",
  ],
  not_found: ["Không tìm thấy tài khoản này.", "That account no longer exists."],
};

export default function AdminUsersPage() {
  const { enabled, ready, profile, session } = useAuth();
  const { pick, lang } = useLang();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");

  const token = session?.access_token ?? "";
  const isAdmin = profile?.role === "admin";

  const errorText = useCallback(
    (code: string) => {
      const [vi, en] = ERRORS[code] ?? ["Có lỗi xảy ra, vui lòng thử lại.", "Something went wrong — please try again."];

      return pick(vi, en);
    },
    [pick]
  );

  const load = useCallback(async () => {
    setLoadError(null);

    try {
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setLoadError(json?.error ?? "load_failed");

        return;
      }

      setUsers(json.users);
      setMe(json.me);
      setWarning(json.warning ?? null);
    } catch {
      setLoadError("network");
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin && token) void load();
  }, [isAdmin, token, load]);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: 0, active: 0, draft: 0, disabled: 0 };

    for (const user of users ?? []) {
      result.all += 1;
      result[user.status] += 1;
    }

    return result;
  }, [users]);

  const visible = useMemo(() => {
    const q = normalizeSearch(query);

    return (users ?? []).filter(
      (user) => (filter === "all" || user.status === filter) && (!q || matchesSearch(q, user.full_name, user.phone, formatPhone(user.phone)))
    );
  }, [users, filter, query]);

  const patchUser = useCallback((id: string, changes: Partial<AdminUser>) => {
    setUsers((prev) => prev?.map((user) => (user.id === id ? { ...user, ...changes } : user)) ?? prev);
  }, []);

  if (!ready) return <p className="text-sm text-zinc-500">{pick("Đang tải…", "Loading…")}</p>;

  if (!enabled || !isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight">{pick("Quản lý người dùng", "Users")}</h1>
        <p className="text-sm text-zinc-500 mt-2">
          {enabled ? errorText("forbidden") : errorText("not_configured")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{pick("Quản lý người dùng", "Users")}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {pick(
            "Duyệt hoặc khoá tài khoản và đặt lại mật khẩu. Người được đặt lại mật khẩu sẽ được hỏi đổi mật khẩu sau lần đăng nhập tiếp theo.",
            "Approve or disable accounts and reset passwords. Someone whose password you reset is asked to change it after they next sign in."
          )}
        </p>
      </header>

      {warning && (
        <p className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          {errorText(warning)}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div role="tablist" className="flex flex-wrap gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "text-xs font-medium px-3 py-2 sm:py-1.5 rounded-md transition-colors",
                filter === item.id
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              {pick(item.vi, item.en)}
              {users && <span className="ml-1.5 tabular-nums text-zinc-400">{counts[item.id]}</span>}
            </button>
          ))}
        </div>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={pick("Tìm theo tên hoặc số điện thoại", "Search by name or phone")}
          clearLabel={pick("Xoá tìm kiếm", "Clear search")}
          className="sm:ml-auto sm:w-72"
        />
      </div>

      {loadError && (
        <div className="card">
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorText(loadError)}</p>
          <button type="button" onClick={() => void load()} className="btn-secondary mt-3 text-sm">
            {pick("Thử lại", "Try again")}
          </button>
        </div>
      )}

      {!users && !loadError && <p className="text-sm text-zinc-500">{pick("Đang tải…", "Loading…")}</p>}

      {users && visible.length === 0 && (
        <p className="text-sm text-zinc-500">{pick("Không có tài khoản nào.", "No accounts here.")}</p>
      )}

      <ul className="space-y-3">
        {visible.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isSelf={user.id === me}
            token={token}
            lang={lang}
            errorText={errorText}
            onChange={(changes) => patchUser(user.id, changes)}
          />
        ))}
      </ul>
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  token,
  lang,
  errorText,
  onChange,
}: {
  user: AdminUser;
  isSelf: boolean;
  token: string;
  lang: string;
  errorText: (code: string) => string;
  onChange: (changes: Partial<AdminUser>) => void;
}) {
  const { pick } = useLang();
  const [statusBusy, setStatusBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const joined = new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", { dateStyle: "medium" }).format(
    new Date(user.created_at)
  );

  async function changeStatus(status: AccountStatus) {
    setError(null);
    setNotice(null);
    setStatusBusy(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok) {
        onChange({ status: json.user.status, approved_at: json.user.approved_at });
      } else {
        setError(json?.error ?? "update_failed");
      }
    } catch {
      setError("network");
    }

    setStatusBusy(false);
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!isValidPassword(password)) return setError("invalid_password");

    setPasswordBusy(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok) {
        onChange({ must_change_password: Boolean(json?.mustChangePassword) });
        setPasswordOpen(false);
        setNotice(
          isSelf
            ? pick(`Đã đổi mật khẩu của bạn thành: ${password}`, `Your password is now: ${password}`)
            : pick(
                `Đã đặt mật khẩu mới: ${password} — hãy gửi cho ${user.full_name}. Sau khi đăng nhập, họ sẽ được hỏi đổi mật khẩu hoặc giữ nguyên.`,
                `New password set: ${password} — send it to ${user.full_name}. After signing in they'll be asked to change it or keep it.`
              )
        );
        setPassword("");
      } else {
        setError(json?.error ?? "update_failed");
      }
    } catch {
      setError("network");
    }

    setPasswordBusy(false);
  }

  const [statusVi, statusEn] = STATUS_LABEL[user.status];

  return (
    <li className="card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 font-semibold text-zinc-700 dark:text-zinc-200"
          >
            {user.full_name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {user.full_name}
              {isSelf && <span className="ml-1.5 text-xs font-normal text-zinc-500">({pick("bạn", "you")})</span>}
            </div>
            <div className="text-sm text-zinc-500">
              {formatPhone(user.phone)} · {pick("Tham gia", "Joined")} {joined}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded", STATUS_BADGE[user.status])}>
                {pick(statusVi, statusEn)}
              </span>
              <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded", ROLE_BADGE[user.role])}>
                {user.role}
              </span>
              {user.must_change_password && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300">
                  {pick("Chờ đổi mật khẩu", "Password reset pending")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <label className="sr-only" htmlFor={`status-${user.id}`}>
            {pick("Trạng thái", "Status")}
          </label>
          <select
            id={`status-${user.id}`}
            value={user.status}
            disabled={isSelf || statusBusy}
            title={isSelf ? errorText("cannot_change_self") : undefined}
            onChange={(e) => void changeStatus(e.target.value as AccountStatus)}
            className={cn(
              "rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm",
              (isSelf || statusBusy) && "opacity-60 cursor-not-allowed"
            )}
          >
            {(Object.keys(STATUS_LABEL) as AccountStatus[]).map((status) => (
              <option key={status} value={status}>
                {pick(...STATUS_LABEL[status])}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setPasswordOpen((open) => !open);
              setError(null);
              setNotice(null);
            }}
            aria-expanded={passwordOpen}
            className="btn-secondary text-sm"
          >
            {pick("Đặt mật khẩu", "Set password")}
          </button>
        </div>
      </div>

      {passwordOpen && (
        <form onSubmit={savePassword} noValidate className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <label htmlFor={`password-${user.id}`} className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">
            {pick(`Mật khẩu mới cho ${user.full_name}`, `New password for ${user.full_name}`)}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Plain text on purpose: the admin has to read it out or copy it to the user. */}
            <input
              id={`password-${user.id}`}
              className="input sm:flex-1 font-mono"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={MAX_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setPassword(generatePassword())} className="btn-secondary text-sm">
              {pick("Tạo ngẫu nhiên", "Generate")}
            </button>
            <button type="submit" disabled={passwordBusy} className={cn("btn-primary text-sm", passwordBusy && "opacity-60 cursor-wait")}>
              {passwordBusy ? pick("Đang lưu…", "Saving…") : pick("Lưu mật khẩu", "Save password")}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {isSelf
              ? pick(`Tối thiểu ${MIN_PASSWORD} ký tự.`, `At least ${MIN_PASSWORD} characters.`)
              : pick(
                  `Tối thiểu ${MIN_PASSWORD} ký tự. Sau khi đăng nhập bằng mật khẩu này, người dùng sẽ được hỏi đổi mật khẩu hoặc giữ nguyên.`,
                  `At least ${MIN_PASSWORD} characters. After signing in with it, the user is asked to change it or keep it.`
                )}
          </p>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {errorText(error)}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400 break-all sm:break-normal">
          {notice}
        </p>
      )}
    </li>
  );
}
