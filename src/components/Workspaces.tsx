import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, BookOpen, Check, ChevronRight, ChevronUp, ClipboardList, Eraser, FileText, Library, Mic, Paperclip, Pause, PenLine, Play, Undo2, Link2, Lock, Pin, Plus, Send, Settings2, Sparkles, Trash2, UserPlus, Users, X } from "lucide-react";
import { supabase } from "@/integrations/client";
import { profileFromUser, useAuth } from "@/lib/auth";
import { useClassOverview } from "@/lib/classes";
import { getLiveMembers } from "@/lib/live-class";
import * as W from "@/lib/workspaces";
import teacherPic from "@/assets/avatars/taiwo.png";
import studentPic from "@/assets/avatars/lecturer.png";
import classChatIcon from "@/assets/workspaces/class-chat.png";
import groupIcon from "@/assets/workspaces/class-chat.png";

const INK = "#14161F", SOFT = "#707285", FAINT = "#A3A5B5", ACCENT = "#5B3FE0", WASH = "#EEEAFD", LINE = "rgba(20,22,31,0.07)", CANVAS = "#F5F5FA";
const SHADOW = "0 1px 2px rgba(20,22,31,0.04), 0 8px 24px rgba(20,22,31,0.04)";
const css = `@keyframes wsUp{from{transform:translateY(28px);opacity:0}to{transform:none;opacity:1}}@keyframes wsFade{from{opacity:0}to{opacity:1}}.ws-in{animation:wsFade .3s ease}`;

const TPL = {
  study: { label: "Study group", Icon: BookOpen, board: "Muddy points", hint: "Post what's confusing. Upvote what you're stuck on too." },
  reading: { label: "Reading group", Icon: Library, board: "Questions", hint: "Raise questions and passages worth discussing." },
  project: { label: "Project group", Icon: ClipboardList, board: "Tasks", hint: "Break the work down and tick it off together." },
  custom: { label: "Custom", Icon: Sparkles, board: "", hint: "" },
} as const;
const MODES: Record<W.JoinMode, { label: string; hint: string }> = {
  open: { label: "Open", hint: "Anyone in the class can join" },
  request: { label: "Request", hint: "People ask, an owner approves" },
  invite: { label: "Invite only", hint: "Only people you invite" },
  assigned: { label: "Assigned", hint: "Lecturer adds students" },
};
const safeUrl = (u: string) => {
  const t = u.trim();
  const full = !t ? "" : /^https?:\/\//i.test(t) ? t : /^[a-z][a-z0-9+.-]*:/i.test(t) ? "" : `https://${t}`;
  try { return full ? new URL(full).href : null; } catch { return null; }
};
const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

