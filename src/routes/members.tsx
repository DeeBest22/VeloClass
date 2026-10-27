import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, Copy, Download, RefreshCw, Search, Trash2, UserMinus, X } from "lucide-react";
import { isClassId, regenerateJoinCode, useClassOverview } from "@/lib/classes";
import { getLiveMembers, type LiveMember } from "@/lib/live-class";
import { useAuth } from "@/lib/auth";
import { fetchRoster, removeStudents, type RosterRow } from "@/lib/roster";

export const Route = createFileRoute("/members")({
  validateSearch: (search: Record<string, unknown>): { classId?: string } => {
    const classId = search["classId"];
    return typeof classId === "string" ? { classId } : {};
  },
  head: () => ({ meta: [{ title: "Members | Classroom" }, { name: "description", content: "Everyone in this class, plus tools for lecturers to see who's engaged and manage the roster." }] }),
  component: MembersPage,
});

const INK = "#14161F", SOFT = "#707285", FAINT = "#A3A5B5", CANVAS = "#F5F5FA", ACCENT = "#5B3FE0", WASH = "#EEEAFD", LINE = "rgba(20,22,31,0.07)", CHIP = "#E9E9F1", GREEN = "#0D9B57", RED = "#D3402E";
const SHADOW = "0 1px 2px rgba(16,16,20,.04), 0 10px 28px -14px rgba(16,16,20,.12)";
const EASE = "cubic-bezier(.22,1,.36,1)";
const DAY = 86400000;

type Tier = "active" | "quiet" | "new" | "none";
type Row = LiveMember & { joined: string | null; stats: RosterRow | null; tier: Tier; me: boolean };
const TIER: Record<Tier, { label: string; bg: string; fg: string }> = {
  active: { label: "Active", bg: "#E3F6EC", fg: GREEN },
  quiet: { label: "Quiet", bg: "#FEF3C7", fg: "#B45309" },
  new: { label: "New", bg: WASH, fg: ACCENT },
  none: { label: "No activity", bg: CHIP, fg: SOFT },
};
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
};
const joinedLabel = (iso: string | null) => (iso ? `Joined ${new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" })}` : "");
const total = (s: RosterRow) => s.n_msgs + s.n_questions + s.n_answers + s.n_polls + s.n_quizzes;
function tierOf(role: string, joined: string | null, s: RosterRow | null): Tier {
  if (role !== "student" || !s) return "none";
  if (s.last_active && Date.now() - Date.parse(s.last_active) < 7 * DAY) return "active";
  if (s.last_active) return "quiet";
  return joined && Date.now() - Date.parse(joined) < 3 * DAY ? "new" : "none";
}

