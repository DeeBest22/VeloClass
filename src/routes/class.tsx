import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  MoreHorizontal,
  CalendarDays,
  Users,
  MessageSquare,
  FolderOpen,
  Sparkles,
  NotebookPen,
  FileCheck2,
  ChevronRight,
  Paperclip,
  FlaskConical,
  Check,
} from "lucide-react";

import banner from "@/assets/chemistry-banner.jpg";
import ClassSections from "@/components/class-sections";

export const Route = createFileRoute("/class")({
  head: () => ({
    meta: [
      { title: "Chemistry Class Hub | Virtual Classroom" },
      {
        name: "description",
        content:
          "Class home for Chemistry with Mr. Pandu Baskara: live session, what's new feed, chat, files, activities, assignments and tests.",
      },
      { property: "og:title", content: "Chemistry Class Hub | Virtual Classroom" },
      {
        property: "og:description",
        content:
          "Join the live session, catch up on new assignments and files, and open chat for your Chemistry class.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassHome,
});

const feed = [
  {
    icon: NotebookPen,
    tint: "bg-course-yellow/25",
    tag: "Assignment",
    title: "Ch. 5 — Ionic bonding worksheet",
    meta: "Due Fri, 12 Sep · posted by Mr. Pandu",
    time: "2h ago",
    isNew: true,
  },
  {
    icon: FileCheck2,
    tint: "bg-course-red/15",
    tag: "Test",
    title: "Chemistry Quiz scheduled",
    meta: "3 sessions planned · 9 Dec 2025",
    time: "5h ago",
    isNew: true,
  },
  {
    icon: MessageSquare,
    tint: "bg-course-blue/15",
    tag: "Chat",
    title: "Aisha: “Is the lab report group work?”",
    meta: "12 new messages in Class discussion",
    time: "Yesterday",
    isNew: true,
  },
  {
    icon: Paperclip,
    tint: "bg-course-blue/10",
    tag: "File",
    title: "Periodic-table-reference.pdf",
    meta: "Added to Files & Documents · 1.2 MB",
    time: "2 days ago",
    isNew: false,
  },
];

const classwork = [
  { day: "9", month: "Sep", title: "Periodic trends reading response", meta: "Reading · 10 pts", status: "done" as const },
  { day: "12", month: "Sep", title: "Ionic bonding worksheet", meta: "Worksheet · 20 pts", status: "due" as const, due: "Due Fri" },
  { day: "15", month: "Sep", title: "Titration lab report", meta: "Lab report · 50 pts", status: "upcoming" as const, due: "Next week" },
  { day: "9", month: "Dec", title: "Unit 3 quiz", meta: "Quiz · 30 pts", status: "upcoming" as const, due: "9 Dec" },
];

function ClassHome() {
  const router = useRouter();
  const doneCount = classwork.filter((i) => i.status === "done").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md pb-12">
        {/* Top bar + class card */}
        <div className="relative">
          <header className="absolute inset-x-0 top-0 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 pt-5">
            <button
              aria-label="Back to classes"
              onClick={() => router.history.back()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-[var(--shadow-card)] transition-transform active:scale-95"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
          </header>

          {/* Class card — banner + meta */}
          <section className="card-soft overflow-hidden rounded-t-none" style={{ boxShadow: "none" }}>
            <img
              src={banner}
              alt="Illustrated chemistry lab bench with flasks and test tubes"
              width={1088}
              height={608}
              className="h-40 w-full object-cover"
            />
            <div className="px-4 pb-4 pt-3.5">
              <h1 className="text-[19px] font-extrabold tracking-[-0.01em]">Chemistry Subject</h1>
              <p className="mt-1 text-[13.5px] text-muted-foreground">Mr. Pandu Baskara, S.Sc</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-course-blue/10 px-3 py-1.5 text-[11.5px] font-semibold text-foreground/80">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  Tue &amp; Thu · 10:45–12:15 PM
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-course-yellow/25 px-3 py-1.5 text-[11.5px] font-semibold text-foreground/80">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  20 Students
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="px-4">
          {/* Quick access */}
          <div className="mt-6">
            <ClassSections />
          </div>

          {/* Class work */}
          <div className="mt-7">
            <div className="flex items-baseline justify-between">
              <Link to="/classwork" className="text-base font-bold text-slate-900">
                Class work
              </Link>
              <Link to="/classwork" className="text-xs font-medium text-slate-400">
                {doneCount} of {classwork.length} done
              </Link>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(doneCount / classwork.length) * 100}%` }}
              />
            </div>

            <div className="mt-4">
              {classwork.map((item, i) => {
                const isLast = i === classwork.length - 1;
                return (
                  <Link
                    key={item.title}
                    to="/classwork"
                    className="relative flex gap-3 transition-opacity active:opacity-70"
                  >
                    {!isLast && (
                      <span
                        aria-hidden
                        className={`absolute left-[19px] top-11 w-px ${
                          item.status === "done" ? "bg-emerald-200" : "bg-slate-200"
                        }`}
                        style={{ height: "calc(100% - 0.5rem)" }}
                      />
                    )}

                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border ${
                        item.status === "done"
                          ? "border-emerald-200 bg-emerald-50"
                          : item.status === "due"
                            ? "border-course-red/30 bg-course-red/10"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      {item.status === "done" ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <>
                          <span
                            className={`text-[12.5px] font-bold leading-none ${
                              item.status === "due" ? "text-course-red" : "text-slate-600"
                            }`}
                          >
                            {item.day}
                          </span>
                          <span
                            className={`mt-0.5 text-[8px] font-semibold uppercase leading-none ${
                              item.status === "due" ? "text-course-red/70" : "text-slate-400"
                            }`}
                          >
                            {item.month}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pb-5 pt-1">
                      <p
                        className={`truncate text-[13.5px] font-semibold ${
                          item.status === "done" ? "text-slate-400 line-through" : "text-slate-900"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-slate-400">{item.meta}</p>
                    </div>

                    {item.due && (
                      <span
                        className={`shrink-0 self-start pt-2.5 text-[11px] font-semibold ${
                          item.status === "due" ? "text-course-red" : "text-slate-400"
                        }`}
                      >
                        {item.due}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}