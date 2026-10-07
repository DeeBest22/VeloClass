import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, X, Clock, FileText, Lock, CheckCircle2, ChevronRight } from "lucide-react";

import featuredImg from "@/assets/featured-assessment.jpg";
import thermofluidsBg from "@/assets/thermofluids-bg.png";
import thumbQuiz from "@/assets/thumb-quiz.jpg";
import thumbCbt from "@/assets/thumb-cbt.jpg";
import thumbAssignment from "@/assets/thumb-assignment.jpg";

export const Route = createFileRoute("/assessments")({
  head: () => ({
    meta: [
      { title: "MCE 201 Assessments — Virtual Classroom" },
      {
        name: "description",
        content:
          "Browse quizzes, tests and assignments available for MCE 201 Applied Mechanics in your Virtual Classroom.",
      },
      { property: "og:title", content: "MCE 201 Assessments — Virtual Classroom" },
      {
        property: "og:description",
        content: "All quizzes, tests and assignments available for MCE 201, in one place.",
      },
    ],
  }),
  component: Assessments,
});

const filters = ["All", "Quizzes", "Tests", "Assignments", "Mid-Semester", "Past Papers"] as const;

type Status = "open" | "closed" | "done";

type Assessment = {
  id: string;
  title: string;
  meta: string;
  due: string;
  image: string;
  category: (typeof filters)[number];
  status: Status;
};

const assessments: Assessment[] = [
  {
    id: "1",
    title: "Vectors & Equilibrium Quiz",
    meta: "20 questions · 25 min",
    due: "Due Oct 2",
    image: thumbQuiz,
    category: "Quizzes",
    status: "open",
  },
  {
    id: "2",
    title: "Kinematics CBT Test",
    meta: "40 questions · 1 hr",
    due: "Due Oct 6",
    image: thumbCbt,
    category: "Tests",
    status: "open",
  },
  {
    id: "3",
    title: "Friction & Belt Drives Assignment",
    meta: "5 questions · Upload PDF",
    due: "Due Oct 9",
    image: thumbAssignment,
    category: "Assignments",
    status: "open",
  },
  {
    id: "4",
    title: "Mid-Semester Assessment",
    meta: "50 questions · 1 hr 30 min",
    due: "Opens Oct 14",
    image: thumbCbt,
    category: "Mid-Semester",
    status: "closed",
  },
  {
    id: "5",
    title: "Moments & Couples Quiz",
    meta: "15 questions · 20 min",
    due: "Scored 18/20",
    image: thumbQuiz,
    category: "Quizzes",
    status: "done",
  },
  {
    id: "6",
    title: "2023/24 Past Paper Practice",
    meta: "35 questions · Untimed",
    due: "Always open",
    image: thumbAssignment,
    category: "Past Papers",
    status: "open",
  },
];

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") return <CheckCircle2 className="size-3.5 shrink-0" strokeWidth={2.2} />;
  if (status === "closed") return <Lock className="size-3.5 shrink-0" strokeWidth={2.2} />;
  return <Clock className="size-3.5 shrink-0" strokeWidth={2.2} />;
}

