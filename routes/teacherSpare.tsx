import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";
import WorkFloatingActionButton, { type WorkType } from "@/components/WorkFloatingActionButton";
import { CLASS_SIZE, useSharedWork, type Shared } from "@/lib/teacher-work";

export const Route = createFileRoute("/teacherSpare")({
  head: () => ({
    meta: [
      { title: "MCE 201 Teacher Hub" },
      {
        name: "description",
        content:
          "Track assignments, classwork and assessments for your MCE 201 Applied Mechanics class.",
      },
      { property: "og:title", content: "MCE 201 Teacher Hub — Virtual Classroom" },
      {
        property: "og:description",
        content: "See what's due next, who has submitted and what still needs grading.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherHub,
});

const typeStyle: Record<WorkType, { icon: typeof FileText; tint: string }> = {
  Assignment: {
    icon: ClipboardList,
    tint: "bg-feature-alt/25 text-foreground",
  },
  Classwork: {
    icon: FileText,
    tint: "bg-surface text-foreground",
  },
  Assessment: {
    icon: ClipboardList,
    tint: "bg-feature/10 text-feature",
  },
};

function StatusChip({ status }: { status: Shared["status"] }) {
  if (status === "done")
    return (
      <span className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
        <CheckCircle2 className="size-3.5 shrink-0" strokeWidth={2.2} /> Graded
      </span>
    );
  if (status === "grading")
    return (
      <span className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
        <Clock className="size-3.5 shrink-0" strokeWidth={2.2} /> Grading
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-bold text-feature">
      <Clock className="size-3.5 shrink-0" strokeWidth={2.2} /> Open
    </span>
  );
}

function TeacherHub() {
  const navigate = useNavigate();
  const shared = useSharedWork();

  const summary = useMemo(
    () => [
      { v: shared.filter((s) => s.status === "open").length, l: "Open" },
      { v: shared.filter((s) => s.status === "grading").length, l: "To grade" },
      { v: String(CLASS_SIZE), l: "Students" },
    ],
    [shared],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-7">
        <Link
          to="/"
          aria-label="Go back"
          className="-ml-1 grid size-9 place-items-center rounded-full text-foreground transition-colors active:bg-muted"
        >
          <ArrowLeft className="size-[22px]" strokeWidth={2.2} />
        </Link>
        <span className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-[11px] font-bold text-muted-foreground">
          <Users className="size-3.5" strokeWidth={2.2} /> {CLASS_SIZE} students
        </span>
      </div>

      {/* Title */}
      <header className="px-6 pt-3">
        <h1 className="text-[32px] font-extrabold leading-none tracking-tight text-foreground">
          Teacher Hub
        </h1>
        <p className="mt-2 text-[13px] font-medium text-muted-foreground">
          MCE 201 · Applied Mechanics
        </p>
      </header>

   

      {/* Recently shared */}
      <p className="px-6 pt-7 text-[11px] font-bold tracking-[0.18em] text-muted-foreground">
        SHARED WITH CLASS
      </p>

      <ul className="mt-2 divide-y divide-border px-6">
        {shared.map((s) => {
          const { icon: Icon, tint } = typeStyle[s.type];
          const pct = s.total ? Math.round((s.submitted / s.total) * 100) : 0;
          return (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-center gap-4 py-4 text-left transition-opacity active:opacity-60"
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tint}`}>
                  <Icon className="size-[22px]" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-foreground">
                    {s.title}
                  </span>
                  <span className="mt-1 block text-[12px] font-medium text-muted-foreground">
                    {s.type} · {s.due}
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface">
                      <span
                        className="block h-full rounded-full bg-feature"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {s.submitted}/{s.total}
                    </span>
                  </span>
                  <span className="mt-1.5 block">
                    <StatusChip status={s.status} />
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" strokeWidth={2.2} />
              </button>
            </li>
          );
        })}
      </ul>

      <WorkFloatingActionButton onSelect={(type) => navigate({ to: "/new-work", search: { type } })} />
    </main>
  );
}
