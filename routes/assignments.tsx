import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  BookOpen,
  CircleAlert,
  CircleCheck,
  Clock,
  FlaskConical,
  FolderKanban,
  ListChecks,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import heroBackground from "@/assets/assignment-hero.webp";
import cardPurple from "@/assets/card-purple.png";
import cardRed from "@/assets/card-red.png";
import cardYellow from "@/assets/card-yellow.png";
import cardGreen from "@/assets/card-green.png";
import noActivityImage from "@/assets/no_activity.png";
import { useAuth } from "@/lib/auth";
import { getLastOpenedClassId, useClassOverview } from "@/lib/classes";
import { useSharedWork } from "@/lib/teacher-work";

/* -------------------------------------------------------------------------- */
/*  Route (routes/assignments.tsx  ->  /assignments)                          */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/assignments")({
  validateSearch: (search: Record<string, unknown>): { classId?: string } =>
    typeof search["classId"] === "string" ? { classId: search["classId"] } : {},
  head: () => ({
    meta: [
      { title: "Assignments | ENG 201" },
      { name: "description", content: "View coursework and deadlines for Engineering Mechanics." },
      { property: "og:title", content: "Assignments | ENG 201" },
      { property: "og:description", content: "View coursework and deadlines for Engineering Mechanics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ]
  }),
  component: AssignmentsRoute,
});

function AssignmentsRoute() {
  const router = useRouter();
  const { user } = useAuth();
  const { classId: searchedClassId } = Route.useSearch();
  const classId = searchedClassId ?? getLastOpenedClassId(user?.id);
  const overviewQuery = useClassOverview(classId);
  const workQuery = useSharedWork(classId);
  if (overviewQuery.isPending || workQuery.isPending) return <div className="min-h-screen bg-[#EEF1F5]" />;
  const assignments: Assignment[] = (workQuery.data ?? [])
    .filter((item) => item.type === "Assignment")
    .map((item) => ({ id: item.id, title: item.title, type: "homework", dueAt: item.dueAt, points: item.points ?? 0, status: "todo", attachments: item.attachmentCount, submitted: item.submitted, total: item.total }));
  return <AssignmentsPage role={overviewQuery.data?.myRole === "teacher" ? "instructor" : "student"} classCode={overviewQuery.data?.courseCode ?? "Your class"} courseName={overviewQuery.data?.name ?? "Assignments"} assignments={assignments} onBack={() => router.history.back()} onOpenAssignment={(assignment) => void router.navigate({ to: "/work", search: { classId: classId ?? "", workId: assignment.id } })} />;
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type AssignmentType = "homework" | "quiz" | "project" | "lab" | "essay";
export type AssignmentStatus = "todo" | "in_progress" | "submitted" | "graded";
type Tab = "todo" | "submitted" | "graded";

export interface Assignment {
  id: string;
  title: string;
  type: AssignmentType;
  dueAt: Date | string;
  points: number;
  status: AssignmentStatus;
  score?: number; // set when status is "graded"
  attachments?: number; // files the instructor attached
  submitted?: number; // instructor view: submissions received
  total?: number; // instructor view: students in class
}

export interface AssignmentsPageProps {
  role?: "student" | "instructor";
  classCode?: string; // e.g. "ENG 201"
  courseName?: string; // e.g. "Engineering Mechanics"
  assignments?: Assignment[];
  onBack?: () => void;
  onOpenAssignment?: (assignment: Assignment) => void;
  onCreate?: () => void; // instructor only
}

type Row = Assignment & { due: Date; tab: Tab; overdue: boolean };

/* -------------------------------------------------------------------------- */
/*  Tokens                                                                    */
/* -------------------------------------------------------------------------- */

const INK = "#13233F";
const PAPER = "#EEF1F5";
const RULE = "#D3DAE4";
const SIGNAL = "#FFD23F";
const LATE = "#D93B3B";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5BEA]";

/* -------------------------------------------------------------------------- */
/*  Date helpers                                                              */
/* -------------------------------------------------------------------------- */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
const dayDiff = (a: Date, b: Date) =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);

const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

type Tone = "late" | "soon" | "calm";

