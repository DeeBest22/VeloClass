import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Clock, ListChecks, Plus, Trash2, X } from "lucide-react";
import QuestionBuilder, { type Question as BQ } from "@/components/QuestionBuilder";
import { closeQuiz, createQuiz, deleteQuiz, getQuizResult, getQuizResults, listQuizzes, startQuiz, submitQuiz, type QuizResult, type QuizStart, type QuizSummary } from "@/lib/quizzes";

export type QWho = { name: string; pic: string } | null;
export type Student = { id: string; name: string; pic: string };
const INK = "#14161F", SOFT = "#707285", CANVAS = "#F5F5FA", ACCENT = "#5B3FE0", WASH = "#EEEAFD", LINE = "rgba(20,22,31,0.07)", CHIP = "#E9E9F1", GREEN = "#0D9B57", RED = "#D3402E";
const SHADOW = "0 1px 2px rgba(16,16,20,.04), 0 10px 28px -14px rgba(16,16,20,.12)";
const EASE = "cubic-bezier(.22,1,.36,1)";
const LETTERS = ["A", "B", "C", "D"];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const seeded = (seed: string) => { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); };

const Pill = ({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) => (
  <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: bg, color: fg }}>{children}</span>
);
const Face = ({ w, size = 32 }: { w: QWho; size?: number }) => w ? <img src={w.pic} alt="" draggable={false} className="block shrink-0 rounded-full object-cover" style={{ width: size, height: size, maxWidth: "none", boxShadow: "0 0 0 1px rgba(20,22,31,0.06)" }} /> : <span className="shrink-0 rounded-full" style={{ width: size, height: size, backgroundColor: CHIP }} />;
const Back = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}><ChevronLeft className="h-5 w-5" /></button>;
const Primary = ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40" style={{ backgroundColor: ACCENT }}>{children}</button>;

/* ---------- card: used in the chat and in the list ---------- */
export function QuizCard({ quiz, who, time, teacher, onOpen }: { quiz: QuizSummary; who: QWho; time: string; teacher: boolean; onOpen: () => void }) {
  const done = quiz.my_status === "done";
  const cta = teacher ? "View results" : done ? "View result" : quiz.my_status === "started" ? "Resume" : quiz.closed ? "Closed" : "Start quiz";
  const dead = !teacher && !done && quiz.closed && quiz.my_status === "none";
  return (
    <article onClick={dead ? undefined : onOpen} className="rounded-[26px] bg-white p-5 text-left ring-1 ring-black/[0.035] transition-transform duration-200 active:scale-[0.99]" style={{ boxShadow: SHADOW, cursor: dead ? "default" : "pointer" }}>
      <div className="mb-3 flex items-center gap-2.5">
        <Face w={who} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{who?.name ?? "Lecturer"}<span className="font-medium" style={{ color: SOFT }}> sent a quiz</span></span>
        <span className="shrink-0 text-[11.5px]" style={{ color: SOFT }}>{time}</span>
      </div>
      <div className="flex items-center gap-2">
        <Pill bg={quiz.closed ? CHIP : "#E3F6EC"} fg={quiz.closed ? SOFT : GREEN}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: quiz.closed ? SOFT : "#22C55E" }} />{quiz.closed ? "Closed" : "Open"}</Pill>
        <Pill bg={WASH} fg={ACCENT}><ListChecks className="h-3 w-3" />{quiz.question_count} {quiz.question_count === 1 ? "question" : "questions"}</Pill>
        <Pill bg={CHIP} fg={SOFT}><Clock className="h-3 w-3" />{quiz.duration_minutes ? `${quiz.duration_minutes} min` : "Untimed"}</Pill>
      </div>
      <h3 className="mt-3 text-[17px] font-extrabold leading-[23px] tracking-[-0.015em] [overflow-wrap:anywhere]">{quiz.title}</h3>
      <div className="mt-4 flex items-center gap-2 pt-3.5" style={{ borderTop: `1px solid ${LINE}` }}>
        {teacher ? (
          <span className="text-[12.5px] font-semibold" style={{ color: SOFT }}>{quiz.submitted_count} submitted{quiz.submitted_count > 0 ? ` · avg ${quiz.avg_pct ?? 0}%` : ""}</span>
        ) : done ? (
          <span className="flex items-center gap-1.5 text-[13px] font-extrabold" style={{ color: GREEN }}><Check className="h-4 w-4" strokeWidth={3} />{quiz.my_score}/{quiz.my_total} · {pct(quiz.my_score ?? 0, quiz.my_total ?? 0)}%</span>
        ) : <span className="text-[12.5px] font-semibold" style={{ color: SOFT }}>{quiz.my_status === "started" ? "In progress" : "Not attempted"}</span>}
        <span className="ml-auto" />
        {!dead && <span className="rounded-full px-4 py-2 text-[13px] font-bold" style={{ backgroundColor: !teacher && !done && !quiz.closed ? ACCENT : WASH, color: !teacher && !done && !quiz.closed ? "white" : ACCENT }}>{cta}</span>}
        {dead && <span className="text-[12.5px] font-semibold" style={{ color: SOFT }}>You missed this one</span>}
      </div>
    </article>
  );
}

