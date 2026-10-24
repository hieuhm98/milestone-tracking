"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/context/lang";
import { safeNext, STORE_BASE, StoreApiError } from "@/lib/store/client";
import { useStore } from "@/components/store/StoreContext";
import { btnPrimary, card, ErrorNotice, input, Spinner } from "@/components/store/ui";

// Sign-up is two requests, as on most real sites: POST /auth/register creates
// the account (201, no token), then POST /auth/login logs the new user in.
// A field the API rejects (400 validation_failed) is shown under that field.

export default function RegisterPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <RegisterForm />
    </Suspense>
  );
}

type Field = "full_name" | "email" | "password" | "phone" | "address";

function RegisterForm() {
  const { pick } = useLang();
  const { api, login, notify } = useStore();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [form, setForm] = useState<Record<Field, string>>({ full_name: "", email: "", password: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fieldIssues = new Map<string, string>();

  if (error instanceof StoreApiError && Array.isArray(error.details)) {
    for (const d of error.details as { field: string; issue: string }[]) fieldIssues.set(d.field, d.issue);
  }

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!api) return;

    setBusy(true);
    setError(null);

    try {
      await api.post("/auth/register", {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        // Optional fields are left out rather than sent empty.
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
      });
      await login(form.email.trim(), form.password);
      notify(pick("Tạo tài khoản thành công — chào mừng bạn!", "Account created — welcome!"), "success");
      router.push(next);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const fields: { name: Field; label: [string, string]; type: string; required?: boolean; auto: string; hint?: [string, string] }[] = [
    { name: "full_name", label: ["Họ và tên", "Full name"], type: "text", required: true, auto: "name" },
    { name: "email", label: ["Email", "Email"], type: "email", required: true, auto: "email" },
    { name: "password", label: ["Mật khẩu", "Password"], type: "password", required: true, auto: "new-password", hint: ["Ít nhất 8 ký tự.", "At least 8 characters."] },
    { name: "phone", label: ["Số điện thoại (không bắt buộc)", "Phone (optional)"], type: "tel", auto: "tel" },
    { name: "address", label: ["Địa chỉ giao hàng (không bắt buộc)", "Shipping address (optional)"], type: "text", auto: "street-address" },
  ];

  return (
    <div className="max-w-md mx-auto">
      <div className={`${card} p-6 sm:p-8`}>
        <h1 className="text-2xl font-serif font-bold">{pick("Tạo tài khoản", "Create an account")}</h1>
        <p className="text-sm text-stone-500 mt-1">
          {pick("Tài khoản này chỉ tồn tại trong sandbox của bạn.", "This account only exists in your sandbox.")}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {fields.map((f) => (
            <label key={f.name} className="block">
              <span className="text-sm font-medium text-stone-700">{pick(...f.label)}</span>
              <input
                type={f.type}
                required={f.required}
                autoComplete={f.auto}
                value={form[f.name]}
                onChange={set(f.name)}
                aria-invalid={fieldIssues.has(f.name) || undefined}
                className={`${input} mt-1 ${fieldIssues.has(f.name) ? "border-red-400" : ""}`}
              />
              {fieldIssues.has(f.name) ? (
                <span className="text-xs text-red-600 mt-1 block">
                  {f.name} {fieldIssues.get(f.name)}
                </span>
              ) : (
                f.hint && <span className="text-xs text-stone-500 mt-1 block">{pick(...f.hint)}</span>
              )}
            </label>
          ))}

          <ErrorNotice error={error} />

          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? pick("Đang tạo…", "Creating…") : pick("Tạo tài khoản", "Create account")}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-stone-600">
          {pick("Đã có tài khoản?", "Already have an account?")}{" "}
          <Link href={`${STORE_BASE}/login?next=${encodeURIComponent(next)}`} className="font-semibold text-orange-700 hover:underline">
            {pick("Đăng nhập", "Log in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