const PicCtx = createContext<Record<string, { url: string | null; role: string }>>({});
function Avatar({ name, id, size = 36 }: { name: string; id?: string; size?: number }) {
  const p = useContext(PicCtx)[id ?? ""];
  const src = p ? p.url ?? (p.role === "teacher" ? teacherPic : studentPic) : null;
  return src ? (
    <img src={src} alt={name} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full font-bold" style={{ width: size, height: size, backgroundColor: WASH, color: ACCENT, fontSize: size * 0.4 }}>{name.trim().charAt(0).toUpperCase() || "?"}</span>
  );
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="h-9 shrink-0 rounded-full px-4 text-[13px] font-bold transition-all active:scale-95" style={on ? { backgroundColor: ACCENT, color: "#fff" } : { backgroundColor: "#fff", color: SOFT, border: `1px solid ${LINE}` }}>{children}</button>;
}
function IconBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return <button onClick={onClick} aria-label={label} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}`, color: INK }}>{children}</button>;
}
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div onClick={onClose} className="absolute inset-0" style={{ backgroundColor: "rgba(20,22,31,0.32)", animation: "wsFade .25s ease" }} />
      <div className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[28px] sm:max-w-md sm:rounded-[28px]" style={{ backgroundColor: CANVAS, animation: "wsUp .38s cubic-bezier(.22,1,.36,1)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-center gap-3 px-5 pb-2 pt-5">
          <h2 className="min-w-0 flex-1 truncate text-[19px] font-bold tracking-[-0.01em]" style={{ color: INK }}>{title}</h2>
          <IconBtn onClick={onClose} label="Close"><X className="h-4 w-4" /></IconBtn>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
const field = "h-11 w-full rounded-2xl bg-white px-4 text-[14px] outline-none";
const Label = ({ children }: { children: React.ReactNode }) => <p className="mb-2 mt-4 text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: FAINT }}>{children}</p>;
const Primary = ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className="mt-5 h-12 w-full rounded-full text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40" style={{ backgroundColor: ACCENT }}>{children}</button>;
const numOrNull = (v: string) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };

/* ============================== main ============================== */
export default function Workspaces({ classId, onClose }: { classId: string; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const me = user?.id ?? "";
  const myName = user ? profileFromUser(user).name : "";
  const isT = useClassOverview(classId).data?.myRole === "teacher";
  const [view, setView] = useState<{ t: "list" } | { t: "group"; id: string } | { t: "insights" }>({ t: "list" });
  const [sheet, setSheet] = useState<null | "create" | "settings">(null);
  const [toast, setToast] = useState("");
  const settings = useQuery({ queryKey: ["ws-settings", classId], queryFn: () => W.getSettings(classId) });
  const groups = useQuery({ queryKey: ["ws-groups", classId], queryFn: () => W.listGroups(classId) });
  const members = useQuery({ queryKey: ["ws-members", classId], queryFn: () => W.listMembers(classId) });
  const roster = useQuery({ queryKey: ["ws-roster", classId], queryFn: () => W.listRoster(classId) });
  const live = useQuery({ queryKey: ["live-members", classId], queryFn: () => getLiveMembers(classId) });
  const pics = useMemo(() => Object.fromEntries((live.data ?? []).map((m) => [m.id, { url: m.avatar_url, role: m.role }])), [live.data]);

  useEffect(() => {
    const ch = (supabase as any).channel(`ws-class-${classId}`);
    for (const [t, k] of [["ws_groups", "ws-groups"], ["ws_members", "ws-members"], ["ws_settings", "ws-settings"]] as const)
      ch.on("postgres_changes", { event: "*", schema: "public", table: t, filter: `class_id=eq.${classId}` }, () => qc.invalidateQueries({ queryKey: [k, classId] }));
    ch.subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [classId]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2800); return () => clearTimeout(t); }, [toast]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["ws-groups", classId] }); qc.invalidateQueries({ queryKey: ["ws-members", classId] }); };
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); refresh(); } catch (e) { setToast((e as Error).message); } };

  const s = settings.data ?? W.DEFAULTS(classId);
  const rows = useMemo(() => { const m = new Map<string, W.Member[]>(); for (const r of members.data ?? []) m.set(r.group_id, [...(m.get(r.group_id) ?? []), r]); return m; }, [members.data]);
  const all = groups.data ?? [];
  const canCreate = isT || s.creators === "all" || (s.creators === "selected" && s.allowed.includes(me));
  const students = (roster.data ?? []).filter((p) => p.role === "student");
  const group = view.t === "group" ? all.find((g) => g.id === view.id) : undefined;

  const mineRow = (g: W.Group) => (rows.get(g.id) ?? []).find((r) => r.user_id === me);
  const isIn = (g: W.Group) => mineRow(g)?.status === "member";
  const mine = all.filter((g) => isIn(g) || (isT && false));
  const others = all.filter((g) => !isIn(g));

  return (
    <PicCtx.Provider value={pics}>
    <div className="fixed inset-0 z-[80] flex flex-col" style={{ backgroundColor: CANVAS, color: INK, paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <style>{css}</style>
      {view.t === "group" && group ? (
        <GroupView key={group.id} g={group} me={me} myName={myName} isT={isT} rows={rows.get(group.id) ?? []} roster={roster.data ?? []} act={act} setToast={setToast} onBack={() => setView({ t: "list" })} />
      ) : view.t === "insights" ? (
        <>
          <Header title="Class insights" sub="Most upvoted muddy points across groups" onBack={() => setView({ t: "list" })} />
          <Insights groups={all} />
        </>
      ) : (
        <>
          <Header title="Workspaces" sub={isT ? "Manage your class sub-groups" : "Small groups for focused work"} onBack={onClose}>
            {isT && <IconBtn onClick={() => setView({ t: "insights" })} label="Insights"><BarChart3 className="h-[18px] w-[18px]" /></IconBtn>}
            {isT && <IconBtn onClick={() => setSheet("settings")} label="Settings"><Settings2 className="h-[18px] w-[18px]" /></IconBtn>}
            {canCreate && <button onClick={() => setSheet("create")} aria-label="New workspace" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-90" style={{ backgroundColor: ACCENT }}><Plus className="h-5 w-5" /></button>}
          </Header>
          <div className="ws-in flex-1 space-y-7 overflow-y-auto px-5 pb-10 pt-1">
            <button onClick={onClose} className="flex w-full items-center gap-3.5 rounded-[20px] bg-white px-4 py-3.5 text-left transition-transform active:scale-[0.985]" style={{ boxShadow: SHADOW }}>
              <img src={classChatIcon} alt="" draggable={false} className="h-11 w-11 shrink-0 select-none object-contain" />
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Class chat</span><span className="block truncate text-[12.5px]" style={{ color: SOFT }}>The main conversation for everyone</span></span>
              <ChevronRight className="h-4 w-4 shrink-0" style={{ color: FAINT }} />
            </button>

            {groups.isLoading ? <p className="py-10 text-center text-[13px]" style={{ color: FAINT }}>Loading…</p> : all.length === 0 ? (
              <div className="py-12 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full" style={{ backgroundColor: WASH, color: ACCENT }}><Users className="h-6 w-6" /></span>
                <p className="mt-4 text-[16px] font-semibold">No workspaces yet</p>
                <p className="mx-auto mt-1 max-w-[260px] text-[13px] leading-relaxed" style={{ color: SOFT }}>{canCreate ? "Create one for a study group, a project or anything else." : "Your lecturer hasn't set up any groups yet."}</p>
              </div>
            ) : (
              <>
                {[["Your workspaces", isT ? all : mine], ["Discover", isT ? [] : others]].map(([title, list]) => (list as W.Group[]).length > 0 && (
                  <section key={title as string}>
                    <p className="mb-3 px-1 text-[13px] font-semibold" style={{ color: SOFT }}>{title as string}<span className="ml-1.5 font-medium" style={{ color: FAINT }}>{(list as W.Group[]).length}</span></p>
                    <div className="space-y-2.5">
                      {(list as W.Group[]).map((g) => <GroupCard key={g.id} g={g} rows={rows.get(g.id) ?? []} me={me} isT={isT} act={act} open={() => setView({ t: "group", id: g.id })} />)}
                    </div>
                  </section>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {sheet === "create" && (
        <CreateSheet isT={isT} cap={isT ? null : s.max_members} onClose={() => setSheet(null)}
          onCreate={async (a) => { const id = await W.createGroup({ classId, ...a }); refresh(); setSheet(null); setView({ t: "group", id }); }} />
      )}
      {sheet === "settings" && (
        <SettingsSheet s={s} students={students} onClose={() => setSheet(null)}
          onSave={async (next) => { await W.saveSettings(next); qc.invalidateQueries({ queryKey: ["ws-settings", classId] }); setSheet(null); setToast("Settings saved"); }} />
      )}
      {toast && <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[95] flex justify-center px-4"><div className="rounded-full px-4 py-2.5 text-[13px] font-semibold text-white ws-in" style={{ backgroundColor: INK }}>{toast}</div></div>}
    </div>
    </PicCtx.Provider>
  );
}

function Header({ title, sub, icon, onBack, children }: { title: string; sub?: string; icon?: string; onBack: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 pb-4 pt-4">
      <IconBtn onClick={onBack} label="Back"><ArrowLeft className="h-[18px] w-[18px]" /></IconBtn>
      {icon && <img src={icon} alt="" draggable={false} className="h-10 w-10 shrink-0 select-none object-contain" />}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[21px] font-bold leading-tight tracking-[-0.01em]">{title}</h1>
        {sub && <p className="mt-0.5 truncate text-[12.5px]" style={{ color: SOFT }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/* ============================== cards ============================== */
function GroupCard({ g, rows, me, isT, act, open }: { g: W.Group; rows: W.Member[]; me: string; isT: boolean; act: (f: () => Promise<unknown>) => void; open: () => void }) {
  const T = TPL[g.template];
  const mine = rows.find((r) => r.user_id === me);
  const count = rows.filter((r) => r.status === "member").length;
  const pending = rows.filter((r) => r.status === "requested").length;
  const inside = mine?.status === "member" || isT;
  const pill = (t: string) => <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ backgroundColor: CANVAS, color: SOFT }}>{t}</span>;
  const btn = (t: string, f: () => void, solid = true) => <button onClick={(e) => { e.stopPropagation(); f(); }} className="rounded-full px-4 py-2 text-[13px] font-semibold transition-transform active:scale-95" style={solid ? { backgroundColor: ACCENT, color: "#fff" } : { backgroundColor: CANVAS, color: SOFT }}>{t}</button>;
  return (
    <div onClick={inside ? open : undefined} className={`rounded-[20px] bg-white px-4 py-4 transition-transform ${inside ? "cursor-pointer active:scale-[0.985]" : ""}`} style={{ boxShadow: SHADOW }}>
      <div className="flex items-center gap-3.5">
        <img src={groupIcon} alt="" draggable={false} className="h-11 w-11 shrink-0 select-none object-contain" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{g.name}</p>
            {isT && pending > 0 && <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: ACCENT }}>{pending} new</span>}
          </div>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[12.5px]" style={{ color: SOFT }}>
            <span className="truncate">{T.label}</span><span style={{ color: FAINT }}>·</span>
            <span>{count}{g.max_members ? `/${g.max_members}` : ""} {count === 1 ? "member" : "members"}</span>
            {g.join_mode !== "open" && <Lock className="h-3 w-3 shrink-0" style={{ color: FAINT }} aria-label={MODES[g.join_mode].label} />}
          </p>
          {g.description && <p className="mt-2 line-clamp-2 text-[13px] leading-snug" style={{ color: SOFT }}>{g.description}</p>}
          {!inside && (
            <div className="mt-3 flex items-center justify-end gap-2">
              {mine?.status === "invited" ? <>{btn("Decline", () => act(() => W.leave(g.id)), false)}{btn("Accept", () => act(() => W.joinGroup(g.id)))}</> :
                mine?.status === "requested" ? <>{pill("Requested")}{btn("Cancel", () => act(() => W.leave(g.id)), false)}</> :
                g.join_mode === "open" ? btn("Join", () => act(() => W.joinGroup(g.id))) :
                g.join_mode === "request" ? btn("Request to join", () => act(() => W.joinGroup(g.id))) :
                pill(g.join_mode === "assigned" ? "Assigned by lecturer" : "Invite only")}
            </div>
          )}
        </div>
        {inside && <ChevronRight className="h-4 w-4 shrink-0" style={{ color: FAINT }} />}
      </div>
    </div>
  );
}

/* ============================== sheets ============================== */
function CreateSheet({ isT, cap, onClose, onCreate }: { isT: boolean; cap: number | null; onClose: () => void; onCreate: (a: { name: string; desc: string; template: W.Template; mode: W.JoinMode; max: number | null }) => Promise<void> }) {
  const [name, setName] = useState(""), [desc, setDesc] = useState(""), [template, setTemplate] = useState<W.Template>("study"), [mode, setMode] = useState<W.JoinMode>("open"), [max, setMax] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const modes = (isT ? ["open", "request", "invite", "assigned"] : ["open", "request", "invite"]) as W.JoinMode[];
  const submit = async () => {
    setBusy(true); setErr("");
    try { await onCreate({ name: name.trim(), desc: desc.trim(), template, mode, max: numOrNull(max) }); } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <Sheet title="New workspace" onClose={onClose}>
      <Label>Template</Label>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(TPL) as W.Template[]).map((k) => { const T = TPL[k]; const on = template === k; return (
          <button key={k} onClick={() => setTemplate(k)} className="flex items-center gap-2.5 rounded-2xl p-3 text-left transition-all active:scale-[0.97]" style={{ backgroundColor: on ? WASH : "#fff", border: `1.5px solid ${on ? ACCENT : LINE}`, color: on ? ACCENT : INK }}>
            <T.Icon className="h-[18px] w-[18px]" /><span className="text-[13px] font-bold">{T.label}</span>
          </button>); })}
      </div>
      {TPL[template].hint && <p className="mt-2 text-[12.5px]" style={{ color: SOFT }}>{TPL[template].hint}</p>}
      <Label>Name</Label>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Thermodynamics crew" className={field} style={{ border: `1px solid ${LINE}` }} />
      <Label>Description (optional)</Label>
      <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={240} placeholder="What is this group for?" className={field} style={{ border: `1px solid ${LINE}` }} />
      <Label>Who can join</Label>
      <div className="flex flex-wrap gap-2">{modes.map((m) => <Chip key={m} on={mode === m} onClick={() => setMode(m)}>{MODES[m].label}</Chip>)}</div>
      <p className="mt-2 text-[12.5px]" style={{ color: SOFT }}>{MODES[mode].hint}</p>
      <Label>Max members (optional)</Label>
      <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={cap ? `Up to ${cap}` : "No limit"} className={field} style={{ border: `1px solid ${LINE}` }} />
      {err && <p className="mt-3 text-[12.5px] font-semibold text-red-500">{err}</p>}
      <Primary onClick={submit} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create workspace"}</Primary>
    </Sheet>
  );
}

function SettingsSheet({ s, students, onClose, onSave }: { s: W.Settings; students: W.Person[]; onClose: () => void; onSave: (s: W.Settings) => Promise<void> }) {
  const [creators, setCreators] = useState(s.creators), [allowed, setAllowed] = useState(s.allowed);
  const [mg, setMg] = useState(s.max_groups_per_student?.toString() ?? ""), [mm, setMm] = useState(s.max_members?.toString() ?? "");
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const save = async () => {
    setBusy(true); setErr("");
    try { await onSave({ ...s, creators, allowed, max_groups_per_student: numOrNull(mg), max_members: (() => { const n = numOrNull(mm); return n && n > 1 ? n : null; })() }); } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <Sheet title="Workspace settings" onClose={onClose}>
      <Label>Who can create workspaces</Label>
      <div className="flex flex-wrap gap-2">
        {([["none", "Only me"], ["all", "All students"], ["selected", "Selected students"]] as const).map(([k, l]) => <Chip key={k} on={creators === k} onClick={() => setCreators(k)}>{l}</Chip>)}
      </div>
      {creators === "selected" && (
        <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-2xl bg-white p-2" style={{ border: `1px solid ${LINE}` }}>
          {students.length === 0 && <p className="p-3 text-center text-[13px]" style={{ color: FAINT }}>No students yet</p>}
          {students.map((p) => { const on = allowed.includes(p.id); return (
            <button key={p.id} onClick={() => setAllowed(on ? allowed.filter((x) => x !== p.id) : [...allowed, p.id])} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-black/5">
              <Avatar name={p.name} id={p.id} size={32} /><span className="flex-1 truncate text-[14px] font-semibold">{p.name}</span>
              <span className="grid h-6 w-6 place-items-center rounded-full" style={on ? { backgroundColor: ACCENT, color: "#fff" } : { border: `1.5px solid ${FAINT}` }}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
            </button>); })}
        </div>
      )}
      <Label>Max workspaces per student (optional)</Label>
      <input value={mg} onChange={(e) => setMg(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="No limit" className={field} style={{ border: `1px solid ${LINE}` }} />
      <Label>Max members per student-created group (optional)</Label>
      <input value={mm} onChange={(e) => setMm(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="No limit" className={field} style={{ border: `1px solid ${LINE}` }} />
      <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: SOFT }}>You can always create, open and manage every workspace in this class.</p>
      {err && <p className="mt-3 text-[12.5px] font-semibold text-red-500">{err}</p>}
      <Primary onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Primary>
    </Sheet>
  );
}

/* ============================== group view ============================== */
type Tab = "chat" | "board" | "pins" | "people";
function GroupView({ g, me, myName, isT, rows, roster, act, setToast, onBack }: { g: W.Group; me: string; myName: string; isT: boolean; rows: W.Member[]; roster: W.Person[]; act: (f: () => Promise<unknown>) => void; setToast: (s: string) => void; onBack: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("chat");
  const T = TPL[g.template];
  const mine = rows.find((r) => r.user_id === me);
  const manage = isT || mine?.role === "owner";
  const canSee = isT || mine?.status === "member";
  const pending = rows.filter((r) => r.status === "requested").length;

  useEffect(() => {
    const ch = (supabase as any).channel(`ws-group-${g.id}`);
    for (const [t, k] of [["ws_messages", "ws-msgs"], ["ws_items", "ws-items"], ["ws_votes", "ws-votes"]] as const)
      ch.on("postgres_changes", { event: "*", schema: "public", table: t, filter: `group_id=eq.${g.id}` }, () => qc.invalidateQueries({ queryKey: [k, g.id] }));
    ch.subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [g.id]);
  useEffect(() => { if (!canSee) onBack(); }, [canSee]);

  const tabs: [Tab, string][] = [["chat", "Chat"], ...(T.board ? [["board", T.board] as [Tab, string]] : []), ["pins", "Pinned"], ["people", "People"]];
  return (
    <>
      <Header title={g.name} sub={`${T.label} · ${MODES[g.join_mode].label}`} icon={groupIcon} onBack={onBack} />
      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {tabs.map(([k, l]) => <Chip key={k} on={tab === k} onClick={() => setTab(k)}>{l}{k === "people" && manage && pending > 0 ? ` · ${pending}` : ""}</Chip>)}
      </div>
      <div className="ws-in flex min-h-0 flex-1 flex-col" key={tab}>
        {tab === "chat" && <ChatTab g={g} me={me} myName={myName} />}
        {tab === "board" && <BoardTab g={g} me={me} myName={myName} manage={manage} />}
        {tab === "pins" && <PinsTab g={g} me={me} myName={myName} manage={manage} />}
        {tab === "people" && <PeopleTab g={g} me={me} isT={isT} manage={manage} rows={rows} roster={roster} act={act} setToast={setToast} onBack={onBack} />}
      </div>
    </>
  );
}

const fmtSize = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function useSignedUrl(path: string | null) {
  return useQuery({ queryKey: ["ws-url", path], enabled: !!path, staleTime: 50 * 60_000, queryFn: () => W.signedAttachmentUrl(path!) }).data;
}

function VoicePlayer({ url, duration, mine }: { url?: string; duration: number; mine: boolean }) {
  const a = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false), [p, setP] = useState(0);
  const toggle = () => { const el = a.current; if (!el) return; if (el.paused) el.play().catch(() => {}); else el.pause(); };
  return (
    <div className="flex w-[210px] items-center gap-3">
      <audio ref={a} src={url} preload="metadata" onPlay={() => setOn(true)} onPause={() => setOn(false)} onEnded={() => { setOn(false); setP(0); }}
        onTimeUpdate={(e) => setP(duration ? Math.min(1, e.currentTarget.currentTime / duration) : 0)} />
      <button onClick={toggle} disabled={!url} aria-label={on ? "Pause" : "Play"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-90" style={{ backgroundColor: mine ? "rgba(255,255,255,0.22)" : WASH, color: mine ? "#fff" : ACCENT }}>
        {on ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
      </button>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: mine ? "rgba(255,255,255,0.25)" : "rgba(20,22,31,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${p * 100}%`, backgroundColor: mine ? "#fff" : ACCENT }} />
      </div>
      <span className="text-[11.5px] font-semibold tabular-nums">{mmss(duration)}</span>
    </div>
  );
}

