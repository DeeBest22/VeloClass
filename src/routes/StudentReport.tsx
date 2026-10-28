import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck, GraduationCap } from "lucide-react";

/* ---------- design tokens (same family as PerformanceAnalysis / work) ---------- */
const DISPLAY = "'Bricolage Grotesque', 'Plus Jakarta Sans', system-ui, sans-serif";
const INK = "#0E0F14", VIOLET = "#5B4DE8", TRACK = "#DEDBF1", MUTED = "#6F6C8A", SOFT = "#EFEDFC";
const GLASS = { background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 24px 60px -30px rgba(91,77,232,0.35)", backdropFilter: "blur(14px)" } as const;
const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-[#5B4DE8]";

const STATUS = {
  present: { label: "Present", solid: VIOLET, tint: "rgba(91,77,232,0.13)" },
  late: { label: "Late", solid: "#E8A13A", tint: "rgba(232,161,58,0.30)" },
  absent: { label: "Absent", solid: "#D3402E", tint: "rgba(211,64,46,0.22)" },
  excused: { label: "Excused", solid: "#B7B2DE", tint: "rgba(183,178,222,0.50)" },
} as const;
type Status = keyof typeof STATUS;

/* ---------- hardcoded data ---------- */
const STUDENT = { name: "Chidera Okonkwo", klass: "Mathematics · Year 10B", rank: "4th", of: 32 };

type Kind = "Quiz" | "Assignment" | "Exam";
const GRADES: { title: string; kind: Kind; date: string; score: number; max: number; cls: number }[] = [
  { title: "Algebra basics", kind: "Quiz", date: "2026-09-08", score: 16, max: 20, cls: 71 },
  { title: "Linear equations", kind: "Assignment", date: "2026-09-15", score: 18, max: 25, cls: 74 },
  { title: "Mid-term exam", kind: "Exam", date: "2026-09-24", score: 68, max: 100, cls: 63 },
  { title: "Factorisation", kind: "Quiz", date: "2026-10-01", score: 17, max: 20, cls: 72 },
  { title: "Word problems", kind: "Assignment", date: "2026-10-08", score: 39, max: 50, cls: 76 },
  { title: "Quadratics", kind: "Quiz", date: "2026-10-13", score: 22, max: 25, cls: 70 },
  { title: "Geometry project", kind: "Assignment", date: "2026-10-20", score: 42, max: 50, cls: 79 },
  { title: "Coordinate geometry", kind: "Quiz", date: "2026-10-26", score: 46, max: 50, cls: 77 },
];
const pctOf = (g: (typeof GRADES)[number]) => Math.round((g.score / g.max) * 100);
const PCTS = GRADES.map(pctOf);
const CLS = GRADES.map((g) => g.cls);
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const AVG = Math.round(mean(PCTS));
const DIFF = Math.round(mean(PCTS) - mean(CLS));

/* October 2026, school days only (Mon–Fri). Everything not listed was present. */
const TODAY = 27;
const NOTES: Record<number, [Status, string]> = {
  6: ["late", "Arrived 8:41 AM"],
  9: ["absent", "Sick leave"],
  14: ["late", "Arrived 8:35 AM"],
  16: ["excused", "Inter-house sports"],
  22: ["late", "Arrived 8:52 AM"],
};
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1).filter((d) => { const w = new Date(2026, 9, d).getDay(); return w >= 1 && w <= 5; });
const OFFSET = new Date(2026, 9, 1).getDay() - 1;
const statusOf = (d: number): Status | null => (d > TODAY ? null : NOTES[d]?.[0] ?? "present");
const noteOf = (d: number) => NOTES[d]?.[1] ?? "On time";
const PAST = DAYS.filter((d) => d <= TODAY);
const COUNT: Record<Status, number> = { present: 0, late: 0, absent: 0, excused: 0 };
PAST.forEach((d) => { COUNT[statusOf(d)!]++; });
const RATE = Math.round(((COUNT.present + COUNT.late) / (PAST.length - COUNT.excused)) * 100);

/* ---------- helpers ---------- */
const toDate = (v: string | number) => (typeof v === "string" ? new Date(`${v}T12:00:00`) : new Date(2026, 9, v, 12));
const dayOf = (v: string | number) => toDate(v).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const shortDay = (v: string) => toDate(v).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");

const Panel = ({ children }: { children: React.ReactNode }) => <section className="rounded-[28px] p-5" style={GLASS}>{children}</section>;
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="text-[19px] font-medium tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{children}</h2>;

/* ---------- score trend chart ---------- */
const W = 320, H = 150, PL = 28, PR = 12, PT = 12, PB = 22;
const X = (i: number) => PL + (i * (W - PL - PR)) / (GRADES.length - 1);
const Y = (v: number) => PT + (1 - (v - 50) / 50) * (H - PT - PB);
const curve = (vals: number[]) => {
  let d = "";
  vals.forEach((v, i) => {
    if (i === 0) { d = `M${X(0)} ${Y(v)}`; return; }
    const mx = (X(i - 1) + X(i)) / 2;
    d += ` C${mx} ${Y(vals[i - 1]!)} ${mx} ${Y(v)} ${X(i)} ${Y(v)}`;
  });
  return d;
};

function Trend({ sel, setSel, shown }: { sel: number; setSel: (i: number) => void; shown: boolean }) {
  const line = curve(PCTS), cls = curve(CLS), g = GRADES[sel]!;
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <H2>Score trend</H2>
          <p className="mt-1 text-[12.5px] font-medium" style={{ color: MUTED }}>{DIFF >= 0 ? `${DIFF} points above` : `${-DIFF} points below`} the class average</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-1 text-[11px] font-medium" style={{ color: MUTED }}>
          <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full" style={{ backgroundColor: VIOLET }} />Chidera</span>
          <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: MUTED }} />Class</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Score percentage per assessment compared with the class average">
        <defs><linearGradient id="sr-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={VIOLET} stopOpacity="0.22" /><stop offset="1" stopColor={VIOLET} stopOpacity="0" /></linearGradient></defs>
        {[60, 80, 100].map((v) => (
          <g key={v}><line x1={PL} x2={W - PR} y1={Y(v)} y2={Y(v)} stroke="#CFCBEA" strokeWidth="1" strokeDasharray="1 4" strokeLinecap="round" /><text x="0" y={Y(v) + 3} fontSize="9" fill={MUTED}>{v}</text></g>
        ))}
        <path d={`${line} L${X(GRADES.length - 1)} ${H - PB} L${X(0)} ${H - PB} Z`} fill="url(#sr-area)" style={{ opacity: shown ? 1 : 0, transition: "opacity 1s ease .5s" }} />
        <path d={cls} fill="none" stroke={MUTED} strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" style={{ opacity: shown ? 0.7 : 0, transition: "opacity .8s ease .4s" }} />
        <path d={line} fill="none" stroke={VIOLET} strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={shown ? 0 : 1} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)" }} />
        {PCTS.map((p, i) => {
          const on = i === sel;
          return (
            <g key={i} role="button" tabIndex={0} aria-label={`${GRADES[i]!.title}, ${p}%`} onClick={() => setSel(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSel(i); }} className="cursor-pointer outline-none" style={{ opacity: shown ? 1 : 0, transition: `opacity .4s ease ${0.5 + i * 0.08}s` }}>
              <circle cx={X(i)} cy={Y(p)} r="15" fill="transparent" />
              <circle cx={X(i)} cy={Y(p)} r={on ? 6 : 3.5} fill={on ? VIOLET : INK} stroke="#fff" strokeWidth="2" style={{ transition: "r .25s ease, fill .25s ease" }} />
            </g>
          );
        })}
        <text x={X(0)} y={H - 5} fontSize="9.5" fill={MUTED} textAnchor="start">{shortDay(GRADES[0]!.date)}</text>
        <text x={X(GRADES.length - 1)} y={H - 5} fontSize="9.5" fill={MUTED} textAnchor="end">{shortDay(GRADES[GRADES.length - 1]!.date)}</text>
      </svg>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3">
        <div className="min-w-0"><p className="truncate text-[14px] font-semibold" style={{ color: INK }}>{g.title}</p><p className="text-[12px] font-medium" style={{ color: MUTED }}>{g.kind} · {dayOf(g.date)}</p></div>
        <div className="shrink-0 text-right"><p className="text-[22px] font-medium leading-none" style={{ fontFamily: DISPLAY, color: INK }}>{PCTS[sel]}%</p><p className="mt-1 text-[11px] font-medium" style={{ color: MUTED }}>Class {g.cls}%</p></div>
      </div>
    </Panel>
  );
}