function relative(due: Date, now: Date): { text: string; tone: Tone } {
  const diff = due.getTime() - now.getTime();
  const mins = Math.max(1, Math.round(Math.abs(diff) / 60000));
  const hrs = Math.round(mins / 60);
  if (diff < 0) {
    if (mins < 60) return { text: `${mins} min late`, tone: "late" };
    if (hrs < 24) return { text: `${hrs} h late`, tone: "late" };
    const d = Math.max(1, dayDiff(now, due));
    return { text: `${d} ${d === 1 ? "day" : "days"} late`, tone: "late" };
  }
  if (mins < 60) return { text: `in ${mins} min`, tone: "soon" };
  if (hrs < 24) return { text: `in ${hrs} h`, tone: "soon" };
  const d = dayDiff(due, now);
  return { text: d === 1 ? "tomorrow" : `in ${d} days`, tone: "calm" };
}

const TYPE_LABEL: Record<AssignmentType, string> = {
  homework: "Homework",
  quiz: "Quiz",
  project: "Project",
  lab: "Lab",
  essay: "Essay",
};

const TYPE_ICON: Record<AssignmentType, LucideIcon> = {
  homework: BookOpen,
  quiz: ListChecks,
  project: FolderKanban,
  lab: FlaskConical,
  essay: NotebookPen,
};

/* -------------------------------------------------------------------------- */
/*  Demo data (built after mount so server and client never disagree)         */
/* -------------------------------------------------------------------------- */

