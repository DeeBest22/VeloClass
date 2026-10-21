import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Paperclip,
  Pencil,
  Plus,
  Timer,
  X,
} from "lucide-react";
import type { WorkType } from "@/components/WorkFloatingActionButton";
import QuestionBuilder, { type Question } from "@/components/QuestionBuilder";
import { createWork } from "@/lib/teacher-work";
import { isClassId, useClassOverview } from "@/lib/classes";

export const Route = createFileRoute("/new-work")({
  validateSearch: (search: Record<string, unknown>): { type: WorkType; classId?: string } => ({
    type:
      search["type"] === "Classwork" || search["type"] === "Assessment"
        ? (search["type"] as WorkType)
        : "Assignment",
    ...(typeof search["classId"] === "string" ? { classId: search["classId"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "New Work | Teacher Hub" },
      {
        name: "description",
        content: "Create an assignment, classwork or assessment for your class.",
      },
    ],
  }),
  component: NewWork,
});

const MIN_POINTS = 1;
const MAX_POINTS = 1000;
const TITLE_MAX = 80;
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DURATIONS = [30, 45, 60, 90, 120, 180];

const formatDuration = (min: number) =>
  min < 60 ? `${min} min` : `${+(min / 60).toFixed(1)} hr`;

type TypeConfig = {
  dueLabel: string;
  dateHeading: string;
  timeHeading: string;
  dateHint: string;
  timeHint: string;
  placeholder: string;
  doneTitle: string;
  daysAhead: number;
  hour: string;
  minute: string;
  period: "AM" | "PM";
  points: string;
  presets: number[];
  pointLabel: string;
  unit: string;
  canUngrade: boolean;
  hasDuration: boolean;
  duration: number;
};

const TYPE_CONFIG: Record<WorkType, TypeConfig> = {
  Assignment: {
    dueLabel: "Due",
    dateHeading: "Due Date",
    timeHeading: "Due Time",
    dateHint: "Enter the due date",
    timeHint: "Enter the due time",
    placeholder: "Write the instructions for your students",
    doneTitle: "Assignment shared",
    daysAhead: 3,
    hour: "11",
    minute: "59",
    period: "PM",
    points: "20",
    presets: [10, 20, 50, 100],
    pointLabel: "Points",
    unit: "pts",
    canUngrade: true,
    hasDuration: false,
    duration: 60,
  },
  Classwork: {
    dueLabel: "Due",
    dateHeading: "Due Date",
    timeHeading: "Due Time",
    dateHint: "Enter the due date",
    timeHint: "Enter the due time",
    placeholder: "Describe the activity for your students",
    doneTitle: "Classwork shared",
    daysAhead: 0,
    hour: "11",
    minute: "59",
    period: "PM",
    points: "10",
    presets: [5, 10, 20, 50],
    pointLabel: "Points",
    unit: "pts",
    canUngrade: true,
    hasDuration: false,
    duration: 60,
  },
  Assessment: {
    dueLabel: "Starts",
    dateHeading: "Test Date",
    timeHeading: "Start Time",
    dateHint: "Enter the test date",
    timeHint: "Enter the start time",
    placeholder: "Add instructions, topics covered and any rules for the test",
    doneTitle: "Assessment shared",
    daysAhead: 7,
    hour: "09",
    minute: "00",
    period: "AM",
    points: "50",
    presets: [20, 30, 50, 100],
    pointLabel: "Marks",
    unit: "marks",
    canUngrade: false,
    hasDuration: true,
    duration: 60,
  },
};

/* ---------- Date helpers ---------- */

const pad = (n: number | string) => String(n).padStart(2, "0");
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const inputBase =
  "h-14 rounded-2xl border border-border bg-surface text-center text-[20px] font-semibold text-foreground outline-none transition-shadow placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-feature/40";

/* ---------- Calendar ---------- */

function CalendarGrid({
  month,
  selected,
  today,
  onMonthChange,
  onSelect,
}: {
  month: Date;
  selected: Date | null;
  today: Date;
  onMonthChange: (m: Date) => void;
  onSelect: (d: Date) => void;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const offset = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => new Date(y, m, 1 - offset + i));
  const todayStart = startOfDay(today);
  const canGoBack = month.getTime() > startOfMonth(today).getTime();

  const navBtn =
    "grid size-10 place-items-center rounded-xl border border-border text-muted-foreground transition-all duration-200 active:scale-90 disabled:opacity-30";

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => onMonthChange(new Date(y, m - 1, 1))}
          className={navBtn}
        >
          <ChevronLeft className="size-5" strokeWidth={2.2} />
        </button>
        <span className="text-[16px] font-semibold text-foreground">
          {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonthChange(new Date(y, m + 1, 1))}
          className={navBtn}
        >
          <ChevronRight className="size-5" strokeWidth={2.2} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-2 text-[14px] font-medium text-muted-foreground">
            {w}
          </span>
        ))}
        {cells.map((d) => {
          const outside = d.getMonth() !== m;
          const past = d.getTime() < todayStart.getTime();
          const isSelected = !!selected && sameDay(d, selected);
          const isToday = sameDay(d, today);
          return (
            <div key={d.getTime()} className="grid place-items-center py-0.5">
              <button
                type="button"
                disabled={past}
                aria-label={d.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                aria-pressed={isSelected}
                onClick={() => onSelect(d)}
                className={`grid size-11 place-items-center rounded-xl text-[17px] transition-all duration-200 active:scale-90 ${
                  isSelected
                    ? "bg-feature font-bold text-white"
                    : isToday
                      ? "bg-feature/15 font-semibold text-feature"
                      : "font-normal text-foreground"
                } ${past ? "cursor-not-allowed opacity-35" : outside && !isSelected ? "opacity-40" : ""}`}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Expandable row (Points) ---------- */

function Expandable({
  open,
  onToggle,
  icon,
  label,
  value,
  warn = false,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-4 text-left transition-opacity active:opacity-60"
      >
        <span className="grid size-5 shrink-0 place-items-center text-feature">{icon}</span>
        <span className="flex-1 text-[15px] font-bold text-foreground">{label}</span>
        <span
          className={`max-w-[11rem] truncate text-[14px] font-semibold transition-colors duration-300 ${
            warn ? "text-red-500" : open ? "text-feature" : "text-muted-foreground"
          }`}
        >
          {value}
        </span>
        <ChevronDown
          className={`size-[18px] shrink-0 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2.2}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out ${
          open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-5">{children}</div>
        </div>
      </div>
    </li>
  );
}

/* ---------- Page ---------- */

function NewWork() {
  const { type, classId } = Route.useSearch();
  const cfg = TYPE_CONFIG[type];
  const overviewQuery = useClassOverview(classId);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<"edit" | "sharing" | "done">("edit");
  const [shareError, setShareError] = useState<string | null>(null);
  const [failedFiles, setFailedFiles] = useState<string[]>([]);

  // Date
  const [today, setToday] = useState<Date | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [mode, setMode] = useState<"manual" | "calendar">("manual");
  const [viewMonth, setViewMonth] = useState<Date | null>(null);
  const [manualDay, setManualDay] = useState("");
  const [manualMonth, setManualMonth] = useState("");
  const [manualYear, setManualYear] = useState("");

  // Time
  const [hours, setHours] = useState(cfg.hour);
  const [minutes, setMinutes] = useState(cfg.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(cfg.period);

  // Points
  const [graded, setGraded] = useState(true);
  const [pointsText, setPointsText] = useState(cfg.points);
  const [duration, setDuration] = useState(cfg.duration);
  const [openRow, setOpenRow] = useState<"due" | "duration" | "points" | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [view, setView] = useState<"form" | "questions">("form");
  const pointsOpen = openRow === "points";

  const [, setTick] = useState(0);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Defaults depend on the type. They run on the client only, which avoids a hydration mismatch. */
  const applyDefaults = () => {
    const now = new Date();
    let d = addDays(now, cfg.daysAhead);
    const hour24 = (Number(cfg.hour) % 12) + (cfg.period === "PM" ? 12 : 0);
    const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour24, Number(cfg.minute));
    // If the default time has already passed today, move to tomorrow.
    if (candidate.getTime() <= now.getTime()) d = addDays(d, 1);
    setToday(now);
    setManualDay(pad(d.getDate()));
    setManualMonth(pad(d.getMonth() + 1));
    setManualYear(String(d.getFullYear()));
    setViewMonth(startOfMonth(d));
    setMode("manual");
    setHours(cfg.hour);
    setMinutes(cfg.minute);
    setPeriod(cfg.period);
    setGraded(true);
    setPointsText(cfg.points);
    setDuration(cfg.duration);
    setQuestions([]);
    setView("form");
  };

  useEffect(() => {
    applyDefaults();
  }, [type]);

  useEffect(() => {
    document.title = `New ${type} | Teacher Hub`;
  }, [type]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Grow the instructions field with its content.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
  }, [instructions, phase]);

  // Apply the typed date whenever all three fields form a real date that is not in the past.
  useEffect(() => {
    if (!today) return;
    const d = parseInt(manualDay, 10);
    const mo = parseInt(manualMonth, 10);
    const y = parseInt(manualYear, 10);
    if (!d || !mo || manualYear.length < 4) {
      setDate(null);
      return;
    }
    const parsed = new Date(y, mo - 1, d);
    if (parsed.getFullYear() !== y || parsed.getMonth() !== mo - 1 || parsed.getDate() !== d) {
      setDate(null);
      return;
    }
    setDate(parsed.getTime() < startOfDay(today).getTime() ? null : parsed);
  }, [manualDay, manualMonth, manualYear, today]);

  const pickDate = (d: Date) => {
    setManualDay(pad(d.getDate()));
    setManualMonth(pad(d.getMonth() + 1));
    setManualYear(String(d.getFullYear()));
    setViewMonth(startOfMonth(d));
  };

  const toggleMode = () => {
    if (mode === "manual" && date) setViewMonth(startOfMonth(date));
    setMode((m) => (m === "manual" ? "calendar" : "manual"));
  };

  /* ----- Time ----- */
  const h = parseInt(hours, 10);
  const mi = parseInt(minutes, 10);
  const timeValid = h >= 1 && h <= 12 && minutes !== "" && mi >= 0 && mi <= 59;

  const buildDue = () => {
    if (!date || !timeValid) return null;
    const hour24 = (h % 12) + (period === "PM" ? 12 : 0);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour24, mi, 0, 0);
  };

  const due = buildDue();
  const dueInFuture = !!due && due.getTime() > Date.now();
  const duePassed = !!due && !dueInFuture;

  const dueText = (() => {
    if (!due || !today) return "";
    const day = sameDay(due, today)
      ? "Today"
      : sameDay(due, addDays(today, 1))
        ? "Tomorrow"
        : due.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    return `${day}, ${pad(h)}:${pad(mi)} ${period}`;
  })();

  const dueLabel = duePassed ? "Time has passed" : dueText || "Set date and time";

  /* ----- Points ----- */
  const pointsValue = parseInt(pointsText, 10);
  const pointsValid = Number.isFinite(pointsValue) && pointsValue >= MIN_POINTS;
  const pointsLabel = !graded
    ? "Ungraded"
    : pointsValid
      ? `${pointsValue} ${cfg.unit}`
      : `Set ${cfg.pointLabel.toLowerCase()}`;

  const onPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 4);
    setPointsText(Number(digits) > MAX_POINTS ? String(MAX_POINTS) : digits);
  };

  // If the points row closes while the field is empty, fall back to the default.
  useEffect(() => {
    if (!pointsOpen && graded && !pointsValid) setPointsText(cfg.points);
  }, [pointsOpen, graded, pointsValid, cfg.points]);

  if (!classId || !isClassId(classId) || overviewQuery.isError || overviewQuery.data === null) {
    return <main className="mx-auto min-h-screen w-full max-w-md bg-background px-6 pt-12 text-center"><h1 className="text-lg font-bold text-foreground">Class not found</h1><p className="mt-2 text-sm text-muted-foreground">This class does not exist or you don't have access.</p><Link to="/courses" className="mt-5 inline-block rounded-full bg-feature px-5 py-2.5 text-sm font-bold text-white">Back to classes</Link></main>;
  }
  if (overviewQuery.isPending) return <main className="min-h-screen bg-background" />;
  if (overviewQuery.data.myRole !== "teacher" || overviewQuery.data.archived) {
    return <main className="mx-auto min-h-screen w-full max-w-md bg-background px-6 pt-12 text-center"><h1 className="text-lg font-bold text-foreground">Sharing is unavailable</h1><p className="mt-2 text-sm text-muted-foreground">Only teachers can share work in an active class.</p><Link to="/courses" className="mt-5 inline-block rounded-full bg-feature px-5 py-2.5 text-sm font-bold text-white">Back to classes</Link></main>;
  }

  /* ----- Files ----- */
  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) setFiles((cur) => [...cur, ...picked].slice(0, 5));
    e.target.value = "";
  };

  /* ----- Share ----- */
  const trimmedTitle = title.trim();
  const ready = trimmedTitle.length > 0 && dueInFuture && (!graded || pointsValid);

  const share = async () => {
    if (phase !== "edit") return;
    const latest = buildDue();
    if (!trimmedTitle || !latest || (graded && !pointsValid)) return;
    // Re-check against the real clock, in case the page has been open for a while.
    if (latest.getTime() <= Date.now()) {
      setTick((t) => t + 1);
      return;
    }
    if (!classId || !isClassId(classId)) { setShareError("This class could not be found."); return; }
    setShareError(null); setFailedFiles([]); setOpenRow(null);
    setPhase("sharing");
    const started = Date.now();
    try {
      const result = await createWork({ classId, type, title: trimmedTitle, instructions, dueAt: latest, points: graded ? pointsValue : null, durationMinutes: type === "Assessment" ? duration : null, questions, files });
      setFailedFiles(result.failedFiles);
      const remaining = Math.max(0, 700 - (Date.now() - started));
      timerRef.current = setTimeout(() => setPhase("done"), remaining);
    } catch (error) { setShareError(error instanceof Error ? error.message : "We couldn't share this work. Please try again."); setPhase("edit"); }
  };

  const reset = () => {
    setTitle("");
    setInstructions("");
    setFiles([]);
    setOpenRow(null);
    applyDefaults();
    setPhase("edit");
  };

  const styles = (
    <style>{`
      @keyframes nw-pop { 0% { transform: scale(.5); opacity: 0 } 70% { transform: scale(1.06); opacity: 1 } 100% { transform: scale(1) } }
      @keyframes nw-rise { 0% { transform: translateY(14px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
      @keyframes nw-swap { 0% { transform: translateY(8px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
      @media (prefers-reduced-motion: reduce) {
        .nw-anim { animation: none !important; opacity: 1 !important; transform: none !important }
      }
    `}</style>
  );

  /* ---------- Done ---------- */
  if (phase === "done") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-6">
        {styles}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span
            className="nw-anim grid size-20 place-items-center rounded-full bg-feature text-white"
            style={{ animation: "nw-pop 0.5s cubic-bezier(.2,.9,.3,1.2) both" }}
          >
            <Check className="size-9" strokeWidth={3} />
          </span>
          <div className="nw-anim" style={{ animation: "nw-rise 0.5s ease-out 0.25s both" }}>
            <h1 className="mt-7 text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
              {cfg.doneTitle}
            </h1>
            <p className="mx-auto mt-2 max-w-[18rem] truncate text-[14px] font-medium text-muted-foreground">
              {trimmedTitle}
            </p>
            <p className="mt-1 text-[13px] font-medium text-muted-foreground">
              {cfg.dueLabel} {dueText}
              {cfg.hasDuration ? ` · ${formatDuration(duration)}` : ""}
              {questions.length > 0
                ? ` · ${questions.length} ${questions.length === 1 ? "question" : "questions"}`
                : ""}{" "}
               {failedFiles.length ? ` · ${failedFiles.join(", ")} could not upload` : ""}
            </p>
          </div>
        </div>
        <div
          className="nw-anim flex flex-col gap-2 pb-8"
          style={{ animation: "nw-rise 0.5s ease-out 0.4s both" }}
        >
          <Link
            to="/teacher"
            search={{ classId }}
            className="grid h-14 w-full place-items-center rounded-full bg-feature text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            Back to Teacher Hub
          </Link>
          <button
            type="button"
            onClick={reset}
            className="h-12 w-full rounded-full text-[14px] font-bold text-muted-foreground transition-opacity active:opacity-60"
          >
            Create another
          </button>
        </div>
      </main>
    );
  }

  /* ---------- Question builder ---------- */
  if (view === "questions") {
    return (
      <QuestionBuilder
        initial={questions}
        files={files}
        onClose={(qs) => {
          setQuestions(qs);
          setView("form");
        }}
      />
    );
  }

  /* ---------- Editor ---------- */
  const busy = phase === "sharing";
  const selectedLine = date
    ? date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const manualTouched = manualDay !== "" || manualMonth !== "" || manualYear !== "";

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-20">
      {styles}

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-7">
        <Link
          to="/teacher"
          search={{ classId }}
          aria-label="Go back"
          className="-ml-1 grid size-9 place-items-center rounded-full text-foreground transition-colors active:bg-muted"
        >
          <ArrowLeft className="size-[22px]" strokeWidth={2.2} />
        </Link>
        <button
          type="button"
          onClick={share}
          disabled={!ready || busy}
          className={`h-10 rounded-full px-5 text-[14px] font-bold transition-all duration-300 active:scale-95 ${
            ready ? "bg-feature text-white" : "bg-surface text-muted-foreground"
          }`}
        >
          {busy ? "Sharing" : "Share"}
        </button>
      </div>

      {/* Header */}
        <header className="px-6 pt-6">
        <p className="text-[13px] font-medium text-muted-foreground">
          New {type.toLowerCase()} · MCE 201
        </p>
        <label htmlFor="nw-title" className="sr-only">
          Assignment title
        </label>
        <input
          id="nw-title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
          placeholder="Title"
          autoComplete="off"
          enterKeyHint="next"
          className="mt-2 w-full bg-transparent text-[32px] font-extrabold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
        />
        </header>
        {shareError && <p className="px-6 pt-2 text-[12px] font-medium text-red-500">{shareError}</p>}

      {/* Instructions */}
      <div className="mt-3 px-6">
        <label htmlFor="nw-instructions" className="sr-only">
          Instructions
        </label>
        <textarea
          id="nw-instructions"
          ref={textRef}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={cfg.placeholder}
          className="block min-h-[96px] w-full resize-none bg-transparent text-[16px] font-medium leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Attached files */}
      {files.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-2 px-6">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex max-w-full items-center gap-1.5 rounded-full bg-surface py-1.5 pl-3.5 pr-1.5 text-[12px] font-bold text-foreground"
            >
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((cur) => cur.filter((_, idx) => idx !== i))}
                className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-muted"
              >
                <X className="size-3.5" strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Due, points and attachments */}
      <input ref={fileRef} type="file" multiple onChange={onPickFiles} className="hidden" />
      <ul className="mx-6 mt-8 divide-y divide-border border-y border-border">
        <Expandable
          open={openRow === "due"}
          onToggle={() => setOpenRow((r) => (r === "due" ? null : "due"))}
          icon={<CalendarDays className="size-5" strokeWidth={2.2} />}
          label={cfg.dueLabel}
          value={dueLabel}
          warn={duePassed}
        >
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-bold tracking-tight text-foreground">{cfg.dateHeading}</h2>
          <button
            type="button"
            onClick={toggleMode}
            className={`flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-all duration-300 active:scale-95 ${
              mode === "calendar" ? "bg-feature text-white" : "bg-surface text-foreground"
            }`}
          >
            {mode === "calendar" ? (
              <Pencil className="size-3.5" strokeWidth={2.2} />
            ) : (
              <CalendarDays className="size-3.5" strokeWidth={2.2} />
            )}
            {mode === "calendar" ? "Enter manually" : "Pick from calendar"}
          </button>
        </div>

        <div
          key={mode}
          className="nw-anim mt-5"
          style={{ animation: "nw-swap 0.2s ease-out both" }}
        >
          {mode === "manual" ? (
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                {cfg.dateHint}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <label className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Day
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={manualDay}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                      if (v === "" || (Number(v) >= 1 && Number(v) <= 31)) setManualDay(v);
                    }}
                    onBlur={() => manualDay.length === 1 && setManualDay(pad(manualDay))}
                    placeholder="DD"
                    className={`${inputBase} w-16`}
                  />
                </label>
                <span className="mt-6 select-none text-[20px] font-bold leading-none text-muted-foreground/40">
                  ·
                </span>
                <label className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Month
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={manualMonth}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                      if (v === "" || (Number(v) >= 1 && Number(v) <= 12)) setManualMonth(v);
                    }}
                    onBlur={() => manualMonth.length === 1 && setManualMonth(pad(manualMonth))}
                    placeholder="MM"
                    className={`${inputBase} w-16`}
                  />
                </label>
                <span className="mt-6 select-none text-[20px] font-bold leading-none text-muted-foreground/40">
                  ·
                </span>
                <label className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Year
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={manualYear}
                    onChange={(e) => setManualYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="YYYY"
                    className={`${inputBase} w-24`}
                  />
                </label>
              </div>
              <p className="mt-4 text-center text-[12px] text-muted-foreground">
                {selectedLine ? (
                  <>
                    Selected: <span className="font-medium text-foreground">{selectedLine}</span>
                  </>
                ) : manualTouched ? (
                  "Enter a valid date from today onwards"
                ) : (
                  " "
                )}
              </p>
            </div>
          ) : viewMonth && today ? (
            <CalendarGrid
              month={viewMonth}
              selected={date}
              today={today}
              onMonthChange={setViewMonth}
              onSelect={pickDate}
            />
          ) : (
            <div className="h-72 animate-pulse rounded-2xl bg-surface" />
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2.5">
          <Clock className="size-5 text-muted-foreground" strokeWidth={2.2} />
          <h2 className="text-[18px] font-bold tracking-tight text-foreground">{cfg.timeHeading}</h2>
        </div>
        <p className="mt-5 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {cfg.timeHint}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Hour"
            maxLength={2}
            value={hours}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (v === "" || Number(v) <= 12) setHours(v);
            }}
            onBlur={() => setHours(hours === "" || Number(hours) === 0 ? "12" : pad(hours))}
            placeholder="HH"
            className={`${inputBase} w-16`}
          />
          <span className="text-[22px] font-bold text-muted-foreground">:</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Minutes"
            maxLength={2}
            value={minutes}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (v === "" || Number(v) <= 59) setMinutes(v);
            }}
            onBlur={() => setMinutes(minutes === "" ? "00" : pad(minutes))}
            placeholder="MM"
            className={`${inputBase} w-16`}
          />
          <div
            role="group"
            aria-label="AM or PM"
            className="flex h-14 overflow-hidden rounded-2xl border border-border"
          >
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={`px-4 text-[15px] font-semibold transition-colors duration-300 ${
                  period === p ? "bg-feature text-white" : "bg-surface text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 min-h-[18px] text-[12px] font-medium text-red-500">
          {date && timeValid && !dueInFuture ? "That time has already passed. Pick a later time." : ""}
        </p>
      </div>
        </Expandable>

        {cfg.hasDuration && (
          <Expandable
            open={openRow === "duration"}
            onToggle={() => setOpenRow((r) => (r === "duration" ? null : "duration"))}
            icon={<Timer className="size-5" strokeWidth={2.2} />}
            label="Duration"
            value={formatDuration(duration)}
          >
            <ul className="grid grid-cols-3 gap-2">
              {DURATIONS.map((m) => (
                <li key={m}>
                  <button
                    type="button"
                    aria-pressed={duration === m}
                    onClick={() => setDuration(m)}
                    className={`h-11 w-full rounded-full text-[13px] font-bold transition-all duration-300 active:scale-95 ${
                      duration === m ? "bg-feature/10 text-feature" : "bg-surface text-muted-foreground"
                    }`}
                  >
                    {formatDuration(m)}
                  </button>
                </li>
              ))}
            </ul>
          </Expandable>
        )}

        <Expandable
          open={pointsOpen}
          onToggle={() => setOpenRow((r) => (r === "points" ? null : "points"))}
          icon={<Award className="size-5" strokeWidth={2.2} />}
          label={cfg.pointLabel}
          value={pointsLabel}
        >
          {cfg.canUngrade && (
          <div
            role="group"
            aria-label="Grading"
            className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1"
          >
            {[
              { label: "Graded", value: true },
              { label: "Ungraded", value: false },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={graded === o.value}
                onClick={() => setGraded(o.value)}
                className={`h-10 rounded-full text-[13px] font-bold transition-all duration-300 ${
                  graded === o.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          )}

          {graded ? (
            <div className={`${cfg.canUngrade ? "mt-4" : ""} flex items-center justify-between gap-3`}>
              <div className="flex items-baseline gap-1.5 pl-1">
                <input
                  aria-label="Points"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pointsText}
                  onChange={onPointsChange}
                  onKeyDown={(e) => e.key === "Enter" && setOpenRow(null)}
                  placeholder="0"
                  style={{ width: `${Math.max(pointsText.length, 1) + 0.6}ch` }}
                  className="bg-transparent text-[36px] font-extrabold leading-none tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30"
                />
                <span className="text-[14px] font-bold text-muted-foreground">{cfg.unit}</span>
              </div>
              <ul className="flex gap-1.5">
                {cfg.presets.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      aria-pressed={pointsText === String(p)}
                      onClick={() => setPointsText(String(p))}
                      className={`h-9 rounded-full px-3.5 text-[12px] font-bold transition-all duration-300 active:scale-95 ${
                        pointsText === String(p)
                          ? "bg-feature/10 text-feature"
                          : "bg-surface text-muted-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 pl-1 text-[13px] font-medium text-muted-foreground">
              No score will be recorded for this assignment.
            </p>
          )}
        </Expandable>

        <li>
          <button
            type="button"
            onClick={() => setView("questions")}
            className="flex w-full items-center gap-3 py-4 text-left transition-opacity active:opacity-60"
          >
            <span className="grid size-5 shrink-0 place-items-center text-feature">
              <ListChecks className="size-5" strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-[15px] font-bold text-foreground">Multiple choice</span>
            <span
              className={`text-[14px] font-semibold ${
                questions.length > 0 ? "text-feature" : "text-muted-foreground"
              }`}
            >
              {questions.length === 0
                ? "Add"
                : `${questions.length} ${questions.length === 1 ? "question" : "questions"}`}
            </span>
            <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={2.2} />
          </button>
        </li>

        <li>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 py-4 text-left transition-opacity active:opacity-60"
          >
            <span className="grid size-5 shrink-0 place-items-center text-feature">
              <Paperclip className="size-5" strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-[15px] font-bold text-foreground">Attachments</span>
            <span className="text-[14px] font-semibold text-muted-foreground">
              {files.length === 0 ? "Add" : files.length === 1 ? "1 file" : `${files.length} files`}
            </span>
            <Plus className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={2.2} />
          </button>
        </li>
      </ul>
    </main>
  );
}
