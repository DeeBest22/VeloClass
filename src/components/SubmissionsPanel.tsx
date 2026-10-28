import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChartNoAxesColumn, Check, ChevronLeft, ChevronRight, Minus, Paperclip, Plus, X } from "lucide-react";
import defaultPic from "@/assets/pfp.png";
import { getLiveMembers } from "@/lib/live-class";
import { PerformanceAnalysis } from "@/components/PerformanceAnalysis";
import { signedWorkUrl } from "@/lib/work";
import { autoMark, parseAnswers, useAnswerKey, useGradeActions, useWorkGrades, type Grade, type KeyQuestion } from "@/lib/grading";

const LETTERS = ["A", "B", "C", "D"];
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const when = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

type Work = { id: string; title: string; points: number | null; type: string };
type Row = { pic: string; id: string; studentId: string | null; name: string; at: string; late: boolean; body: string; attachments: { path: string; name: string }[]; answers: Record<string, number> | null; auto: ReturnType<typeof autoMark> | null; grade: Grade | null; final: number | null };

const Pfp = ({ src, size = 40 }: { src: string; size?: number }) => (
  <img src={src} alt="" draggable={false} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, maxWidth: "none" }} />
);

/* ---------- grade sheet ---------- */
function GradeSheet({ row, max, onClose, onSave, onReset }: { row: Row; max: number; onClose: () => void; onSave: (score: number, feedback: string) => Promise<void>; onReset: () => Promise<void> }) {
  const [score, setScore] = useState(fmt(row.grade?.score ?? row.auto?.score ?? 0));
  const [feedback, setFeedback] = useState(row.grade?.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const n = Number(score);
  const valid = score.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= max;
  const step = (d: number) => setScore(fmt(Math.min(max, Math.max(0, Math.round(((Number.isFinite(n) ? n : 0) + d) * 100) / 100))));
  const run = (p: Promise<void>) => { setBusy(true); void p.then(onClose).catch(() => {}).finally(() => setBusy(false)); };
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-md rounded-t-3xl bg-background px-6 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="text-[12px] font-bold text-muted-foreground">Grade</p>
        <h3 className="mt-0.5 text-[20px] font-bold tracking-tight text-foreground">{row.name}</h3>
        <div className="mt-6 flex items-center justify-center gap-5">
          <button type="button" aria-label="Decrease" onClick={() => step(-1)} className="grid size-12 place-items-center rounded-full bg-surface text-foreground transition-transform active:scale-90"><Minus className="size-5" strokeWidth={2.4} /></button>
          <div className="flex items-baseline gap-1.5">
            <input value={score} onChange={(e) => setScore(e.target.value.replace(",", "."))} inputMode="decimal" aria-label="Score" className={`w-24 bg-transparent text-center text-[44px] font-bold leading-none tracking-tight outline-none ${valid ? "text-foreground" : "text-red-500"}`} />
            <span className="text-[16px] font-bold text-muted-foreground">/ {fmt(max)}</span>
          </div>
          <button type="button" aria-label="Increase" onClick={() => step(1)} className="grid size-12 place-items-center rounded-full bg-surface text-foreground transition-transform active:scale-90"><Plus className="size-5" strokeWidth={2.4} /></button>
        </div>
        {row.auto && (
          <p className="mt-3 text-center text-[12.5px] font-medium text-muted-foreground">
            Auto score {fmt(row.auto.score)} / {fmt(max)}
            {row.grade && <button type="button" disabled={busy} onClick={() => run(onReset())} className="ml-2 font-bold text-feature">Use it</button>}
          </p>
        )}
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1000} rows={3} placeholder="Feedback (optional)" className="mt-5 w-full resize-none rounded-2xl bg-surface p-4 text-[15px] leading-snug text-foreground outline-none placeholder:text-muted-foreground" />
        <button type="button" disabled={!valid || busy} onClick={() => run(onSave(n, feedback))} className="mt-4 flex h-14 w-full items-center justify-center rounded-full bg-feature text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40">{busy ? "Saving…" : "Save grade"}</button>
      </div>
    </div>
  );
}

