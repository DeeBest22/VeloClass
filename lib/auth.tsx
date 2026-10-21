import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/client";

/* ───────────────────────── Config ───────────────────────── */

/** Must match `appId` in capacitor.config.ts and the intent-filter scheme in AndroidManifest.xml. */
const NATIVE_SCHEME = "com.learnova.app";

export type OAuthProvider = "google" | "facebook" | "apple";

const isNative = () => Capacitor.isNativePlatform();

/**
 * Where Supabase sends the user after they tap an email link or finish OAuth.
 * - Web: your site (VITE_SITE_URL, or the current origin if unset)
 * - Native: a deep link back into the app
 * Every URL produced here must be added to Supabase → Auth → URL Configuration → Redirect URLs.
 */
export function authRedirect(path: string): string {
  const clean = path.replace(/^\//, "");
  if (isNative()) return `${NATIVE_SCHEME}://${clean}`;
  const base = (import.meta.env["VITE_SITE_URL"] as string | undefined) || window.location.origin;
  return `${base.replace(/\/$/, "")}/${clean}`;
}

/* ───────────────────────── Errors ───────────────────────── */

type AnyAuthError =
  | { message?: string | undefined; code?: string | undefined; status?: number | undefined }
  | null
  | undefined;

export function friendlyAuthError(err: AnyAuthError): string {
  if (!err) return "Something went wrong. Please try again.";
  const msg = (err.message ?? "").toLowerCase();

  switch (err.code) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "Please confirm your email first. Check your inbox for the link.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Try logging in instead.";
    case "weak_password":
      return "That password is too weak. Use at least 8 characters with letters and numbers.";
    case "same_password":
      return "Your new password must be different from the old one.";
    case "signup_disabled":
      return "Sign ups are currently disabled.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
    case "over_sms_send_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    case "validation_failed":
      return "Please check your details and try again.";
    case "provider_disabled":
      return "That sign-in method isn't enabled yet.";
  }

  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
    return "That sign-in method isn't enabled yet.";
  }
  if (msg.includes("invalid login credentials")) return "Incorrect email or password.";
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email first. Check your inbox for the link.";
  }
  if (msg.includes("already registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (msg.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";

  return err.message || "Something went wrong. Please try again.";
}

/* ───────────────────────── Profile ───────────────────────── */

export type Profile = {
  id: string;
  name: string;
  firstName: string;
  username: string;
  email: string;
  /** Photo from Google/Facebook/Apple if the account has one, otherwise undefined. */
  avatarUrl: string | undefined;
  createdAt: string | undefined;
};

/** Turns a Supabase user into the details the UI shows. Email sign ups store the name at sign up;
 *  social logins provide it themselves. Falls back to the part of the email before the @. */
export function profileFromUser(user: User | null): Profile {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const email = user?.email ?? "";
  const emailName = email.split("@")[0] ?? "";
  const name = str(meta["full_name"]) || str(meta["name"]) || emailName;
  const username =
    str(meta["username"]) || emailName.toLowerCase().replace(/[^a-z0-9_.]/g, "") || "user";

  return {
    id: user?.id ?? "",
    name,
    firstName: name.split(/\s+/)[0] || name,
    username,
    email,
    avatarUrl: str(meta["avatar_url"]) || str(meta["picture"]) || undefined,
    createdAt: user?.created_at,
  };
}

/* ───────────────────────── Onboarding ───────────────────────── */

const onboardedKey = (userId: string) => `onboarded:${userId}`;

/**
 * New accounts see the onboarding slides once. "Done" is stored on the account (user metadata, so it
 * follows the person across devices) and mirrored in local storage so a failed network call can
 * never trap someone in a redirect loop.
 */
export function needsOnboarding(user: User | null): boolean {
  if (!user) return false;
  if (user.user_metadata?.["onboarded"] === true) return false;
  try {
    if (window.localStorage.getItem(onboardedKey(user.id)) === "1") return false;
  } catch {
    /* storage blocked: fall through */
  }
  return true;
}

/* ───────────────────────── Context ───────────────────────── */

type Result = { error: string | null };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** true until the stored session has been read on app start */
  loading: boolean;
  signUp: (args: { email: string; password: string; fullName: string }) => Promise<
    Result & { needsConfirmation: boolean }
  >;
  signIn: (args: { email: string; password: string }) => Promise<Result>;
  signInWithProvider: (provider: OAuthProvider) => Promise<Result>;
  resetPassword: (email: string) => Promise<Result>;
  updatePassword: (password: string) => Promise<Result>;
  /** Marks onboarding as seen (called when the person finishes or skips it). */
  completeOnboarding: () => Promise<void>;
  updateProfile: (args: { fullName: string; username: string }) => Promise<Result>;
  resendConfirmation: (email: string) => Promise<Result>;
  signOut: () => Promise<Result>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/* ───────────────────────── Provider ───────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /* Load the stored session, then keep it in sync (login, logout, token refresh, other tabs). */
  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        /* storage unavailable / offline: treat as signed out */
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      setLoading(false);
      // Web: the reset link signs the person in temporarily; send them to set a new password.
      if (event === "PASSWORD_RECOVERY") navigate({ to: "/reset-password", replace: true });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  /* Native: finish OAuth / email-link flows when the app is re-opened through the deep link. */
  useEffect(() => {
    if (!isNative()) return;

    const handle = CapApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith(`${NATIVE_SCHEME}://`)) return;

      let params: URLSearchParams;
      try {
        const parsed = new URL(url);
        params = new URLSearchParams(parsed.hash.replace(/^#/, "") || parsed.search);
      } catch {
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      await Browser.close().catch(() => {});

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && params.get("type") === "recovery") {
          navigate({ to: "/reset-password", replace: true });
        }
      }
    });

    return () => {
      void handle.then((h) => h.remove());
    };
  }, [navigate]);

  const signUp = useCallback<AuthContextValue["signUp"]>(async ({ email, password, fullName }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: authRedirect("/"),
        },
      });
      if (error) return { error: friendlyAuthError(error), needsConfirmation: false };

      // With email confirmation on, Supabase hides "already registered" by returning a user
      // with no identities instead of an error. Surface it so the person isn't left waiting.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { error: friendlyAuthError({ code: "user_already_exists" }), needsConfirmation: false };
      }

      return { error: null, needsConfirmation: !data.session };
    } catch (e) {
      return { error: friendlyAuthError(e as Error), needsConfirmation: false };
    }
  }, []);

  const signIn = useCallback<AuthContextValue["signIn"]>(async ({ email, password }) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? friendlyAuthError(error) : null };
    } catch (e) {
      return { error: friendlyAuthError(e as Error) };
    }
  }, []);

  const signInWithProvider = useCallback<AuthContextValue["signInWithProvider"]>(async (provider) => {
    try {
      const native = isNative();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: authRedirect("/"), skipBrowserRedirect: native },
      });
      if (error) return { error: friendlyAuthError(error) };
      // On native we open the provider page ourselves; on web supabase-js redirects the tab.
      if (native && data.url) await Browser.open({ url: data.url });
      return { error: null };
    } catch (e) {
      return { error: friendlyAuthError(e as Error) };
    }
  }, []);

  const resetPassword = useCallback<AuthContextValue["resetPassword"]>(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirect("/reset-password"),
      });
      return { error: error ? friendlyAuthError(error) : null };
    } catch (e) {
      return { error: friendlyAuthError(e as Error) };
    }
  }, []);

  const updatePassword = useCallback<AuthContextValue["updatePassword"]>(async (password) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error ? friendlyAuthError(error) : null };
    } catch (e) {
      return { error: friendlyAuthError(e as Error) };
    }
  }, []);

  const completeOnboarding = useCallback<AuthContextValue["completeOnboarding"]>(async () => {
    const id = session?.user.id;
    if (id) {
      try {
        window.localStorage.setItem(onboardedKey(id), "1");
      } catch {
        /* ignore */
      }
    }
    try {
      await supabase.auth.updateUser({ data: { onboarded: true } });
    } catch {
      /* local flag above already prevents a loop */
    }
  }, [session]);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(async ({ fullName, username }) => {
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, username } });
      return { error: error ? friendlyAuthError(error) : null };
    } catch (e) {
      return { error: friendlyAuthError(e as Error) };
    }
  }, []);

  const resendConfirmation = useCallback<AuthContextValue["resendConfirmation"]>(async (email) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: authRedirect("/") },
      });
      return { error: error ? friendlyAuthError(error) : null };
    } catch (e) {
      return { error: friendlyAuthError(e as Error) };
    }
  }, []);

  const signOut = useCallback<AuthContextValue["signOut"]>(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      // Even if the network call failed, drop the local session so the person is logged out here.
      if (error) await supabase.auth.signOut({ scope: "local" });
      return { error: null };
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      return { error: null };
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signUp,
      signIn,
      signInWithProvider,
      resetPassword,
      updatePassword,
      completeOnboarding,
      updateProfile,
      resendConfirmation,
      signOut,
    }),
    [session, loading, signUp, signIn, signInWithProvider, resetPassword, updatePassword, completeOnboarding, updateProfile, resendConfirmation, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
