import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Search,
  ArrowUpRight,
  Megaphone,
  Users,
  Code2,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses" },
      {
        name: "description",
        content:
          "A minimal mobile courses screen: continue where you left off, follow progress and browse every enrolled course.",
      },
      { property: "og:title", content: "Courses — Track Your Learning" },
      {
        property: "og:description",
        content: "Continue learning, follow progress and browse your courses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: Index,
});

type Course = {
  title: string;
  category: string;
  lessons: number;
  done: number;
};

const courses: Course[] = [
  { title: "Growing a Facebook Page", category: "Marketing", lessons: 12, done: 9 },
  { title: "Community Building", category: "Strategy", lessons: 8, done: 4 },
  { title: "Data Science Bootcamp", category: "Engineering", lessons: 24, done: 21 },
  { title: "Target Audience Research", category: "Marketing", lessons: 10, done: 2 },
];

const filters = ["All", "In progress", "Completed"];

type Accent = {
  card: string;
  ink: string;
  track: string;
  icon: LucideIcon;
};

const ACCENTS: Record<string, Accent> = {
  Marketing: { card: "#F4D35E", ink: "#241D08", track: "rgba(36,29,8,0.18)", icon: Megaphone },
  Strategy: { card: "#C9B6FF", ink: "#231A3A", track: "rgba(35,26,58,0.18)", icon: Users },
  Engineering: { card: "#9BE87A", ink: "#132308", track: "rgba(19,35,8,0.18)", icon: Code2 },
};
const DEFAULT_ACCENT: Accent = { card: "#8FCFFF", ink: "#0E2233", track: "rgba(14,34,51,0.18)", icon: Users };

function accentFor(category: string) {
  return ACCENTS[category] ?? DEFAULT_ACCENT;
}

const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;

function ProgressRing({ pct, stroke, track }: { pct: number; stroke: string; track: string }) {
  const dash = (pct / 100) * RING_C;
  return (
    <div className="relative grid h-9 w-9 shrink-0 place-items-center">
      <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
        <circle cx="18" cy="18" r={RING_R} fill="none" stroke={track} strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={RING_R}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${RING_C}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <span
        className="font-mono-num absolute text-[9px] font-medium tabular-nums"
        style={{ color: stroke }}
      >
        {pct}
      </span>
    </div>
  );
}

function CourseCard({ course, span }: { course: Course; span?: "wide" }) {
  const pct = Math.round((course.done / course.lessons) * 100);
  const accent = accentFor(course.category);
  const Icon = accent.icon;

  return (
    <li className={`rise-in ${span === "wide" ? "col-span-2" : "col-span-1"}`}>
      <button
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-[24px] p-4 text-left transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        style={{ backgroundColor: accent.card, color: accent.ink, ["--tw-ring-color" as string]: accent.card }}
      >
        <Icon
          aria-hidden
          className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 rotate-[-12deg] opacity-[0.14]"
          strokeWidth={1.5}
        />
        <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-colors group-hover:bg-black/15">
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
        </span>

        <p className="font-mono-num relative text-[0.62rem] font-medium tracking-[0.14em] uppercase opacity-70">
          {course.category}
        </p>
        <h3 className="font-display relative mt-1.5 max-w-[85%] text-[0.95rem] leading-snug font-semibold">
          {course.title}
        </h3>

        <div className="relative mt-auto flex items-end justify-between pt-4">
          <span className="font-mono-num text-[0.7rem] font-medium tabular-nums opacity-70">
            {course.done}/{course.lessons} lessons
          </span>
          <ProgressRing pct={pct} stroke={accent.ink} track={accent.track} />
        </div>
      </button>
    </li>
  );
}

function Index() {
  const [filter, setFilter] = useState(0);

  const current = courses.find((c) => c.done < c.lessons) ?? courses[0];

  const shown = courses.filter((c) =>
    c !== current && (filter === 0 ? true : filter === 1 ? c.done < c.lessons : c.done === c.lessons),
  );

  const currentPct = Math.round((current.done / current.lessons) * 100);
  const currentAccent = accentFor(current.category);
  const CurrentIcon = currentAccent.icon;

  const today = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="font-body flex min-h-screen justify-center bg-white sm:py-8">
   <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
  .font-display { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
  .font-body { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
  .font-mono-num { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
  html, body { background-color: #0a0a0f; }
`}</style>

      <div className="flex w-full max-w-[420px] flex-col bg-white text-[#0B0A0F] sm:rounded-[2.5rem] sm:border sm:border-black/5 sm:shadow-2xl sm:shadow-black/10">
        <header className="px-6 pt-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono-num text-[10px] font-medium tracking-[0.2em] text-black/40 uppercase">
                {today}
              </p>
              <h1 className="font-display mt-2 text-[1.9rem] leading-tight font-semibold tracking-tight">
                Courses
              </h1>
            </div>
            <button
              aria-label="Add a course"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10 text-[#0B0A0F] transition-colors hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 focus-within:border-black/20">
            <Search className="h-4 w-4 shrink-0 text-black/40" strokeWidth={2} />
            <input
              type="search"
              placeholder="Search courses"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#0B0A0F] outline-none placeholder:text-black/40"
            />
          </div>
        </header>

     <section className="px-6 pt-7">
  <h2 className="font-mono-num text-[10px] font-medium tracking-[0.2em] text-black/40 uppercase">
    Continue learning
  </h2>

  <article className="relative mt-3 overflow-hidden rounded-[28px] bg-white p-6 shadow-[0_2px_8px_rgba(51,47,99,0.04),0_16px_40px_-16px_rgba(51,47,99,0.12)]">
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEEBFC]">
      <CurrentIcon aria-hidden className="h-5 w-5 text-[#7C6FEE]" strokeWidth={1.75} />
    </div>

    <h3 className="font-display mt-5 text-xl leading-snug font-semibold text-[#211D45]">
      {current.title}
    </h3>

    <div className="mt-3 flex gap-3">
      <div className="w-[3px] shrink-0 rounded-full bg-[#7C6FEE]/25" />
      <p className="text-[0.8rem] leading-relaxed text-[#211D45]/55">
        {current.category} &middot; Lesson {current.done + 1} of {current.lessons}.
        You&rsquo;re {currentPct}% of the way through.
      </p>
    </div>

    <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-[#211D45]/[0.06]">
      <div
        className="h-full rounded-full bg-[#7C6FEE] transition-[width] duration-700"
        style={{ width: `${currentPct}%` }}
      />
    </div>

    <button className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#EEEBFC] px-5 py-3 text-sm font-semibold text-[#4C3FCC] transition-colors hover:bg-[#E3DEFB] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7C6FEE]">
      Resume
      <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
    </button>
  </article>
</section>
        <div className="no-scrollbar mt-7 flex gap-2 overflow-x-auto px-6">
          {filters.map((f, i) => (
            <button
              key={f}
              onClick={() => setFilter(i)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                filter === i
                  ? "bg-[#0B0A0F] text-white"
                  : "border border-black/10 text-black/45 hover:text-black/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

   

        <div className="flex-1 px-6 pt-5 pb-28">
          {shown.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3">
              {shown.map((course, i) => (
                <CourseCard
                  key={course.title}
                  course={course}
                  span={i === shown.length - 1 ? "wide" : undefined}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-[24px] border border-dashed border-black/10 px-5 py-10 text-center">
              <p className="font-display text-sm font-semibold">Nothing here yet</p>
              <p className="mt-1 text-xs text-black/45">
                Courses matching this filter will show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}