/* ---------- review: the student's test, as they saw it ---------- */
function Review({ row, max, keyQs, onClose, onSave, onReset }: { row: Row; max: number; keyQs: KeyQuestion[]; onClose: () => void; onSave: (score: number, feedback: string) => Promise<void>; onReset: () => Promise<void> }) {
  const [index, setIndex] = useState(0);
  const [grading, setGrading] = useState(false);
  const touchX = useRef<number | null>(null);
  const mc = !!row.answers && keyQs.length > 0;
  const n = keyQs.length;
  const pq = n ? Math.round((max / n) * 100) / 100 : 0;
  const go = (d: number) => setIndex((i) => Math.min(n - 1, Math.max(0, i + d)));
  const status = (q: KeyQuestion) => { const a = row.answers?.[q.qid]; return typeof a !== "number" || a < 0 || a >= q.options.length ? "skipped" : a === q.correct_index ? "right" : "wrong"; };
  const last = index === n - 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <main className="mx-auto min-h-screen w-full max-w-md pb-36">
        <div className="flex items-center justify-between px-6 pt-7">
          <button type="button" aria-label="Back to submissions" onClick={onClose} className="-ml-1 grid size-9 place-items-center rounded-full text-foreground transition-colors active:bg-muted"><ArrowLeft className="size-[22px]" strokeWidth={2.2} /></button>
          <button type="button" onClick={() => setGrading(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-surface px-4 text-[13px] font-bold text-foreground transition-transform active:scale-95">
            {row.final !== null ? <>{fmt(row.final)} / {fmt(max)}</> : "Grade"}
            {row.grade && <Check className="size-3.5 text-feature" strokeWidth={3} />}
          </button>
        </div>
        <div className="mt-5 flex items-center gap-3 px-6">
          <Pfp src={row.pic} size={44} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-foreground">{row.name}</p>
            <p className="text-[12px] font-medium text-muted-foreground">{when(row.at)}{row.late ? " · Late" : ""}</p>
          </div>
        </div>

        {mc ? (
          <>
            <ul className="mt-4 flex gap-1 px-6" aria-label="Question progress">
              {keyQs.map((q, i) => {
                const s = status(q);
                return (
                  <li key={q.qid} className="flex-1">
                    <button type="button" aria-label={`Go to question ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} className="block w-full py-2">
                      <span className={`block h-1 rounded-full transition-colors duration-300 ${i === index ? "bg-feature" : s === "right" ? "bg-feature/35" : s === "wrong" ? "bg-red-500/40" : "bg-surface"}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 overflow-hidden" onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={(e) => { if (touchX.current === null) return; const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current; touchX.current = null; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); }}>
              <div className="flex items-start transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
                {keyQs.map((q, qi) => {
                  const picked = row.answers?.[q.qid];
                  const s = status(q);
                  return (
                    <section key={q.qid} aria-hidden={qi !== index} aria-label={`Question ${qi + 1} of ${n}`} className="w-full shrink-0 px-6">
                      <div className="flex items-center justify-between text-[12px] font-bold text-muted-foreground">
                        <span>Question {qi + 1} of {n}</span>
                        <span>{s === "right" ? fmt(pq) : 0} / {fmt(pq)} {pq === 1 ? "point" : "points"}</span>
                      </div>
                      <h2 className="mt-3 text-[22px] font-bold leading-snug tracking-tight text-foreground">{q.qtext}</h2>
                      <div className="mt-6 space-y-2.5">
                        {q.options.map((opt, k) => {
                          const isRight = k === q.correct_index, isMine = k === picked;
                          return (
                            <div key={k} className={`flex w-full items-center gap-4 rounded-2xl p-3 pr-5 ${isRight ? "bg-feature/10" : isMine ? "bg-red-500/10" : "bg-surface"}`}>
                              <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-bold ${isRight ? "bg-feature text-white" : isMine ? "bg-red-500 text-white" : "bg-background text-muted-foreground"}`}>
                                {isRight ? <Check className="size-[18px]" strokeWidth={3} /> : isMine ? <X className="size-[18px]" strokeWidth={3} /> : LETTERS[k]}
                              </span>
                              <span className="min-w-0 flex-1 text-[16px] font-semibold leading-snug text-foreground">{opt}</span>
                              {(isMine || isRight) && <span className="shrink-0 text-[11px] font-bold text-muted-foreground">{isMine ? "Chosen" : "Correct"}</span>}
                            </div>
                          );
                        })}
                      </div>
                      {s === "skipped" && <p className="mt-3 text-[13px] font-medium text-muted-foreground">Not answered</p>}
                    </section>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-8 px-6">
            <p className="text-[12px] font-bold text-muted-foreground">{row.answers ? "Answers" : "Response"}</p>
            {row.answers ? (
              <p className="mt-3 rounded-2xl bg-surface p-4 text-[14px] font-medium text-muted-foreground">{Object.values(row.answers).filter((v) => v >= 0).length} answers were submitted. The answer key isn't available, so you can set the score yourself.</p>
            ) : (
              <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-surface p-4 text-[16px] leading-relaxed text-foreground">{row.body || "No written response."}</p>
            )}
            {row.attachments.map((a) => (
              <button key={a.path} type="button" onClick={() => void signedWorkUrl(a.path)} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 text-left text-[14px] font-bold text-feature"><Paperclip className="size-4 shrink-0" /><span className="truncate">{a.name}</span></button>
            ))}
            {row.grade?.feedback && <p className="mt-5 text-[13px] font-medium text-muted-foreground">Your feedback: {row.grade.feedback}</p>}
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 z-20">
          <div className="mx-auto w-full max-w-md bg-gradient-to-t from-background via-background/95 to-transparent px-6 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3">
              {mc && <button type="button" aria-label="Previous question" onClick={() => go(-1)} disabled={index === 0} className="grid size-14 shrink-0 place-items-center rounded-full bg-surface text-foreground transition-all active:scale-90 disabled:opacity-35"><ChevronLeft className="size-6" strokeWidth={2.4} /></button>}
              <button type="button" onClick={() => (mc && !last ? go(1) : setGrading(true))} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-feature text-[15px] font-bold text-white transition-transform active:scale-[0.98]">
                {mc && !last ? "Next" : row.grade ? "Edit grade" : "Grade"}
                {mc && !last && <ArrowRight className="size-[18px]" strokeWidth={2.4} />}
              </button>
            </div>
          </div>
        </div>
      </main>
      {grading && <GradeSheet row={row} max={max} onClose={() => setGrading(false)} onSave={onSave} onReset={onReset} />}
    </div>
  );
}

/* ---------- the list ---------- */
export function SubmissionsPanel({ work, classId, submissions, loading }: { work: Work; classId: string; submissions: any[] | undefined; loading: boolean }) {
  const keyQ = useAnswerKey(work.id);
  const gradesQ = useWorkGrades(work.id);
  const actions = useGradeActions(work.id);
  const keyQs = keyQ.data ?? [];
  const max = work.points ?? (keyQs.length || 100);
  const [filter, setFilter] = useState<"all" | "todo" | "late">("all");
  const [sort, setSort] = useState<"recent" | "score" | "name">("recent");
  const [openId, setOpenId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState(false);
  const membersQ = useQuery({ queryKey: ["live-members", classId], enabled: !!classId, queryFn: () => getLiveMembers(classId) });
  const [toast, setToast] = useState<string | null>(null);
  const say = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2000); };

  const rows = useMemo<Row[]>(() => {
    const grades = new Map((gradesQ.data ?? []).map((g) => [g.submission_id, g]));
    const byId = new Map((membersQ.data ?? []).map((m) => [m.id, m]));
    const byName = new Map((membersQ.data ?? []).map((m) => [m.name.trim().toLowerCase(), m]));
    return (submissions ?? []).map((s: any) => {
      const member = byId.get(s.student_id ?? s.user_id) ?? byName.get(String(s.student_name ?? "").trim().toLowerCase());
      const answers = parseAnswers(s.body);
      const auto = answers && keyQs.length ? autoMark(answers, keyQs, max) : null;
      const grade = grades.get(s.id) ?? null;
      return { pic: member?.avatar_url ?? s.avatar_url ?? defaultPic, id: s.id, studentId: s.student_id ?? s.user_id ?? null, name: s.student_name ?? "Student", at: s.submitted_at, late: !!s.is_late, body: s.body ?? "", attachments: s.attachments ?? [], answers, auto, grade, final: grade?.score ?? auto?.score ?? null };
    });
  }, [submissions, gradesQ.data, membersQ.data, keyQs, max]);

  const scored = rows.filter((r) => r.final !== null);
  const avg = scored.length ? Math.round((scored.reduce((s, r) => s + r.final! / max, 0) / scored.length) * 100) : null;
  const todo = rows.filter((r) => r.final === null).length;
  const withAns = rows.filter((r) => r.answers);
  const acc = keyQs.map((q) => (withAns.length ? Math.round((withAns.filter((r) => r.answers![q.qid] === q.correct_index).length / withAns.length) * 100) : 0));

  const list = rows.filter((r) => (filter === "todo" ? r.final === null : filter === "late" ? r.late : true))
    .sort((a, b) => sort === "score" ? (b.final ?? -1) - (a.final ?? -1) : sort === "name" ? a.name.localeCompare(b.name) : Date.parse(b.at) - Date.parse(a.at));
  const current = rows.find((r) => r.id === openId) ?? null;

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [r.name, r.at, r.late ? "Late" : "", r.final ?? "", max, r.final !== null ? Math.round((r.final / max) * 100) : "", r.grade ? "Graded" : r.auto ? "Auto" : "Not graded", r.grade?.feedback ?? ""].map(esc).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[["Name", "Submitted", "Late", "Score", "Out of", "Percent", "Source", "Feedback"].map(esc).join(","), ...lines].join("\n")], { type: "text/csv" }));
    a.download = `${work.title.replace(/[^\w-]+/g, "_")}-grades.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-bold tracking-tight text-foreground">Submissions</h2>
        {rows.length > 0 && <button type="button" onClick={exportCsv} className="text-[13px] font-bold text-feature">Export</button>}
      </div>

      {loading ? <p className="mt-4 text-[14px] font-medium text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface p-5 text-center text-[14px] font-medium text-muted-foreground">No submissions yet.</p>
      ) : (
        <>
          <button type="button" onClick={() => setAnalysis(true)} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-feature/10 p-3.5 text-left transition-transform active:scale-[0.99]">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-feature text-white"><ChartNoAxesColumn className="size-[18px]" strokeWidth={2.2} /></span>
            <span className="min-w-0 flex-1 text-[15px] font-bold text-foreground">View performance analysis</span>
            <ChevronRight className="size-4 shrink-0 text-feature" />
          </button>

          <div className="mt-7 flex items-center gap-5 text-[13px] font-bold">
            {([["all", "All"], ["todo", "To grade"], ["late", "Late"]] as const).map(([id, l]) => <button key={id} type="button" onClick={() => setFilter(id)} className={`transition-colors ${filter === id ? "text-foreground" : "text-muted-foreground"}`}>{l}</button>)}
            <button type="button" onClick={() => setSort(sort === "recent" ? "score" : sort === "score" ? "name" : "recent")} className="ml-auto text-muted-foreground">{sort === "recent" ? "Latest" : sort === "score" ? "Top score" : "A to Z"}</button>
          </div>

          <div className="mt-3 space-y-2">
            {list.map((r) => (
              <button key={r.id} type="button" onClick={() => setOpenId(r.id)} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 text-left transition-transform active:scale-[0.99]">
                <Pfp src={r.pic} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-foreground">{r.name}</span>
                  <span className="block text-[12px] font-medium text-muted-foreground">{when(r.at)}{r.late ? " · Late" : ""}</span>
                </span>
                {r.final !== null ? (
                  <span className="text-right">
                    <span className={`block text-[15px] font-bold tabular-nums ${r.final / max < 0.5 ? "text-red-500" : "text-foreground"}`}>{fmt(r.final)}/{fmt(max)}</span>
                    <span className="block text-[11px] font-medium text-muted-foreground">{r.grade ? "Graded" : "Auto"}</span>
                  </span>
                ) : <span className="text-[13px] font-bold text-feature">Grade</span>}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
            {list.length === 0 && <p className="py-8 text-center text-[14px] font-medium text-muted-foreground">Nothing here.</p>}
          </div>
          {(keyQ.isError || gradesQ.isError) && <p className="mt-4 text-[12.5px] font-medium text-muted-foreground">Scores need the latest database update before they can show. {((keyQ.error ?? gradesQ.error) as Error)?.message}</p>}
          {keyQ.isSuccess && keyQs.length === 0 && withAns.length > 0 && <p className="mt-4 text-[12.5px] font-medium text-muted-foreground">No answer key came back for this quiz, so scores and question stats can't be calculated.</p>}
        </>
      )}

      {analysis && (
        <PerformanceAnalysis onClose={() => setAnalysis(false)} data={{
          submitted: rows.length, average: avg, max,
          bands: [0, 1, 2, 3].map((i) => scored.filter((r) => { const p = r.final! / max; return (p >= 0.8 ? 0 : p >= 0.6 ? 1 : p >= 0.4 ? 2 : 3) === i; }).length),
          accuracy: acc,
          top: scored.length ? (() => { const t = [...scored].sort((a, b) => b.final! - a.final!)[0]!; return { name: t.name, score: t.final! }; })() : null,
          onOpenTop: () => { const t = [...scored].sort((a, b) => b.final! - a.final!)[0]; if (t) { setAnalysis(false); setOpenId(t.id); } },
        }} />
      )}
      {current && (
        <Review key={current.id} row={current} max={max} keyQs={keyQs} onClose={() => setOpenId(null)}
          onSave={(score, fb) => actions.save(current.id, current.studentId, score, fb).then(() => say("Grade saved")).catch((e: Error) => { say(e.message); throw e; })}
          onReset={() => actions.clear(current.id).then(() => say("Using the auto score")).catch((e: Error) => { say(e.message); throw e; })} />
      )}
      {toast && <div className="fixed inset-x-0 top-5 z-[70] flex justify-center px-4"><div className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-semibold text-background shadow-lg">{toast}</div></div>}
    </section>
  );
}