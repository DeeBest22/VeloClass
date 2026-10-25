import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Check, ChevronLeft, Clock, Plus, X } from "lucide-react";
import { closePoll, createPoll, listPolls, votePoll, type Poll, type ShowResults } from "@/lib/polls";

const INK = "#14161F", SOFT = "#707285", CANVAS = "#F5F5FA", ACCENT = "#5B3FE0", WASH = "#EEEAFD", LINE = "rgba(20,22,31,0.07)", CHIP = "#E9E9F1", GREEN = "#0D9B57";
const SHADOW = "0 1px 2px rgba(16,16,20,.04), 0 10px 28px -14px rgba(16,16,20,.12)";
const EASE = "cubic-bezier(.22,1,.36,1)";

const left = (iso: string | null) => {
  if (!iso) return null;
  const m = Math.ceil((new Date(iso).getTime() - Date.now()) / 60000);
  return m <= 0 ? null : m < 60 ? `${m} min left` : m < 1440 ? `${Math.ceil(m / 60)} hr left` : `${Math.ceil(m / 1440)} d left`;
};

function Seg<T extends string | number>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { v: T; label: string }[] }) {
  return (
    <div className="flex rounded-full p-1" style={{ backgroundColor: CANVAS }}>
      {items.map((i) => (
        <button key={String(i.v)} onClick={() => onChange(i.v)} className="flex-1 rounded-full py-2 text-[12px] font-bold transition-all duration-200" style={{ backgroundColor: value === i.v ? "white" : "transparent", color: value === i.v ? INK : SOFT, boxShadow: value === i.v ? "0 1px 3px rgba(20,22,31,.12)" : "none" }}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 py-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold">{label}</span>
        <span className="block text-[12px]" style={{ color: SOFT }}>{hint}</span>
      </span>
      <span className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300" style={{ backgroundColor: on ? ACCENT : "#D5D5E0" }}>
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300" style={{ transform: on ? "translateX(20px)" : "none", transitionTimingFunction: EASE }} />
      </span>
    </button>
  );
}

export function PollCard({ poll, teacher, onVote, onClose, meta, eligible }: { poll: Poll; teacher: boolean; onVote: (ids: number[]) => void; onClose: () => void; meta?: { name: string; pic: string; time: string }; eligible?: number }) {
  const [sel, setSel] = useState<number[]>(poll.my_votes);
  const [editing, setEditing] = useState(false);
  const key = poll.my_votes.join(",");
  useEffect(() => { setSel(poll.my_votes); setEditing(false); }, [key]);
  const voted = poll.my_votes.length > 0;
  const open = !poll.closed;
  const live = !teacher && open && (!voted || editing);
  const bars = poll.counts !== null;
  const dirty = sel.join(",") !== key && sel.length > 0;
  const pick = (i: number) => {
    if (!live) return;
    setSel((s) => (poll.multiple ? (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b)) : [i]));
  };
  const note = !bars ? (voted ? "Results appear when the poll closes." : poll.show_results === "after_vote" ? "Vote to see the results." : "Results appear when the poll closes.") : null;
  return (
    <article className="rounded-[26px] bg-white p-5 ring-1 ring-black/[0.035]" style={{ boxShadow: SHADOW }}>
      {meta && (
        <div className="mb-3 flex items-center gap-2.5">
          <img src={meta.pic} alt="" draggable={false} className="block h-8 w-8 shrink-0 rounded-full object-cover" style={{ maxWidth: "none", boxShadow: "0 0 0 1px rgba(20,22,31,0.06)" }} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{meta.name}<span className="font-medium" style={{ color: SOFT }}> started a poll</span></span>
          <span className="shrink-0 text-[11.5px]" style={{ color: SOFT }}>{meta.time}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: open ? "#E3F6EC" : CHIP, color: open ? GREEN : SOFT }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: open ? "#22C55E" : SOFT }} />
          {open ? "Open" : "Closed"}
        </span>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: WASH, color: ACCENT }}>{poll.multiple ? "Pick several" : "Pick one"}</span>
        {open && left(poll.closes_at) && (
          <span className="ml-auto flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: SOFT }}><Clock className="h-3.5 w-3.5" />{left(poll.closes_at)}</span>
        )}
      </div>
      <h3 className="mt-3 text-[17px] font-extrabold leading-[23px] tracking-[-0.015em] [overflow-wrap:anywhere]">{poll.question}</h3>

      <div className="mt-4 flex flex-col gap-2">
        {poll.options.map((text, i) => {
          const n = poll.counts?.[i] ?? 0;
          const pct = bars && poll.total_voters ? Math.round((n / poll.total_voters) * 100) : 0;
          const on = sel.includes(i);
          return (
            <button key={i} disabled={!live} onClick={() => pick(i)} className="relative overflow-hidden rounded-2xl text-left transition-[transform,box-shadow] duration-200 active:scale-[0.99]" style={{ border: `1.5px solid ${on ? ACCENT : LINE}`, backgroundColor: on && live ? WASH : "white" }}>
              {bars && <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, backgroundColor: on ? "rgba(91,63,224,0.16)" : "#F0F0F6", transition: `width .7s ${EASE}` }} />}
              <span className="relative flex items-center gap-3 px-3.5 py-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center transition-all duration-200" style={{ borderRadius: poll.multiple ? 7 : 999, border: `1.5px solid ${on ? ACCENT : "#C9C9D6"}`, backgroundColor: on ? ACCENT : "transparent", color: "white" }}>
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug [overflow-wrap:anywhere]">{text}</span>
                {bars && <span className="text-[12.5px] font-bold tabular-nums" style={{ color: on ? ACCENT : SOFT }}>{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>

      {note && <p className="mt-3 text-[12px] font-semibold" style={{ color: ACCENT }}>{note}</p>}
      <p className="mt-2 text-[11.5px] font-medium" style={{ color: SOFT }}>
        {[poll.show_results === "live" ? "Live results" : poll.show_results === "after_vote" ? "Results after voting" : "Results after close", poll.allow_change ? "Votes can be changed" : "Votes are final"].join(" · ")}
      </p>

      <div className="mt-4 flex items-center gap-2 pt-3.5" style={{ borderTop: `1px solid ${LINE}` }}>
        <span className="text-[12.5px] font-semibold" style={{ color: SOFT }}>{eligible ? `${poll.total_voters} of ${eligible} voted` : `${poll.total_voters} ${poll.total_voters === 1 ? "vote" : "votes"}`}</span>
        <span className="ml-auto" />
        {live && (
          <button disabled={!dirty} onClick={() => onVote(sel)} className="rounded-full px-5 py-2 text-[13px] font-bold text-white transition-all duration-200 active:scale-95 disabled:opacity-40" style={{ backgroundColor: ACCENT }}>
            {voted ? "Update vote" : "Vote"}
          </button>
        )}
        {!teacher && open && voted && !editing && poll.allow_change && (
          <button onClick={() => setEditing(true)} className="rounded-full px-4 py-2 text-[13px] font-bold" style={{ color: ACCENT, backgroundColor: WASH }}>Change vote</button>
        )}
        {!teacher && voted && !(open && poll.allow_change) && <span className="flex items-center gap-1 text-[12.5px] font-bold" style={{ color: GREEN }}><Check className="h-4 w-4" />Voted</span>}
        {teacher && open && (
          <button onClick={onClose} className="rounded-full px-4 py-2 text-[13px] font-bold" style={{ color: "#D3402E", backgroundColor: "#FDE7E2" }}>Close poll</button>
        )}
      </div>
    </article>
  );
}

function Composer({ onCancel, onPublish }: { onCancel: () => void; onPublish: (p: Parameters<typeof createPoll>[1]) => Promise<void> }) {
  const [question, setQuestion] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [showResults, setShowResults] = useState<ShowResults>("live");
  const [allowChange, setAllowChange] = useState(true);
  const [minutes, setMinutes] = useState(0);
  const [busy, setBusy] = useState(false);
  const clean = opts.map((o) => o.trim()).filter(Boolean);
  const ok = question.trim().length > 0 && new Set(clean.map((c) => c.toLowerCase())).size >= 2 && new Set(clean.map((c) => c.toLowerCase())).size === clean.length;
  const set = (i: number, v: string) => setOpts((o) => o.map((x, j) => (j === i ? v : x)));
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end" style={{ backgroundColor: "rgba(20,22,31,0.38)" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="lc-drop flex max-h-[92%] flex-col rounded-t-[30px] bg-white" style={{ boxShadow: "0 -12px 40px rgba(20,22,31,0.14)" }}>
        <div className="flex items-center px-5 pb-1 pt-4">
          <h2 className="text-[19px] font-extrabold tracking-tight">New poll</h2>
          <button onClick={onCancel} aria-label="Close" className="ml-auto grid h-9 w-9 place-items-center rounded-full" style={{ backgroundColor: CHIP }}><X className="h-4 w-4" /></button>
        </div>
        <div className="lc-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-2">
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} rows={2} placeholder="Ask the class a question" className="w-full resize-none rounded-2xl px-4 py-3 text-[15px] font-semibold outline-none placeholder:text-[#707285]" style={{ backgroundColor: CANVAS }} />
          <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: SOFT }}>Options</p>
          <div className="flex flex-col gap-2">
            {opts.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={o} onChange={(e) => set(i, e.target.value)} maxLength={80} placeholder={`Option ${i + 1}`} className="h-12 min-w-0 flex-1 rounded-2xl px-4 text-[14px] font-medium outline-none placeholder:text-[#707285]" style={{ backgroundColor: CANVAS }} />
                {opts.length > 2 && <button onClick={() => setOpts((x) => x.filter((_, j) => j !== i))} aria-label="Remove option" className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ color: SOFT }}><X className="h-4 w-4" /></button>}
              </div>
            ))}
          </div>
          {opts.length < 8 && (
            <button onClick={() => setOpts((o) => [...o, ""])} className="mt-2 flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-bold" style={{ color: ACCENT }}><Plus className="h-4 w-4" />Add option</button>
          )}

          <p className="mb-1 mt-5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: SOFT }}>Settings</p>
          <Switch label="Allow multiple answers" hint="Students can select more than one option" on={multiple} onChange={setMultiple} />
          <div style={{ borderTop: `1px solid ${LINE}` }} />
          <Switch label="Allow changing votes" hint="Students can update their answer while open" on={allowChange} onChange={setAllowChange} />
          <div style={{ borderTop: `1px solid ${LINE}` }} className="pb-3" />
          <p className="mb-2 text-[13px] font-bold">Show results to students</p>
          <Seg value={showResults} onChange={setShowResults} items={[{ v: "live", label: "Live" }, { v: "after_vote", label: "After voting" }, { v: "after_close", label: "After close" }]} />
          <p className="mb-2 mt-4 text-[13px] font-bold">Closes</p>
          <Seg value={minutes} onChange={setMinutes} items={[{ v: 0, label: "Manually" }, { v: 5, label: "5 min" }, { v: 60, label: "1 hr" }, { v: 1440, label: "24 hr" }]} />
        </div>
        <div className="px-5 pt-2" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
          <button disabled={!ok || busy} onClick={() => { setBusy(true); void onPublish({ question: question.trim(), options: clean, multiple, showResults, allowChange, minutes }).finally(() => setBusy(false)); }} className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40" style={{ backgroundColor: ACCENT }}>
            {busy ? "Publishing…" : "Publish poll"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PollsSheet({ classId, isInstructor, open, onClose, onToast, onChanged }: { classId: string | undefined; isInstructor: boolean; open: boolean; onClose: () => void; onToast: (m: string) => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["polls", classId], enabled: !!classId && open, queryFn: () => listPolls(classId!), refetchInterval: open ? 8000 : false });
  const [creating, setCreating] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => tick((n) => n + 1), 20000);
    return () => clearInterval(t);
  }, [open]);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["polls", classId] }); onChanged(); };
  const polls = q.data ?? [];
  const run = (p: Promise<unknown>, ok: string) => p.then(() => { onToast(ok); refresh(); }).catch((e: Error) => { onToast(e.message); refresh(); });
  return (
    <div aria-hidden={!open} className="absolute inset-0 z-[60] flex flex-col overflow-hidden" style={{ backgroundColor: CANVAS, transform: open ? "translate3d(0,0,0)" : "translate3d(100%,0,0)", visibility: open ? "visible" : "hidden", transition: `transform .45s ${EASE}, visibility 0s linear ${open ? "0s" : ".45s"}`, willChange: "transform" }}>
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <button onClick={onClose} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}><ChevronLeft className="h-5 w-5" /></button>
        <h1 className="flex-1 text-[19px] font-extrabold tracking-tight">Polls</h1>
        {isInstructor && (
          <button onClick={() => setCreating(true)} className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-white transition-transform active:scale-95" style={{ backgroundColor: ACCENT }}><Plus className="h-4 w-4" />New poll</button>
        )}
      </header>
      <div className="lc-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-8 pt-1">
        {polls.length === 0 && (
          <div className="m-auto flex flex-col items-center gap-3 px-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: WASH, color: ACCENT }}><BarChart3 className="h-7 w-7" strokeWidth={1.7} /></span>
            <p className="text-[15px] font-bold">{q.isLoading ? "Loading polls…" : "No polls yet"}</p>
            {!q.isLoading && <p className="text-[13px]" style={{ color: SOFT }}>{isInstructor ? "Create a poll and your class can vote right away." : "When your lecturer starts a poll, it will show up here."}</p>}
          </div>
        )}
        {polls.map((p) => (
          <PollCard key={p.id} poll={p} teacher={isInstructor} onVote={(ids) => run(votePoll(p.id, ids), "Vote recorded")} onClose={() => run(closePoll(p.id), "Poll closed")} />
        ))}
      </div>
      {creating && classId && (
        <Composer onCancel={() => setCreating(false)} onPublish={(v) => createPoll(classId, v).then(() => { setCreating(false); onToast("Poll published"); refresh(); }).catch((e: Error) => onToast(e.message))} />
      )}
    </div>
  );
}