function buildDemo(now: Date): Assignment[] {
  const at = (offset: number, h: number, m = 0) => {
    const d = startOfDay(addDays(now, offset));
    d.setHours(h, m, 0, 0);
    return d;
  };
  return [
    { id: "1", title: "Problem set 3: Newton's laws of motion", type: "homework", dueAt: at(0, 23, 59), points: 20, status: "in_progress", attachments: 1, submitted: 18, total: 40 },
    { id: "2", title: "Lab safety acknowledgement form", type: "lab", dueAt: at(-1, 17), points: 10, status: "todo", submitted: 31, total: 40 },
    { id: "3", title: "Quiz 2: Kinematics in one dimension", type: "quiz", dueAt: at(1, 10), points: 15, status: "todo", submitted: 0, total: 40 },
    { id: "4", title: "Pendulum experiment lab report", type: "lab", dueAt: at(3, 17), points: 30, status: "todo", attachments: 2, submitted: 6, total: 40 },
    { id: "5", title: "Group project proposal", type: "project", dueAt: at(5, 12), points: 50, status: "submitted", attachments: 1, submitted: 12, total: 40 },
    { id: "6", title: "Reflection: ethics in engineering practice", type: "essay", dueAt: at(9, 23, 59), points: 25, status: "todo", submitted: 2, total: 40 },
    { id: "7", title: "Problem set 2: Vectors and forces", type: "homework", dueAt: at(-3, 23, 59), points: 20, status: "graded", score: 17, submitted: 38, total: 40 },
    { id: "8", title: "Quiz 1: Units and measurement", type: "quiz", dueAt: at(-7, 10), points: 15, status: "graded", score: 13, submitted: 40, total: 40 },
    { id: "9", title: "Problem set 1: Dimensional analysis", type: "homework", dueAt: at(-11, 23, 59), points: 20, status: "graded", score: 18, submitted: 40, total: 40 },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export function AssignmentsPage({
  role = "student",
  classCode = "ENG 201",
  courseName = "Engineering Mechanics",
  assignments,
  onBack,
  onOpenAssignment,
  onCreate,
}: AssignmentsPageProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("todo");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isInstructor = role === "instructor";

  // Set "now" after mount and keep it fresh so countdowns stay honest.
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const rows: Row[] = useMemo(() => {
    if (!now) return [];
    return (assignments ?? [])
      .map((a) => {
        const due = new Date(a.dueAt);
        const t: Tab = a.status === "graded" ? "graded" : a.status === "submitted" ? "submitted" : "todo";
        return { ...a, due, tab: t, overdue: t === "todo" && due < now };
      })
      .sort((x, y) => x.due.getTime() - y.due.getTime());
  }, [assignments, now]);

  const counts = useMemo(
    () => ({
      todo: rows.filter((r) => r.tab === "todo").length,
      submitted: rows.filter((r) => r.tab === "submitted").length,
      graded: rows.filter((r) => r.tab === "graded").length,
    }),
    [rows],
  );

  const overdueCount = rows.filter((r) => r.overdue).length;

  // The hero always answers "what is my next deadline?"
  const hero = useMemo(() => {
    const open = rows.filter((r) => r.tab === "todo");
    return open.find((r) => !r.overdue) ?? open[0] ?? null;
  }, [rows]);

  // One flat list: soonest first on "To do" (overdue work naturally leads),
  // most recent first on "Submitted" and "Graded".
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => r.tab === tab && (!q || r.title.toLowerCase().includes(q)));
    return tab === "todo" ? list : [...list].reverse();
  }, [rows, tab, query]);

  // Sliding underline: measure the active tab and glide the indicator to it.
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, animate: false });
  useEffect(() => {
    const measure = () => {
      const el = tabRefs.current[tab];
      if (!el) return;
      setIndicator((prev) => ({ left: el.offsetLeft, width: el.offsetWidth, animate: prev.width > 0 }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tab, counts, isInstructor]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "todo", label: isInstructor ? "Open" : "To do" },
    { key: "submitted", label: isInstructor ? "To grade" : "Submitted" },
    { key: "graded", label: "Graded" },
  ];

  return (
    <div
      className="relative mx-auto min-h-dvh w-full max-w-md overflow-x-hidden pb-36"
    
    >
      {/* Header */}
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack ?? (() => window.history.back())}
            aria-label="Back to class"
            className={`group grid h-10 w-10 place-items-center rounded-full bg-white shadow-[0_1px_2px_rgba(19,35,63,0.06),0_0_0_1px_rgba(19,35,63,0.07)] transition duration-200 hover:shadow-[0_6px_16px_-8px_rgba(19,35,63,0.3),0_0_0_1px_rgba(19,35,63,0.07)] active:scale-90 ${FOCUS}`}
          >
            <ArrowLeft
              className="h-[18px] w-[18px] transition-transform duration-200 group-hover:-translate-x-0.5"
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? "Close search" : "Search assignments"}
            aria-expanded={searchOpen}
            className={`grid h-10 w-10 place-items-center rounded-full transition duration-200 active:scale-90 ${FOCUS} ${
              searchOpen
                ? "bg-[#13233F] text-white shadow-[0_6px_16px_-8px_rgba(19,35,63,0.6)]"
                : "bg-white shadow-[0_1px_2px_rgba(19,35,63,0.06),0_0_0_1px_rgba(19,35,63,0.07)] hover:shadow-[0_6px_16px_-8px_rgba(19,35,63,0.3),0_0_0_1px_rgba(19,35,63,0.07)]"
            }`}
          >
            {searchOpen ? (
              <X className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <Search className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
            )}
          </button>
        </div>

        <h1 className="mt-5 text-[34px] font-extrabold leading-none tracking-tight">Assignments</h1>
        <p className="mt-1.5 text-[14px]" style={{ color: "#5B6B85" }}>
          {classCode}, {courseName}
        </p>

        {searchOpen && (
          <div
            className="mt-4 flex items-center gap-2 rounded-full border bg-white px-5 py-3"
            style={{ borderColor: RULE }}
          >
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400"
            />
          </div>
        )}
      </header>

      {/* Next deadline */}
      {(hero || (!now && (assignments?.length ?? 0) > 0)) && (
        <section className="mt-6 px-5" aria-label="Next deadline">
          <Countdown hero={hero} now={now} isInstructor={isInstructor} onOpen={onOpenAssignment} />
        </section>
      )}

      {/* Tabs */}
      <nav className="relative mt-7 flex gap-6 border-b px-5" style={{ borderColor: RULE }} role="tablist">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`flex items-baseline gap-1.5 pb-3 text-[15px] font-semibold transition-colors duration-300 ${FOCUS} ${
                active ? "text-[#13233F]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
              <span
                className={`text-[12px] font-semibold tabular-nums transition-colors duration-300 ${
                  active ? "text-slate-500" : "text-slate-300"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px left-0 h-[3px] rounded-full"
          style={{
            backgroundColor: INK,
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
            opacity: indicator.width ? 1 : 0,
            transition: indicator.animate
              ? "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), width 420ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "none",
          }}
        />
      </nav>

      {/* Timeline */}
      <main className="px-5 pt-2">
        <style>{`
          @keyframes card-in { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
          @media (prefers-reduced-motion: no-preference) { .card-in { animation: card-in 480ms cubic-bezier(0.22, 1, 0.36, 1) both; } }
        `}</style>
        {!now && (
          <div className="mt-6 grid grid-cols-2 gap-3.5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[600/717] animate-pulse rounded-[10%] bg-white/70" />
            ))}
          </div>
        )}

        {now && visible.length === 0 && <Empty key={tab} tab={tab} isInstructor={isInstructor} searching={!!query.trim()} />}

        {now && visible.length > 0 && (
          <ul className="mt-6 grid grid-cols-2 gap-3.5" aria-label="Assignments">
            {visible.map((r, i) => (
              <li key={r.id} className="card-in" style={{ animationDelay: `${Math.min(i, 7) * 45}ms` }}>
                <AssignmentCard
                  r={r}
                  now={now}
                  isInstructor={isInstructor}
                  colorIndex={i}
                  onOpen={() => onOpenAssignment?.(r)}
                />
              </li>
            ))}
          </ul>
        )}

        {now && overdueCount > 0 && tab !== "todo" && (
          <button
            type="button"
            onClick={() => setTab("todo")}
            className={`card-in group mt-8 flex w-full items-center gap-3.5 rounded-[22px] bg-white p-2.5 pr-3 text-left shadow-[0_1px_2px_rgba(19,35,63,0.05),0_0_0_1px_rgba(217,59,59,0.14)] transition duration-200 hover:shadow-[0_10px_24px_-14px_rgba(217,59,59,0.45),0_0_0_1px_rgba(217,59,59,0.22)] active:scale-[0.985] ${FOCUS}`}
          >
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
              style={{ backgroundColor: "#FDECEA", color: LATE }}
            >
              <CircleAlert className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-bold leading-tight">
                {overdueCount} {overdueCount === 1 ? "assignment" : "assignments"} overdue
              </span>
              <span className="mt-0.5 block text-[12.5px]" style={{ color: "#5B6B85" }}>
                Tap to view them in {tabs[0].label}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ backgroundColor: "#FDECEA", color: LATE }}
            >
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </button>
        )}
      </main>

      {isInstructor && (
        <button
          type="button"
          onClick={onCreate}
          className={`fixed bottom-28 right-5 z-20 flex h-14 items-center gap-2 rounded-full pl-4 pr-5 text-[14px] font-bold shadow-lg transition active:scale-95 ${FOCUS}`}
          style={{ background: SIGNAL, color: INK }}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          New assignment
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                    */
/* -------------------------------------------------------------------------- */

/** "Today", "Tomorrow", "Yesterday", otherwise a short date like "Sep 29". */
function dayWord(date: Date, now: Date): string {
  const d = dayDiff(date, now);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Illustrated backdrop for the top card. The artwork sits on the right, so the
    picture is anchored right and any cropping happens on the empty left side. */
function HeroBackground() {
  return (
    <img
      src={heroBackground}
      alt=""
      width={1400}
      height={590}
      decoding="async"
      draggable={false}
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-right"
    />
  );
}

function Countdown({
  hero,
  now,
  isInstructor,
  onOpen,
}: {
  hero: Row | null;
  now: Date | null;
  isInstructor: boolean;
  onOpen?: ((a: Assignment) => void) | undefined;
}) {
  if (!now) {
    return <div className="h-[176px] animate-pulse rounded-[18px] bg-[#4241B8]/80" />;
  }

  if (!hero) {
    return (
      <div className="relative isolate flex min-h-[176px] flex-col justify-center overflow-hidden rounded-[18px] bg-[#4241B8] px-5 py-5 text-white shadow-[0_8px_22px_rgba(66,65,184,0.28)]">
        <HeroBackground />
        <p className="text-[13px] font-medium opacity-75">Next deadline</p>
        <p className="mt-2 max-w-[52%] text-[22px] font-extrabold leading-tight">Nothing due right now</p>
        <p className="mt-2 max-w-[52%] text-[13px] leading-snug opacity-85">
          {isInstructor ? "Create an assignment when you are ready." : "You are all caught up. New work will appear here."}
        </p>
      </div>
    );
  }

  const isToday = sameDay(hero.due, now);
  const badgeText = hero.overdue ? "OVERDUE" : isToday ? "DUE TODAY" : `DUE ${fmtShort(hero.due).toUpperCase()}`;

  // Badge colour follows urgency: red when late, yellow today, frosted white otherwise.
  const BadgeIcon = hero.overdue ? CircleAlert : isToday ? Clock : CalendarDays;
  const badgeStyle = hero.overdue
    ? "bg-[#FFE3E0] text-[#B4231B]"
    : isToday
      ? "bg-[#FFD23F] text-[#2A1F00]"
      : "bg-white/20 text-white backdrop-blur-sm";

  return (
    <article className="relative isolate h-[176px] overflow-hidden rounded-[18px] bg-[#4241B8] text-white shadow-[0_8px_22px_rgba(66,65,184,0.28)]">
      <HeroBackground />

      <div className="relative z-10 flex h-full flex-col px-4 pb-4 pt-4">
        {hero.overdue ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 py-1.5 pl-2.5 pr-3 text-[11px] font-bold leading-none tracking-wide text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF8A7A] opacity-70 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF6B5E]" />
            </span>
            <span className="uppercase">Overdue</span>
            <span className="h-3 w-px bg-white/30" aria-hidden="true" />
            <span className="font-medium normal-case tracking-normal text-white/80">
              {relative(hero.due, now).text}
            </span>
          </div>
        ) : (
          <div
            className={`inline-flex w-fit items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-[11px] font-extrabold leading-none tracking-wide ${badgeStyle}`}
          >
            <BadgeIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            {badgeText}
          </div>
        )}

        <h2 className="mt-3 max-w-[58%] truncate text-[18px] font-bold leading-tight tracking-[-0.01em]">
          {hero.title === "Problem set 3: Newton's laws of motion" ? "Math Assignment 2" : hero.title}
        </h2>
        <p className="mt-1 flex items-center gap-2 text-[12px] font-medium tracking-wide text-white/85">
          <span>101 BIO</span>
          <span className="h-1 w-1 rounded-full bg-white/60" aria-hidden="true" />
          <span>{fmtTime(hero.due).toUpperCase()}</span>
        </p>

        <button
          type="button"
          onClick={() => onOpen?.(hero)}
          className={`group mt-auto flex h-11 w-[54%] min-w-[11rem] items-center justify-between gap-2 whitespace-nowrap rounded-full bg-white pl-4 pr-1.5 text-[13px] font-bold text-[#3937A8] shadow-[0_6px_16px_rgba(20,19,90,0.35)] transition active:scale-[0.98] ${FOCUS}`}
        >
          View Assignment
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-full bg-[#4241B8] text-white transition-transform duration-200 group-hover:translate-x-0.5 group-active:translate-x-1"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          </span>
        </button>
      </div>
    </article>
  );
}

/* Transparent cut-outs of the four card templates (src/assets/card-*.png).
   ink   = text and icon colour on that card
   glass = translucent tile / pill behind icons and points
   arrow = colour of the arrow inside the notch                              */
const CARD_ART = [
  { src: cardPurple, ink: "#FFFFFF", glass: "rgba(255,255,255,0.22)", arrow: "#6A3FF5" },
  { src: cardRed, ink: "#FFFFFF", glass: "rgba(255,255,255,0.22)", arrow: "#F0453A" },
  // White text is hard to read on yellow, so this card uses a deep brown instead.
  { src: cardYellow, ink: "#3B2A00", glass: "rgba(255,255,255,0.40)", arrow: "#D69A12" },
  { src: cardGreen, ink: "#FFFFFF", glass: "rgba(255,255,255,0.22)", arrow: "#43A857" },
] as const;

function AssignmentCard({
  r,
  now,
  isInstructor,
  colorIndex,
  onOpen,
}: {
  r: Row;
  now: Date;
  isInstructor: boolean;
  colorIndex: number;
  onOpen: () => void;
}) {
  const art = CARD_ART[colorIndex % CARD_ART.length];
  const TypeIcon = TYPE_ICON[r.type];
  const rel = relative(r.due, now);
  const dueText = `${dayWord(r.due, now)}, ${fmtTime(r.due)}`;
  const showScore = !isInstructor && r.tab === "graded" && r.score !== undefined;

  // Top-right pill: points, or the score once graded.
  const pill = showScore ? `${r.score}/${r.points}` : `${r.points} pts`;

  // One quiet line under the title: a small icon and a single short phrase.
  let MetaIcon: LucideIcon = Clock;
  let meta: string;
  if (isInstructor) {
    MetaIcon = Users;
    const count = r.total ? ` · ${r.submitted ?? 0}/${r.total}` : "";
    const lead = r.tab === "todo" ? (r.overdue ? rel.text : dayWord(r.due, now)) : r.tab === "submitted" ? "To grade" : "Graded";
    meta = lead + count;
  } else if (r.tab === "todo") {
    if (r.overdue) {
      MetaIcon = CircleAlert;
      meta = rel.text;
    } else {
      if (r.status === "in_progress") MetaIcon = Pencil;
      meta = dueText;
    }
  } else {
    MetaIcon = CircleCheck;
    meta = r.tab === "submitted" ? "Awaiting grade" : "Graded";
  }

  const summary = [
    r.title,
    TYPE_LABEL[r.type],
    r.tab === "todo" ? `Due ${dueText}${r.overdue ? `, ${rel.text}` : ""}${r.status === "in_progress" ? ", in progress" : ""}` : meta,
    showScore ? `Score ${r.score} of ${r.points}` : `${r.points} points`,
  ].join(". ");

  return (
    <article className="w-full [container-type:inline-size]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={summary}
        title={r.title}
        className={`relative block aspect-[600/717] w-full rounded-[10%] text-left antialiased transition active:scale-[0.97] ${FOCUS}`}
        style={{ color: art.ink }}
      >
        {/* Card shape (from the template image) */}
        <img
          src={art.src}
          alt=""
          width={600}
          height={717}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
        />

        {/* Arrow badge sitting in the notch */}
        <span
          aria-hidden="true"
          className="absolute grid aspect-square place-items-center rounded-full bg-white"
          style={{ left: "86.3%", top: "47.6%", width: "14%", transform: "translateY(-50%)", color: art.arrow }}
        >
          <ArrowUpRight className="h-[52%] w-[52%]" strokeWidth={2.6} aria-hidden="true" />
        </span>

        {/* Type tile, top left */}
        <span
          aria-hidden="true"
          className="absolute grid aspect-square place-items-center"
          style={{ left: "6.4%", top: "5.4%", width: "27%", borderRadius: "30%", background: art.glass }}
        >
          <TypeIcon className="h-[50%] w-[50%]" strokeWidth={1.75} aria-hidden="true" />
        </span>

        {/* Points pill, top right, centred on the tile's row */}
        <span
          aria-hidden="true"
          className="absolute flex items-center justify-end"
          style={{ right: "6.4%", top: "5.4%", width: "40%", aspectRatio: "40 / 27" }}
        >
          <span
            className="rounded-full font-bold tabular-nums leading-none"
            style={{ background: art.glass, padding: "0.5em 0.85em", fontSize: "clamp(9.5px, 5.6cqw, 12px)" }}
          >
            {pill}
          </span>
        </span>

        {/* Title and one line of detail, anchored to the bottom */}
        <span className="absolute flex flex-col" style={{ left: "6.4%", right: "6%", bottom: "5.4%" }}>
          <span
            className="line-clamp-2 font-bold [text-wrap:balance]"
            style={{ fontSize: "clamp(10.5px, 7.2cqw, 17px)", lineHeight: 1.2, letterSpacing: "-0.01em" }}
          >
            {r.title}
          </span>
          <span
            aria-hidden="true"
            className="flex min-w-0 items-center gap-[0.4em] font-semibold"
            style={{ marginTop: "4.4%", fontSize: "clamp(10px, 6.1cqw, 13px)", lineHeight: 1.2 }}
          >
            <MetaIcon className="h-[1.15em] w-[1.15em] shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <span className="truncate">{meta}</span>
          </span>
        </span>
      </button>
    </article>
  );
}

function Empty({ tab, isInstructor, searching }: { tab: Tab; isInstructor: boolean; searching: boolean }) {
  const { title, body } = searching
    ? { title: "No match found", body: "Try a different word from the title." }
    : tab === "todo"
      ? isInstructor
        ? { title: "No open assignments", body: "Create one and it will show up here." }
        : { title: "You're all caught up", body: "New assignments from your instructor will appear here." }
      : tab === "submitted"
        ? isInstructor
          ? { title: "Nothing to grade", body: "Submissions will land here as students hand in work." }
          : { title: "Nothing submitted yet", body: "Work you hand in waits here until it is graded." }
        : { title: "No grades yet", body: "Scores appear here once work has been marked." };

  return (
    <div className="empty-in mt-10 flex flex-col items-center text-center">
      <style>{`
        @keyframes empty-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: no-preference) { .empty-in { animation: empty-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both; } }
      `}</style>

      <img
        src={noActivityImage}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-40 w-auto select-none object-contain"
      />

      <p className="mt-6 text-[19px] font-extrabold tracking-tight">{title}</p>
      <p className="mt-1.5 max-w-[17rem] text-[13.5px] leading-relaxed" style={{ color: "#5B6B85" }}>
        {body}
      </p>
    </div>
  );
}