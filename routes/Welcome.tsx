import { createFileRoute, Link } from "@tanstack/react-router";
import welcomeHero from "@/assets/welcome-hero.webp";

export const Route = createFileRoute("/Welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — Classroom" },
      {
        name: "description",
        content: "Every class, assignment and conversation, in one place.",
      },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {/* Hero: a single illustration replaces the old icon cluster. The
            source image has generous padding baked in, so negative vertical
            margins pull the text closer without cropping the artwork. */}
        <img
          src={welcomeHero}
          alt="A student studying on a laptop with a checklist, a document and a chat bubble floating nearby"
          width={1254}
          height={1254}
          className="rise-in -my-6 h-auto w-full max-w-[20rem] shrink-0 select-none"
          draggable={false}
        />

        <h1
          className="rise-in mt-6 max-w-[19rem] text-[28px] font-bold leading-tight text-foreground"
          style={{ animationDelay: "0.32s" }}
        >
          Every class, right where you left it.
        </h1>

        <p
          className="rise-in mt-3 max-w-[17rem] text-[14.5px] leading-relaxed text-muted-foreground"
          style={{ animationDelay: "0.4s" }}
        >
          Assignments, chats and schedules for everything you&rsquo;re taking, in one app.
        </p>
      </div>

      {/* Actions */}
      <div
        className="rise-in mx-auto w-full max-w-sm pb-10"
        style={{ animationDelay: "0.48s" }}
      >
        <Link
          to="/Auth"
          className="btn-primary-grad flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-semibold"
        >
          Get started
        </Link>
      </div>
    </div>
  );
}