const isImage = (m: W.Msg) => m.kind === "sketch" || (m.kind === "file" && !!m.mime?.startsWith("image/"));
function MsgBody({ m, mine }: { m: W.Msg; mine: boolean }) {
  const url = useSignedUrl(m.kind === "text" ? null : m.file_path);
  if (m.kind === "voice") return <VoicePlayer url={url} duration={m.duration ?? 0} mine={mine} />;
  if (isImage(m)) return url ? <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={m.file_name ?? "Image"} className="max-h-64 max-w-full rounded-2xl object-cover" /></a> : <div className="h-32 w-48 animate-pulse rounded-2xl" style={{ backgroundColor: "rgba(20,22,31,0.06)" }} />;
  if (m.kind === "file") return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex w-[220px] items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: mine ? "rgba(255,255,255,0.22)" : WASH, color: mine ? "#fff" : ACCENT }}><FileText className="h-5 w-5" /></span>
      <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{m.file_name}</span><span className="block text-[11.5px] opacity-70">{fmtSize(m.file_size ?? 0)}</span></span>
    </a>
  );
  return <>{m.body}</>;
}

function SketchPad({ onClose, onSend }: { onClose: () => void; onSend: (b: Blob) => Promise<void> }) {
  type Stroke = { c: string; w: number; pts: [number, number][] };
  const wrap = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]), cur = useRef<Stroke | null>(null);
  const [color, setColor] = useState(INK), [big, setBig] = useState(false), [n, setN] = useState(0), [busy, setBusy] = useState(false);
  const COLORS = [INK, ACCENT, "#E5484D", "#12A150", "#F59E0B"];
  const draw = () => {
    const c = cv.current; const x = c?.getContext("2d"); if (!c || !x) return;
    const d = window.devicePixelRatio || 1;
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.setTransform(d, 0, 0, d, 0, 0); x.lineCap = "round"; x.lineJoin = "round";
    for (const s of strokes.current) {
      x.strokeStyle = s.c; x.lineWidth = s.w; x.beginPath();
      s.pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
      const f = s.pts[0]; if (s.pts.length === 1 && f) x.lineTo(f[0] + 0.1, f[1]);
      x.stroke();
    }
  };
  useEffect(() => {
    const fit = () => { const c = cv.current, w = wrap.current; if (!c || !w) return; const d = window.devicePixelRatio || 1; c.width = w.clientWidth * d; c.height = w.clientHeight * d; draw(); };
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);
  const pos = (e: React.PointerEvent): [number, number] => { const r = cv.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const eraser = color === "#ffffff";
  const send = () => cv.current?.toBlob(async (b) => { if (!b) return; setBusy(true); try { await onSend(b); onClose(); } finally { setBusy(false); } }, "image/png");
  return (
    <div className="fixed inset-0 z-[96] flex flex-col" style={{ backgroundColor: CANVAS, paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <IconBtn onClick={onClose} label="Close"><X className="h-[18px] w-[18px]" /></IconBtn>
        <h2 className="flex-1 text-[19px] font-bold tracking-[-0.01em]">Sketch</h2>
        <button onClick={send} disabled={n === 0 || busy} className="h-10 rounded-full px-5 text-[14px] font-bold text-white disabled:opacity-40" style={{ backgroundColor: ACCENT }}>{busy ? "Sending…" : "Send"}</button>
      </div>
      <div ref={wrap} className="mx-4 min-h-0 flex-1 overflow-hidden rounded-[24px] bg-white" style={{ border: `1px solid ${LINE}` }}>
        <canvas ref={cv} className="h-full w-full" style={{ touchAction: "none" }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const s = { c: color, w: eraser ? 22 : big ? 8 : 3.5, pts: [pos(e)] }; cur.current = s; strokes.current.push(s); draw(); }}
          onPointerMove={(e) => { if (!cur.current) return; cur.current.pts.push(pos(e)); draw(); }}
          onPointerUp={() => { cur.current = null; setN(strokes.current.length); }} onPointerCancel={() => { cur.current = null; setN(strokes.current.length); }} />
      </div>
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-4">
        {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} aria-label="Colour" className="h-8 w-8 shrink-0 rounded-full transition-transform active:scale-90" style={{ backgroundColor: c, outline: color === c ? `3px solid ${WASH}` : "none", boxShadow: color === c ? `0 0 0 2px ${c}` : "none" }} />)}
        <IconBtn onClick={() => setColor("#ffffff")} label="Eraser"><Eraser className="h-[18px] w-[18px]" style={{ color: eraser ? ACCENT : INK }} /></IconBtn>
        <button onClick={() => setBig(!big)} aria-label="Brush size" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white" style={{ border: `1px solid ${LINE}` }}><span className="rounded-full" style={{ width: big ? 14 : 6, height: big ? 14 : 6, backgroundColor: INK }} /></button>
        <span className="flex-1" />
        <IconBtn onClick={() => { strokes.current.pop(); setN(strokes.current.length); draw(); }} label="Undo"><Undo2 className="h-[18px] w-[18px]" /></IconBtn>
        <IconBtn onClick={() => { strokes.current = []; setN(0); draw(); }} label="Clear"><Trash2 className="h-[18px] w-[18px]" /></IconBtn>
      </div>
    </div>
  );
}

