import { useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogIn, Mail, UserPlus } from "lucide-react";
import { BackButton } from "@/components/BackButton";

type Mode = "signup" | "login";

export const Route = createFileRoute("/AuthMethods")({
  validateSearch: (search: Record<string, unknown>): { mode: Mode } => ({
    mode: search.mode === "login" ? "login" : "signup",
  }),
  head: () => ({
    meta: [
      { title: "Choose how to continue | Classroom" },
      {
        name: "description",
        content: "Sign up or log in to Classroom with Google, Facebook, Apple or email.",
      },
    ],
  }),
  component: AuthMethodsPage,
});

type Provider = "google" | "facebook" | "apple";

/* Brand marks are inline so there is no extra dependency. Apple uses
   currentColor so it follows light and dark themes. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.34v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.37 14.31a7.2 7.2 0 0 1 0-4.62V6.6H1.34a12 12 0 0 0 0 10.8l4.03-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43A11.54 11.54 0 0 0 12 0 12 12 0 0 0 1.34 6.6l4.03 3.09A7.16 7.16 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M16.37 1.43c0 1.14-.46 2.22-1.2 3.01-.8.86-2.1 1.52-3.16 1.44-.13-1.1.41-2.25 1.15-3.02.82-.87 2.22-1.5 3.21-1.43ZM20.5 17.14c-.55 1.27-.81 1.83-1.52 2.95-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.02-3.05-1.77-4.04-3.33C-.07 15.9-.36 10.8 1.35 8.17c1.21-1.87 3.12-2.97 4.92-2.97 1.83 0 2.98 1.01 4.49 1.01 1.47 0 2.36-1.01 4.47-1.01 1.6 0 3.3.87 4.51 2.38-3.97 2.18-3.33 7.85.76 9.56Z" />
    </svg>
  );
}

const socials: { id: Provider; name: string; icon: ReactNode }[] = [
  { id: "google", name: "Google", icon: <GoogleMark /> },
  { id: "facebook", name: "Facebook", icon: <FacebookMark /> },
  { id: "apple", name: "Apple", icon: <AppleMark /> },
];

const copy: Record<
  Mode,
  { chip: string; title: string; body: string; verb: string; switchText: string; switchCta: string }
> = {
  signup: {
    chip: "",
    title: "Create your account",
    body: "Choose how you would like to sign up.",
    verb: "Sign up",
    switchText: "Already have an account?",
    switchCta: "Log in",
  },
  login: {
    chip: "Log in",
    title: "Welcome back",
    body: "Choose how you usually log in.",
    verb: "Log in",
    switchText: "New to Classroom?",
    switchCta: "Create an account",
  },
};

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function AuthMethodsPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [pending, setPending] = useState<Provider | null>(null);

  const isSignup = mode === "signup";
  const t = copy[mode];
  const ChipIcon = isSignup ? UserPlus : LogIn;
  const busy = pending !== null;

  // TODO: replace with your real OAuth calls. "mode" tells you whether the
  // person tapped sign up or log in. Many providers handle both in one step.
  // For now each option shows a short loading state, then continues to "/".
  const continueWith = async (provider: Provider) => {
    if (busy) return;
    setPending(provider);
    await new Promise((r) => setTimeout(r, 700));
    setPending(null);
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6">
      {/* Top bar */}
      <div className="flex h-16 items-center">
        <BackButton />
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        {/* Header re-animates if the mode changes */}
        <div key={mode} className="rise-in pt-4">
        
          <h1 className="text-[30px] font-bold leading-tight text-foreground">{t.title}</h1>
          <p className="mt-2 max-w-[19rem] text-[14.5px] leading-relaxed text-muted-foreground">
            {t.body}
          </p>
        </div>

        <div className="flex-1" />

        {/* Options */}
        <div
          className="rise-in flex flex-col gap-3 pb-6"
          style={{ animationDelay: "0.12s" }}
        >
          {socials.map(({ id, name, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => continueWith(id)}
              disabled={busy}
              className="relative flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card py-3.5 text-[15px] font-semibold text-foreground transition-all duration-200 hover:bg-muted active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              <span className="absolute left-5 grid h-5 w-5 place-items-center">{icon}</span>
              <span>
                {t.verb} with {name}
              </span>
              {pending === id && (
                <span className="absolute right-5 text-muted-foreground">
                  <Spinner />
                </span>
              )}
            </button>
          ))}

          {/* Divider */}
          <div className="my-1 flex items-center gap-4" role="separator" aria-label="or">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[12.5px] text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Link
            to="/EmailAuth"
            search={{ mode }}
            aria-disabled={busy}
            tabIndex={busy ? -1 : 0}
            className={`btn-primary-grad relative flex w-full items-center justify-center gap-3 rounded-full py-3.5 text-[15px] font-semibold transition-all duration-200 active:scale-[0.99] motion-reduce:transition-none ${
              busy ? "pointer-events-none opacity-70" : ""
            }`}
          >
            <span className="absolute left-5 grid h-5 w-5 place-items-center">
              <Mail className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span>{t.verb} with email</span>
          </Link>
        </div>

        {/* Switch path, plus legal text only when creating an account */}
        <div
          className="rise-in pb-10 text-center"
          style={{ animationDelay: "0.2s" }}
        >
          <p className="text-[13.5px] text-muted-foreground">
            {t.switchText}{" "}
            <Link
              to="/AuthMethods"
              search={{ mode: isSignup ? "login" : "signup" }}
              replace
              className="font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t.switchCta}
            </Link>
          </p>

          {isSignup && (
            <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
              By signing up you agree to our{" "}
              <Link to="/" className="font-medium text-foreground underline-offset-2 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/" className="font-medium text-foreground underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
