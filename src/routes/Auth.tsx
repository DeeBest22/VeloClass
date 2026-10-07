import { createFileRoute, Link } from "@tanstack/react-router";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/Auth")({
  head: () => ({
    meta: [
      { title: "Get started | Classroom" },
      {
        name: "description",
        content: "Create a Classroom account or log in to the one you already have.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6">
      {/* Top bar */}
      <div className="flex h-16 items-center">
        <BackButton />
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* Image slot: drop an illustration in here. Remove the dashed
              styles once it is in place. */}
          <div
            data-slot="illustration"
            className="rise-in aspect-square w-full max-w-[17rem] rounded-[2rem] border border-dashed border-border bg-muted/40"
          />

          <h1
            className="rise-in mt-8 max-w-[18rem] text-[28px] font-bold leading-tight text-foreground"
            style={{ animationDelay: "0.1s" }}
          >
            Let&rsquo;s get you started
          </h1>
          <p
            className="rise-in mt-3 max-w-[17rem] text-[14.5px] leading-relaxed text-muted-foreground"
            style={{ animationDelay: "0.18s" }}
          >
            Create a new account, or log in if you already have one.
          </p>
        </div>

        {/* Two clear paths */}
        <div
          className="rise-in flex flex-col gap-3 pb-10"
          style={{ animationDelay: "0.26s" }}
        >
          <Link
            to="/AuthMethods"
            search={{ mode: "signup" }}
            className="btn-primary-grad flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-semibold transition-all duration-200 active:scale-[0.99] motion-reduce:transition-none"
          >
            Create account
          </Link>

    

          <Link
            to="/AuthMethods"
            search={{ mode: "login" }}
            className="flex w-full items-center justify-center rounded-full border border-border bg-card py-3.5 text-[15px] font-semibold text-foreground transition-all duration-200 hover:bg-muted active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            Log in
          </Link>
          
        </div>
      </div>
    </div>
  );
}
