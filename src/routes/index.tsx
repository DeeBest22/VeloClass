import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  Bell,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CalendarClock,
  TriangleAlert,
  Layers,
  Calculator,
  MessageSquare,
  FolderOpen,
  GraduationCap,
  Users
} from "lucide-react";
import pfpImage from "@/assets/pfp.png";
import FloatingCallButton from '@/components/FloatingActionButton'
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Classroom" },
      {
        name: "description",
        content:
          "Your classroom home: today's schedule, course overview, alerts and recent activity.",
      },
      { property: "og:title", content: "Today — Classroom" },
      {
        property: "og:description",
        content: "Track classes, assignments and course activity in one place.",
      },
    ],
  }),
  component: HomePage,
});

const INK = "#14161F";
const INK_SOFT = "#6B6C76";
const CANVAS = "#F8F7F4";
const FLAME = "#FF5A36";
const AMBER = "#FFB33E";

const courses = [
  {
    eyebrow: "Chemistry",
    title: "Organic Chemistry II",
    progressLabel: "15/22 lessons",
    percent: 68,
    bg: "#D9CFFB",
    accent: "#5B3FE0",
  },
  {
    eyebrow: "Design",
    title: "Design Studio",
    progressLabel: "9/22 lessons",
    percent: 41,
    bg: "#C3EFAE",
    accent: "#3C7A22",
  },
  {
    eyebrow: "Teaching",
    title: "World Geography",
    progressLabel: "8/12 sessions",
    percent: 67,
    bg: "#FFE0AE",
    accent: "#9A6412",
  },
];

const schedule = [
  { time: "09:30", title: "Organic Chemistry II", meta: "Lab 2 · 90 min", now: true },

];

const alerts = [
  {
    icon: CalendarClock,
    title: "Lab report due tonight",
    meta: "Organic Chemistry II · 11:59 PM",
    color: AMBER,
  },
  {
    icon: TriangleAlert,
    title: "Missed class Thursday",
    meta: "World Geography · recording ready",
    color: FLAME,
  },
];

const activity = [
  { tag: "Grade", title: "Poster critique · A (92%)", time: "1h" },
  { tag: "Note", title: "Field trip moved to Friday", time: "3h" },
  { tag: "Reading", title: "Week 6 list posted", time: "Yesterday" },
];

const tools = [

  { icon: MessageSquare, label: "Messages", bg: "#DDF3E4", accent: "#0D9B57" },
  { icon: FolderOpen, label: "Resources", bg: "#FFE9D6", accent: "#C2680E" },
  { icon: GraduationCap, label: "Grades", bg: "#FDE2E2", accent: "#D3402E" },
];

const mentors = [
  { name: "Dr. Ada Bello", role: "Organic Chemistry II" },
  { name: "Kali Mona", role: "Design Studio · UI/UX" },
];

function ProgressRing({ percent, color }: { percent: number; color: string }) {
  const r = 15;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
        style={{ color: INK }}
      >
        {percent}
      </span>
    </div>
  );
}

function EmptyState({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-4 py-8 text-center"
      style={{ backgroundColor: "white", border: "1px dashed rgba(0,0,0,0.12)" }}
    >
      <p className="text-[13.5px] font-medium" style={{ color: INK }}>
        {title}
      </p>
      <p className="mt-1 text-[11.5px]" style={{ color: INK_SOFT }}>
        {meta}
      </p>
    </div>
  );
}