/* ---------- create: same question builder as assignments, with a simpler form ---------- */
function Create({ onCancel, onSend }: { onCancel: () => void; onSend: (v: { title: string; questions: BQ[]; minutes: number | null; showAnswers: boolean; shuffle: boolean }) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<BQ[]>([]);
  const [minutes, setMinutes] = useState(10);
  const [showAnswers, setShowAnswers] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [building, setBuilding] = useState(false);
  const [busy, setBusy] = useState(false);
  const Switch = ({ label, hint, on, set }: { label: string; hint: string; on: boolean; set: (v: boolean) => void }) => (
    <button role="switch" aria-checked={on} onClick={() => set(!on)} className="flex w-full items-center gap-3 py-3 text-left">
      <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{label}</span><span className="block text-[12px]" style={{ color: SOFT }}>{hint}</span></span>
      <span className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300" style={{ backgroundColor: on ? ACCENT : "#D5D5E0" }}>
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300" style={{ transform: on ? "translateX(20px)" : "none", transitionTimingFunction: EASE }} />
      </span>
    </button>
  );
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end" style={{ backgroundColor: "rgba(20,22,31,0.38)" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="lc-drop flex max-h-[92%] flex-col rounded-t-[30px] bg-white" style={{ boxShadow: "0 -12px 40px rgba(20,22,31,0.14)" }}>
        <div className="flex items-center px-5 pb-1 pt-4">
          <h2 className="text-[19px] font-extrabold tracking-tight">New quiz</h2>
          <button onClick={onCancel} aria-label="Close" className="ml-auto grid h-9 w-9 place-items-center rounded-full" style={{ backgroundColor: CHIP }}><X className="h-4 w-4" /></button>
        </div>
        <div className="lc-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Quiz title, e.g. Moments check" className="h-12 w-full rounded-2xl px-4 text-[15px] font-semibold outline-none placeholder:text-[#707285]" style={{ backgroundColor: CANVAS }} />
          <button onClick={() => setBuilding(true)} className="mt-3 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-transform active:scale-[0.99]" style={{ border: `1.5px solid ${questions.length ? ACCENT : LINE}`, backgroundColor: questions.length ? WASH : "white" }}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ backgroundColor: questions.length ? "white" : WASH, color: ACCENT }}><ListChecks className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{questions.length ? `${questions.length} ${questions.length === 1 ? "question" : "questions"} ready` : "Add questions"}</span><span className="block text-[12px]" style={{ color: SOFT }}>{questions.length ? "Tap to review or edit" : "Write them, or generate from your notes"}</span></span>
            <ArrowRight className="h-4 w-4" style={{ color: SOFT }} />
          </button>
          <p className="mb-2 mt-5 text-[13px] font-bold">Time limit</p>
          <div className="flex rounded-full p-1" style={{ backgroundColor: CANVAS }}>
            {[{ v: 5, l: "5 min" }, { v: 10, l: "10 min" }, { v: 15, l: "15 min" }, { v: 0, l: "None" }].map((o) => (
              <button key={o.v} onClick={() => setMinutes(o.v)} className="flex-1 rounded-full py-2 text-[12px] font-bold transition-all duration-200" style={{ backgroundColor: minutes === o.v ? "white" : "transparent", color: minutes === o.v ? INK : SOFT, boxShadow: minutes === o.v ? "0 1px 3px rgba(20,22,31,.12)" : "none" }}>{o.l}</button>
            ))}
          </div>
          <div className="mt-3" style={{ borderTop: `1px solid ${LINE}` }} />
          <Switch label="Show answers after submitting" hint="Students see what they got right and wrong" on={showAnswers} set={setShowAnswers} />
          <div style={{ borderTop: `1px solid ${LINE}` }} />
          <Switch label="Shuffle questions" hint="Each student gets a different order" on={shuffle} set={setShuffle} />
        </div>
        <div className="px-5 pt-2" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
          <Primary disabled={!title.trim() || !questions.length || busy} onClick={() => { setBusy(true); void onSend({ title: title.trim(), questions, minutes: minutes || null, showAnswers, shuffle }).finally(() => setBusy(false)); }}>{busy ? "Sending…" : "Send to class"}</Primary>
        </div>
      </div>
      {building && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-background" onClick={(e) => e.stopPropagation()}>
          <QuestionBuilder initial={questions} files={[]} onClose={(qs) => { setQuestions(qs); setBuilding(false); }} />
        </div>
      )}
    </div>
  );
}