function Assessments() {
  const [active, setActive] = useState<(typeof filters)[number]>("All");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assessments.filter(
      (a) =>
        (active === "All" || a.category === active) &&
        (q === "" || a.title.toLowerCase().includes(q) || a.meta.toLowerCase().includes(q)),
    );
  }, [active, query]);

  return (
    <main className="theme-assessments mx-auto min-h-screen w-full max-w-md bg-background pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-7">
        <button
          type="button"
          aria-label="Go back"
          className="-ml-1 grid size-9 place-items-center rounded-full text-foreground transition-colors active:bg-muted"
        >
          <ArrowLeft className="size-[22px]" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label={searching ? "Close search" : "Search assessments"}
          onClick={() => {
            setSearching((s) => !s);
            setQuery("");
          }}
          className="-mr-1 grid size-9 place-items-center rounded-full text-foreground transition-colors active:bg-muted"
        >
          {searching ? (
            <X className="size-[21px]" strokeWidth={2.2} />
          ) : (
            <Search className="size-[21px]" strokeWidth={2.2} />
          )}
        </button>
      </div>

      {/* Title */}
      <header className="px-6 pt-3">
        <h1 className="text-[32px] font-extrabold leading-none tracking-tight text-foreground">
          Assessments
        </h1>
        <p className="mt-2 text-[13px] font-medium text-muted-foreground">
          MCE 201 · Applied Mechanics
        </p>
      </header>

      {searching && (
        <div className="px-6 pt-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tests, quizzes…"
            className="w-full rounded-full bg-surface px-5 py-3 text-[14px] font-medium text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-feature/30"
          />
        </div>
      )}

      {/* Filter chips */}
      <div className="no-scrollbar mt-5 flex gap-2.5 overflow-x-auto px-6 pb-1">
        {filters.map((f) => {
          const selected = f === active;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setActive(f)}
              aria-pressed={selected}
              className={`shrink-0 rounded-full border px-5 py-2 text-[13px] font-semibold transition-colors ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Featured card with peeking next card */}
      <div className="no-scrollbar mt-6 flex gap-4 overflow-x-auto px-6 pb-2">
        <article className="relative aspect-[4/5] w-[78%] shrink-0 overflow-hidden rounded-[28px] bg-feature shadow-feature">
          <img
            src={featuredImg}
            alt="Exam sheet with pencil and ruler"
            width={1024}
            height={1024}
            className="pointer-events-none absolute inset-0 size-full translate-x-[-4%] translate-y-[-8%] scale-[1.1] object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-feature/90 to-transparent" />

          <div className="relative flex h-full flex-col justify-between p-6">
            <div>
              <h2 className="text-[21px] font-extrabold leading-tight text-feature-foreground">
                Applied Mechanics
                <br />
                Main Test
              </h2>
              <p className="mt-1.5 text-[13px] font-semibold text-feature-foreground/80">
                30 marks · 45 min
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-feature-foreground">
                Closes today, 11:59 PM
              </span>
              <button
                type="button"
                className="rounded-full bg-background px-4 py-2 text-[12px] font-bold text-foreground transition-transform active:scale-95"
              >
                Start
              </button>
            </div>
          </div>
        </article>

        <article className="relative aspect-[4/5] w-[78%] shrink-0 overflow-hidden rounded-[28px] bg-feature-alt">
          <img
            src={thermofluidsBg}
            alt=""
            width={1254}
            height={1254}
            className="pointer-events-none absolute inset-0 size-full object-cover object-right-bottom"
          />
          <div className="relative p-6">
            <h2 className="text-[21px] font-extrabold leading-tight text-primary">
              Thermofluids
              <br />
              Practice Set
            </h2>
            <p className="mt-1.5 text-[13px] font-semibold text-primary/70">25 marks · 30 min</p>
          </div>
        </article>
      </div>

      {/* List */}
      <div className="mx-6 mt-7 grid grid-cols-3 rounded-2xl bg-surface py-4 text-center">
        {[
          { v: assessments.filter((a) => a.status === "open").length, l: "Open" },
          { v: assessments.filter((a) => a.status === "done").length, l: "Completed" },
          { v: "90%", l: "Avg. score" },
        ].map((s, i) => (
          <div key={s.l} className={i > 0 ? "border-l border-border" : ""}>
            <p className="text-[18px] font-extrabold text-foreground">{s.v}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <p className="px-6 pt-7 text-[11px] font-bold tracking-[0.18em] text-muted-foreground">
        {list.length} AVAILABLE
      </p>

      <ul className="mt-2 divide-y divide-border px-6">
        {list.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              className="flex w-full items-center gap-4 py-4 text-left transition-opacity active:opacity-60"
            >
              <span className="grid size-[68px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface">
                <img
                  src={a.image}
                  alt=""
                  loading="lazy"
                  width={816}
                  height={816}
                  className="size-full object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-foreground">
                  {a.title}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                  <FileText className="size-3.5 shrink-0" strokeWidth={2.2} />
                  <span className="truncate">{a.meta}</span>
                </span>
                <span
                  className={`mt-1.5 flex items-center gap-1.5 text-[12px] font-bold ${
                    a.status === "done"
                      ? "text-muted-foreground"
                      : a.status === "closed"
                        ? "text-muted-foreground"
                        : "text-feature"
                  }`}
                >
                  <StatusIcon status={a.status} />
                  {a.due}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" strokeWidth={2.2} />
            </button>
          </li>
        ))}
      </ul>

      {list.length === 0 && (
        <p className="px-6 pt-10 text-center text-[13px] font-medium text-muted-foreground">
          No assessments match this filter yet.
        </p>
      )}
    </main>
  );
} 