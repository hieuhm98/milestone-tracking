"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/context/lang";
import { STORE_BASE, StoreApiError, type PublicUser } from "@/lib/store/client";
import { useStore } from "@/components/store/StoreContext";
import { btnPrimary, btnSecondary, card, ErrorNotice, input, PageTitle, Spinner, useRequireLogin } from "@/components/store/ui";

// GET /auth/me reads the profile; PATCH /users/{id} sends only the fields that
// changed — the difference between PATCH (some fields) and PUT (the whole row).

type Field = "full_name" | "phone" | "address" | "password";

export default function AccountPage() {
  const { pick } = useLang();
  const allowed = useRequireLogin();
  const { api, setUser, logout, notify } = useStore();
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [form, setForm] = useState<Record<Field, string>>({ full_name: "", phone: "", address: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!allowed || !api) return;

    api
      .get<PublicUser>("/auth/me")
      .then((user) => {
        setMe(user);
        setForm({ full_name: user.full_name, phone: user.phone ?? "", address: user.address ?? "", password: "" });
      })
      .catch(setError);
  }, [allowed, api]);

  if (!allowed || !me) return error ? <ErrorNotice error={error} /> : <Spinner />;

  const changes: Record<string, string | null> = {};

  if (form.full_name.trim() !== me.full_name) changes.full_name = form.full_name.trim();

  if (form.phone.trim() !== (me.phone ?? "")) changes.phone = form.phone.trim() || null;

  if (form.address.trim() !== (me.address ?? "")) changes.address = form.address.trim() || null;

  if (form.password) changes.password = form.password;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!api || Object.keys(changes).length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const updated = await api.patch<PublicUser>(`/users/${me.id}`, changes);

      setMe(updated);
      setUser(updated);
      setForm({ ...form, password: "" });
      notify(pick("Đã lưu thông tin.", "Saved."), "success");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const issues = new Map<string, string>();

  if (error instanceof StoreApiError && Array.isArray(error.details)) {
    for (const d of error.details as { field: string; issue: string }[]) issues.set(d.field, d.issue);
  }

  const fields: { name: Field; label: [string, string]; type: string; auto: string }[] = [
    { name: "full_name", label: ["Họ và tên", "Full name"], type: "text", auto: "name" },
    { name: "phone", label: ["Số điện thoại", "Phone"], type: "tel", auto: "tel" },
    { name: "address", label: ["Địa chỉ giao hàng mặc định", "Default shipping address"], type: "text", auto: "street-address" },
    { name: "password", label: ["Mật khẩu mới (để trống nếu không đổi)", "New password (leave blank to keep)"], type: "password", auto: "new-password" },
  ];

  return (
    <div className="max-w-xl mx-auto">
      <PageTitle sub={`${me.email} · ${pick("thành viên từ", "member since")} ${new Date(me.created_at).toLocaleDateString(pick("vi-VN", "en-GB"))}`}>
        {pick("Tài khoản của tôi", "My account")}
      </PageTitle>

      <form onSubmit={save} className={`${card} p-6 space-y-4`}>
        {fields.map((f) => (
          <label key={f.name} className="block">
            <span className="text-sm font-medium text-stone-700">{pick(...f.label)}</span>
            <input
              type={f.type}
              autoComplete={f.auto}
              value={form[f.name]}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              aria-invalid={issues.has(f.name) || undefined}
              className={`${input} mt-1 ${issues.has(f.name) ? "border-red-400" : ""}`}
            />
            {issues.has(f.name) && (
              <span className="text-xs text-red-600 mt-1 block">
                {f.name} {issues.get(f.name)}
              </span>
            )}
          </label>
        ))}

        <ErrorNotice error={error} />

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || Object.keys(changes).length === 0} className={btnPrimary}>
            {busy ? pick("Đang lưu…", "Saving…") : pick("Lưu thay đổi", "Save changes")}
          </button>
          <span className="text-xs text-stone-500 font-mono">
            {Object.keys(changes).length > 0 ? `PATCH /users/${me.id} { ${Object.keys(changes).join(", ")} }` : pick("Chưa có thay đổi", "No changes yet")}
          </span>
        </div>
      </form>

      <button
        type="button"
        onClick={() => {
          logout();
          router.push(STORE_BASE);
        }}
        className={`${btnSecondary} mt-6 w-full`}
      >
        {pick("Đăng xuất", "Log out")}
      </button>
      <p className="text-xs text-stone-500 mt-2 text-center">
        {pick(
          "Đăng xuất chỉ xoá token khỏi trình duyệt — JWT không bị thu hồi trên server, nó tự hết hạn sau 1 giờ.",
          "Logging out just deletes the token from this browser — a JWT isn't revoked on the server; it expires after an hour."
        )}
      </p>
    </div>
  );
}