function ChatTab({ g, me, myName }: { g: W.Group; me: string; myName: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [sketch, setSketch] = useState(false), [rec, setRec] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const r = useRef<{ mr: MediaRecorder; chunks: Blob[]; stream: MediaStream; t: number; cancel: boolean } | null>(null);
  const msgs = useQuery({ queryKey: ["ws-msgs", g.id], queryFn: () => W.listMessages(g.id) });
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.data?.length]);
  const redo = () => qc.invalidateQueries({ queryKey: ["ws-msgs", g.id] });
  const send = async () => {
    const b = text.trim(); if (!b) return;
    setText("");
    try { await W.sendMessage(g.id, me, myName, b); } catch { setText(b); }
    redo();
  };
  const sendMedia = async (blob: Blob, name: string, kind: "file" | "voice" | "sketch", duration?: number) => {
    if (blob.size > W.MAX_FILE) { setErr("Files can be up to 25 MB."); return; }
    setBusy(true); setErr("");
    try {
      const path = await W.uploadAttachment(g.id, blob, name);
      await W.sendMessage(g.id, me, myName, "", { kind, path, name, size: blob.size, mime: blob.type, duration });
      redo();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const stopRec = (sendIt: boolean) => { const st = r.current; if (!st) return; st.cancel = !sendIt; r.current = null; setRec(null); if (st.mr.state !== "inactive") st.mr.stop(); };
  const startRec = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const st = { mr, chunks: [] as Blob[], stream, t: Date.now(), cancel: false };
      mr.ondataavailable = (e) => { if (e.data.size) st.chunks.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const secs = (Date.now() - st.t) / 1000;
        if (st.cancel || secs < 1) return;
        const type = (mr.mimeType || "audio/webm").split(";")[0] || "audio/webm";
        sendMedia(new Blob(st.chunks, { type }), `voice-note.${type.includes("mp4") ? "m4a" : "webm"}`, "voice", Math.round(secs));
      };
      mr.start(); r.current = st; setRec(0);
    } catch { setErr("Microphone access was blocked."); }
  };
  useEffect(() => {
    if (rec === null) return;
    if (rec >= 300) { stopRec(true); return; }
    const t = setTimeout(() => setRec((x) => (x === null ? x : x + 1)), 1000);
    return () => clearTimeout(t);
  }, [rec]);
  useEffect(() => () => { const st = r.current; if (st) { st.cancel = true; if (st.mr.state !== "inactive") st.mr.stop(); } }, []);

  const list = msgs.data ?? [];
  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
        {list.length === 0 && <p className="py-16 text-center text-[13px]" style={{ color: FAINT }}>No messages yet. Say hello 👋</p>}
        {list.map((m, i) => { const mineMsg = m.user_id === me; const first = list[i - 1]?.user_id !== m.user_id; const last = list[i + 1]?.user_id !== m.user_id; return (
          <div key={m.id} className={`flex items-end gap-2 ${mineMsg ? "flex-row-reverse" : ""}`}>
            <div className="w-8 shrink-0">{last && <Avatar id={m.user_id} name={m.display_name} size={32} />}</div>
            <div className={`flex min-w-0 max-w-[82%] flex-col ${mineMsg ? "items-end" : "items-start"}`}>
            {first && !mineMsg && <span className="mb-1 ml-1 mt-2 text-[11.5px] font-bold" style={{ color: SOFT }}>{m.display_name}</span>}
            <div className={`max-w-full whitespace-pre-wrap break-words rounded-[20px] text-[14.5px] leading-snug ${isImage(m) ? "p-1.5" : "px-4 py-2.5"}`} style={mineMsg ? { backgroundColor: ACCENT, color: "#fff", borderBottomRightRadius: 6 } : { backgroundColor: "#fff", border: `1px solid ${LINE}`, borderBottomLeftRadius: 6 }}>
              <MsgBody m={m} mine={mineMsg} />
            </div>
            </div>
          </div>); })}
        <div ref={end} />
      </div>
      {err && <p className="px-5 pb-1 text-[12px] font-semibold text-red-500">{err}</p>}
      {busy && <p className="px-5 pb-1 text-[12px] font-semibold" style={{ color: SOFT }}>Sending…</p>}
      <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) sendMedia(f, f.name, "file"); }} />
      {rec !== null ? (
        <div className="flex items-center gap-3 px-4 pb-4 pt-2">
          <IconBtn onClick={() => stopRec(false)} label="Cancel recording"><Trash2 className="h-[18px] w-[18px]" /></IconBtn>
          <div className="flex h-12 flex-1 items-center gap-3 rounded-full bg-white px-5" style={{ border: `1px solid ${LINE}` }}>
            <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ backgroundColor: "#E5484D" }} />
            <span className="text-[14px] font-semibold tabular-nums">{mmss(rec)}</span>
            <span className="text-[12.5px]" style={{ color: FAINT }}>Recording…</span>
          </div>
          <button onClick={() => stopRec(true)} aria-label="Send voice note" className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-90" style={{ backgroundColor: ACCENT }}><Send className="h-[18px] w-[18px]" /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 pb-4 pt-2">
          <IconBtn onClick={() => fileRef.current?.click()} label="Attach a file"><Paperclip className="h-[18px] w-[18px]" /></IconBtn>
          <IconBtn onClick={() => setSketch(true)} label="Sketch"><PenLine className="h-[18px] w-[18px]" /></IconBtn>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message" maxLength={2000} className="h-12 min-w-0 flex-1 rounded-full bg-white px-5 text-[14.5px] outline-none" style={{ border: `1px solid ${LINE}` }} />
          {text.trim() ? (
            <button onClick={send} aria-label="Send" className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-90" style={{ backgroundColor: ACCENT }}><Send className="h-[18px] w-[18px]" /></button>
          ) : (
            <button onClick={startRec} aria-label="Record a voice note" className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-90" style={{ backgroundColor: ACCENT }}><Mic className="h-[18px] w-[18px]" /></button>
          )}
        </div>
      )}
      {sketch && <SketchPad onClose={() => setSketch(false)} onSend={(b) => sendMedia(b, "sketch.png", "sketch")} />}
    </>
  );
}