function HomePage() {
  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: CANVAS, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        html, body { background-color: #0a0a0f; }
      `}</style>

     
      <FloatingCallButton />

      <div className="mx-auto max-w-2xl px-5 pb-28">
        {/* Header */}
<header className="flex items-center justify-between pt-7">
  <div className="flex items-center gap-3.5">
    <div className="relative">
      <div
        className="h-14 w-14 overflow-hidden rounded-[22px] border-2"
        style={{ borderColor: "rgba(0,0,0,0.12)" }}
      >
        <img
          src={pfpImage}
          alt="Profile picture"
          className="h-full w-full object-cover"
        />
      </div>
      <span
        className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white"
        style={{ backgroundColor: "#22C55E" }}
      />
    </div>
    <div>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: INK_SOFT }}
      >
        Good evening
      </p>
      <p className="text-[22px] font-bold leading-tight" style={{ color: INK }}>
        Amara
      </p>
    </div>
  </div>

  <button
    aria-label="Search"
    className="grid h-12 w-12 place-items-center rounded-2xl border transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    style={{ borderColor: "rgba(0,0,0,0.08)", outlineColor: INK }}
  >
    <Search className="h-5 w-5" style={{ color: INK }} />
  </button>
</header>


        {/* Subject cards */}
        <section className="mt-9">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold" style={{ color: INK }}>
              Your courses
            </h2>
            <Link to="/" className="text-xs font-medium" style={{ color: INK_SOFT }}>
              All courses
            </Link>
          </div>
          {courses.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No courses yet" meta="Enrolled courses will show up here" />
            </div>
          ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {courses.map((c) => (
              <Link
                to={c.title === "Organic Chemistry II" ? "/live-class" : "/"}
                key={c.title}
                className="flex h-[168px] flex-col justify-between rounded-[1.5rem] p-4 transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: c.bg }}
              >
                <div className="flex items-start justify-between">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: c.accent }}
                  >
                    {c.eyebrow}
                  </span>
                  <div
                    className="grid h-6 w-6 place-items-center rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.55)" }}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" style={{ color: INK }} />
                  </div>
                </div>
                <p className="text-[15px] font-bold leading-snug" style={{ color: INK }}>
                  {c.title}
                </p>
                <div className="flex items-end justify-between">
                  <span className="text-[11px] font-medium" style={{ color: "rgba(0,0,0,0.55)" }}>
                    {c.progressLabel}
                  </span>
                  <ProgressRing percent={c.percent} color={c.accent} />
                </div>
              </Link>
            ))}
            <Link
              to="/"
              className="flex h-[168px] flex-col items-start justify-between rounded-[1.5rem] p-4 transition-colors hover:bg-black/[0.02]"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex w-full items-start justify-between">
                <div
                  className="grid h-9 w-9 place-items-center rounded-xl"
                  style={{ backgroundColor: "rgba(0,0,0,0.04)" }}
                >
                  <Layers className="h-4 w-4" style={{ color: INK_SOFT }} strokeWidth={1.75} />
                </div>
                <div
                  className="grid h-6 w-6 place-items-center rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.04)" }}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" style={{ color: INK_SOFT }} />
                </div>
              </div>
              <div>
                <p className="text-[15px] font-bold leading-snug" style={{ color: INK }}>
                  6 enrolled
                </p>
                <p className="mt-0.5 text-[11.5px]" style={{ color: INK_SOFT }}>
                  2 teaching · see all
                </p>
              </div>
            </Link>
          </div>
          )}
        </section>

        {/* Tools */}
        <section className="mt-9">
          <h2 className="text-sm font-semibold" style={{ color: INK }}>
            Tools
          </h2>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {tools.map((t) => (
              <Link
                to="/"
                key={t.label}
                className="flex flex-col items-center gap-2 rounded-2xl py-3.5 transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div
                  className="grid h-9 w-9 place-items-center rounded-xl"
                  style={{ backgroundColor: t.bg }}
                >
                  <t.icon className="h-4 w-4" style={{ color: t.accent }} strokeWidth={1.75} />
                </div>
                <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: INK }}>
                  {t.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Today's schedule */}
        <section className="mt-9">
          <h2 className="text-sm font-semibold" style={{ color: INK }}>
            Today&apos;s schedule
          </h2>
          <div className="mt-4 space-y-2">
            {schedule.length === 0 && (
              <EmptyState title="Nothing scheduled today" meta="Your classes for today will appear here" />
            )}
            {schedule.map((s) => (
              <div
                key={s.title}
                className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-colors hover:bg-black/[0.02]"
                style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <p className="w-12 shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: INK_SOFT }}>
                  {s.time}
                </p>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-medium" style={{ color: INK }}>
                      {s.title}
                    </p>
                    {s.now && (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider"
                        style={{ backgroundColor: "#E7F8EF", color: "#0D9B57" }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#0D9B57" }} />
                        Now
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11.5px]" style={{ color: INK_SOFT }}>
                    {s.meta}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: INK_SOFT }} />
              </div>
            ))}
          </div>
        </section>

     
    

        {/* Recent activity */}
        <section className="mt-9">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold" style={{ color: INK }}>
              Recent activity
            </h2>
            <button className="text-xs font-medium" style={{ color: INK_SOFT }}>
              Show all
            </button>
          </div>
          <div className="mt-4 space-y-4" style={activity.length > 0 ? { borderColor: "rgba(0,0,0,0.09)", borderLeftWidth: 1, paddingLeft: 16 } : undefined}>
            {activity.length === 0 && (
              <EmptyState title="No activity yet" meta="Grades, notes and updates will show up here" />
            )}
            {activity.map((a) => (
              <div key={a.title} className="relative">
                <span
                  className="absolute -left-[18.5px] top-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
                />
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className="text-[9.5px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: INK_SOFT }}
                  >
                    {a.tag}
                  </p>
                  <span className="shrink-0 text-[10.5px] tabular-nums" style={{ color: INK_SOFT }}>
                    {a.time}
                  </span>
                </div>
                <p className="mt-0.5 text-[13.5px] font-medium leading-snug" style={{ color: INK }}>
                  {a.title}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}