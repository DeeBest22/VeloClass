import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password | Classroom" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = password.length >= 8 && password === confirm;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setSubmitting(true);
    const res = await updatePassword(password);
    setSubmitting(false);
    if (res.error) return setError(res.error);
    navigate({ to: "/", replace: true });
  };

  const field =
    "flex h-[3.25rem] items-center rounded-[10px] border border-border bg-card px-4 transition-all focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10";
  const input =
    "h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground";

  return (
    <main className="flex min-h-screen flex-col bg-background px-6">
      <div className="flex h-16 items-center">
        <BackButton />
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col pt-16 sm:pt-20">
        {loading ? (
          <div className="flex justify-center pt-24">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status" aria-label="Loading" />
          </div>
        ) : !session ? (
          <section className="rise-in">
            <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.045em] text-foreground">Link expired</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              This password reset link is invalid or has expired. Request a new one from the log in screen.
            </p>
            <Link
              to="/EmailAuth"
              search={{ mode: "login" }}
              replace
              className="btn-primary-grad mt-8 flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-semibold"
            >
              Back to log in
            </Link>
          </section>
        ) : (
          <>
            <section className="rise-in">
              <span className="mb-5 block h-1 w-9 rounded-full bg-primary" aria-hidden="true" />
              <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.045em] text-foreground">Set a new password</h1>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">Choose a password you haven't used here before.</p>
            </section>

            <form onSubmit={submit} noValidate className="rise-in mt-10 space-y-6">
              {error && (
                <p role="alert" className="rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                  {error}
                </p>
              )}
              <div className="space-y-2.5">
                <label htmlFor="new-password" className="text-[13px] font-semibold text-foreground">New password</label>
                <div className={field}>
                  <input id="new-password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className={input} />
                  <button type="button" onClick={() => setShow((v) => !v)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2.5">
                <label htmlFor="confirm-password" className="text-[13px] font-semibold text-foreground">Confirm password</label>
                <div className={field}>
                  <input id="confirm-password" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" className={input} />
                </div>
              </div>
              <button type="submit" disabled={!valid || submitting} className="btn-primary-grad flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? "Please wait…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