function AddRow({ placeholder, onAdd, extra }: { placeholder: string; onAdd: (t: string) => Promise<void>; extra?: React.ReactNode }) {
  const [t, setT] = useState(""), [busy, setBusy] = useState(false);
  const go = async () => { if (!t.trim() || busy) return; setBusy(true); try { await onAdd(t.trim()); setT(""); } finally { setBusy(false); } };
  return (
    <div className="flex items-center gap-2">
      <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} maxLength={300} placeholder={placeholder} className="h-11 min-w-0 flex-1 rounded-full bg-white px-4 text-[14px] outline-none" style={{ border: `1px solid ${LINE}` }} />
      {extra}
      <button onClick={go} disabled={!t.trim() || busy} aria-label="Add" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-90 disabled:opacity-40" style={{ backgroundColor: ACCENT }}><Plus className="h-5 w-5" /></button>
    </div>
  );
}

function BoardTab({ g, me, myName, manage }: { g: W.Group; me: string; myName: string; manage: boolean }) {
  const qc = useQueryClient();
  const kind = g.template === "project" ? "task" : "topic";
  const items = useQuery({ queryKey: ["ws-items", g.id], queryFn: () => W.listItems([g.id]) });
  const votes = useQuery({ queryKey: ["ws-votes", g.id], queryFn: () => W.listVotes([g.id]) });
  const redo = () => { qc.invalidateQueries({ queryKey: ["ws-items", g.id] }); qc.invalidateQueries({ queryKey: ["ws-votes", g.id] }); };
  const list = (items.data ?? []).filter((i) => i.kind === kind);
  const count = (id: string) => (votes.data ?? []).filter((v) => v.item_id === id).length;
  const voted = (id: string) => (votes.data ?? []).some((v) => v.item_id === id && v.user_id === me);
  const sorted = kind === "topic" ? [...list].sort((a, b) => Number(a.done) - Number(b.done) || count(b.id) - count(a.id)) : [...list].reverse().sort((a, b) => Number(a.done) - Number(b.done));
  const done = list.filter((i) => i.done).length;
  const run = async (f: () => Promise<unknown>) => { try { await f(); } catch { /* ignore */ } redo(); };
  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-6">
      <p className="text-[12.5px] leading-snug" style={{ color: SOFT }}>{TPL[g.template].hint}</p>
      <AddRow placeholder={kind === "task" ? "Add a task" : g.template === "study" ? "What's confusing?" : "Add a question"} onAdd={async (t) => run(() => W.addItem(g.id, kind, t, me, myName))} />
      {kind === "task" && list.length > 0 && (
        <div><div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(20,22,31,0.07)" }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(done / list.length) * 100}%`, backgroundColor: ACCENT }} /></div><p className="mt-1 text-[11.5px] font-semibold" style={{ color: FAINT }}>{done} of {list.length} done</p></div>
      )}
      {sorted.length === 0 && <p className="py-12 text-center text-[13px]" style={{ color: FAINT }}>Nothing here yet</p>}
      {sorted.map((i) => (
        <div key={i.id} className="flex items-center gap-3 rounded-[20px] bg-white p-3.5" style={{ border: `1px solid ${LINE}`, opacity: i.done ? 0.55 : 1 }}>
          {kind === "topic" ? (
            <button onClick={() => run(() => W.toggleVote(i.id, g.id, me, !voted(i.id)))} aria-label="Upvote" className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-2xl transition-transform active:scale-90" style={voted(i.id) ? { backgroundColor: ACCENT, color: "#fff" } : { backgroundColor: WASH, color: ACCENT }}>
              <ChevronUp className="h-4 w-4" strokeWidth={3} /><span className="text-[13px] font-extrabold leading-none">{count(i.id)}</span>
            </button>
          ) : (
            <button onClick={() => run(() => W.setDone(i.id, !i.done))} aria-label="Toggle done" className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all" style={i.done ? { backgroundColor: ACCENT, color: "#fff" } : { border: `1.5px solid ${FAINT}` }}>{i.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</button>
          )}
          <div className="min-w-0 flex-1">
            <p className="break-words text-[14.5px] font-semibold leading-snug" style={{ textDecoration: i.done ? "line-through" : "none" }}>{i.text}</p>
            <p className="mt-0.5 text-[11.5px]" style={{ color: FAINT }}>{i.author_name} · {ago(i.created_at)}</p>
          </div>
          {kind === "topic" && manage && <button onClick={() => run(() => W.setDone(i.id, !i.done))} className="rounded-full px-3 py-1.5 text-[11.5px] font-bold" style={{ backgroundColor: CANVAS, color: SOFT }}>{i.done ? "Reopen" : "Covered"}</button>}
          {(i.author_id === me || manage) && <button onClick={() => run(() => W.deleteItem(i.id))} aria-label="Delete" style={{ color: FAINT }}><Trash2 className="h-4 w-4" /></button>}
        </div>
      ))}
    </div>
  );
}

