import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started | Classroom" },
      {
        name: "description",
        content: "A quick look at how Classroom keeps your studies in one place.",
      },
    ],
  }),
  component: OnboardingPage,
});

const slides = [
  {
    title: "All your classes, one place",
    body: "Assignments, materials and schedules for every course, neatly organized for you.",
  },
  {
    title: "Talk with your class",
    body: "Chat with classmates and lecturers, share ideas and get answers without the wait.",
  },
  {
    title: "Never miss a deadline",
    body: "Timely reminders for assignments, tests and live sessions, right when you need them.",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === slides.length - 1;

  const finish = () => navigate({ to: "/" });

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  };

  const onPrimary = () => (isLast ? finish() : goTo(index + 1));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar: skip stays out of the way, and disappears on the last slide */}
      <div className="flex h-14 items-center justify-end px-6">
        <button
          type="button"
          onClick={finish}
          aria-hidden={isLast}
          tabIndex={isLast ? -1 : 0}
          className={`text-[14px] font-medium text-muted-foreground transition-opacity duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
            isLast ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          Skip
        </button>
      </div>

      {/* Slides: native scroll snap gives smooth, touch friendly swiping */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <section
              key={slide.title}
              aria-label={`Step ${i + 1} of ${slides.length}`}
              className="flex w-full shrink-0 snap-center flex-col items-center px-6"
            >
              {/* Image slot: drop your illustration in here. Keep it square so
                  every slide lines up the same way. */}
              <div className="flex w-full flex-1 items-center justify-center py-4">
                <div
                  data-slot="illustration"
                  className={`aspect-square w-full max-w-[20rem] rounded-[2rem] border border-dashed border-border bg-muted/40 transition-all duration-500 ease-out motion-reduce:transition-none ${
                    active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                  }`}
                />
              </div>

              <div
                className={`flex min-h-[9.5rem] flex-col items-center text-center transition-all delay-100 duration-500 ease-out motion-reduce:transition-none ${
                  active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                }`}
              >
                <h1 className="max-w-[17rem] text-[28px] font-bold leading-tight text-foreground">
                  {slide.title}
                </h1>
                <p className="mt-3 max-w-[18rem] text-[14.5px] leading-relaxed text-muted-foreground">
                  {slide.body}
                </p>
              </div>
            </section>
          );
        })}
      </div>

      {/* Pager + action */}
      <div className="mx-auto w-full max-w-sm px-6 pb-10 pt-2">
        <div
          role="tablist"
          aria-label="Onboarding steps"
          className="mb-8 flex items-center justify-center gap-2"
        >
          {slides.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                i === index ? "w-6 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onPrimary}
          className="btn-primary-grad flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-semibold"
        >
          {isLast ? "Get started" : "Next"}
        </button>
      </div>
    </div>
  );
}