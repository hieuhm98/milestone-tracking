"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSandboxKey } from "@/components/sandbox/useSandboxKey";
import { useLang } from "@/context/lang";
import {
  createApi,
  StoreApiError,
  type ApiLogEntry,
  type Author,
  type Cart,
  type LoginResponse,
  type PublicUser,
  type StoreApi,
} from "@/lib/store/client";

// State shared by every page of the web store: the API client, who is logged
// in to the *shop* (a bookstore account in the learner's sandbox — separate
// from their account on this site), the cart badge, author names, a toast, and
// the request log behind the "API log" panel.
//
// The shop session lives in localStorage under SESSION_KEY, like many real
// single-page apps keep a JWT — open DevTools → Application → Local Storage to
// see it. Logging out just forgets the token: a JWT can't be "revoked" here,
// it simply expires after an hour.

const SESSION_KEY = "bookstore-web:session";
const MAX_LOG = 60;

interface Session {
  token: string;
  user: PublicUser;
  expiresAt: number;
}

interface Toast {
  id: number;
  tone: "success" | "error" | "info";
  text: string;
}

interface StoreValue {
  api: StoreApi | null;
  /** Why the store can't reach the API (no sandbox key), or null. */
  keyError: string | null;
  user: PublicUser | null;
  /** False until the saved shop session has been read. */
  ready: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  logout: () => void;
  setUser: (user: PublicUser) => void;
  cart: Cart | null;
  refreshCart: () => Promise<void>;
  setCart: (cart: Cart | null) => void;
  authors: Map<number, Author>;
  log: ApiLogEntry[];
  clearLog: () => void;
  toast: Toast | null;
  notify: (text: string, tone?: Toast["tone"]) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);

    if (!raw) return null;

    const session = JSON.parse(raw) as Session;

    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Without storage the login lasts until the tab closes.
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { key, error: keyError } = useSandboxKey();
  const { pick } = useLang();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [authors, setAuthors] = useState<Map<number, Author>>(new Map());
  const [log, setLog] = useState<ApiLogEntry[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const tokenRef = useRef<string | null>(null);
  // A page and the header often ask for the cart at the same moment; they share one request.
  const cartInFlight = useRef<Promise<void> | null>(null);

  tokenRef.current = session?.token ?? null;

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const notify = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now();

    setToast({ id, tone, text });
    window.setTimeout(() => setToast((current) => (current?.id === id ? null : current)), 4000);
  }, []);

  const api = useMemo(
    () =>
      key
        ? createApi({
            key,
            getToken: () => tokenRef.current,
            onLog: (entry) => setLog((prev) => [entry, ...prev].slice(0, MAX_LOG)),
          })
        : null,
    [key]
  );

  const logout = useCallback(() => {
    writeSession(null);
    setSession(null);
    setCart(null);
  }, []);

  // A 401 on any call means the token expired or no longer fits this sandbox
  // (e.g. it was reset): drop the session, as a real app would.
  const guardedApi = useMemo(() => {
    if (!api) return null;

    const guard = async <T,>(call: () => Promise<T>): Promise<T> => {
      try {
        return await call();
      } catch (error) {
        if (error instanceof StoreApiError && error.status === 401 && tokenRef.current) {
          logout();
          notify(
            error.code === "token_expired"
              ? pick("Phiên đăng nhập đã hết hạn — hãy đăng nhập lại.", "Your session expired — please log in again.")
              : pick("Phiên đăng nhập không còn hợp lệ — hãy đăng nhập lại.", "Your session is no longer valid — please log in again."),
            "error"
          );
        }

        throw error;
      }
    };

    return {
      request: <T,>(...args: Parameters<StoreApi["request"]>) => guard(() => api.request<T>(...args)),
      get: <T,>(...args: Parameters<StoreApi["get"]>) => guard(() => api.get<T>(...args)),
      post: <T,>(...args: Parameters<StoreApi["post"]>) => guard(() => api.post<T>(...args)),
      patch: <T,>(...args: Parameters<StoreApi["patch"]>) => guard(() => api.patch<T>(...args)),
      del: (...args: Parameters<StoreApi["del"]>) => guard(() => api.del(...args)),
    } as StoreApi;
  }, [api, logout, notify, pick]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!api) throw new Error("API not ready");

      const res = await api.post<LoginResponse>("/auth/login", { email, password });
      const next: Session = { token: res.access_token, user: res.user, expiresAt: Date.now() + res.expires_in * 1000 };

      writeSession(next);
      setSession(next);

      return res.user;
    },
    [api]
  );

  const setUser = useCallback((user: PublicUser) => {
    setSession((prev) => {
      if (!prev) return prev;

      const next = { ...prev, user };

      writeSession(next);

      return next;
    });
  }, []);

  const refreshCart = useCallback(async () => {
    if (!guardedApi || !tokenRef.current) {
      setCart(null);

      return;
    }

    cartInFlight.current ??= guardedApi
      .get<Cart>("/cart")
      .then(setCart, () => setCart(null))
      .finally(() => {
        cartInFlight.current = null;
      });

    return cartInFlight.current;
  }, [guardedApi]);

  // The cart badge follows whoever is logged in.
  useEffect(() => {
    if (ready) void refreshCart();
  }, [ready, session?.token, refreshCart]);

  // Author names for the book cards: one request, cached for the visit.
  useEffect(() => {
    if (!api) return;

    api
      .get<{ data: Author[] }>("/authors", { limit: 100 })
      .then((res) => setAuthors(new Map(res.data.map((a) => [a.id, a]))))
      .catch(() => undefined);
  }, [api]);

  const value: StoreValue = {
    api: guardedApi,
    keyError,
    user: session?.user ?? null,
    ready,
    login,
    logout,
    setUser,
    cart,
    refreshCart,
    setCart,
    authors,
    log,
    clearLog: () => setLog([]),
    toast,
    notify,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);

  if (!value) throw new Error("useStore must be used inside StoreProvider");

  return value;
}
