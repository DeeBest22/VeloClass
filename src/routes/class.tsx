import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
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
  Pencil,
  RefreshCw,
  Archive,
  ArchiveRestore,
  Trash2,
  LogOut,
} from "lucide-react";

import banner from "@/assets/chemistry-banner.jpg";
import noClasswork from "@/assets/no-classwork.png";
import ClassSections from "@/components/class-sections";
import { useAuth } from "@/lib/auth";
import {
  formatSchedule,
  getLastOpenedClassId,
  isClassId,
  setLastOpenedClassId,
  useClassOverview,
  deleteClass,
  leaveClass,
  regenerateJoinCode,
  setClassArchived,
} from "@/lib/classes";
import { useSharedWork } from "@/lib/teacher-work";

export const Route = createFileRoute("/class")({
  validateSearch: (search: Record<string, unknown>): { classId?: string } => {
    const classId = search["classId"];
    return typeof classId === "string" ? { classId } : {};
  },
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

type ClassworkItem = {
  day: string;
  month: string;
  title: string;
  meta: string;
  status: "done" | "due" | "upcoming";
  due?: string;
};

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
    <div className="min-h-screen bg-background px-4 pt-12">
      <div className="card-soft mx-auto max-w-md rounded-tile p-6 text-center">
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}

function ClassLoading() {
  return (
    <div className="min-h-screen bg-background px-4 pt-5">
      <div className="card-soft mx-auto max-w-md overflow-hidden rounded-tile animate-pulse">
        <div className="h-40 w-full bg-slate-200" />
        <div className="space-y-3 p-4">
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-8 w-full rounded-full bg-slate-100" />
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
      {hint && <span className="shrink-0 pr-1 font-mono text-[11px] font-medium tracking-wider text-slate-400">{hint}</span>}
    </button>
  );
}

function ClassHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { classId: searchedClassId } = Route.useSearch();
  const classId = searchedClassId ?? getLastOpenedClassId(user?.id);
  const overviewQuery = useClassOverview(classId);
  const overview = overviewQuery.data;
  const workQuery = useSharedWork(classId);
  const classwork: ClassworkItem[] = (workQuery.data ?? []).slice().sort((a, b) => a.due.localeCompare(b.due)).map((item) => {
    const due = item.due.replace(/^Due |^Closed /, ""); const parsed = new Date(due);
    return { day: Number.isNaN(parsed.getTime()) ? "" : String(parsed.getDate()), month: Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("en-US", { month: "short" }), title: item.title, meta: item.type, status: "upcoming", due: item.due };
  });
  const doneCount = 0;
  const counts = (workQuery.data ?? []).reduce<{ Assignments: number; Assessments: number }>((result, item) => { if (item.type === "Assignment") result.Assignments += 1; if (item.type === "Assessment") result.Assessments += 1; return result; }, { Assignments: 0, Assessments: 0 });
  const schedule = overview ? formatSchedule(overview.scheduleDays, overview.scheduleTime) : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuEverOpened, setMenuEverOpened] = useState(false);
  useEffect(() => {
    if (overview?.myRole === "teacher") {
      void router.navigate({ to: "/teacher", search: { classId: overview.id }, replace: true });
    }
  }, [overview, router]);
  useEffect(() => { if (menuOpen) setMenuEverOpened(true); }, [menuOpen]);
  const [confirm, setConfirm] = useState<"regenerate" | "archive" | "delete" | "leave" | null>(null);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (overview && user) setLastOpenedClassId(user.id, overview.id);
  }, [overview, user]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!classId) {
    return (
      <ClassState title="No class selected" message="Create a class or join one to get started.">
        <Link to="/create" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create class</Link>
        <Link to="/join" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Join class</Link>
      </ClassState>
    );
  }

  if (!isClassId(classId) || overviewQuery.isError || overview === null) {
    return (
      <ClassState title="Class not found" message="This class does not exist or you don't have access.">
        <button onClick={() => router.history.back()} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Go back</button>
        <Link to="/join" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Join a class</Link>
      </ClassState>
    );
  }

  if (overviewQuery.isPending || !overview) return <ClassLoading />;

  if (overview.myRole === "teacher") return <ClassLoading />;

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
            <div ref={menuRef} className="relative col-start-3 justify-self-end">
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
              <style>{"@keyframes menuIn{0%{opacity:0;transform:translateY(-10px) scale(.96)}60%{opacity:1;transform:translateY(2px) scale(1.01)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes menuOut{0%{visibility:visible;opacity:1;transform:translateY(0) scale(1)}100%{visibility:hidden;opacity:0;transform:translateY(-8px) scale(.96)}}"}</style>
              <div
                role="menu"
                onClick={() => setMenuOpen(false)}
                aria-hidden={!menuOpen}
                className={`absolute right-0 top-12 z-20 w-60 origin-top-right overflow-hidden rounded-xl border border-white/10 bg-slate-900/85 p-1.5 text-white shadow-[0_18px_44px_-10px_rgba(0,0,0,0.55)] backdrop-blur-xl ${
                  menuOpen ? "visible animate-[menuIn_280ms_cubic-bezier(0.22,1,0.36,1)_both]" : menuEverOpened ? "pointer-events-none invisible animate-[menuOut_200ms_cubic-bezier(0.4,0,1,1)_both]" : "pointer-events-none invisible"
                }`}
              >
                {overview.myRole === "teacher" ? (
                  <>
                    <MenuItem icon={Pencil} label="Edit class" onClick={() => router.navigate({ to: "/create", search: { classId: overview.id } })} />
                    <MenuItem icon={Users} label="Members" onClick={() => router.navigate({ to: "/members", search: { classId: overview.id } })} />
                    <div className="mx-2 my-1.5 h-px bg-white/10" />
                    <MenuItem
                      icon={Copy}
                      label="Copy join code"
                      hint={overview.joinCode ? `${overview.joinCode.slice(0, 4)}-${overview.joinCode.slice(4)}` : undefined}
                      onClick={() => void navigator.clipboard.writeText(overview.joinCode ?? "").then(() => toast.success("Join code copied"), () => toast.error("Couldn't copy join code"))}
                    />
                    <MenuItem icon={RefreshCw} label="Regenerate join code" onClick={() => setConfirm("regenerate")} />
                    <MenuItem icon={overview.archived ? ArchiveRestore : Archive} label={overview.archived ? "Unarchive class" : "Archive class"} onClick={() => setConfirm("archive")} />
                    <div className="mx-2 my-1.5 h-px bg-white/10" />
                    <MenuItem icon={Trash2} label="Delete class" danger onClick={() => setConfirm("delete")} />
                  </>
                ) : (
                  <>
                    <MenuItem icon={Users} label="Members" onClick={() => router.navigate({ to: "/members", search: { classId: overview.id } })} />
                    <div className="mx-2 my-1.5 h-px bg-white/10" />
                    <MenuItem icon={LogOut} label="Leave class" danger onClick={() => setConfirm("leave")} />
                  </>
                )}
              </div>
            </div>
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
              <h1 className="text-[19px] font-extrabold tracking-[-0.01em]">{overview.name}</h1>
              <p className="mt-1 text-[13.5px] text-muted-foreground">{overview.teacherName}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {schedule && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-course-blue/10 px-3 py-1.5 text-[11.5px] font-semibold text-foreground/80">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {schedule}
                  </span>
                )}
                <button onClick={() => router.navigate({ to: "/members", search: { classId: overview.id } })} className="inline-flex items-center gap-1.5 rounded-full bg-course-yellow/25 px-3 py-1.5 text-[11.5px] font-semibold text-foreground/80">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {overview.studentCount} {overview.studentCount === 1 ? "Student" : "Students"}
                </button>
                {overview.myRole === "teacher" && overview.joinCode && (
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(overview.joinCode).then(
                        () => toast.success("Join code copied"),
                        () => toast.error("Couldn't copy join code"),
                      );
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-course-blue/10 px-3 py-1.5 text-[11.5px] font-semibold text-foreground/80"
                  >
                    <Copy className="h-3.5 w-3.5 shrink-0" />
                    {overview.joinCode.slice(0, 4)}-{overview.joinCode.slice(4)}
                  </button>
                )}
                {overview.archived && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11.5px] font-semibold text-foreground/80">Archived</span>}
              </div>
            </div>
          </section>
        </div>

        <div className="px-4">
          {/* Quick access */}
          <div className="mt-6">
            <ClassSections counts={counts} classId={overview.id} />
          </div>

          {/* Class work */}
          <div className="mt-7">
            <div className="flex items-baseline justify-between">
              <Link to="/classwork" search={{ classId: overview.id }} className="text-base font-bold text-slate-900">
                Class work
              </Link>
              <Link to="/classwork" search={{ classId: overview.id }} className="text-xs font-medium text-slate-400">
                {doneCount} of {classwork.length} done
              </Link>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${classwork.length ? (doneCount / classwork.length) * 100 : 0}%` }}
              />
            </div>

            <div className="mt-4">
              {classwork.length === 0 && (
                <div className="flex flex-col items-center px-4 pb-2 pt-4 text-center">
                  <img
                    src={noClasswork}
                    alt="A sleepy red panda curled up on a cushion next to a cup of tea and a stack of books"
                    width={640}
                    height={479}
                    className="w-56 max-w-full select-none"
                    draggable={false}
                  />
                  <h3 className="mt-4 text-[15px] font-bold text-slate-900">No class work yet</h3>
                  <p className="mt-1 text-[12.5px] text-slate-400">
                    Assignments and tests will show up here once they're posted.
                  </p>
                </div>
              )}
              {classwork.map((item, i) => {
                const isLast = i === classwork.length - 1;
                return (
                  <div
                    key={item.title}
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {confirm && <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4"><div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-5"><h2 className="text-base font-bold">{confirm === "delete" ? "Delete class?" : confirm === "leave" ? "Leave class?" : confirm === "regenerate" ? "Regenerate join code?" : overview.archived ? "Unarchive class?" : "Archive class?"}</h2><p className="mt-2 text-sm text-slate-500">{confirm === "regenerate" ? "The old code will stop working immediately." : confirm === "archive" ? "Nobody new can join while this class is archived." : "This action can affect access to this class."}</p><div className="mt-5 flex justify-end gap-2"><button disabled={busy} onClick={() => setConfirm(null)} className="rounded-full border border-black/10 px-4 py-2 text-sm">Cancel</button><button disabled={busy} onClick={() => void (async () => { setBusy(true); try { if (confirm === "regenerate") { await regenerateJoinCode(overview.id); toast.success("Join code regenerated"); } else if (confirm === "archive") { await setClassArchived(overview.id, !overview.archived); toast.success(overview.archived ? "Class unarchived" : "Class archived"); } else if (confirm === "delete") { await deleteClass(overview.id); router.navigate({ to: "/courses" }); } else { await leaveClass(overview.id); router.navigate({ to: "/courses" }); } setConfirm(null); } catch (error) { toast.error(error instanceof Error ? error.message : "Something went wrong"); } finally { setBusy(false); } })()} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">{busy ? "Working…" : "Confirm"}</button></div></div></div>}
    </div>
  );
}