/* ---------- page ---------- */
export const Route = createFileRoute("/StudentReport")({
  validateSearch: (s: Record<string, unknown>) => ({ classId: typeof s.classId === "string" ? s.classId : "", studentId: typeof s.studentId === "string" ? s.studentId : "" }),
  component: StudentReport,
});

function StudentReport() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [shown, setShown] = useState(false);
  const [sel, setSel] = useState(GRADES.length - 1);
  const [filter, setFilter] = useState<"All" | Kind>("All");
  const [day, setDay] = useState(TODAY);
  useEffect(() => { const t = window.setTimeout(() => setShown(true), 60); return () => window.clearTimeout(t); }, []);

  const rows = GRADES.map((g, i) => ({ g, i })).filter(({ g }) => filter === "All" || g.kind === filter).reverse();
  const dStatus = statusOf(day) ?? "present";
  const exceptions = PAST.filter((d) => statusOf(d) !== "present").reverse();

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(165deg,#E4E0FF 0%,#F2F0FF 52%,#E9E5FF 100%)" }}>
      <style>{`@keyframes sr-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.sr-in{animation:sr-in .45s cubic-bezier(.22,1,.36,1)}@media (prefers-reduced-motion:reduce){.sr-in{animation:none}}`}</style>
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-12 pt-6">
        <button type="button" onClick={() => router.history.back()} aria-label="Back" className={`grid size-11 place-items-center rounded-full bg-white/70 transition-transform active:scale-90 ${FOCUS}`}><ArrowLeft className="size-5" style={{ color: INK }} strokeWidth={2.2} /></button>

        <div className="mt-6 flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full text-[19px] font-medium text-white" style={{ backgroundColor: INK, fontFamily: DISPLAY, boxShadow: `0 0 0 4px ${SOFT}` }}>{initials(STUDENT.name)}</span>
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-medium leading-tight tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{STUDENT.name}</h1>
            <p className="text-[13px] font-medium" style={{ color: MUTED }}>{STUDENT.klass}</p>
          </div>
        </div>

        <section className="mt-6 grid grid-cols-3 divide-x divide-[#DEDBF1] rounded-[28px] py-5" style={GLASS}>
          {[{ v: `${AVG}%`, l: "Average" }, { v: `${RATE}%`, l: "Attendance" }, { v: STUDENT.rank, l: `Rank of ${STUDENT.of}` }].map((s) => (
            <div key={s.l} className="min-w-0 px-5">
              <p className="text-[32px] font-medium leading-none tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{s.v}</p>
              <p className="mt-2 truncate text-[12px] font-medium" style={{ color: MUTED }}>{s.l}</p>
            </div>
          ))}
        </section>

        <div role="tablist" className="relative mt-5 grid grid-cols-2 rounded-full bg-white/60 p-1">
          <span className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white" style={{ transform: `translateX(${tab * 100}%)`, transition: "transform .4s cubic-bezier(.22,1,.36,1)", boxShadow: "0 6px 16px -8px rgba(14,15,20,0.25)" }} />
          {[{ l: "Grades", Icon: GraduationCap }, { l: "Attendance", Icon: CalendarCheck }].map(({ l, Icon }, i) => (
            <button key={l} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)} className={`relative z-10 flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors ${FOCUS}`} style={{ color: tab === i ? INK : MUTED }}><Icon className="size-4" strokeWidth={2} />{l}</button>
          ))}
        </div>

        {tab === 0 ? (
          <div key="grades" className="sr-in mt-4 grid items-start gap-4 sm:grid-cols-2">
            <Trend sel={sel} setSel={setSel} shown={shown} />
            <div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(["All", "Quiz", "Assignment", "Exam"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFilter(f)} className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors ${FOCUS}`} style={{ backgroundColor: filter === f ? INK : "rgba(255,255,255,0.6)", color: filter === f ? "#fff" : MUTED }}>{f === "All" ? "All" : `${f}s`}</button>
                ))}
              </div>
              <div className="mt-3 space-y-2.5">
                {rows.map(({ g, i }) => {
                  const on = i === sel, p = PCTS[i]!;
                  return (
                    <button key={g.title} type="button" onClick={() => setSel(i)} className={`block w-full rounded-[22px] p-4 text-left transition-all ${FOCUS}`} style={{ background: on ? "#fff" : "rgba(255,255,255,0.5)", boxShadow: on ? `inset 0 0 0 1.5px ${VIOLET}` : "none" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-[15px] font-semibold" style={{ color: INK }}>{g.title}</p><p className="mt-0.5 text-[12px] font-medium" style={{ color: MUTED }}>{g.kind} · {dayOf(g.date)}</p></div>
                        <div className="shrink-0 text-right"><p className="text-[20px] font-medium leading-none" style={{ fontFamily: DISPLAY, color: INK }}>{p}%</p><p className="mt-1 text-[11px] font-medium" style={{ color: MUTED }}>{g.score}/{g.max}</p></div>
                      </div>
                      <div className="relative mt-3.5 h-1.5 rounded-full" style={{ backgroundColor: TRACK }}>
                        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: shown ? `${p}%` : "0%", backgroundColor: on ? VIOLET : INK, transition: "width .9s cubic-bezier(.22,1,.36,1), background-color .3s" }} />
                        <span className="absolute -top-[3px] h-3 w-[2px] rounded-full" style={{ left: `${g.cls}%`, backgroundColor: MUTED }} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 px-1 text-[11.5px] font-medium" style={{ color: MUTED }}>The grey tick on each bar marks the class average.</p>
            </div>
          </div>
        ) : (
          <div key="attendance" className="sr-in mt-4 grid items-start gap-4 sm:grid-cols-2">
            <Panel>
              <div className="flex items-start justify-between gap-3">
                <div><H2>October 2026</H2><p className="mt-1 text-[12.5px] font-medium" style={{ color: MUTED }}>{PAST.length} school days so far</p></div>
                <p className="text-[26px] font-medium leading-none tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{RATE}%</p>
              </div>
              <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                {(Object.keys(STATUS) as Status[]).filter((s) => COUNT[s] > 0).map((s) => <span key={s} style={{ flexGrow: COUNT[s], backgroundColor: STATUS[s].solid }} />)}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-medium" style={{ color: INK }}>
                {(Object.keys(STATUS) as Status[]).map((s) => <span key={s} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: STATUS[s].solid }} />{STATUS[s].label} {COUNT[s]}</span>)}
              </div>

              <div className="mt-5 grid grid-cols-5 gap-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((w) => <span key={w} className="pb-1 text-center text-[11px] font-medium" style={{ color: MUTED }}>{w}</span>)}
                {Array.from({ length: OFFSET }, (_, i) => <span key={`b${i}`} />)}
                {DAYS.map((d) => {
                  const s = statusOf(d), on = d === day;
                  return (
                    <button key={d} type="button" disabled={!s} onClick={() => setDay(d)} aria-label={s ? `${dayOf(d)}, ${STATUS[s].label}` : `${dayOf(d)}, upcoming`} className={`grid aspect-square place-items-center rounded-2xl text-[14px] font-medium transition-all ${FOCUS}`} style={{ backgroundColor: s ? STATUS[s].tint : "transparent", color: s ? INK : "#A9A6C4", boxShadow: on ? `inset 0 0 0 2px ${INK}` : "none" }}>{d}</button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS[dStatus].solid }} />
                <div className="min-w-0"><p className="text-[14px] font-semibold" style={{ color: INK }}>{dayOf(day)} · {STATUS[dStatus].label}</p><p className="text-[12px] font-medium" style={{ color: MUTED }}>{noteOf(day)}</p></div>
              </div>
            </Panel>

            <Panel>
              <H2>Late, absent and excused</H2>
              <div className="mt-3 divide-y divide-[#DEDBF1]">
                {exceptions.map((d) => {
                  const s = statusOf(d)!;
                  return (
                    <div key={d} className="flex items-center justify-between gap-3 py-3.5">
                      <div className="min-w-0"><p className="text-[14px] font-semibold" style={{ color: INK }}>{dayOf(d)}</p><p className="truncate text-[12px] font-medium" style={{ color: MUTED }}>{noteOf(d)}</p></div>
                      <span className="shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold" style={{ backgroundColor: STATUS[s].tint, color: INK }}>{STATUS[s].label}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
}