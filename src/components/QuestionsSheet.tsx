import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, ChevronLeft, Lock, MessageCircle, Plus, Send, ThumbsUp, Trash2, Users, X } from "lucide-react";
import { acceptAnswer, answerQuestion, askQuestion, deleteQuestion, listAnswers, listQuestions, toggleHelpful, toggleMeToo, type Answer, type Question } from "@/lib/questions";

export type Who = { name: string; pic: string; lec?: boolean | undefined };
const INK = "#14161F", SOFT = "#707285", CANVAS = "#F5F5FA", ACCENT = "#5B3FE0", WASH = "#EEEAFD", LINE = "rgba(20,22,31,0.07)", CHIP = "#E9E9F1", GREEN = "#0D9B57", AMBER = "#B45309";
const SHADOW = "0 1px 2px rgba(16,16,20,.04), 0 10px 28px -14px rgba(16,16,20,.12)";
const EASE = "cubic-bezier(.22,1,.36,1)";
const ago = (iso: string) => { const s = (Date.now() - Date.parse(iso)) / 1000; return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; };
const words = (t: string) => new Set(t.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);

function Face({ w, size = 32 }: { w: Who | null; size?: number }) {
  return w ? (
    <img src={w.pic} alt="" draggable={false} className="block shrink-0 rounded-full object-cover" style={{ width: size, height: size, maxWidth: "none", boxShadow: "0 0 0 1px rgba(20,22,31,0.06)" }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full text-[13px] font-extrabold" style={{ width: size, height: size, backgroundColor: CHIP, color: SOFT }}>?</span>
  );
}
const Pill = ({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) => (
  <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: bg, color: fg }}>{children}</span>
);

/* A question as a card: used in the chat and in the list */
export function QuestionCard({ q, who, viewerIsTeacher, onOpen, onMeToo }: { q: Question; who: Who | null; viewerIsTeacher: boolean; onOpen: () => void; onMeToo: () => void }) {
  const solved = !!q.accepted_answer_id;
  return (
    <article onClick={onOpen} className="cursor-pointer rounded-[26px] bg-white p-5 text-left ring-1 ring-black/[0.035] transition-transform duration-200 active:scale-[0.99]" style={{ boxShadow: SHADOW }}>
      <div className="flex items-center gap-2.5">
        <Face w={who} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold">{who?.name ?? "Anonymous"}<span className="font-medium" style={{ color: SOFT }}> asked</span></p>
          <p className="text-[11.5px]" style={{ color: SOFT }}>{ago(q.created_at)}</p>
        </div>
        {q.private && <Pill bg={WASH} fg={ACCENT}><Lock className="h-3 w-3" />{q.mine ? "Only lecturer" : "Private"}</Pill>}
        {q.anonymous && <Pill bg={CHIP} fg={SOFT}>Anonymous</Pill>}
      </div>
      <p className="mt-3 text-[15.5px] font-semibold leading-[22px] tracking-[-0.01em] [overflow-wrap:anywhere]" style={{ display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{q.body}</p>
      <div className="mt-4 flex items-center gap-2 pt-3.5" style={{ borderTop: `1px solid ${LINE}` }}>
        {solved ? <Pill bg="#E3F6EC" fg={GREEN}><Check className="h-3 w-3" strokeWidth={3} />Solved</Pill>
          : q.answer_count > 0 ? <Pill bg={WASH} fg={ACCENT}><MessageCircle className="h-3 w-3" />{q.answer_count} {q.answer_count === 1 ? "answer" : "answers"}</Pill>
          : <Pill bg="#FEF3C7" fg={AMBER}>Needs an answer</Pill>}
        {solved && q.answer_count > 0 && <span className="text-[12px] font-semibold" style={{ color: SOFT }}>{q.answer_count} {q.answer_count === 1 ? "answer" : "answers"}</span>}
        <span className="ml-auto" />
        {!q.private && (q.mine || viewerIsTeacher ? (
          q.me_too > 0 && <span className="flex items-center gap-1 text-[12px] font-bold" style={{ color: SOFT }}><Users className="h-3.5 w-3.5" />{q.me_too} stuck too</span>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onMeToo(); }} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all duration-200 active:scale-95" style={{ backgroundColor: q.i_me_too ? ACCENT : WASH, color: q.i_me_too ? "white" : ACCENT }}>
            <Users className="h-3.5 w-3.5" />Me too{q.me_too > 0 ? ` · ${q.me_too}` : ""}
          </button>
        ))}
      </div>
    </article>
  );
}

