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
  Users,
  FileText,
  ClipboardCheck,
  BookOpen,
} from "lucide-react";
import pfpImage from "@/assets/pfp.png";
import noActivityImage from "@/assets/no_activity_calendar.png";
import { useAuth, profileFromUser } from "@/lib/auth";
import { getLastOpenedClassId, roleLabel, useMyClasses } from "@/lib/classes";
import { useRecentClassActivity } from "@/lib/work";
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

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const displayDays: Record<(typeof weekDays)[number], string> = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(); date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

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

const tools = [

  { icon: MessageSquare, label: "Messages", bg: "#DDF3E4", accent: "#0D9B57", to: "/chat" },
  { icon: FolderOpen, label: "Resources", bg: "#FFE9D6", accent: "#C2680E", to: "/files" },
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

function ActivityEmptyState() {
  return (
    <div
      className="flex flex-col items-center rounded-[1.5rem] px-6 pb-7 pt-6 text-center"
      style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <img
        src={noActivityImage}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-36 w-auto select-none object-contain"
      />
      <p className="mt-4 text-[15px] font-bold" style={{ color: INK }}>
        No recent activity yet
      </p>
      <p className="mt-1 max-w-[16rem] text-[12px] leading-relaxed" style={{ color: INK_SOFT }}>
        Classwork, assignments and assessments will show up here.
      </p>
      <Link
        to="/courses"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[12.5px] font-semibold transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ border: "1px solid rgba(0,0,0,0.12)", color: INK, outlineColor: INK }}
      >
        Browse courses
      
      </Link>
    </div>
  );
}