/* ---------- student: intro, questions, submit ---------- */
function Attempt({ quiz, userId, onBack, onSubmitted, onToast }: { quiz: QuizSummary; userId: string; onBack: () => void; onSubmitted: (r: QuizResult) => void; onToast: (m: string) => void }) {
  const [data, setData] = useState<QuizStart | null>(null);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [i, setI] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const deadline = useRef<number | null>(null);
  const sent = useRef(false);
  const order = useMemo(() => {
    if (!data) return [];
    const qs = [...data.questions];
    if (data.shuffle) { const r = seeded(userId + quiz.id); for (let k = qs.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [qs[k], qs[j]] = [qs[j]!, qs[k]!]; } }
    return qs;
  }, [data, userId, quiz.id]);
  const begin = () => {
    setBusy(true);
    startQuiz(quiz.id).then((d) => {
      if (d.duration_minutes) { const elapsed = (Date.parse(d.server_now) - Date.parse(d.started_at)) / 1000; deadline.current = Date.now() + (d.duration_minutes * 60 - elapsed) * 1000; setLeft(Math.round(d.duration_minutes * 60 - elapsed)); }
      setData(d);
    }).catch((e: Error) => onToast(e.message)).finally(() => setBusy(false));
  };
  const submit = () => {
    if (sent.current) return;
    sent.current = true; setBusy(true);
    submitQuiz(quiz.id, answers).then(onSubmitted).catch((e: Error) => { sent.current = false; setBusy(false); onToast(e.message); });
  };
  const submitRef = useRef(submit); submitRef.current = submit;
  useEffect(() => {
    if (!data || deadline.current === null) return;
    const t = setInterval(() => { const s = Math.ceil((deadline.current! - Date.now()) / 1000); setLeft(Math.max(0, s)); if (s <= 0) submitRef.current(); }, 500);
    return () => clearInterval(t);
  }, [data]);

  if (!data) {
    return (
      <div className="lc-tab flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 pb-3 pt-4"><Back onClick={onBack} /><h1 className="flex-1 text-[19px] font-extrabold tracking-tight">Quiz</h1></header>
        <div className="flex min-h-0 flex-1 flex-col justify-center px-6 pb-10">
          <span className="grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: WASH, color: ACCENT }}><ListChecks className="h-7 w-7" strokeWidth={1.7} /></span>
          <h2 className="mt-5 text-[26px] font-extrabold leading-[1.1] tracking-tight [overflow-wrap:anywhere]">{quiz.title}</h2>
          <div className="mt-5 flex flex-col gap-3 text-[14px] font-semibold">
            <p className="flex items-center gap-3"><ListChecks className="h-[18px] w-[18px]" style={{ color: ACCENT }} />{quiz.question_count} multiple choice questions</p>
            <p className="flex items-center gap-3"><Clock className="h-[18px] w-[18px]" style={{ color: ACCENT }} />{quiz.duration_minutes ? `${quiz.duration_minutes} minutes, starts when you tap Start` : "No time limit"}</p>
            <p className="flex items-center gap-3"><Check className="h-[18px] w-[18px]" style={{ color: ACCENT }} />One attempt. {quiz.show_answers ? "You'll see the answers after." : "Your lecturer will share answers."}</p>
          </div>
          {quiz.my_status === "started" && <p className="mt-5 rounded-2xl px-4 py-3 text-[13px] font-semibold" style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}>You already started this quiz. The timer kept running.</p>}
          <div className="mt-8"><Primary disabled={busy} onClick={begin}>{busy ? "Starting…" : quiz.my_status === "started" ? "Resume quiz" : "Start quiz"}</Primary></div>
        </div>
      </div>
    );
  }
  const q = order[i]!;
  const answered = Object.keys(answers).length;
  const last = i === order.length - 1;
  const urgent = left !== null && left <= 60;
  return (
    <div className="lc-tab flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-4">
        <span className="flex-1 text-[13px] font-bold" style={{ color: SOFT }}>Question {i + 1} of {order.length}</span>
        {left !== null && <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-extrabold tabular-nums transition-colors" style={{ backgroundColor: urgent ? "#FDE7E2" : WASH, color: urgent ? RED : ACCENT }}><Clock className="h-3.5 w-3.5" />{mmss(left)}</span>}
      </header>
      <div className="mx-4 flex gap-1">{order.map((o, k) => <button key={o.id} onClick={() => setI(k)} aria-label={`Question ${k + 1}`} className="h-1.5 flex-1 rounded-full transition-colors duration-300" style={{ backgroundColor: k === i ? ACCENT : answers[o.id] !== undefined ? "#B9A9F3" : CHIP }} />)}</div>
      <div key={q.id} className="lc-tab lc-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-7">
        <h2 className="text-[21px] font-extrabold leading-[1.25] tracking-[-0.02em] [overflow-wrap:anywhere]">{q.text}</h2>
        <div className="mt-6 flex flex-col gap-2.5">
          {q.options.map((o, k) => {
            const on = answers[q.id] === k;
            return (
              <button key={k} onClick={() => setAnswers((a) => ({ ...a, [q.id]: k }))} className="flex items-center gap-3 rounded-2xl p-3.5 text-left transition-all duration-200 active:scale-[0.99]" style={{ border: `1.5px solid ${on ? ACCENT : LINE}`, backgroundColor: on ? WASH : "white" }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-extrabold transition-colors" style={{ backgroundColor: on ? ACCENT : CANVAS, color: on ? "white" : SOFT }}>{LETTERS[k]}</span>
                <span className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug [overflow-wrap:anywhere]">{o}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 pt-2" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} aria-label="Previous" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90 disabled:opacity-30" style={{ border: `1px solid ${LINE}` }}><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1"><Primary onClick={() => (last ? setConfirm(true) : setI(i + 1))}>{last ? "Submit quiz" : "Next"}</Primary></div>
      </div>
      {confirm && (
        <div className="absolute inset-0 z-10 flex items-end" style={{ backgroundColor: "rgba(20,22,31,0.38)" }} onClick={() => !busy && setConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="lc-drop w-full rounded-t-[30px] bg-white px-5 pt-6" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
            <h3 className="text-[19px] font-extrabold tracking-tight">Submit your answers?</h3>
            <p className="mt-1.5 text-[13.5px]" style={{ color: SOFT }}>{answered === order.length ? "You answered every question." : `You left ${order.length - answered} unanswered. They count as wrong.`} You can't change them after.</p>
            <div className="mt-5 flex gap-3">
              <button disabled={busy} onClick={() => setConfirm(false)} className="flex-1 rounded-full py-3.5 text-[14px] font-bold" style={{ backgroundColor: CANVAS }}>Keep going</button>
              <div className="flex-1"><Primary disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit"}</Primary></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- student: result ---------- */
function Result({ quizId, onBack }: { quizId: string; onBack: () => void }) {
  const q = useQuery({ queryKey: ["quiz-result", quizId], queryFn: () => getQuizResult(quizId) });
  const r = q.data;
  const p = r ? pct(r.score, r.total) : 0;
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShown(p), 120); return () => clearTimeout(t); }, [p]);
  const C = 2 * Math.PI * 54;
  return (
    <div className="lc-tab flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 px-4 pb-3 pt-4"><Back onClick={onBack} /><h1 className="min-w-0 flex-1 truncate text-[19px] font-extrabold tracking-tight">{r?.title ?? "Result"}</h1></header>
      <div className="lc-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-8">
        {!r ? <p className="m-auto text-[13px]" style={{ color: SOFT }}>{q.isError ? "Couldn't load your result." : "Loading…"}</p> : (
          <>
            <section className="flex flex-col items-center rounded-[26px] bg-white px-5 py-7 ring-1 ring-black/[0.035]" style={{ boxShadow: SHADOW }}>
              <div className="relative h-[132px] w-[132px]">
                <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90"><circle cx="66" cy="66" r="54" fill="none" stroke={CHIP} strokeWidth="11" /><circle cx="66" cy="66" r="54" fill="none" stroke={p >= 50 ? GREEN : "#F59E0B"} strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} style={{ transition: `stroke-dashoffset 1s ${EASE}` }} /></svg>
                <div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-[30px] font-extrabold leading-none tracking-tight">{r.score}<span className="text-[18px]" style={{ color: SOFT }}>/{r.total}</span></p><p className="mt-1 text-[12.5px] font-bold" style={{ color: SOFT }}>{p}%</p></div></div>
              </div>
              <p className="mt-4 text-[17px] font-extrabold">{p === 100 ? "Perfect score" : p >= 80 ? "Great work" : p >= 50 ? "Good effort" : "Keep practising"}</p>
              <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>Your lecturer can see this result.{r.late ? " Submitted after the time limit." : ""}</p>
            </section>
            {r.review ? r.review.map((x, n) => (
              <section key={x.id} className="rounded-[22px] bg-white p-4 ring-1 ring-black/[0.035]">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: x.picked === x.correct ? GREEN : RED }}>{x.picked === x.correct ? "Correct" : x.picked === -1 ? "Skipped" : "Incorrect"} · Q{n + 1}</p>
                <p className="mt-1.5 text-[15px] font-bold leading-snug [overflow-wrap:anywhere]">{x.text}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {x.options.map((o, k) => {
                    const right = k === x.correct, wrong = k === x.picked && !right;
                    return <p key={k} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold" style={{ backgroundColor: right ? "#E3F6EC" : wrong ? "#FDE7E2" : CANVAS, color: right ? GREEN : wrong ? RED : INK }}><span className="font-extrabold">{LETTERS[k]}</span><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{o}</span>{right && <Check className="h-4 w-4" strokeWidth={3} />}{wrong && <X className="h-4 w-4" strokeWidth={3} />}</p>;
                  })}
                </div>
              </section>
            )) : <p className="px-3 py-4 text-center text-[13px]" style={{ color: SOFT }}>Your lecturer chose not to show the answers.</p>}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- lecturer: results ---------- */
function Results({ quiz, students, who, onBack, run }: { quiz: QuizSummary; students: Student[]; who: (id: string) => QWho; onBack: () => void; run: (p: Promise<unknown>, ok: string) => void }) {
  const q = useQuery({ queryKey: ["quiz-results", quiz.id], queryFn: () => getQuizResults(quiz.id), refetchInterval: 8000 });
  const [confirm, setConfirm] = useState(false);
  const d = q.data;
  const at = d?.attempts ?? [];
  const avg = at.length ? Math.round(at.reduce((s, a) => s + pct(a.score, a.total), 0) / at.length) : 0;
  const high = at.length ? Math.max(...at.map((a) => pct(a.score, a.total))) : 0;
  const done = new Set(at.map((a) => a.user_id));
  const waiting = students.filter((s) => !done.has(s.id));
  const acc = (d?.questions ?? []).map((x, n) => ({ n, text: x.text, p: at.length ? pct(at.filter((a) => a.answers?.[x.id] === x.correct).length, at.length) : 0 }));
  const hardest = at.length >= 2 && acc.length > 1 ? [...acc].sort((a, b) => a.p - b.p)[0]!.n : -1;
  const tile = (label: string, v: string) => <div className="flex-1 rounded-[20px] bg-white px-3 py-3.5 text-center ring-1 ring-black/[0.035]"><p className="text-[20px] font-extrabold tracking-tight">{v}</p><p className="mt-0.5 text-[11px] font-semibold" style={{ color: SOFT }}>{label}</p></div>;
  return (
    <div className="lc-tab flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 px-4 pb-3 pt-4"><Back onClick={onBack} /><h1 className="min-w-0 flex-1 truncate text-[19px] font-extrabold tracking-tight">{quiz.title}</h1></header>
      <div className="lc-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-8">
        <div className="flex gap-2.5">{tile("Submitted", `${at.length}/${students.length || at.length}`)}{tile("Average", at.length ? `${avg}%` : "–")}{tile("Highest", at.length ? `${high}%` : "–")}</div>
        <div className="flex gap-2.5">
          {!quiz.closed && <button onClick={() => run(closeQuiz(quiz.id), "Quiz closed")} className="flex-1 rounded-full py-3 text-[13px] font-bold" style={{ backgroundColor: WASH, color: ACCENT }}>Close quiz</button>}
          <button onClick={() => (confirm ? (run(deleteQuiz(quiz.id), "Quiz deleted"), onBack()) : setConfirm(true))} onBlur={() => setConfirm(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-3 text-[13px] font-bold" style={{ backgroundColor: confirm ? "#FDE7E2" : "white", color: confirm ? RED : SOFT, border: confirm ? "none" : `1px solid ${LINE}` }}><Trash2 className="h-4 w-4" />{confirm ? "Tap to delete" : "Delete"}</button>
        </div>
        {at.length > 0 && (
          <section className="rounded-[26px] bg-white p-5 ring-1 ring-black/[0.035]" style={{ boxShadow: SHADOW }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: SOFT }}>Scores</p>
            {at.map((a, n) => {
              const w = who(a.user_id); const p = pct(a.score, a.total);
              return (
                <div key={a.user_id} className="flex items-center gap-3 py-2.5" style={{ borderTop: n ? `1px solid ${LINE}` : "none", marginTop: n ? 0 : 8 }}>
                  <span className="w-5 text-center text-[12px] font-extrabold tabular-nums" style={{ color: SOFT }}>{n + 1}</span>
                  <Face w={w} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold">{w?.name ?? "Student"}{a.late && <span className="ml-1.5 text-[10.5px] font-bold" style={{ color: "#B45309" }}>LATE</span>}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: CHIP }}><div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: p >= 50 ? GREEN : "#F59E0B", transition: `width .8s ${EASE}` }} /></div>
                  </div>
                  <div className="text-right"><p className="text-[13.5px] font-extrabold tabular-nums">{a.score}/{a.total}</p><p className="text-[11px] tabular-nums" style={{ color: SOFT }}>{mmss((Date.parse(a.submitted_at) - Date.parse(a.started_at)) / 1000)}</p></div>
                </div>
              );
            })}
          </section>
        )}
        {acc.length > 0 && at.length > 0 && (
          <section className="rounded-[26px] bg-white p-5 ring-1 ring-black/[0.035]" style={{ boxShadow: SHADOW }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: SOFT }}>Question accuracy</p>
            {acc.map((x) => (
              <div key={x.n} className="mt-3.5">
                <div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{x.n + 1}. {x.text}</p>{x.n === hardest && <Pill bg="#FDE7E2" fg={RED}>Hardest</Pill>}<span className="text-[12.5px] font-extrabold tabular-nums">{x.p}%</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: CHIP }}><div className="h-full rounded-full" style={{ width: `${x.p}%`, backgroundColor: x.p >= 50 ? ACCENT : RED, transition: `width .8s ${EASE}` }} /></div>
              </div>
            ))}
          </section>
        )}
        {waiting.length > 0 && (
          <section className="rounded-[26px] bg-white p-5 ring-1 ring-black/[0.035]" style={{ boxShadow: SHADOW }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: SOFT }}>Not submitted yet · {waiting.length}</p>
            <div className="mt-3 flex flex-wrap gap-2">{waiting.map((s) => <span key={s.id} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12.5px] font-semibold" style={{ backgroundColor: CANVAS }}><Face w={s} size={24} />{s.name}</span>)}</div>
          </section>
        )}
        {q.isSuccess && at.length === 0 && <p className="px-6 py-8 text-center text-[13px]" style={{ color: SOFT }}>No submissions yet. Results appear here as students finish.</p>}
      </div>
    </div>
  );
}

/* ---------- the sheet ---------- */
export function QuizSheet({ classId, userId, isInstructor, open, onClose, onToast, onChanged, who, students, quizId, setQuizId }: { classId: string | undefined; userId: string | undefined; isInstructor: boolean; open: boolean; onClose: () => void; onToast: (m: string) => void; onChanged: () => void; who: (id: string | null) => QWho; students: Student[]; quizId: string | null; setQuizId: (id: string | null) => void }) {
  const qc = useQueryClient();
  const qs = useQuery({ queryKey: ["quizzes", classId], enabled: !!classId, queryFn: () => listQuizzes(classId!), refetchInterval: open ? 8000 : 10000 });
  const [creating, setCreating] = useState(false);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["quizzes", classId] }); void qc.invalidateQueries({ queryKey: ["quiz-results"] }); onChanged(); };
  const run = (p: Promise<unknown>, ok: string) => p.then(() => { onToast(ok); refresh(); }).catch((e: Error) => { onToast(e.message); refresh(); });
  const list = qs.data ?? [];
  const cur = quizId ? list.find((x) => x.id === quizId) : undefined;
  useEffect(() => { if (quizId && qs.isSuccess && !cur) setQuizId(null); }, [quizId, qs.isSuccess, cur]);
  const body = (() => {
    if (cur && isInstructor) return <Results key={cur.id} quiz={cur} students={students} who={(id) => who(id)} onBack={() => setQuizId(null)} run={run} />;
    if (cur && userId && cur.my_status === "done") return <Result key={cur.id} quizId={cur.id} onBack={() => setQuizId(null)} />;
    if (cur && userId) return <Attempt key={cur.id} quiz={cur} userId={userId} onBack={() => setQuizId(null)} onToast={onToast} onSubmitted={(r) => { qc.setQueryData(["quiz-result", cur.id], r); refresh(); }} />;
    return (
      <div className="lc-tab flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 pb-3 pt-4">
          <Back onClick={onClose} />
          <h1 className="flex-1 text-[19px] font-extrabold tracking-tight">Quizzes</h1>
          {isInstructor && <button onClick={() => setCreating(true)} className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-white transition-transform active:scale-95" style={{ backgroundColor: ACCENT }}><Plus className="h-4 w-4" />New quiz</button>}
        </header>
        <div className="lc-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-8 pt-1">
          {list.length === 0 && (
            <div className="m-auto flex flex-col items-center gap-3 px-8 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: WASH, color: ACCENT }}><ListChecks className="h-7 w-7" strokeWidth={1.7} /></span>
              <p className="text-[15px] font-bold">{qs.isLoading ? "Loading quizzes…" : "No quizzes yet"}</p>
              {!qs.isLoading && <p className="text-[13px]" style={{ color: SOFT }}>{isInstructor ? "Send a quick quiz and see results as students finish." : "When your lecturer sends a quiz, it will show up here."}</p>}
            </div>
          )}
          {list.map((x) => <QuizCard key={x.id} quiz={x} who={null} time={new Date(x.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} teacher={isInstructor} onOpen={() => setQuizId(x.id)} />)}
        </div>
      </div>
    );
  })();
  return (
    <div aria-hidden={!open} className="absolute inset-0 z-[60] flex flex-col overflow-hidden" style={{ backgroundColor: CANVAS, transform: open ? "translate3d(0,0,0)" : "translate3d(100%,0,0)", visibility: open ? "visible" : "hidden", transition: `transform .45s ${EASE}, visibility 0s linear ${open ? "0s" : ".45s"}`, willChange: "transform" }}>
      {body}
      {creating && classId && <Create onCancel={() => setCreating(false)} onSend={(v) => createQuiz(classId, v).then(() => { setCreating(false); onToast("Quiz sent to class"); refresh(); }).catch((e: Error) => onToast(e.message))} />}
    </div>
  );
}