function PinsTab({ g, me, myName, manage }: { g: W.Group; me: string; myName: string; manage: boolean }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const items = useQuery({ queryKey: ["ws-items", g.id], queryFn: () => W.listItems([g.id]) });
  const list = (items.data ?? []).filter((i) => i.kind === "resource");
  const redo = () => qc.invalidateQueries({ queryKey: ["ws-items", g.id] });
  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-6">
      <AddRow placeholder="Title of a resource" extra={<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link" className="h-11 w-24 shrink-0 rounded-full bg-white px-3 text-[13px] outline-none sm:w-40" style={{ border: `1px solid ${LINE}` }} />}
        onAdd={async (t) => { await W.addItem(g.id, "resource", t, me, myName, safeUrl(url)); setUrl(""); redo(); }} />
      {list.length === 0 && <p className="py-12 text-center text-[13px]" style={{ color: FAINT }}>Pin links, readings and files your group needs</p>}
      {list.map((i) => { const href = i.url ? safeUrl(i.url) : null; return (
        <div key={i.id} className="flex items-center gap-3 rounded-[20px] bg-white p-3.5" style={{ border: `1px solid ${LINE}` }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: WASH, color: ACCENT }}>{href ? <Link2 className="h-[18px] w-[18px]" /> : <Pin className="h-[18px] w-[18px]" />}</span>
          <div className="min-w-0 flex-1">
            {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="block truncate text-[14.5px] font-semibold" style={{ color: ACCENT }}>{i.text}</a> : <p className="truncate text-[14.5px] font-semibold">{i.text}</p>}
            <p className="truncate text-[11.5px]" style={{ color: FAINT }}>{href ? new URL(href).host : "Note"} · {i.author_name}</p>
          </div>
          {(i.author_id === me || manage) && <button onClick={async () => { try { await W.deleteItem(i.id); } catch { /* ignore */ } redo(); }} aria-label="Remove" style={{ color: FAINT }}><Trash2 className="h-4 w-4" /></button>}
        </div>); })}
    </div>
  );
}

