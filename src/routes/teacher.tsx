import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardList,
  Copy,
  FileText,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";

import banner from "@/assets/chemistry-banner.jpg";
import noClasswork from "@/assets/no-classwork.png";
import ClassSections from "@/components/class-sections";
import WorkFloatingActionButton, { type WorkType } from "@/components/WorkFloatingActionButton";
import { useAuth } from "@/lib/auth";
import {
  formatSchedule,
  getLastOpenedClassId,
  isClassId,
  setLastOpenedClassId,
  useClassOverview,
  deleteClass,
  regenerateJoinCode,
  setClassArchived,
} from "@/lib/classes";
import { useSharedWork, type Shared } from "@/lib/teacher-work";

export const Route = createFileRoute("/teacher")({
  validateSearch: (search: Record<string, unknown>): { classId?: string } => {
    const classId = search["classId"];
    return typeof classId === "string" ? { classId } : {};
  },
  head: () => ({
    meta: [
      { title: "Teacher Class Hub | Virtual Classroom" },
      {
        name: "description",
        content:
          "Manage your class: create assignments, classwork and assessments, and see who has submitted and what needs grading.",
      },
      { property: "og:title", content: "Teacher Class Hub | Virtual Classroom" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherClass,
});

/* ---------- Small pieces ---------- */

const typeStyle: Record<WorkType, { icon: typeof FileText; tint: string }> = {
  Assignment: { icon: ClipboardList, tint: "bg-feature-alt/25 text-foreground" },
  Classwork: { icon: FileText, tint: "bg-surface text-foreground" },
  Assessment: { icon: ClipboardList, tint: "bg-feature/10 text-feature" },
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
        <Clock className="size-3.5 shrink-0" strokeWidth={2.2} /> Needs grading
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-bold text-feature">
      <Clock className="size-3.5 shrink-0" strokeWidth={2.2} /> Open
    </span>
  );
}

function ClassState({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background px-6 pt-12">
      <div className="mx-auto max-w-md rounded-3xl bg-surface p-6 text-center">
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}

function ClassLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md animate-pulse">
        <div className="h-40 w-full bg-surface" />
        <div className="space-y-3 px-6 pt-4">
          <div className="h-5 w-2/3 rounded bg-surface" />
          <div className="h-4 w-1/2 rounded bg-surface" />
          <div className="h-8 w-full rounded-full bg-surface" />
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13.5px] font-semibold transition-all active:scale-[0.98] ${
        danger ? "text-red-400 hover:bg-red-500/15" : "text-slate-100 hover:bg-white/10"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
          danger ? "bg-red-500/15" : "bg-white/10"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && (
        <span className="shrink-0 pr-1 font-mono text-[11px] font-medium tracking-wider text-slate-400">
          {hint}
        </span>
      )}
    </button>
  );
}

type Confirm = "regenerate" | "archive" | "delete";

function confirmCopy(kind: Confirm, archived: boolean) {
  if (kind === "delete")
    return {
      title: "Delete class?",
      message: "This removes the class for everyone and cannot be undone.",
    };
  if (kind === "regenerate")
    return {
      title: "Regenerate join code?",
      message: "The old code will stop working immediately.",
    };
  return archived
    ? { title: "Unarchive class?", message: "Students will be able to join the class again." }
    : { title: "Archive class?", message: "Nobody new can join while this class is archived." };
}

function ConfirmDialog({
  kind,
  archived,
  busy,
  onCancel,
  onConfirm,
}: {
  kind: Confirm;
  archived: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { title, message } = confirmCopy(kind, archived);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-30 grid place-items-center bg-foreground/30 p-6"
    >
      <div className="w-full max-w-sm rounded-3xl bg-background p-6">
        <h2 className="text-[17px] font-extrabold tracking-tight text-foreground">{title}</h2>
        <p className="mt-2 text-[14px] font-medium leading-relaxed text-muted-foreground">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            disabled={busy}
            onClick={onCancel}
            className="h-11 rounded-full px-5 text-[14px] font-bold text-muted-foreground transition-opacity active:opacity-60 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={onConfirm}
            className={`h-11 rounded-full px-5 text-[14px] font-bold text-white transition-transform active:scale-95 disabled:opacity-60 ${
              kind === "delete" ? "bg-red-500" : "bg-feature"
            }`}
          >
            {busy ? "Working..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

function TeacherClass() {
  const router = useRouter();
  const { user } = useAuth();
  const { classId: searchedClassId } = Route.useSearch();
  const classId = searchedClassId ?? getLastOpenedClassId(user?.id);
  const overviewQuery = useClassOverview(classId);
  const overview = overviewQuery.data;
  const sharedQuery = useSharedWork(classId);
  const shared = sharedQuery.data ?? [];

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuEverOpened, setMenuEverOpened] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (menuOpen) setMenuEverOpened(true);
  }, [menuOpen]);

  useEffect(() => {
    if (overview && user) setLastOpenedClassId(user.id, overview.id);
  }, [overview, user]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!classId) {
    return (
      <ClassState title="No class selected" message="Create a class to get started.">
        <Link
          to="/create"
          className="rounded-full bg-feature px-5 py-2.5 text-sm font-bold text-white"
        >
          Create class
        </Link>
      </ClassState>
    );
  }

  if (!isClassId(classId) || overviewQuery.isError || overview === null) {
    return (
      <ClassState title="Class not found" message="This class does not exist or you don't have access.">
        <button
          onClick={() => router.history.back()}
          className="rounded-full bg-surface px-5 py-2.5 text-sm font-bold text-foreground"
        >
          Go back
        </button>
      </ClassState>
    );
  }

  if (overviewQuery.isPending || !overview) return <ClassLoading />;

  if (overview.myRole !== "teacher") {
    return (
      <ClassState title="Teachers only" message="This page is only available to the teacher of this class.">
        <Link
          to="/class"
          search={{ classId: overview.id }}
          className="rounded-full bg-feature px-5 py-2.5 text-sm font-bold text-white"
        >
          Open class
        </Link>
      </ClassState>
    );
  }

  const schedule = formatSchedule(overview.scheduleDays, overview.scheduleTime);
  const joinCode = overview.joinCode
    ? `${overview.joinCode.slice(0, 4)}-${overview.joinCode.slice(4)}`
    : null;
  const openCount = shared.filter((s) => s.status === "open").length;
  const gradeCount = shared.filter((s) => s.status === "grading").length;

  const copyJoinCode = () => {
    if (!overview.joinCode) return;
    void navigator.clipboard.writeText(overview.joinCode).then(
      () => toast.success("Join code copied"),
      () => toast.error("Couldn't copy join code"),
    );
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm === "regenerate") {
        await regenerateJoinCode(overview.id);
        toast.success("Join code regenerated");
      } else if (confirm === "archive") {
        await setClassArchived(overview.id, !overview.archived);
        toast.success(overview.archived ? "Class unarchived" : "Class archived");
      } else {
        await deleteClass(overview.id);
        router.navigate({ to: "/courses" });
      }
      setConfirm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const openMembers = () => router.navigate({ to: "/members", search: { classId: overview.id } });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md pb-32">
        {/* Banner and top bar */}
        <div className="relative">
          <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-5">
            <button
              aria-label="Back to classes"
              onClick={() => router.history.back()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-[var(--shadow-card)] transition-transform active:scale-95"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>

            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Class options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={`grid h-10 w-10 place-items-center rounded-full bg-card text-foreground shadow-[var(--shadow-card)] transition-all active:scale-95 ${
                  menuOpen ? "ring-2 ring-slate-300" : ""
                }`}
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </button>
              <style>{`
                @keyframes menuIn { 0% { opacity: 0; transform: translateY(-10px) scale(.96) } 60% { opacity: 1; transform: translateY(2px) scale(1.01) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
                @keyframes menuOut { 0% { visibility: visible; opacity: 1; transform: translateY(0) scale(1) } 100% { visibility: hidden; opacity: 0; transform: translateY(-8px) scale(.96) } }
                @media (prefers-reduced-motion: reduce) { [role="menu"] { animation: none !important } }
              `}</style>
              <div
                role="menu"
                onClick={() => setMenuOpen(false)}
                aria-hidden={!menuOpen}
                className={`absolute right-0 top-12 z-20 w-60 origin-top-right overflow-hidden rounded-xl border border-white/10 bg-slate-900/85 p-1.5 text-white shadow-[0_18px_44px_-10px_rgba(0,0,0,0.55)] backdrop-blur-xl ${
                  menuOpen
                    ? "visible animate-[menuIn_280ms_cubic-bezier(0.22,1,0.36,1)_both]"
                    : menuEverOpened
                      ? "pointer-events-none invisible animate-[menuOut_200ms_cubic-bezier(0.4,0,1,1)_both]"
                      : "pointer-events-none invisible"
                }`}
              >
                <MenuItem
                  icon={Pencil}
                  label="Edit class"
                  onClick={() => router.navigate({ to: "/create", search: { classId: overview.id } })}
                />
                <MenuItem icon={Users} label="Members" onClick={openMembers} />
                <div className="mx-2 my-1.5 h-px bg-white/10" />
                <MenuItem
                  icon={Copy}
                  label="Copy join code"
                  hint={joinCode ?? undefined}
                  onClick={copyJoinCode}
                />
                <MenuItem
                  icon={RefreshCw}
                  label="Regenerate join code"
                  onClick={() => setConfirm("regenerate")}
                />
                <MenuItem
                  icon={overview.archived ? ArchiveRestore : Archive}
                  label={overview.archived ? "Unarchive class" : "Archive class"}
                  onClick={() => setConfirm("archive")}
                />
                <div className="mx-2 my-1.5 h-px bg-white/10" />
                <MenuItem
                  icon={Trash2}
                  label="Delete class"
                  danger
                  onClick={() => setConfirm("delete")}
                />
              </div>
            </div>
          </header>

          <img
            src={banner}
            alt="Illustrated chemistry lab bench with flasks and test tubes"
            width={1088}
            height={608}
            className="h-40 w-full object-cover"
          />
        </div>

        {/* Class info */}
        <section className="px-6 pt-4">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-foreground">
            {overview.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {schedule && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-foreground/80">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                {schedule}
              </span>
            )}
            <button
              onClick={openMembers}
              className="inline-flex items-center gap-1.5 rounded-full bg-feature-alt/25 px-3 py-1.5 text-[11.5px] font-semibold text-foreground/80 transition-transform active:scale-95"
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              {overview.studentCount} {overview.studentCount === 1 ? "student" : "students"}
            </button>
            {joinCode && (
              <button
                onClick={copyJoinCode}
                aria-label="Copy join code"
                className="inline-flex items-center gap-1.5 rounded-full bg-feature/10 px-3 py-1.5 text-[11.5px] font-semibold text-feature transition-transform active:scale-95"
              >
                <Copy className="h-3.5 w-3.5 shrink-0" />
                {joinCode}
              </button>
            )}
            {overview.archived && (
              <span className="inline-flex items-center rounded-full bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-muted-foreground">
                Archived
              </span>
            )}
          </div>

      
        </section>

        {/* Class sections */}
        <div className="mt-6 px-6">
         <ClassSections exclude={["Assignments", "Assessments"]} classId={overview.id} />
        </div>

        {/* Shared with class */}
        <section className="mt-8">
          <p className="px-6 text-[11px] font-bold tracking-[0.18em] text-muted-foreground">
            SHARED WITH CLASS
          </p>

          {shared.length === 0 ? (
            <div className="flex flex-col items-center px-6 pb-2 pt-6 text-center">
              <img
                src={noClasswork}
                alt="A sleepy red panda curled up on a cushion next to a cup of tea and a stack of books"
                width={640}
                height={479}
                className="w-48 max-w-full select-none"
                draggable={false}
              />
              <h3 className="mt-4 text-[15px] font-bold text-foreground">Nothing shared yet</h3>
              <p className="mt-1 max-w-[16rem] text-[12.5px] font-medium text-muted-foreground">
                Tap the plus button to create an assignment, classwork or assessment.
              </p>
            </div>
          ) : (
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
                      <span
                        className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tint}`}
                      >
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
                            {s.submitted}/{s.total} submitted
                          </span>
                        </span>
                        <span className="mt-1.5 block">
                          <StatusChip status={s.status} />
                        </span>
                      </span>
                      <ChevronRight
                        className="size-5 shrink-0 text-muted-foreground"
                        strokeWidth={2.2}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <WorkFloatingActionButton
        onSelect={(type) => router.navigate({ to: "/new-work", search: { type, classId: overview.id } })}
      />

      {confirm && (
        <ConfirmDialog
          kind={confirm}
          archived={overview.archived}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void runConfirm()}
        />
      )}
    </div>
  );
}
