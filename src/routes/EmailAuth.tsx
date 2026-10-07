import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { BackButton } from "@/components/BackButton";

type Mode = "signup" | "login";

function GoogleMark() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" /><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.34v3.09A12 12 0 0 0 12 24Z" /><path fill="#FBBC05" d="M5.37 14.31a7.2 7.2 0 0 1 0-4.62V6.6H1.34a12 12 0 0 0 0 10.8l4.03-3.09Z" /><path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43A11.54 11.54 0 0 0 12 0 12 12 0 0 0 1.34 6.6l4.03 3.09A7.16 7.16 0 0 1 12 4.75Z" /></svg>;
}

function FacebookMark() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" /></svg>;
}

function AppleMark() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M16.37 1.43c0 1.14-.46 2.22-1.2 3.01-.8.86-2.1 1.52-3.16 1.44-.13-1.1.41-2.25 1.15-3.02.82-.87 2.22-1.5 3.21-1.43ZM20.5 17.14c-.55 1.27-.81 1.83-1.52 2.95-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.02-3.05-1.77-4.04-3.33C-.07 15.9-.36 10.8 1.35 8.17c1.21-1.87 3.12-2.97 4.92-2.97 1.83 0 2.98 1.01 4.49 1.01 1.47 0 2.36-1.01 4.47-1.01 1.6 0 3.3.87 4.51 2.38-3.97 2.18-3.33 7.85.76 9.56Z" /></svg>;
}

export const Route = createFileRoute("/EmailAuth")({
  validateSearch: (search: Record<string, unknown>): { mode: Mode } => ({
    mode: search.mode === "login" ? "login" : "signup",
  }),
  head: () => ({
    meta: [
      { title: "Continue with email | Classroom" },
      { name: "description", content: "Create or access your Classroom account with email." },
    ],
  }),
  component: EmailAuthPage,
});

function EmailAuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const passwordValid = password.length >= 8;
  const canSubmit = emailValid && passwordValid && !submitting;
  const title = isSignup ? "Create your account" : "Welcome back";
  const body = isSignup ? "Create an account with your email." : "Log in with your email to continue.";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (!canSubmit) return;

    setSubmitting(true);
    // Replace with the real email authentication request when it is available.
    await new Promise((resolve) => setTimeout(resolve, 650));
    navigate({ to: "/" });
  };

  return (
    <main className="flex min-h-screen flex-col bg-background px-6">
      <div className="flex h-16 items-center">
        <BackButton />
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col pt-16 sm:pt-20">
        <section className="rise-in">
          <span className="mb-5 block h-1 w-9 rounded-full bg-primary" aria-hidden="true" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {isSignup ? "Sign up" : "Log in"}
          </p>
          <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.045em] text-foreground">
            {title}
          </h1>
          <p className="mt-3 max-w-[17rem] text-[14px] leading-relaxed text-muted-foreground">{body}</p>
        </section>

        <form onSubmit={submit} noValidate className="rise-in mt-12 space-y-6" style={{ animationDelay: "0.12s" }}>
          <div className="space-y-2.5">
            <label htmlFor="email" className="text-[13px] font-semibold text-foreground">
              Email address
            </label>
            <div className={`flex h-[3.25rem] items-center rounded-[10px] border bg-card px-4 transition-all ${touched.email && !emailValid ? "border-destructive/70" : "border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"}`}>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched((value) => ({ ...value, email: true }))}
                placeholder="you@example.com"
                autoComplete="email"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                aria-invalid={touched.email && !emailValid}
                aria-describedby="email-error"
              />
            </div>
            {touched.email && !emailValid && <p id="email-error" className="text-[12px] text-destructive">Enter a valid email address.</p>}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[13px] font-semibold text-foreground">Password</label>
              {!isSignup && <button type="button" className="text-[12px] font-semibold text-primary hover:underline">Forgot password?</button>}
            </div>
            <div className={`flex h-[3.25rem] items-center rounded-[10px] border bg-card px-4 transition-all ${touched.password && !passwordValid ? "border-destructive/70" : "border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"}`}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setTouched((value) => ({ ...value, password: true }))}
                placeholder="At least 8 characters"
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                aria-invalid={touched.password && !passwordValid}
                aria-describedby="password-error"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              </button>
            </div>
            {touched.password && !passwordValid && <p id="password-error" className="text-[12px] text-destructive">Use at least 8 characters.</p>}
          </div>

          <button type="submit" disabled={!canSubmit} className="btn-primary-grad mt-2 flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>

          <div className="pt-3">
            <div className="flex items-center gap-4" aria-hidden="true">
              <span className="h-px flex-1 bg-border/70" />
              <span className="text-[10px] font-medium text-muted-foreground">Or</span>
              <span className="h-px flex-1 bg-border/70" />
            </div>
            <div className="mt-5 flex justify-center gap-4">
              <Link to="/AuthMethods" search={{ mode }} className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card shadow-[0_3px_9px_-6px_oklch(0.24_0.06_265_/_0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-9px_oklch(0.24_0.06_265_/_0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${isSignup ? "Sign up" : "Log in"} with Google`}><GoogleMark /></Link>
              <Link to="/AuthMethods" search={{ mode }} className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[0_3px_9px_-6px_oklch(0.24_0.06_265_/_0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-9px_oklch(0.24_0.06_265_/_0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${isSignup ? "Sign up" : "Log in"} with Apple`}><AppleMark /></Link>
              <Link to="/AuthMethods" search={{ mode }} className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card shadow-[0_3px_9px_-6px_oklch(0.24_0.06_265_/_0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-9px_oklch(0.24_0.06_265_/_0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${isSignup ? "Sign up" : "Log in"} with Facebook`}><FacebookMark /></Link>
            </div>
          </div>
        </form>

        <div className="rise-in mt-auto pb-10 pt-8 text-center" style={{ animationDelay: "0.22s" }}>
          <p className="text-[13.5px] text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to Classroom?"}{" "}
            <Link to="/EmailAuth" search={{ mode: isSignup ? "login" : "signup" }} replace className="font-semibold text-foreground underline-offset-4 hover:underline">
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