function Avatar({ name, url, size = 44 }: { name: string; url: string | null; size?: number }) {
  return url ? (
    <img src={url} alt="" draggable={false} className="block shrink-0 rounded-full object-cover" style={{ width: size, height: size, maxWidth: "none", boxShadow: "0 0 0 1px rgba(20,22,31,0.06)" }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full font-extrabold" style={{ width: size, height: size, backgroundColor: WASH, color: ACCENT, fontSize: size * 0.38 }}>{name.trim().charAt(0).toUpperCase() || "?"}</span>
  );
}

function MembersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { classId } = Route.useSearch();
  const valid = isClassId(classId);
  const overview = useClassOverview(classId);
  const membersQ = useQuery({ queryKey: ["live-members", classId], enabled: valid, queryFn: () => getLiveMembers(classId as string) });
  const rosterQ = useQuery({ queryKey: ["class-roster", classId], enabled: valid, retry: false, queryFn: () => fetchRoster(classId as string) });
  const isTeacher = overview.data?.myRole === "teacher";

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "students" | "quiet">("all");
  const [sort, setSort] = useState<"name" | "new" | "active">("name");
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [rotate, setRotate] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const pending = useRef<Map<number, () => Promise<void>>>(new Map());

  const say = (msg: string, undo?: () => void) => { setToast(undo ? { msg, undo } : { msg }); if (toastTimer.current) window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(null), undo ? 5200 : 2000); };
  /* a removal waits 5 seconds so it can be undone, and is committed immediately if the lecturer leaves the page */
  useEffect(() => () => { pending.current.forEach((run, t) => { window.clearTimeout(t); void run(); }); }, []);

  const rows = useMemo<Row[]>(() => {
    const stats = new Map((rosterQ.data ?? []).map((r) => [r.user_id, r]));
    return (membersQ.data ?? []).map((m) => {
      const s = stats.get(m.id) ?? null;
      return { ...m, joined: s?.joined_at ?? null, stats: isTeacher ? s : null, tier: isTeacher ? tierOf(m.role, s?.joined_at ?? null, s) : "none", me: m.id === user?.id };
    });
  }, [membersQ.data, rosterQ.data, user?.id, isTeacher]);

  const students = rows.filter((r) => r.role === "student" && !hidden.has(r.id));
  const teachers = rows.filter((r) => r.role === "teacher");
  const activeN = students.filter((r) => r.tier === "active").length;
  const quietN = rosterQ.isError ? 0 : students.filter((r) => r.tier === "quiet" || r.tier === "none").length;

  const term = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = students.filter((r) => (!term || r.name.toLowerCase().includes(term)) && (filter !== "quiet" || r.tier === "quiet" || r.tier === "none"));
    return list.sort((a, b) => sort === "new" ? Date.parse(b.joined ?? "0") - Date.parse(a.joined ?? "0") : sort === "active" ? (b.stats ? total(b.stats) : 0) - (a.stats ? total(a.stats) : 0) : a.name.localeCompare(b.name));
  }, [students, term, filter, sort]);
  const shownTeachers = filter === "all" ? teachers.filter((r) => !term || r.name.toLowerCase().includes(term)) : [];

  const toggle = (id: string) => setPicked((p) => { const c = new Set(p); c.has(id) ? c.delete(id) : c.add(id); return c; });
  const exitSelect = () => { setSelecting(false); setPicked(new Set()); };

  const commitRemoval = (ids: string[], rotateCode: boolean) => {
    if (!valid) return;
    setHidden((h) => new Set([...h, ...ids]));
    setConfirm(null); exitSelect();
    const names = ids.map((id) => rows.find((r) => r.id === id)?.name ?? "Student");
    const run = async () => {
      pending.current.delete(timer);
      try {
        await removeStudents(classId, ids);
        if (rotateCode) await regenerateJoinCode(classId);
      } catch (e) {
        setHidden((h) => { const c = new Set(h); ids.forEach((i) => c.delete(i)); return c; });
        say((e as Error).message);
      }
      void qc.invalidateQueries({ queryKey: ["live-members", classId] });
      void qc.invalidateQueries({ queryKey: ["class-roster", classId] });
    };
    const timer = window.setTimeout(() => void run(), 5000);
    pending.current.set(timer, run);
    say(ids.length === 1 ? `${names[0]} removed` : `${ids.length} students removed`, () => {
      window.clearTimeout(timer); pending.current.delete(timer);
      setHidden((h) => { const c = new Set(h); ids.forEach((i) => c.delete(i)); return c; });
    });
  };

  const copyCode = () => { const c = overview.data?.joinCode; if (!c) return; void navigator.clipboard?.writeText(c).then(() => say("Join code copied")).catch(() => say(c)); };
  const newCode = () => { if (valid) void regenerateJoinCode(classId).then(() => say("New join code created")).catch((e: Error) => say(e.message)); };
  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Name", "Role", "Joined", "Last active", "Messages", "Questions asked", "Answers given", "Polls voted", "Quizzes done", "Quiz average %"];
    const lines = rows.filter((r) => !hidden.has(r.id)).map((r) => [r.name, r.role, r.joined?.slice(0, 10) ?? "", r.stats?.last_active?.slice(0, 10) ?? "", r.stats?.n_msgs ?? "", r.stats?.n_questions ?? "", r.stats?.n_answers ?? "", r.stats?.n_polls ?? "", r.stats?.n_quizzes ?? "", r.stats?.n_quizzes ? r.stats.quiz_avg : ""].map(esc).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv" }));
    a.download = `${overview.data?.courseCode ?? "class"}-roster.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen w-full" style={{ backgroundColor: CANVAS, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: INK }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes mbRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}} @keyframes mbDrop{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        .mb-rise{animation:mbRise .4s ${EASE} both}.mb-drop{animation:mbDrop .38s ${EASE} both}`}</style>
      {children}
    </main>
  );

  if (!valid || overview.data === null || overview.isError) return shell(<div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-8 text-center"><p className="text-[16px] font-bold">Class not found</p><p className="text-[13px]" style={{ color: SOFT }}>It may have been removed, or you don't have access.</p><Link to="/join" className="mt-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white" style={{ backgroundColor: ACCENT }}>Join a class</Link></div>);
  if (overview.isPending || membersQ.isPending) return shell(<div className="mx-auto max-w-md space-y-3 px-4 pt-20">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-[22px] bg-black/[0.05]" />)}</div>);
  if (membersQ.isError) return shell(<div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-8 text-center"><p className="text-[16px] font-bold">We couldn't load the members</p><button onClick={() => void membersQ.refetch()} className="mt-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white" style={{ backgroundColor: ACCENT }}>Try again</button></div>);

  const ov = overview.data!;
  const confirmNames = (confirm ?? []).map((id) => rows.find((r) => r.id === id)?.name ?? "Student");
  const tile = (label: string, value: number, on: boolean, onClick?: () => void) => (
    <button disabled={!onClick} onClick={onClick} className="flex-1 rounded-[20px] bg-white px-3 py-3.5 text-center transition-all duration-200 active:scale-[0.97]" style={{ boxShadow: SHADOW, border: `1.5px solid ${on ? ACCENT : "transparent"}` }}>
      <p className="text-[22px] font-extrabold leading-none tracking-tight">{value}</p><p className="mt-1 text-[11px] font-semibold" style={{ color: SOFT }}>{label}</p>
    </button>
  );

  return shell(
    <div className="mx-auto w-full max-w-md px-4 pb-32 pt-5 sm:max-w-xl">
      <header className="flex items-center gap-3">
        <button onClick={() => router.history.back()} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}><ArrowLeft className="h-[18px] w-[18px]" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif" }}>Members</h1>
          <p className="truncate text-[12px] font-medium" style={{ color: SOFT }}>{ov.name} · {students.length} {students.length === 1 ? "student" : "students"}</p>
        </div>
        {isTeacher && <button onClick={exportCsv} aria-label="Export roster as CSV" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}><Download className="h-[18px] w-[18px]" /></button>}
        {isTeacher && students.length > 0 && <button onClick={() => (selecting ? exitSelect() : setSelecting(true))} className="h-10 shrink-0 rounded-full px-4 text-[13px] font-bold transition-transform active:scale-95" style={{ backgroundColor: selecting ? INK : WASH, color: selecting ? "white" : ACCENT }}>{selecting ? "Done" : "Select"}</button>}
      </header>

      {isTeacher && (
        <>
      
       
        </>
      )}

      <div className="mt-5 flex h-12 items-center gap-2.5 rounded-full bg-white px-4" style={{ border: `1px solid ${LINE}` }}>
        <Search className="h-4 w-4 shrink-0" style={{ color: SOFT }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#707285]" />
        {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X className="h-4 w-4" style={{ color: SOFT }} /></button>}
      </div>
      {isTeacher && students.length > 1 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto">
          {([["name", "A to Z"], ["new", "Newest"], ["active", "Most active"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSort(id)} className="shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold transition-all duration-200" style={{ backgroundColor: sort === id ? INK : "white", color: sort === id ? "white" : SOFT, border: sort === id ? "none" : `1px solid ${LINE}` }}>{label}</button>
          ))}
          {filter === "quiet" && <button onClick={() => setFilter("all")} className="flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-[12px] font-bold" style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}>Quiet only<X className="h-3.5 w-3.5" /></button>}
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {[...shownTeachers, ...visible].map((r, i) => {
          const s = r.stats, t = TIER[r.tier], open = openId === r.id, canPick = isTeacher && r.role === "student";
          const on = picked.has(r.id);
          return (
            <div key={r.id} className="mb-rise overflow-hidden rounded-[22px] bg-white transition-shadow duration-200" style={{ animationDelay: `${Math.min(i, 8) * 30}ms`, boxShadow: SHADOW, border: `1.5px solid ${on ? ACCENT : "transparent"}` }}>
              <button onClick={() => (selecting && canPick ? toggle(r.id) : isTeacher && r.role === "student" ? setOpenId(open ? null : r.id) : undefined)} className="flex w-full items-center gap-3 p-3.5 text-left">
                {selecting && canPick && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all duration-200" style={{ backgroundColor: on ? ACCENT : "transparent", border: `1.5px solid ${on ? ACCENT : "#C9CAD6"}`, color: "white" }}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>}
                <Avatar name={r.name} url={r.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold">{r.name}{r.me && <span className="font-medium" style={{ color: SOFT }}> (you)</span>}</p>
                  <p className="mt-0.5 truncate text-[12px]" style={{ color: SOFT }}>{r.role === "teacher" ? "Lecturer" : isTeacher && s ? (s.last_active ? `Active ${ago(s.last_active)}` : "No activity yet") : joinedLabel(r.joined) || "Student"}</p>
                </div>
                {r.role === "teacher" ? <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: WASH, color: ACCENT }}>Lecturer</span>
                  : isTeacher && <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: t.bg, color: t.fg }}>{t.label}</span>}
                {isTeacher && r.role === "student" && !selecting && <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-300" style={{ color: FAINT, transform: open ? "rotate(180deg)" : "none" }} />}
              </button>
              {isTeacher && r.role === "student" && (
                <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: open && !selecting ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <div className="px-3.5 pb-3.5">
                      <div className="grid grid-cols-3 gap-2">
                        {([["Messages", s?.n_msgs], ["Questions", s?.n_questions], ["Answers", s?.n_answers], ["Polls", s?.n_polls], ["Quizzes", s?.n_quizzes], ["Quiz avg", s && s.n_quizzes ? `${s.quiz_avg}%` : "–"]] as const).map(([k, v]) => (
                          <div key={k} className="rounded-2xl px-2 py-2.5 text-center" style={{ backgroundColor: CANVAS }}><p className="text-[16px] font-extrabold leading-none">{v ?? "–"}</p><p className="mt-1 text-[10.5px] font-semibold" style={{ color: SOFT }}>{k}</p></div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-2"><span className="text-[12px]" style={{ color: SOFT }}>{joinedLabel(r.joined)}</span><span className="ml-auto" />
                        <button onClick={() => { setRotate(false); setConfirm([r.id]); }} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-transform active:scale-95" style={{ backgroundColor: "#FDE7E2", color: RED }}><UserMinus className="h-4 w-4" />Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && shownTeachers.length === 0 && (
          <p className="rounded-[22px] border border-dashed px-4 py-10 text-center text-[13px]" style={{ borderColor: "rgba(20,22,31,0.14)", color: SOFT }}>{term || filter === "quiet" ? "No one matches." : isTeacher ? "No students yet. Share your join code above." : "No classmates yet."}</p>
        )}
      </div>

      {selecting && (
        <div className="mb-drop fixed inset-x-0 bottom-0 z-30 flex justify-center px-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <div className="flex w-full max-w-md items-center gap-3 rounded-full bg-white py-2 pl-5 pr-2 sm:max-w-xl" style={{ border: `1px solid ${LINE}`, boxShadow: "0 12px 34px rgba(20,22,31,0.16)" }}>
            <span className="flex-1 text-[13.5px] font-bold">{picked.size === 0 ? "Select students" : `${picked.size} selected`}</span>
            <button onClick={() => setPicked(picked.size === visible.length ? new Set() : new Set(visible.map((r) => r.id)))} className="text-[12.5px] font-bold" style={{ color: ACCENT }}>{picked.size === visible.length ? "Clear" : "All"}</button>
            <button disabled={picked.size === 0} onClick={() => { setRotate(false); setConfirm([...picked]); }} className="flex h-11 items-center gap-1.5 rounded-full px-5 text-[13px] font-bold text-white transition-all active:scale-95 disabled:opacity-40" style={{ backgroundColor: RED }}><Trash2 className="h-4 w-4" />Remove</button>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" style={{ backgroundColor: "rgba(20,22,31,0.4)" }} onClick={() => setConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} className="mb-drop w-full max-w-md rounded-t-[30px] bg-white px-5 pt-6 sm:rounded-[30px]" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))", boxShadow: "0 -12px 40px rgba(20,22,31,0.16)" }}>
            <h2 className="text-[19px] font-extrabold tracking-tight">Remove {confirm.length === 1 ? confirmNames[0] : `${confirm.length} students`}?</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: SOFT }}>They will lose access to this class and its discussion. They can rejoin with the join code, and you can undo for a few seconds.</p>
            {confirm.length > 1 && <p className="mt-3 line-clamp-2 text-[12.5px] font-semibold">{confirmNames.join(", ")}</p>}
            <button role="switch" aria-checked={rotate} onClick={() => setRotate((v) => !v)} className="mt-4 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left" style={{ backgroundColor: CANVAS }}>
              <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">Also change the join code</span><span className="block text-[12px]" style={{ color: SOFT }}>So they can't rejoin with the old one</span></span>
              <span className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300" style={{ backgroundColor: rotate ? ACCENT : "#D5D5E0" }}><span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300" style={{ transform: rotate ? "translateX(20px)" : "none", transitionTimingFunction: EASE }} /></span>
            </button>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 rounded-full py-3.5 text-[14px] font-bold" style={{ backgroundColor: CANVAS }}>Cancel</button>
              <button onClick={() => commitRemoval(confirm, rotate)} className="flex-1 rounded-full py-3.5 text-[14px] font-bold text-white transition-transform active:scale-[0.98]" style={{ backgroundColor: RED }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="mb-drop fixed inset-x-0 top-5 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full py-2.5 pl-5 pr-3 text-[13px] font-semibold text-white" style={{ backgroundColor: INK, boxShadow: "0 12px 30px rgba(20,22,31,0.3)" }}>
            {toast.msg}
            {toast.undo && <button onClick={() => { toast.undo?.(); setToast(null); }} className="rounded-full px-3 py-1 text-[12.5px] font-bold" style={{ backgroundColor: "rgba(255,255,255,0.16)" }}>Undo</button>}
          </div>
        </div>
      )}
    </div>,
  );
}