"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/context/lang";
import { DEMO_LOGINS, safeNext, STORE_BASE } from "@/lib/store/client";
import { useStore } from "@/components/store/StoreContext";
import { btnPrimary, card, ErrorNotice, input, Spinner } from "@/components/store/ui";

// POST /auth/login → a JWT, kept in localStorage. Wrong email and wrong
// password give the same 401 on purpose — the API never says which emails exist.

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { pick } = useLang();
  const { login, notify } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const user = await login(email.trim(), password);

      notify(pick(`Xin chào, ${user.full_name}!`, `Welcome back, ${user.full_name}!`), "success");
      router.push(next);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className={`${card} p-6 sm:p-8`}>
        <h1 className="text-2xl font-serif font-bold">{pick("Đăng nhập", "Log in")}</h1>
        <p className="text-sm text-stone-500 mt-1">
          {pick("Đăng nhập để mua sách và xem đơn hàng.", "Log in to buy books and see your orders.")}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">{pick("Mật khẩu", "Password")}</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${input} mt-1`}
            />
          </label>

          <ErrorNotice error={error} />

          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? pick("Đang đăng nhập…", "Logging in…") : pick("Đăng nhập", "Log in")}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-stone-600">
          {pick("Chưa có tài khoản?", "New here?")}{" "}
          <Link href={`${STORE_BASE}/register?next=${encodeURIComponent(next)}`} className="font-semibold text-orange-700 hover:underline">
            {pick("Tạo tài khoản", "Create an account")}
          </Link>
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-stone-300 p-4 text-sm">
        <div className="font-medium text-stone-700">{pick("Dùng thử tài khoản mẫu", "Try a demo account")}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO_LOGINS.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword(d.password);
              }}
              className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs hover:border-orange-400"
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
