import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Search, Share2, X } from "lucide-react";
import { supabase } from "@/integrations/client";
import { profileFromUser, useAuth } from "@/lib/auth";
import { isClassId } from "@/lib/classes";
import { getLiveMembers } from "@/lib/live-class";
import { getMyShare, listSharedWithMe, removeShare, upsertShare, type SharedBlock, type SharedNote } from "@/lib/shared-notes";

const INK = "#14161F", SOFT = "#707285", FAINT = "#A3A5B5", ACCENT = "#5B3FE0", WASH = "#EEEAFD", LINE = "rgba(20,22,31,0.07)", CANVAS = "#F5F5FA";
const DISPLAY = "'Bricolage Grotesque', 'Plus Jakarta Sans', system-ui, sans-serif";
const SEEN = "vc-notes-seen-v1";

const css = `@keyframes snUp{from{transform:translateY(28px);opacity:0}to{transform:none;opacity:1}}@keyframes snFade{from{opacity:0}to{opacity:1}}`;

const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

function Avatar({ name, url }: { name: string; url?: string | null }) {
  return url ? (
    <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold" style={{ backgroundColor: WASH, color: ACCENT }}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <style>{css}</style>
      <div onClick={onClose} className="absolute inset-0" style={{ backgroundColor: "rgba(20,22,31,0.32)", animation: "snFade .25s ease" }} />
      <div
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] sm:max-w-md sm:rounded-[28px]"
        style={{ backgroundColor: CANVAS, animation: "snUp .38s cubic-bezier(.22,1,.36,1)", boxShadow: "0 -12px 40px rgba(20,22,31,0.12)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- Share button + people picker (goes in the note editor header) ---------- */
type NoteLike = { id: string; title: string; blocks: SharedBlock[]; subject: string | null };

export function ShareNoteButton({ note }: { note: NoteLike }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const classId = isClassId(note.subject ?? undefined) ? note.subject! : null;
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const key = ["my-share", note.id, user?.id];
  const mine = useQuery({ queryKey: key, enabled: !!user && !!classId, queryFn: () => getMyShare(note.id, user!.id) });
  const members = useQuery({ queryKey: ["live-members", classId], enabled: open && !!classId, queryFn: () => getLiveMembers(classId!) });
  const shared = !!mine.data && mine.data.recipients.length > 0;

  /* keep the shared copy in sync while the owner keeps editing */
  const sig = JSON.stringify([note.title, note.blocks]);
  const sent = useRef(sig);
  useEffect(() => {
    if (!shared || !classId || !user || sig === sent.current) return;
    const t = window.setTimeout(() => {
      upsertShare({ note_id: note.id, owner_id: user.id, owner_name: profileFromUser(user).name, class_id: classId, title: note.title, blocks: note.blocks, recipients: mine.data!.recipients })
        .then(() => (sent.current = sig))
        .catch(() => {});
    }, 1500);
    return () => window.clearTimeout(t);
  }, [sig]);

  const people = (members.data ?? []).filter((m) => m.id !== user?.id);
  const shown = people.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const allOn = people.length > 0 && picked.length === people.length;

  const submit = async () => {
    if (!classId || !user) return;
    setBusy(true);
    setErr("");
    try {
      if (picked.length === 0) await removeShare(note.id, user.id);
      else await upsertShare({ note_id: note.id, owner_id: user.id, owner_name: profileFromUser(user).name, class_id: classId, title: note.title, blocks: note.blocks, recipients: picked });
      sent.current = sig;
      await qc.invalidateQueries({ queryKey: key });
      setOpen(false);
    } catch {
      setErr("Couldn't share right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setPicked(mine.data?.recipients ?? []); setQ(""); setErr(""); setOpen(true); }}
        aria-label="Share note"
        className="relative grid h-10 w-10 place-items-center rounded-full bg-white transition-transform active:scale-90"
        style={{ border: `1px solid ${LINE}`, color: shared ? ACCENT : INK }}
      >
        <Share2 className="h-[18px] w-[18px]" />
        {shared && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />}
      </button>

      {open && (
        <Sheet label="Share note" onClose={() => setOpen(false)}>
          <div className="flex items-start gap-3 px-5 pb-3 pt-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-[20px] font-extrabold leading-tight" style={{ fontFamily: DISPLAY, color: INK }}>Share note</h2>
              <p className="mt-0.5 truncate text-[13px]" style={{ color: SOFT }}>{note.title.trim() || "Untitled note"}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-white" style={{ border: `1px solid ${LINE}` }}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {!classId ? (
            <p className="px-5 pb-8 pt-2 text-[14px] leading-relaxed" style={{ color: SOFT }}>
              Move this note into one of your class categories first, then you can share it with your classmates.
            </p>
          ) : (
            <>
              <div className="px-5">
                <label className="flex h-11 items-center gap-2 rounded-full bg-white px-4" style={{ border: `1px solid ${LINE}` }}>
                  <Search className="h-4 w-4" style={{ color: FAINT }} />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search classmates" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" style={{ color: INK }} />
                </label>
                {people.length > 1 && (
                  <button onClick={() => setPicked(allOn ? [] : people.map((m) => m.id))} className="mt-3 text-[13px] font-bold" style={{ color: ACCENT }}>
                    {allOn ? "Clear selection" : "Select everyone"}
                  </button>
                )}
              </div>
              <div className="mt-2 min-h-[120px] flex-1 overflow-y-auto px-3">
                {members.isLoading && <p className="px-3 py-6 text-center text-[13px]" style={{ color: FAINT }}>Loading class…</p>}
                {!members.isLoading && shown.length === 0 && <p className="px-3 py-6 text-center text-[13px]" style={{ color: FAINT }}>No one found</p>}
                {shown.map((m) => {
                  const on = picked.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggle(m.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors active:bg-white">
                      <Avatar name={m.name} url={m.avatar_url} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold" style={{ color: INK }}>{m.name}</span>
                        <span className="block text-[12px]" style={{ color: FAINT }}>{m.role === "teacher" ? "Lecturer" : "Student"}</span>
                      </span>
                      <span className="grid h-6 w-6 place-items-center rounded-full transition-all" style={on ? { backgroundColor: ACCENT, color: "#fff" } : { border: `1.5px solid ${FAINT}` }}>
                        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="px-5 pb-5 pt-3">
                {err && <p className="mb-2 text-center text-[12px] font-semibold text-red-500">{err}</p>}
                <button
                  onClick={submit}
                  disabled={busy || (picked.length === 0 && !shared)}
                  className="h-12 w-full rounded-full text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
                  style={{ backgroundColor: picked.length === 0 && shared ? "#E5484D" : ACCENT }}
                >
                  {busy ? "Saving…" : picked.length === 0 ? (shared ? "Stop sharing" : "Pick people to share with") : shared ? `Update · ${picked.length} selected` : `Share with ${picked.length}`}
                </button>
                <p className="mt-2 text-center text-[11.5px]" style={{ color: FAINT }}>They get a read-only copy that updates as you edit.</p>
              </div>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

/* ---------- "Shared with you" strip + read-only viewer (goes above the notes list) ---------- */
export function SharedInbox({ classId, onSave }: { classId?: string; onSave: (n: SharedNote) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(SEEN) || "{}"); } catch { return {}; }
  });
  const list = useQuery({ queryKey: ["shared-notes", user?.id, classId ?? "all"], enabled: !!user, queryFn: () => listSharedWithMe(user!.id, classId) });

  useEffect(() => {
    if (!user) return;
    const ch = (supabase as any)
      .channel(`shared-notes-${user.id}-${classId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_notes" }, () => qc.invalidateQueries({ queryKey: ["shared-notes"] }))
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [user?.id, classId]);

  const notes = list.data ?? [];
  const current = notes.find((n) => n.id === openId) ?? null;
  const markSeen = (n: SharedNote) =>
    setSeen((s) => {
      const next = { ...s, [n.id]: n.updated_at };
      try { localStorage.setItem(SEEN, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  const preview = (n: SharedNote) => n.blocks.find((b) => b.text.trim())?.text ?? "Empty note";

  if (notes.length === 0) return null;
  return (
    <section className="mb-6">
      <p className="mb-2 px-1 text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: FAINT }}>Shared with you</p>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => { setOpenId(n.id); markSeen(n); }}
            className="relative flex w-[220px] shrink-0 flex-col rounded-[22px] bg-white p-4 text-left transition-transform active:scale-[0.97]"
            style={{ border: `1px solid ${LINE}`, boxShadow: "0 8px 28px rgba(20,22,31,0.05)" }}
          >
            {seen[n.id] !== n.updated_at && <span className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />}
            <span className="truncate pr-4 text-[15px] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>{n.title.trim() || "Untitled note"}</span>
            <span className="mt-1 line-clamp-2 min-h-[36px] text-[12.5px] leading-snug" style={{ color: SOFT }}>{preview(n)}</span>
            <span className="mt-3 flex items-center gap-2 text-[11.5px] font-semibold" style={{ color: FAINT }}>
              <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold" style={{ backgroundColor: WASH, color: ACCENT }}>{(n.owner_name ?? "?").charAt(0).toUpperCase()}</span>
              <span className="truncate">{n.owner_name ?? "Classmate"} · {ago(n.updated_at)}</span>
            </span>
          </button>
        ))}
      </div>

      {current && (
        <Sheet label="Shared note" onClose={() => setOpenId(null)}>
          <div className="flex items-start gap-3 px-5 pb-2 pt-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] font-extrabold leading-tight" style={{ fontFamily: DISPLAY, color: INK }}>{current.title.trim() || "Untitled note"}</h2>
              <p className="mt-1 text-[12.5px] font-semibold" style={{ color: FAINT }}>From {current.owner_name ?? "a classmate"} · updated {ago(current.updated_at)}</p>
            </div>
            <button onClick={() => setOpenId(null)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-white" style={{ border: `1px solid ${LINE}` }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-3 text-[15px] leading-relaxed" style={{ color: INK }}>
            {current.blocks.filter((b) => b.text.trim()).map((b) =>
              b.type === "heading" ? <h3 key={b.id} className="pt-2 text-[17px] font-extrabold" style={{ fontFamily: DISPLAY }}>{b.text}</h3>
              : b.type === "bullet" ? <p key={b.id} className="flex gap-2.5"><span style={{ color: ACCENT }}>•</span><span>{b.text}</span></p>
              : b.type === "todo" ? (
                <p key={b.id} className="flex items-start gap-2.5">
                  <span className="mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md" style={b.done ? { backgroundColor: ACCENT, color: "#fff" } : { border: `1.5px solid ${FAINT}` }}>{b.done && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                  <span style={{ opacity: b.done ? 0.5 : 1, textDecoration: b.done ? "line-through" : "none" }}>{b.text}</span>
                </p>
              ) : <p key={b.id}>{b.text}</p>,
            )}
          </div>
          <div className="px-5 pb-5 pt-3">
            <button onClick={() => { onSave(current); setOpenId(null); }} className="h-12 w-full rounded-full text-[15px] font-bold text-white transition-transform active:scale-[0.98]" style={{ backgroundColor: ACCENT }}>
              Save a copy to my notes
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
