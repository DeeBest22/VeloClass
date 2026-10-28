import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Award, CalendarDays, Paperclip } from "lucide-react";
import { signedWorkUrl, submitWork, unsubmitWork, useWorkDetail, useWorkSubmissions } from "@/lib/work";
import { useClassOverview } from "@/lib/classes";
import { SubmissionsPanel } from "@/components/SubmissionsPanel";
export const Route=createFileRoute("/work")({validateSearch:(s:Record<string,unknown>)=>({classId:typeof s.classId==="string"?s.classId:"",workId:typeof s.workId==="string"?s.workId:""}),component:Work});
const DISPLAY = "'Bricolage Grotesque', 'Plus Jakarta Sans', system-ui, sans-serif";
const INK = "#0E0F14", VIOLET = "#5B4DE8", MUTED = "#6F6C8A";
const GLASS = { background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 24px 60px -30px rgba(91,77,232,0.35)", backdropFilter: "blur(14px)" } as const;
const cap = (t?: string | null) => (t ? t.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase()) : "");
const dayOf = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
function Work() {
  const router = useRouter(); const { classId, workId } = Route.useSearch(); const q = useWorkDetail(workId); const overview = useClassOverview(classId); const submissions = useWorkSubmissions(workId);
  const [body, setBody] = useState(""); const [files, setFiles] = useState<File[]>([]); const [answers, setAnswers] = useState<Record<string, number>>({}); const [busy, setBusy] = useState(false);
  useEffect(() => { if (overview.data?.myRole === "student") void router.navigate({ to: "/attempt", search: { classId, workId }, replace: true }); }, [classId, overview.data?.myRole, router, workId]);
  if (q.isPending) return <main className="min-h-screen bg-background" />;
  if (q.isError || !q.data) return <main className="p-8 text-center">Activity not found.</main>;
  const { work, attachments, submission, questions = [] } = q.data; const teacher = overview.data?.myRole === "teacher" || (submissions.data ?? []).length > 0 || (submissions.isSuccess && submission === null && work.type !== "assessment"); const submitted = !!submission; const hasQuestions = questions.length > 0;
  const save = async () => { setBusy(true); try { await submitWork({ workId, classId, body: hasQuestions ? JSON.stringify({ answers }) : body, files }); await q.refetch(); } catch (error) { alert(error instanceof Error ? error.message : "Couldn't submit work."); } finally { setBusy(false); } };
  const due = work.due_at ? new Date(work.due_at) : null; const overdue = !!due && due.getTime() < Date.now() && !submitted && !teacher;
  const stats = [
    { label: "Due", icon: CalendarDays, value: due ? dayOf(due) : "No due date", sub: due ? (overdue ? "Overdue · " : "") + due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "", warn: overdue },
    { label: "Points", icon: Award, value: work.points ? String(work.points) : "Ungraded", sub: work.points ? "points" : "not scored", warn: false },
  ];
  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(165deg,#E4E0FF 0%,#F2F0FF 52%,#E9E5FF 100%)" }}>
      <div className="mx-auto max-w-md px-5 pb-12 pt-6">
        <button onClick={() => router.history.back()} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-white/70 transition-transform active:scale-90"><ArrowLeft className="size-5" style={{ color: INK }} strokeWidth={2.2} /></button>
        <span className="mt-6 inline-block rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold tracking-wide" style={{ color: VIOLET }}>{cap(work.type)}</span>
        <h1 className="mt-3 text-[32px] font-medium leading-[1.1] tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{work.title}</h1>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0 rounded-[24px] p-4" style={GLASS}>
              <div className="flex items-center justify-between gap-2"><p className="text-[9.5px] font-medium uppercase tracking-[0.1em]" style={{ color: MUTED }}>{s.label}</p><span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: "#EFEDFC" }}><s.icon className="size-[15px]" style={{ color: VIOLET }} strokeWidth={2} /></span></div>
              <p className="mt-4 truncate text-[22px] font-medium leading-none tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{s.value}</p>
              <p className="mt-1.5 truncate text-[11px] font-medium" style={{ color: s.warn ? "#D3402E" : MUTED }}>{s.sub}</p>
            </div>
          ))}
        </div>
        <section className="mt-3 rounded-[28px] p-5" style={GLASS}>
          <p className="text-[9.5px] font-medium uppercase tracking-[0.1em]" style={{ color: MUTED }}>Instructions</p>
          <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: INK }}>{work.instructions || "No instructions provided."}</p>
        </section>
        {attachments.length > 0 && <div className="mt-3 space-y-2">{attachments.map((a: any) => <button key={a.path} onClick={() => void signedWorkUrl(a.path)} className="flex w-full items-center gap-3 rounded-full bg-white p-2 pr-5 text-left text-[14px] font-semibold transition-transform active:scale-[0.99]" style={{ color: INK }}><span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: "#EFEDFC" }}><Paperclip className="size-4" style={{ color: VIOLET }} /></span><span className="truncate">{a.name}</span></button>)}</div>}
        {teacher ? <SubmissionsPanel work={work} classId={classId} submissions={submissions.data} loading={submissions.isPending} /> : submitted ? (
          <section className="mt-3 rounded-[28px] p-5" style={GLASS}>
            <div className="flex items-center justify-between"><p className="text-[9.5px] font-medium uppercase tracking-[0.1em]" style={{ color: MUTED }}>Your submission</p><span className="rounded-full px-3 py-1 text-[11px] font-semibold text-white" style={{ backgroundColor: submission.status === "graded" ? "#0D9B57" : submission.is_late ? "#D3402E" : VIOLET }}>{submission.status === "graded" ? "Graded" : submission.is_late ? "Submitted late" : "Submitted"}</span></div>
            {submission.status === "graded" && <p className="mt-3 text-[40px] font-medium leading-none tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{submission.score}<span className="text-[18px]" style={{ color: MUTED }}> / {work.points}</span></p>}
            <SubmissionBody body={submission.body} questions={questions} />
            {submission.status !== "graded" && <button onClick={async () => { await unsubmitWork(workId); setBody(submission.body); await q.refetch(); }} className="mt-4 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold transition-transform active:scale-95" style={{ color: VIOLET }}>Edit and resubmit</button>}
          </section>
        ) : (
          <section className="mt-3 rounded-[28px] p-5" style={GLASS}>
            <h2 className="text-[19px] font-medium tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{hasQuestions ? "Your answers" : "Your work"}</h2>
            {hasQuestions ? questions.map((question: any, index: number) => (
              <fieldset key={question.id} className="mt-5">
                <legend className="text-[15px] font-semibold leading-snug" style={{ color: INK }}>{index + 1}. {question.text}</legend>
                {question.options.map((option: string, optionIndex: number) => { const on = answers[question.id] === optionIndex; return (
                  <label key={optionIndex} className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 text-[14px] font-medium transition-all" style={{ background: on ? "#fff" : "rgba(255,255,255,0.5)", boxShadow: on ? `inset 0 0 0 2px ${VIOLET}` : "none", color: INK }}>
                    <input type="radio" className="accent-[#5B4DE8]" name={question.id} checked={on} onChange={() => setAnswers({ ...answers, [question.id]: optionIndex })} />{option}
                  </label>); })}
              </fieldset>
            )) : <>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-4 min-h-32 w-full rounded-2xl bg-white/80 p-4 text-[15px] outline-none placeholder:text-[#6F6C8A] focus:bg-white" style={{ color: INK }} placeholder="Write your response" />
              <input className="mt-3 w-full text-[13px] file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2.5 file:text-[13px] file:font-semibold file:text-[#5B4DE8]" style={{ color: MUTED }} type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))} />
            </>}
            <button disabled={busy || (hasQuestions ? Object.keys(answers).length !== questions.length : !body.trim() && !files.length)} onClick={() => void save()} className="mt-6 h-14 w-full rounded-full text-[15px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40" style={{ backgroundColor: INK }}>{busy ? "Submitting…" : "Submit"}</button>
          </section>
        )}
      </div>
    </main>
  );
}