function PeopleTab({ g, me, isT, manage, rows, roster, act, setToast, onBack }: { g: W.Group; me: string; isT: boolean; manage: boolean; rows: W.Member[]; roster: W.Person[]; act: (f: () => Promise<unknown>) => void; setToast: (s: string) => void; onBack: () => void }) {
  const qc = useQueryClient();
  const members = rows.filter((r) => r.status === "member");
  const requests = rows.filter((r) => r.status === "requested");
  const invited = rows.filter((r) => r.status === "invited");
  const addable = roster.filter((p) => p.role === "student" && !rows.some((r) => r.user_id === p.id));
  const mine = rows.find((r) => r.user_id === me);
  const row = (name: string, sub: string, right: React.ReactNode, key: string) => (
    <div key={key} className="flex items-center gap-3 rounded-[20px] bg-white p-3" style={{ border: `1px solid ${LINE}` }}>
      <Avatar name={name} id={key} /><div className="min-w-0 flex-1"><p className="truncate text-[14.5px] font-semibold">{name}</p><p className="text-[12px]" style={{ color: FAINT }}>{sub}</p></div>{right}
    </div>
  );
  const small = (t: string, f: () => void, solid = false) => <button onClick={f} className="rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-transform active:scale-95" style={solid ? { backgroundColor: ACCENT, color: "#fff" } : { backgroundColor: CANVAS, color: SOFT }}>{t}</button>;
  return (
    <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-8">
      {manage && (
        <div className="mb-2">
          <Label>Join mode</Label>
          <div className="flex flex-wrap gap-2">
            {((isT ? ["open", "request", "invite", "assigned"] : ["open", "request", "invite"]) as W.JoinMode[]).map((m) => <Chip key={m} on={g.join_mode === m} onClick={() => act(() => W.setJoinMode(g.id, m))}>{MODES[m].label}</Chip>)}
          </div>
          <p className="mt-2 text-[12.5px]" style={{ color: SOFT }}>{MODES[g.join_mode].hint}</p>
        </div>
      )}
      {manage && requests.length > 0 && <><Label>Requests</Label>{requests.map((r) => row(r.display_name, "Wants to join", <div className="flex gap-1.5">{small("Decline", () => act(() => W.respond(g.id, r.user_id, false)))}{small("Approve", () => act(() => W.respond(g.id, r.user_id, true)), true)}</div>, r.user_id))}</>}
      <Label>Members · {members.length}{g.max_members ? `/${g.max_members}` : ""}</Label>
      {members.map((r) => row(r.display_name, r.role === "owner" ? "Owner" : "Member", manage && r.role !== "owner" ? small("Remove", () => act(() => W.leave(g.id, r.user_id))) : null, r.user_id))}
      {manage && invited.length > 0 && <><Label>Invited</Label>{invited.map((r) => row(r.display_name, "Waiting to accept", small("Cancel", () => act(() => W.leave(g.id, r.user_id))), r.user_id))}</>}
      {manage && addable.length > 0 && <><Label>{isT ? "Add students" : "Invite classmates"}</Label>{addable.map((p) => row(p.name, "Student", small(isT ? "Add" : "Invite", () => act(() => W.invite(g.id, p.id)), true), p.id))}</>}
      <div className="pt-4">
        {mine?.status === "member" && mine.role !== "owner" && <button onClick={() => act(async () => { await W.leave(g.id); onBack(); })} className="h-11 w-full rounded-full text-[14px] font-bold" style={{ backgroundColor: "#fff", color: SOFT, border: `1px solid ${LINE}` }}>Leave workspace</button>}
        {manage && <button onClick={() => { if (window.confirm("Delete this workspace and everything in it?")) act(async () => { await W.deleteGroup(g.id); qc.removeQueries({ queryKey: ["ws-msgs", g.id] }); onBack(); }); }} className="mt-2 h-11 w-full rounded-full text-[14px] font-bold text-red-500" style={{ backgroundColor: "#fff", border: `1px solid ${LINE}` }}>Delete workspace</button>}
      </div>
    </div>
  );
}

