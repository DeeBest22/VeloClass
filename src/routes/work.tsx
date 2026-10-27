import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Paperclip } from "lucide-react";
import { signedWorkUrl, submitWork, unsubmitWork, useWorkDetail, useWorkSubmissions } from "@/lib/work";
import { useClassOverview } from "@/lib/classes";
export const Route=createFileRoute("/work")({validateSearch:(s:Record<string,unknown>)=>({classId:typeof s.classId==="string"?s.classId:"",workId:typeof s.workId==="string"?s.workId:""}),component:Work});
function Work() {
  const router = useRouter(); const { classId, workId } = Route.useSearch(); const q = useWorkDetail(workId); const overview = useClassOverview(classId); const submissions = useWorkSubmissions(workId);
  const [body, setBody] = useState(""); const [files, setFiles] = useState<File[]>([]); const [answers, setAnswers] = useState<Record<string, number>>({}); const [busy, setBusy] = useState(false);
  useEffect(() => { if (overview.data?.myRole === "student") void router.navigate({ to: "/attempt", search: { classId, workId }, replace: true }); }, [classId, overview.data?.myRole, router, workId]);
  if (q.isPending) return <main className="min-h-screen bg-background" />;
  if (q.isError || !q.data) return <main className="p-8 text-center">Activity not found.</main>;
  const { work, attachments, submission, questions = [] } = q.data; const teacher = (submissions.data ?? []).length > 0 || (submissions.isSuccess && submission === null && work.type !== "assessment"); const submitted = !!submission; const hasQuestions = questions.length > 0;
  const save = async () => { setBusy(true); try { await submitWork({ workId, classId, body: hasQuestions ? JSON.stringify({ answers }) : body, files }); await q.refetch(); } catch (error) { alert(error instanceof Error ? error.message : "Couldn't submit work."); } finally { setBusy(false); } };
  return <main className="mx-auto min-h-screen max-w-md bg-background px-6 pb-10"><button onClick={() => router.history.back()} className="mt-7"><ArrowLeft /></button><p className="mt-6 text-sm font-bold text-feature">{work.type}</p><h1 className="mt-2 text-3xl font-extrabold">{work.title}</h1><p className="mt-2 text-sm text-muted-foreground">Due {new Date(work.due_at).toLocaleString()} · {work.points ?? "Ungraded"}{work.points ? " points" : ""}</p><section className="mt-6 rounded-2xl bg-surface p-4 whitespace-pre-wrap">{work.instructions || "No instructions provided."}</section>{attachments.map((a: any) => <button key={a.path} onClick={() => void signedWorkUrl(a.path)} className="mt-3 flex items-center gap-2 text-sm font-bold text-feature"><Paperclip className="size-4" />{a.name}</button>)}{teacher ? <section className="mt-6 space-y-3"><h2 className="font-bold">Submissions</h2>{submissions.isPending ? <p className="text-sm text-muted-foreground">Loading submissions…</p> : submissions.data?.length ? submissions.data.map((s: any) => <article key={s.id} className="rounded-2xl bg-surface p-4"><b>{s.student_name}</b><p className="mt-1 text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}{s.is_late ? " · Late" : ""}</p><SubmissionBody body={s.body} questions={questions} />{s.attachments.map((a: any) => <button key={a.path} onClick={() => void signedWorkUrl(a.path)} className="mt-2 flex items-center gap-2 text-sm font-bold text-feature"><Paperclip className="size-4" />{a.name}</button>)}</article>) : <p className="rounded-2xl bg-surface p-4 text-sm text-muted-foreground">No submissions yet.</p>}</section> : submitted ? <section className="mt-6 rounded-2xl bg-feature/10 p-4"><b>{submission.status === "graded" ? `${submission.score} / ${work.points}` : submission.is_late ? "Submitted · Late" : "Submitted"}</b><SubmissionBody body={submission.body} questions={questions} />{submission.status !== "graded" && <button onClick={async () => { await unsubmitWork(workId); setBody(submission.body); await q.refetch(); }} className="mt-3 text-sm font-bold text-feature">Edit and resubmit</button>}</section> : <section className="mt-6 rounded-2xl bg-surface p-4"><h2 className="font-bold">{hasQuestions ? "Your answers" : "Your work"}</h2>{hasQuestions ? questions.map((question: any, index: number) => <fieldset key={question.id} className="mt-4"><legend className="text-sm font-semibold">{index + 1}. {question.text}</legend>{question.options.map((option: string, optionIndex: number) => <label key={optionIndex} className="mt-2 flex gap-2 text-sm"><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers({ ...answers, [question.id]: optionIndex })} />{option}</label>)}</fieldset>) : <><textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-3 min-h-28 w-full rounded-xl bg-background p-3" placeholder="Write your response" /><input className="mt-3" type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))} /></>}<button disabled={busy || (hasQuestions ? Object.keys(answers).length !== questions.length : !body.trim() && !files.length)} onClick={() => void save()} className="mt-4 w-full rounded-full bg-feature py-3 font-bold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit"}</button></section>}</main>;
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