/* Quiz-style work is stored as {"answers":{questionId: optionIndex}}. Show it as readable answers, never raw JSON. */
function parseAnswers(body: string | null | undefined): Record<string, number> | null {
  try {
    const v = JSON.parse(body ?? "");
    if (v && typeof v === "object" && v.answers && typeof v.answers === "object") return v.answers as Record<string, number>;
  } catch { /* plain text response */ }
  return null;
}

function SubmissionBody({ body, questions }: { body: string; questions: any[] }) {
  const answers = parseAnswers(body);
  if (!answers) return <p className="mt-3 whitespace-pre-wrap text-sm">{body}</p>;
  const given = Object.values(answers).filter((v) => typeof v === "number" && v >= 0).length;
  if (questions.length === 0) return <p className="mt-3 text-sm text-muted-foreground">{given} {given === 1 ? "answer" : "answers"} submitted</p>;
  const marked = questions.filter((q) => typeof q.correct === "number");
  const right = marked.filter((q) => answers[q.id] === q.correct).length;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-bold text-muted-foreground">
        {marked.length > 0 ? `${right} of ${marked.length} correct · ` : ""}{given} of {questions.length} answered
      </p>
      {questions.map((q: any, i: number) => {
        const picked = answers[q.id];
        const has = typeof picked === "number" && picked >= 0 && picked < q.options.length;
        const known = typeof q.correct === "number";
        const ok = known && picked === q.correct;
        const tone = !has ? "#707285" : !known ? "#14161F" : ok ? "#0D9B57" : "#D3402E";
        return (
          <div key={q.id} className="rounded-xl bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground">{i + 1}. {q.text}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: tone }}>
              {has ? `${String.fromCharCode(65 + picked)}. ${q.options[picked]}` : "Not answered"}
              {known && has && (ok ? "  ✓" : "  ✗")}
            </p>
            {known && !ok && <p className="mt-0.5 text-xs" style={{ color: "#0D9B57" }}>Correct: {String.fromCharCode(65 + q.correct)}. {q.options[q.correct]}</p>}
          </div>
        );
      })}
    </div>
  );
}