function HomePage() {
  const { user } = useAuth();
  const activeClassId = getLastOpenedClassId(user?.id);
  const profile = profileFromUser(user);
  const myClassesQuery = useMyClasses();
  const realClasses = myClassesQuery.data ?? [];
  const recentActivityQuery = useRecentClassActivity(realClasses.map((course) => course.id));
  const classNames = new Map(realClasses.map((course) => [course.id, course.name]));
  const activityStyles = {
    assignment: { tag: "Assignment", icon: FileText, bg: "#D9CFFB", accent: "#5B3FE0" },
    assessment: { tag: "Assessment", icon: ClipboardCheck, bg: "#FFE0AE", accent: "#9A6412" },
    classwork: { tag: "Classwork", icon: BookOpen, bg: "#C3EFAE", accent: "#3C7A22" },
  } as const;
  const activity = (recentActivityQuery.data ?? []).slice(0, 4).map((item) => {
    const style =
      item.type === "assignment"
        ? activityStyles.assignment
        : item.type === "assessment"
          ? activityStyles.assessment
          : activityStyles.classwork;
    return {
      ...style,
      id: `${item.class_id}-${item.title}-${item.created_at}`,
      title: item.title,
      className: classNames.get(item.class_id) ?? "Class",
      time: new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });
  const visibleClasses = realClasses.filter((course) => !course.archived).slice(0, 3);
  const now = new Date();
  const today = weekDays[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledClasses = realClasses
    .filter((course) => !course.archived && course.scheduleDays?.length && course.scheduleTime)
    .flatMap((course) => (course.scheduleDays ?? []).map((day) => {
      const dayIndex = weekDays.indexOf(day as (typeof weekDays)[number]);
      const [hours, minutes] = (course.scheduleTime ?? "00:00").split(":").map(Number);
      const classMinutes = hours * 60 + minutes;
      let daysAway = (dayIndex - now.getDay() + 7) % 7;
      if (daysAway === 0 && classMinutes < currentMinutes) daysAway = 7;
      return { id: `${course.id}-${day}`, classId: course.id, role: course.myRole, day: day as (typeof weekDays)[number], daysAway, time: course.scheduleTime!, timeMinutes: classMinutes, title: course.name, meta: course.courseCode };
    }));
  const todaySchedule = scheduledClasses.filter((item) => item.day === today).sort((a, b) => a.timeMinutes - b.timeMinutes);
  const upcomingSchedule = scheduledClasses.filter((item) => item.day !== today || item.timeMinutes >= currentMinutes).sort((a, b) => a.daysAway - b.daysAway || a.timeMinutes - b.timeMinutes);
  const schedule = (todaySchedule.length ? todaySchedule : upcomingSchedule).slice(0, 4);
  const showingUpcomingSchedule = todaySchedule.length === 0 && schedule.length > 0;
  const enrolledCount = realClasses.filter((course) => course.myRole === "student").length;
  const teachingCount = realClasses.filter((course) => course.myRole === "teacher").length;
  const showDummyCourses = !myClassesQuery.isPending && realClasses.length === 0;
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
          src={profile.avatarUrl ?? pfpImage}
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
        {profile.firstName}
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
          {myClassesQuery.isPending ? (
            <div className="mt-4 grid grid-cols-2 gap-3 animate-pulse">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-[168px] rounded-[1.5rem] bg-black/[0.06]" />)}
            </div>
          ) : !showDummyCourses && visibleClasses.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No courses yet" meta="Enrolled courses will show up here" />
            </div>
          ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(showDummyCourses ? courses : visibleClasses).map((c, i) => {
              const realCourse = "id" in c;
              const tint = realCourse ? courses[i % courses.length] : null;
              return (
              <Link
                to={realCourse ? "/class" : c.title === "Organic Chemistry II" ? "/live-class" : "/"}
                search={realCourse ? { classId: c.id } : undefined}
                key={c.title}
                className="flex h-[168px] flex-col justify-between rounded-[1.5rem] p-4 transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: realCourse ? tint?.bg : c.bg }}
              >
                <div className="flex items-start justify-between">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: realCourse ? tint?.accent : c.accent }}
                  >
                    {realCourse ? c.department || c.courseCode : c.eyebrow}
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
                    {realCourse ? roleLabel(c.myRole) : c.progressLabel}
                  </span>
                  {!realCourse && <ProgressRing percent={c.percent} color={c.accent} />}
                </div>
              </Link>
            );
            })}
            <Link
              to={showDummyCourses ? "/" : "/courses"}
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
                  {showDummyCourses ? "6 enrolled" : `${enrolledCount} enrolled`}
                </p>
                <p className="mt-0.5 text-[11.5px]" style={{ color: INK_SOFT }}>
                  {showDummyCourses ? "2 teaching · see all" : `${teachingCount} teaching · see all`}
                </p>
              </div>
            </Link>
          </div>
          )}
          {showDummyCourses && (
            <div className="mt-3 flex gap-3 text-xs font-medium" style={{ color: INK_SOFT }}>
              <Link to="/create">Create a class</Link>
              <Link to="/join">Join a class</Link>
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
                to={t.to ?? "/"}
                search={t.to === "/files" && activeClassId ? { classId: activeClassId } : undefined}
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
          {schedule.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No scheduled classes yet" meta="Set a class day and time to see it here" />
            </div>
          ) : (
            <ol className="relative mt-5 space-y-1.5">
              <span
                aria-hidden="true"
                className="absolute bottom-4 left-[5px] top-4 w-px"
                style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
              />
              {schedule.map((s, i) => {
                const accent = courses[i % courses.length].accent;
                const isNow =
                  s.day === today && currentMinutes >= s.timeMinutes && currentMinutes < s.timeMinutes + 90;
                return (
                  <li key={s.id} className="relative pl-7">
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-[1.4rem] h-[11px] w-[11px] rounded-full"
                      style={{
                        backgroundColor: isNow ? "#0D9B57" : CANVAS,
                        border: isNow ? "none" : `2px solid ${accent}`,
                      }}
                    >
                      {isNow && (
                        <span
                          className="absolute inset-0 animate-ping rounded-full"
                          style={{ backgroundColor: "#0D9B57", opacity: 0.45 }}
                        />
                      )}
                    </span>
                    <Link
                      to={s.role === "teacher" ? "/teacher" : "/class"}
                      search={{ classId: s.classId }}
                      className="group flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-colors hover:bg-black/[0.035]"
                      style={isNow ? { backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" } : undefined}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: isNow ? "#0D9B57" : accent }}
                        >
                          {isNow ? "Now" : formatTime(s.time)}
                          {showingUpcomingSchedule && (
                            <span className="font-medium normal-case tracking-normal" style={{ color: INK_SOFT }}>
                              · {displayDays[s.day]}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 truncate text-[14.5px] font-bold leading-snug" style={{ color: INK }}>
                          {s.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px]" style={{ color: INK_SOFT }}>
                          {isNow ? `${formatTime(s.time)} · ${s.meta}` : s.meta}
                        </p>
                      </div>
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5"
                        style={{ backgroundColor: "rgba(0,0,0,0.04)" }}
                      >
                        <ChevronRight className="h-3.5 w-3.5" style={{ color: INK_SOFT }} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
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
          {activity.length === 0 ? (
            <div className="mt-4">
              <ActivityEmptyState />
            </div>
          ) : (
            <ul
              className="mt-4 overflow-hidden rounded-[1.5rem] divide-y"
              style={{
                backgroundColor: "white",
                border: "1px solid rgba(0,0,0,0.06)",
                borderColor: "rgba(0,0,0,0.06)",
              }}
            >
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-black/[0.02]"
                  style={{ borderColor: "rgba(0,0,0,0.05)" }}
                >
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: a.bg }}
                  >
                    <a.icon className="h-[18px] w-[18px]" style={{ color: a.accent }} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold leading-snug" style={{ color: INK }}>
                      {a.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px]" style={{ color: INK_SOFT }}>
                      {a.className}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] font-medium tabular-nums" style={{ color: INK_SOFT }}>
                      {a.time}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: a.bg, color: a.accent }}
                    >
                      {a.tag}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}