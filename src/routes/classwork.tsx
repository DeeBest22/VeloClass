import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  X,
  FileText,

  ClipboardList,
  MessageCircleQuestion,
  ChevronRight,
  ChevronDown,
  Paperclip,
  BookOpen,
  Play,
} from "lucide-react";

import featuredImg from "@/assets/featured-classworks.png";

export const Route = createFileRoute("/classwork")({
  head: () => ({
    meta: [
      { title: "MCE 201 Classwork — Virtual Classroom" },
      {
        name: "description",
        content: "Lecture notes, videos, assignments and questions for MCE 201 Applied Mechanics, organised by week.",
      },
      { property: "og:title", content: "MCE 201 Classwork — Virtual Classroom" },
      { property: "og:description", content: "Everything your lecturer posted for MCE 201, week by week." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Classwork,
});

const filters = ["All", "Materials", "Videos", "Assignments", "Questions"] as const;
type Kind = Exclude<(typeof filters)[number], "All">;

type Item = { id: string; title: string; meta: string; kind: Kind; posted: string; isNew?: boolean };
type Week = { week: string; topic: string; items: Item[] };

const weeks: Week[] = [
  {
    week: "Week 3",
    topic: "Friction & Belt Drives",
    items: [
      { id: "a", title: "Lecture 5 - Dry Friction", meta: "PDF · 2.4 MB", kind: "Materials", posted: "Today", isNew: true },
      { id: "b", title: "Belt Drive Worked Examples", meta: "Video · 18 min", kind: "Videos", posted: "Today", isNew: true },
      { id: "c", title: "Why does a wedge self-lock?", meta: "Question · 12 replies", kind: "Questions", posted: "Yesterday" },
      { id: "d", title: "Tutorial Sheet 3", meta: "Assignment · Due Oct 9", kind: "Assignments", posted: "Yesterday" },
    ],
  },
 
 
];

const kindStyle: Record<Kind, { icon: typeof FileText; tint: string }> = {
  Materials: { icon: ClipboardList, tint: "bg-surface text-foreground" },
  Videos: { icon: ClipboardList, tint: "bg-feature/10 text-feature" },
  Assignments: { icon: ClipboardList, tint: "bg-feature-alt/25 text-foreground" },
  Questions: { icon: ClipboardList, tint: "bg-surface text-muted-foreground" },
};

// Last opened lecture, used by the Continue learning card
const resume = { title: "Lecture 5 - Dry Friction", weekLabel: "Week 3", page: 12, totalPages: 20 };
const resumePercent = Math.round((resume.page / resume.totalPages) * 100);

function Classwork() {
  const [active, setActive] = useState<(typeof filters)[number]>("All");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return weeks
      .map((w) => ({
        ...w,
        items: w.items.filter(
          (i) => (active === "All" || i.kind === active) && (q === "" || i.title.toLowerCase().includes(q)),
        ),
      }))
      .filter((w) => w.items.length > 0);
  }, [active, query]);

  const newCount = weeks.flatMap((w) => w.items).filter((i) => i.isNew).length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-10">
      <div className="flex items-center justify-between px-6 pt-7">
        <Link
          to="/"
          aria-label="Go back"
          className="-ml-1 grid size-9 place-items-center rounded-full text-foreground transition-colors active:bg-muted"
        >
          <ArrowLeft className="size-[22px]" strokeWidth={2.2} />
        </Link>
        <button
          type="button"
          aria-label={searching ? "Close search" : "Search classwork"}
          onClick={() => {
            setSearching((s) => !s);
            setQuery("");
          }}
          className="-mr-1 grid size-9 place-items-center rounded-full text-foreground transition-colors active:bg-muted"
        >
          {searching ? <X className="size-[21px]" strokeWidth={2.2} /> : <Search className="size-[21px]" strokeWidth={2.2} />}
        </button>
      </div>

      <header className="px-6 pt-3">
        <h1 className="text-[32px] font-extrabold leading-none tracking-tight text-foreground">Classwork</h1>
        <p className="mt-2 text-[13px] font-medium text-muted-foreground">MCE 201 · Applied Mechanics</p>
      </header>

      {searching && (
        <div className="px-6 pt-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, videos…"
            className="w-full rounded-full bg-surface px-5 py-3 text-[14px] font-medium text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-feature/30"
          />
        </div>
      )}

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
                selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Continue card */}
      <article className="relative isolate mx-6 mt-6 flex h-[360px] flex-col justify-between overflow-hidden rounded-[28px] bg-[#3f7f47] p-6 shadow-[0_18px_40px_-16px_rgba(45,100,55,0.55)]">
        {/* Background illustration */}
        <img
          src={featuredImg}
          alt=""
          width={1254}
          height={1254}
          className="pointer-events-none absolute inset-0 -z-20 size-full object-cover"
          style={{ objectPosition: "100% 100%" }}
        />
        {/* Gentle top-left scrim so text stays crisp without hiding the artwork */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#265c30]/70 via-[#265c30]/15 to-transparent"
        />

        {/* Top: label, title, progress */}
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 py-1.5 pl-2.5 pr-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white ring-1 ring-white/25 backdrop-blur-sm">
            <BookOpen className="size-3.5" strokeWidth={2.4} />
            Continue learning
          </span>

          <h2 className="mt-4 text-[24px] font-extrabold leading-[1.1] tracking-tight text-white">
            {resume.title}
          </h2>
          <p className="mt-1.5 text-[13px] font-medium text-white/80">
            MCE 201 · {resume.weekLabel}
          </p>

          <div className="mt-5 w-[46%]">
            <div className="mb-1.5 flex items-baseline justify-between text-[11px] font-semibold text-white/90">
              <span>
                Page {resume.page} of {resume.totalPages}
              </span>
              <span className="font-extrabold text-white">{resumePercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={resumePercent}
              className="h-1.5 w-full overflow-hidden rounded-full bg-white/25"
            >
              <div className="h-full rounded-full bg-white" style={{ width: `${resumePercent}%` }} />
            </div>
          </div>
        </div>

        {/* Bottom: primary action */}
        <button
          type="button"
          aria-label={`Resume ${resume.title}`}
          className="relative flex w-fit items-center gap-2.5 rounded-full bg-white py-2 pl-4 pr-2 text-[13px] font-extrabold text-[#245a30] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
        >
          Resume
          <span className="grid size-7 place-items-center rounded-full bg-[#3f7f47] text-white">
            <Play className="size-3 translate-x-[1px]" strokeWidth={0} fill="currentColor" />
          </span>
        </button>
      </article>

   

      {grouped.map((w) => {
        const isCollapsed = collapsed[w.week];
        return (
          <section key={w.week} className="mt-7">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [w.week]: !c[w.week] }))}
              aria-expanded={!isCollapsed}
              className="flex w-full items-end justify-between px-6 text-left"
            >
              <span>
                <span className="block text-[11px] font-bold tracking-[0.18em] text-muted-foreground">
                  {w.week.toUpperCase()}
                </span>
                <span className="mt-1 block text-[17px] font-extrabold text-foreground">{w.topic}</span>
              </span>
              <ChevronDown
                className={`mb-0.5 size-5 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                strokeWidth={2.2}
              />
            </button>

            {!isCollapsed && (
              <ul className="mt-2 divide-y divide-border px-6">
                {w.items.map((it) => {
                  const { icon: Icon, tint } = kindStyle[it.kind];
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 py-4 text-left transition-opacity active:opacity-60"
                      >
                        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tint}`}>
                          <Icon className="size-[22px]" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[15px] font-bold text-foreground">{it.title}</span>
                            {it.isNew && <span className="size-2 shrink-0 rounded-full bg-feature" aria-label="New" />}
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                            <Paperclip className="size-3.5 shrink-0" strokeWidth={2.2} />
                            <span className="truncate">{it.meta}</span>
                            <span aria-hidden>·</span>
                            <span className="shrink-0">{it.posted}</span>
                          </span>
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground" strokeWidth={2.2} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      {grouped.length === 0 && (
        <p className="px-6 pt-10 text-center text-[13px] font-medium text-muted-foreground">
          Nothing here yet. Try another filter.
        </p>
      )}
    </main>
  );
}