/* ============================== lecturer insights ============================== */
function Insights({ groups }: { groups: W.Group[] }) {
  const qc = useQueryClient();
  const ids = groups.filter((g) => g.template === "study" || g.template === "reading").map((g) => g.id);
  const items = useQuery({ queryKey: ["ws-insights", ids.join()], enabled: ids.length > 0, queryFn: () => W.listItems(ids, "topic") });
  const votes = useQuery({ queryKey: ["ws-insight-votes", ids.join()], enabled: ids.length > 0, queryFn: () => W.listVotes(ids) });
  const ranked = (items.data ?? []).map((i) => ({ i, n: (votes.data ?? []).filter((v) => v.item_id === i.id).length })).sort((a, b) => Number(a.i.done) - Number(b.i.done) || b.n - a.n);
  const name = (id: string) => groups.find((g) => g.id === id)?.name ?? "";
  return (
    <div className="ws-in flex-1 space-y-3 overflow-y-auto px-4 pb-8 pt-1">
      {ranked.length === 0 && <p className="py-16 text-center text-[13px]" style={{ color: FAINT }}>{items.isLoading ? "Loading…" : "No muddy points posted yet. They'll be ranked here by upvotes."}</p>}
      {ranked.map(({ i, n }, idx) => (
        <div key={i.id} className="flex items-center gap-3 rounded-[20px] bg-white p-3.5" style={{ border: `1px solid ${LINE}`, opacity: i.done ? 0.55 : 1 }}>
          <span className="grid h-12 w-11 shrink-0 place-items-center rounded-2xl text-center" style={{ backgroundColor: idx < 3 && !i.done ? ACCENT : WASH, color: idx < 3 && !i.done ? "#fff" : ACCENT }}><span><span className="block text-[15px] font-extrabold leading-none">{n}</span><span className="block text-[9px] font-bold uppercase">votes</span></span></span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-[14.5px] font-semibold leading-snug" style={{ textDecoration: i.done ? "line-through" : "none" }}>{i.text}</p>
            <p className="mt-0.5 truncate text-[11.5px]" style={{ color: FAINT }}>{name(i.group_id)} · {i.author_name}</p>
          </div>
          <button onClick={async () => { try { await W.setDone(i.id, !i.done); } catch { /* ignore */ } qc.invalidateQueries({ queryKey: ["ws-insights"] }); }} className="rounded-full px-3 py-1.5 text-[11.5px] font-bold" style={{ backgroundColor: CANVAS, color: SOFT }}>{i.done ? "Reopen" : "Covered"}</button>
        </div>
      ))}
    </div>
  );
}