function Thread({ q, answers, who, me, isTeacher, onBack, run }: { q: Question; answers: Answer[]; who: (id: string | null) => Who | null; me: string | undefined; isTeacher: boolean; onBack: () => void; run: (p: Promise<unknown>, ok?: string) => void }) {
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState(false);
  const canManage = q.mine || isTeacher;
  const sorted = useMemo(() => [...answers].sort((a, b) => (b.id === q.accepted_answer_id ? 1 : 0) - (a.id === q.accepted_answer_id ? 1 : 0) || b.helpful - a.helpful || Date.parse(a.created_at) - Date.parse(b.created_at)), [answers, q.accepted_answer_id]);
  const send = () => { const t = text.trim(); if (!t) return; run(answerQuestion(q.id, t)); setText(""); };
  return (
    <div className="lc-tab flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <button onClick={onBack} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}><ChevronLeft className="h-5 w-5" /></button>
        <h1 className="flex-1 text-[19px] font-extrabold tracking-tight">Question</h1>
        {canManage && (
          <button onClick={() => (confirm ? (run(deleteQuestion(q.id), "Question deleted"), onBack()) : setConfirm(true))} onBlur={() => setConfirm(false)} className="flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold transition-all active:scale-95" style={{ backgroundColor: confirm ? "#FDE7E2" : "white", color: confirm ? "#D3402E" : SOFT, border: confirm ? "none" : `1px solid ${LINE}` }}>
            <Trash2 className="h-4 w-4" />{confirm ? "Tap to delete" : ""}
          </button>
        )}
      </header>
      <div className="lc-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-1">
        <QuestionCard q={q} who={who(q.asker_id)} viewerIsTeacher={isTeacher} onOpen={() => {}} onMeToo={() => run(toggleMeToo(q.id))} />
        {q.private && <p className="px-2 text-center text-[12px] font-medium" style={{ color: SOFT }}>{q.mine ? "Only you and your lecturer can see this." : "Private question. Only the asker and you can see it."}</p>}
        <p className="mt-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: SOFT }}>{sorted.length} {sorted.length === 1 ? "answer" : "answers"}</p>
        {sorted.length === 0 && <p className="px-1 py-6 text-center text-[13px]" style={{ color: SOFT }}>{q.private ? "Waiting for your lecturer." : "Know this one? Be the first to help."}</p>}
        {sorted.map((a) => {
          const w = who(a.author_id);
          const best = a.id === q.accepted_answer_id;
          const own = a.author_id === me;
          return (
            <div key={a.id} className="rounded-[22px] bg-white p-4" style={{ border: `1.5px solid ${best ? GREEN : LINE}`, boxShadow: best ? "0 8px 24px -14px rgba(13,155,87,.45)" : "none" }}>
              <div className="flex items-center gap-2.5">
                <Face w={w} size={28} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{w?.name ?? "Member"}</span>
                {a.by_teacher && <Pill bg={WASH} fg={ACCENT}><BadgeCheck className="h-3 w-3" />Lecturer</Pill>}
                {best && <Pill bg="#E3F6EC" fg={GREEN}><Check className="h-3 w-3" strokeWidth={3} />Accepted</Pill>}
                <span className="text-[11.5px]" style={{ color: SOFT }}>{ago(a.created_at)}</span>
              </div>
              <p className="mt-2.5 text-[14.5px] leading-[21px] [overflow-wrap:anywhere]">{a.body}</p>
              <div className="mt-3 flex items-center gap-2">
                {!own ? (
                  <button onClick={() => run(toggleHelpful(a.id))} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all active:scale-95" style={{ backgroundColor: a.i_helpful ? ACCENT : WASH, color: a.i_helpful ? "white" : ACCENT }}>
                    <ThumbsUp className="h-3.5 w-3.5" />Helpful{a.helpful > 0 ? ` · ${a.helpful}` : ""}
                  </button>
                ) : a.helpful > 0 && <span className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: SOFT }}><ThumbsUp className="h-3.5 w-3.5" />{a.helpful} found this helpful</span>}
                <span className="ml-auto" />
                {canManage && !own && (
                  <button onClick={() => run(acceptAnswer(q.id, best ? null : a.id), best ? undefined : "Marked as solved")} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all active:scale-95" style={{ backgroundColor: best ? "#E3F6EC" : CANVAS, color: best ? GREEN : INK }}>
                    <Check className="h-3.5 w-3.5" strokeWidth={2.6} />{best ? "Accepted" : "Accept"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="shrink-0 px-3 pt-1" style={{ paddingBottom: "calc(max(var(--safe-bottom, 0px), env(safe-area-inset-bottom, 0px)) + 12px)" }}>
        <div className="flex h-[54px] items-center gap-1 rounded-full bg-white pl-4 pr-[7px]" style={{ border: `1px solid ${LINE}`, boxShadow: "0 8px 28px rgba(20,22,31,0.08)" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()} maxLength={2000} placeholder={q.mine ? "Add a follow-up" : "Write an answer"} className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-[#707285]" />
          <button onClick={send} aria-label="Send answer" disabled={!text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-all active:scale-90" style={{ backgroundColor: text.trim() ? ACCENT : CHIP, color: text.trim() ? "white" : INK }}><Send className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </div>
  );
}

function Ask({ isTeacher, questions, onCancel, onSubmit, onOpenSimilar }: { isTeacher: boolean; questions: Question[]; onCancel: () => void; onSubmit: (body: string, priv: boolean, anon: boolean) => Promise<void>; onOpenSimilar: (id: string) => void }) {
  const [text, setText] = useState("");
  const [priv, setPriv] = useState(false);
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const similar = useMemo(() => {
    const w = words(text);
    if (w.size < 2) return [];
    return questions.filter((q) => !q.private).map((q) => ({ q, n: [...words(q.body)].filter((x) => w.has(x)).length })).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 2).map((x) => x.q);
  }, [text, questions]);
  const opt = (on: boolean, Icon: typeof Users, title: string, hint: string, set: () => void) => (
    <button onClick={set} className="flex flex-1 flex-col items-start gap-1 rounded-2xl p-3.5 text-left transition-all duration-200" style={{ border: `1.5px solid ${on ? ACCENT : LINE}`, backgroundColor: on ? WASH : "white" }}>
      <Icon className="h-[18px] w-[18px]" style={{ color: on ? ACCENT : SOFT }} />
      <span className="text-[13.5px] font-bold">{title}</span>
      <span className="text-[11.5px] leading-snug" style={{ color: SOFT }}>{hint}</span>
    </button>
  );
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end" style={{ backgroundColor: "rgba(20,22,31,0.38)" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="lc-drop flex max-h-[92%] flex-col rounded-t-[30px] bg-white" style={{ boxShadow: "0 -12px 40px rgba(20,22,31,0.14)" }}>
        <div className="flex items-center px-5 pb-1 pt-4">
          <h2 className="text-[19px] font-extrabold tracking-tight">Ask a question</h2>
          <button onClick={onCancel} aria-label="Close" className="ml-auto grid h-9 w-9 place-items-center rounded-full" style={{ backgroundColor: CHIP }}><X className="h-4 w-4" /></button>
        </div>
        <div className="lc-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-2">
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={4} placeholder="What are you stuck on?" className="w-full resize-none rounded-2xl px-4 py-3 text-[15px] font-medium leading-[22px] outline-none placeholder:text-[#707285]" style={{ backgroundColor: CANVAS }} />
          {similar.length > 0 && (
            <div className="lc-drop mt-3 rounded-2xl p-3" style={{ backgroundColor: "#FEF9E7" }}>
              <p className="mb-1 text-[12px] font-bold" style={{ color: AMBER }}>Already asked? Tap to check</p>
              {similar.map((s) => <button key={s.id} onClick={() => onOpenSimilar(s.id)} className="block w-full truncate py-1 text-left text-[13px] font-semibold">{s.body}</button>)}
            </div>
          )}
          {!isTeacher && (
            <>
              <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: SOFT }}>Who can see it</p>
              <div className="flex gap-2.5">
                {opt(!priv, Users, "Everyone", "Classmates can answer too", () => setPriv(false))}
                {opt(priv, Lock, "Only lecturer", "Private reply from your lecturer", () => setPriv(true))}
              </div>
              {!priv && (
                <button role="switch" aria-checked={anon} onClick={() => setAnon((v) => !v)} className="mt-2 flex w-full items-center gap-3 py-3 text-left">
                  <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">Hide my name</span><span className="block text-[12px]" style={{ color: SOFT }}>Classmates see Anonymous. Your lecturer still sees you.</span></span>
                  <span className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300" style={{ backgroundColor: anon ? ACCENT : "#D5D5E0" }}>
                    <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300" style={{ transform: anon ? "translateX(20px)" : "none", transitionTimingFunction: EASE }} />
                  </span>
                </button>
              )}
            </>
          )}
        </div>
        <div className="px-5 pt-2" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
          <button disabled={!text.trim() || busy} onClick={() => { setBusy(true); void onSubmit(text.trim(), priv, anon && !priv).finally(() => setBusy(false)); }} className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40" style={{ backgroundColor: ACCENT }}>
            {busy ? "Sending…" : priv && !isTeacher ? "Send to lecturer" : "Post question"}
          </button>
        </div>
      </div>
    </div>
  );
}

type Filter = "all" | "open" | "solved" | "mine";
export function QuestionsSheet({ classId, userId, isInstructor, open, onClose, onToast, onChanged, who, thread, setThread }: { classId: string | undefined; userId: string | undefined; isInstructor: boolean; open: boolean; onClose: () => void; onToast: (m: string) => void; onChanged: () => void; who: (id: string | null) => Who | null; thread: string | null; setThread: (id: string | null) => void }) {
  const qc = useQueryClient();
  const qs = useQuery({ queryKey: ["questions", classId], enabled: !!classId, queryFn: () => listQuestions(classId!), refetchInterval: open ? 8000 : 10000 });
  const as = useQuery({ queryKey: ["answers", classId], enabled: !!classId && open, queryFn: () => listAnswers(classId!), refetchInterval: open ? 8000 : false });
  const [filter, setFilter] = useState<Filter>("all");
  const [asking, setAsking] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { if (!open) return; const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, [open]);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["questions", classId] }); void qc.invalidateQueries({ queryKey: ["answers", classId] }); onChanged(); };
  const run = (p: Promise<unknown>, ok?: string) => p.then(() => { if (ok) onToast(ok); refresh(); }).catch((e: Error) => { onToast(e.message); refresh(); });
  const all = qs.data ?? [];
  const list = useMemo(() => {
    const f = all.filter((q) => (filter === "open" ? !q.accepted_answer_id && q.answer_count === 0 : filter === "solved" ? !!q.accepted_answer_id : filter === "mine" ? (isInstructor ? q.private : q.mine) : true));
    return f.sort((a, b) => (a.accepted_answer_id ? 1 : 0) - (b.accepted_answer_id ? 1 : 0) || b.me_too - a.me_too || Date.parse(b.created_at) - Date.parse(a.created_at));
  }, [all, filter, isInstructor]);
  const current = thread ? all.find((q) => q.id === thread) : undefined;
  useEffect(() => { if (thread && qs.isSuccess && !current) setThread(null); }, [thread, qs.isSuccess, current]);
  const count = (f: Filter) => all.filter((q) => (f === "open" ? !q.accepted_answer_id && q.answer_count === 0 : f === "solved" ? !!q.accepted_answer_id : f === "mine" ? (isInstructor ? q.private : q.mine) : true)).length;
  const chips: { id: Filter; label: string }[] = [{ id: "all", label: "All" }, { id: "open", label: "Needs answer" }, { id: "solved", label: "Solved" }, { id: "mine", label: isInstructor ? "Private" : "Mine" }];
  return (
    <div aria-hidden={!open} className="absolute inset-0 z-[60] flex flex-col overflow-hidden" style={{ backgroundColor: CANVAS, transform: open ? "translate3d(0,0,0)" : "translate3d(100%,0,0)", visibility: open ? "visible" : "hidden", transition: `transform .45s ${EASE}, visibility 0s linear ${open ? "0s" : ".45s"}`, willChange: "transform" }}>
      {current ? (
        <Thread key={current.id} q={current} answers={(as.data ?? []).filter((a) => a.question_id === current.id)} who={who} me={userId} isTeacher={isInstructor} onBack={() => setThread(null)} run={run} />
      ) : (
        <div className="lc-tab flex min-h-0 flex-1 flex-col">
          <header className="flex items-center gap-3 px-4 pb-3 pt-4">
            <button onClick={onClose} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}><ChevronLeft className="h-5 w-5" /></button>
            <h1 className="flex-1 text-[19px] font-extrabold tracking-tight">Questions</h1>
            <button onClick={() => setAsking(true)} className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-white transition-transform active:scale-95" style={{ backgroundColor: ACCENT }}><Plus className="h-4 w-4" />Ask</button>
          </header>
          <div className="lc-scroll flex shrink-0 gap-2 overflow-x-auto px-4 pb-3">
            {chips.map((c) => (
              <button key={c.id} onClick={() => setFilter(c.id)} className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-all duration-200" style={{ backgroundColor: filter === c.id ? INK : "white", color: filter === c.id ? "white" : SOFT, border: filter === c.id ? "none" : `1px solid ${LINE}` }}>
                {c.label}<span className="tabular-nums" style={{ opacity: 0.6 }}>{count(c.id)}</span>
              </button>
            ))}
          </div>
          <div className="lc-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-8">
            {list.length === 0 && (
              <div className="m-auto flex flex-col items-center gap-3 px-8 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: WASH, color: ACCENT }}><MessageCircle className="h-7 w-7" strokeWidth={1.7} /></span>
                <p className="text-[15px] font-bold">{qs.isLoading ? "Loading questions…" : filter === "all" ? "No questions yet" : "Nothing here"}</p>
                {!qs.isLoading && filter === "all" && <p className="text-[13px]" style={{ color: SOFT }}>Stuck on something? Ask the class, or send it privately to your lecturer.</p>}
              </div>
            )}
            {list.map((q) => <QuestionCard key={q.id} q={q} who={who(q.asker_id)} viewerIsTeacher={isInstructor} onOpen={() => setThread(q.id)} onMeToo={() => run(toggleMeToo(q.id))} />)}
          </div>
        </div>
      )}
      {asking && classId && (
        <Ask isTeacher={isInstructor} questions={all} onCancel={() => setAsking(false)} onOpenSimilar={(id) => { setAsking(false); setThread(id); }}
          onSubmit={(body, priv, anon) => askQuestion(classId, body, priv, anon).then(() => { setAsking(false); onToast(priv ? "Sent to your lecturer" : "Question posted"); refresh(); }).catch((e: Error) => onToast(e.message))} />
      )}
    </div>
  );
}
