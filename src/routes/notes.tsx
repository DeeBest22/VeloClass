import { createFileRoute, Link } from "@tanstack/react-router";
import { ShareNoteButton, SharedInbox } from "@/components/ShareNote";
import { isClassId, useClassOverview } from "@/lib/classes";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, Heading1, List, ListChecks, NotebookPen, Pin, PinOff, Plus, Search, Trash2, Type, X } from "lucide-react";

/*
  Route: /notes            all notes
         /notes?classId=x  notes for one class (the filter lives in the URL, so it survives
                           refresh and can be linked to from a class page)
*/
export const Route = createFileRoute("/notes")({
  validateSearch: (q: Record<string, unknown>): { classId?: string } => (typeof q["classId"] === "string" ? { classId: q["classId"] } : {}),
  head: () => ({
    meta: [
      { title: "Notes | Classroom" },
      { name: "description", content: "Take, organise and revisit your notes for every class." },
    ],
  }),
  component: NotesPage,
});

/* ---------- design tokens (same as live-class and class chat) ---------- */
const INK = "#14161F";
const INK_SOFT = "#707285";
const FAINT = "#A3A5B5";
const PLACEHOLDER = "#B3B5C2";
const CANVAS = "#F5F5FA";
const ACCENT = "#5B3FE0";
const WASH = "#EEEAFD";
const LINE = "rgba(20,22,31,0.07)";
const CHIP = "#E9E9F1";
const FLOAT = "0 8px 28px rgba(20,22,31,0.08)";
const DISPLAY = "'Bricolage Grotesque', 'Plus Jakarta Sans', system-ui, sans-serif";
const BODY = "'Plus Jakarta Sans', system-ui, sans-serif";

/*
  TODO: subjects are placeholders. Replace with the student's real classes
  (id, name) from your class queries. `ink` and `tint` just give each subject a quiet colour.
*/
type Subject = { id: string; name: string; ink: string; tint: string };
const DEFAULT_SUBJECTS: Subject[] = [
  { id: "fluid", name: "Fluid Mechanics", ink: ACCENT, tint: "#EEEAFD" },
  { id: "statics", name: "Statics", ink: "#0D9B57", tint: "#E4F6EC" },
  { id: "thermo", name: "Thermodynamics", ink: "#FF5A36", tint: "#FDE7E2" },
  { id: "maths", name: "Engineering Maths", ink: "#2F6BFF", tint: "#E3ECFF" },
];

/* colours handed out (in turn) to categories the student creates */
const PALETTE: { ink: string; tint: string }[] = [
  { ink: "#D6336C", tint: "#FCE4EE" },
  { ink: "#0E9AA7", tint: "#DFF4F6" },
  { ink: "#B7791F", tint: "#FBF0DC" },
  { ink: "#6B7A1F", tint: "#EEF3D6" },
  { ink: "#7C3AED", tint: "#F0E7FE" },
  { ink: "#C2410C", tint: "#FDEBDD" },
];

/* TODO: categories live in localStorage too. Swap for your real classes / categories table. */
const CATS_KEY = "vc-notes-categories-v1";
function loadCats(): Subject[] {
  try {
    const raw = localStorage.getItem(CATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Subject[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* storage unavailable: fall back to defaults */
  }
  return DEFAULT_SUBJECTS;
}
function persistCats(cats: Subject[]) {
  try {
    localStorage.setItem(CATS_KEY, JSON.stringify(cats));
  } catch {
    /* ignore */
  }
}
const subjectOf = (list: Subject[], id: string | null | undefined) => list.find((s) => s.id === id) ?? null;

/* ---------- types ---------- */
type BlockType = "heading" | "text" | "bullet" | "todo";
type Block = { id: string; type: BlockType; text: string; done: boolean };
type Note = { id: string; title: string; blocks: Block[]; subject: string | null; pinned: boolean; updated: number };

/*
  TODO: notes live in localStorage so everything works right now.
  Swap `load`, `persist` and the add/update/remove handlers for your real notes table.
*/
const STORE_KEY = "vc-notes-v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const blk = (type: BlockType, text = "", done = false): Block => ({ id: uid(), type, text, done });
const ago = (h: number) => Date.now() - h * 3600_000;

const SEED: Note[] = [
  {
    id: "n1", title: "Bernoulli's equation", subject: "fluid", pinned: true, updated: ago(2),
    blocks: [
      blk("text", "Energy per unit weight stays constant along a streamline for steady, inviscid, incompressible flow."),
      blk("heading", "What adds up"),
      blk("bullet", "Pressure head + velocity head + elevation head"),
      blk("bullet", "Breaks down with friction or pumps in the line"),
      blk("heading", "Follow up"),
      blk("todo", "Redo tutorial question 4", true),
      blk("todo", "Ask Dr. Ada about venturi meters"),
    ],
  },
  {
    id: "n2", title: "Test 2 checklist", subject: "statics", pinned: true, updated: ago(20),
    blocks: [blk("todo", "Chapters 3 to 5", true), blk("todo", "Past questions 2019 to 2023"), blk("todo", "Calculator and spare batteries"), blk("todo", "Free body diagram drill")],
  },
  {
    id: "n3", title: "First law, in plain words", subject: "thermo", pinned: false, updated: ago(30),
    blocks: [blk("text", "Energy is never created or destroyed, only moved around."), blk("bullet", "Heat in minus work out equals change in internal energy")],
  },
  {
    id: "n4", title: "Laplace transforms", subject: "maths", pinned: false, updated: ago(75),
    blocks: [blk("bullet", "Linearity"), blk("bullet", "Shifting theorems"), blk("bullet", "Inverse by partial fractions"), blk("text", "Practise the table until it is automatic.")],
  },
];

function load(): Note[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Note[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* storage unavailable: fall back to seed */
  }
  return SEED;
}
function persist(notes: Note[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(notes));
  } catch {
    /* ignore */
  }
}

/* ---------- helpers ---------- */
const isEmpty = (n: Note) => !n.title.trim() && n.blocks.every((b) => !b.text.trim());
const wordCount = (n: Note) => (n.title + " " + n.blocks.map((b) => b.text).join(" ")).trim().split(/\s+/).filter(Boolean).length;
const taskStats = (n: Note) => {
  const tasks = n.blocks.filter((b) => b.type === "todo" && b.text.trim());
  return { done: tasks.filter((b) => b.done).length, total: tasks.length };
};

function whenLabel(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const mins = Math.floor((now.getTime() - ts) / 60000);
  if (mins < 1) return "Just now";
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
const rise = (n: number) => ({ animationDelay: `${Math.min(n, 8) * 45}ms` });

/* ---------- note card ---------- */
function NoteCard({ note, subject, index, onOpen, onToggle }: { note: Note; subject: Subject | null; index: number; onOpen: () => void; onToggle: (blockId: string) => void }) {
  const sub = subject;
  const preview = note.blocks.filter((b) => b.text.trim()).slice(0, 4);
  const { done, total } = taskStats(note);
  const tone = sub?.ink ?? ACCENT;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className="nt-card nt-rise mb-3 block w-full cursor-pointer break-inside-avoid rounded-[22px] bg-white p-4 text-left ring-1 ring-black/[0.035] md:mb-4"
      style={rise(index)}
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-[15px] font-extrabold leading-[1.25] tracking-tight" style={{ fontFamily: DISPLAY, color: note.title.trim() ? INK : PLACEHOLDER }}>
          {note.title.trim() || "Untitled"}
        </span>
        {note.pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} fill="currentColor" aria-label="Pinned" />}
      </div>

      {preview.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {preview.map((b) => (
            <div key={b.id} className="flex items-start gap-2 text-[12.5px] leading-[18px]" style={{ color: b.done ? PLACEHOLDER : "#555868" }}>
              {b.type === "todo" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(b.id);
                  }}
                  aria-label={b.done ? "Mark as not done" : "Mark as done"}
                  aria-pressed={b.done}
                  className="-m-1 mt-[-1px] shrink-0 rounded-full p-1"
                >
                  <span
                    className="grid h-[14px] w-[14px] place-items-center rounded-full transition-colors duration-300"
                    style={b.done ? { backgroundColor: tone } : { border: "1.5px solid #C9CAD6" }}
                  >
                    {b.done && <Check className="h-2 w-2 text-white" strokeWidth={4} />}
                  </span>
                </button>
              )}
              {b.type === "bullet" && <span className="mt-[8px] h-[3px] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: "#9A9CAD" }} />}
              <span
                className={`min-w-0 flex-1 ${b.type === "text" ? "line-clamp-3" : "line-clamp-2"} ${b.done ? "line-through" : ""} ${b.type === "heading" ? "font-bold" : ""}`}
                style={b.type === "heading" ? { color: INK } : undefined}
              >
                {b.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: CHIP }}>
            <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${(done / total) * 100}%`, backgroundColor: tone }} />
          </div>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: INK_SOFT }}>
            {done}/{total}
          </span>
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between gap-2">
        {sub ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold" style={{ color: INK_SOFT }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: sub.ink }} />
            <span className="truncate">{sub.name}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="shrink-0 text-[11px] font-medium" style={{ color: FAINT }}>
          {whenLabel(note.updated)}
        </span>
      </div>
    </div>
  );
}

/* ---------- one editable line ---------- */
function BlockRow({
  block,
  setRef,
  onText,
  onToggle,
  onKey,
  onFocus,
}: {
  block: Block;
  setRef: (el: HTMLTextAreaElement | null) => void;
  onText: (v: string) => void;
  onToggle: () => void;
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
}) {
  const ta = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [block.text, block.type]);

  const isHeading = block.type === "heading";

  return (
    <div className={`flex items-start gap-3 ${isHeading ? "pt-3" : ""}`}>
      {block.type === "todo" && (
        <button
          onClick={onToggle}
          aria-label={block.done ? "Mark as not done" : "Mark as done"}
          aria-pressed={block.done}
          className="mt-[5px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full transition-all duration-300 active:scale-90"
          style={block.done ? { backgroundColor: ACCENT, border: `1.5px solid ${ACCENT}` } : { border: "1.5px solid #C9CAD6", backgroundColor: "#fff" }}
        >
          <Check className="h-3 w-3 text-white transition-all duration-300" strokeWidth={3.5} style={{ opacity: block.done ? 1 : 0, transform: block.done ? "scale(1)" : "scale(.4)" }} />
        </button>
      )}
      {block.type === "bullet" && <span className="ml-[9px] mt-[15px] h-[5px] w-[5px] shrink-0 rounded-full" style={{ backgroundColor: INK_SOFT }} />}
      <textarea
        ref={(el) => {
          ta.current = el;
          setRef(el);
        }}
        rows={1}
        value={block.text}
        onChange={(e) => onText(e.target.value)}
        onKeyDown={onKey}
        onFocus={onFocus}
        placeholder={block.type === "text" ? "Start typing" : block.type === "todo" ? "To do" : block.type === "heading" ? "Heading" : "List item"}
        className="min-w-0 flex-1 resize-none bg-transparent py-1 outline-none transition-colors duration-300 placeholder:text-[#B3B5C2]"
        style={{
          fontSize: isHeading ? 20 : 16,
          lineHeight: isHeading ? "28px" : "26px",
          fontWeight: isHeading ? 800 : 400,
          letterSpacing: isHeading ? "-0.01em" : undefined,
          color: block.done ? FAINT : INK,
          textDecoration: block.done ? "line-through" : "none",
          fontFamily: isHeading ? DISPLAY : "inherit",
          overflow: "hidden",
        }}
      />
    </div>
  );
}

/* ---------- page ---------- */
function NotesPage() {
  const { classId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [categories, setCategories] = useState<Subject[]>(() => loadCats());
  const [addingCat, setAddingCat] = useState(false);
  const [catName, setCatName] = useState("");
  const overview = useClassOverview(isClassId(classId) ? classId : undefined).data;
  useEffect(() => {
    if (overview && !categories.some((c) => c.id === overview.id)) setCategories((all) => [...all, { id: overview.id, name: overview.name, ...PALETTE[all.length % PALETTE.length] }]);
  }, [overview]);
  const filter = subjectOf(categories, classId) ? (classId as string) : "all";
  const setFilter = (id: string) => navigate({ search: () => ({ classId: id === "all" ? undefined : id }), replace: true });

  useEffect(() => {
    persistCats(categories);
  }, [categories]);

  const closeCatInput = () => {
    setAddingCat(false);
    setCatName("");
  };
  const addCategory = () => {
    const name = catName.trim();
    if (!name) return closeCatInput();
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setFilter(existing.id); // already there: just jump to it
    } else {
      const cat: Subject = { id: `c-${uid()}`, name, ...PALETTE[categories.length % PALETTE.length] };
      setCategories((all) => [...all, cat]);
      setFilter(cat.id);
    }
    closeCatInput();
  };

  const [notes, setNotes] = useState<Note[]>(() => load());
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null); // note shown in the editor
  const [editorOn, setEditorOn] = useState(false); // drives the slide animation
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);

  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const focusNext = useRef<{ id: string; pos: number } | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const toastTimer = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  /* persist, debounced, and show a quiet "Saved" state */
  useEffect(() => {
    setSaved(false);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      persist(notes);
      setSaved(true);
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [notes]);

  /* never lose the last keystrokes when the tab closes or the route changes */
  useEffect(() => {
    const flush = () => persist(notesRef.current);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const showToast = useCallback((msg: string, undo?: () => void) => {
    setToast({ msg, undo });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 4500 : 1800);
  }, []);

  const current = useMemo(() => notes.find((n) => n.id === openId) ?? null, [notes, openId]);

  /* focus whatever the last key handler asked for */
  useLayoutEffect(() => {
    const f = focusNext.current;
    if (!f) return;
    const el = refs.current[f.id];
    if (el) {
      el.focus();
      el.setSelectionRange(f.pos, f.pos);
      focusNext.current = null;
    }
  });

  const patch = (id: string, fn: (n: Note) => Note) => setNotes((all) => all.map((n) => (n.id === id ? { ...fn(n), updated: Date.now() } : n)));
  const patchBlocks = (id: string, fn: (b: Block[]) => Block[]) => patch(id, (n) => ({ ...n, blocks: fn(n.blocks) }));

  /* tick a task straight from the grid without reshuffling the list */
  const toggleFromCard = (noteId: string, blockId: string) =>
    setNotes((all) => all.map((n) => (n.id === noteId ? { ...n, blocks: n.blocks.map((b) => (b.id === blockId ? { ...b, done: !b.done } : b)) } : n)));

  /* ----- open / close ----- */
  const openNote = (id: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpenId(id);
    requestAnimationFrame(() => setEditorOn(true));
  };
  const newNote = () => {
    const n: Note = { id: uid(), title: "", blocks: [blk("text")], subject: filter !== "all" ? filter : null, pinned: false, updated: Date.now() };
    setNotes((all) => [n, ...all]);
    openNote(n.id);
    window.setTimeout(() => titleRef.current?.focus(), 380);
  };
  const closeEditor = useCallback(() => {
    if (!openId) return;
    const id = openId;
    setEditorOn(false);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpenId(null);
      setActiveBlock(null);
      setNotes((all) => all.filter((n) => n.id !== id || !isEmpty(n))); // drop notes left blank
    }, 420);
  }, [openId]);

  useEffect(() => {
    if (!editorOn) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEditor();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [editorOn, closeEditor]);

  const removeNote = () => {
    if (!current) return;
    const gone = current;
    const index = notes.findIndex((n) => n.id === gone.id);
    setEditorOn(false);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpenId(null);
      setNotes((all) => all.filter((n) => n.id !== gone.id));
    }, 420);
    if (!isEmpty(gone)) {
      showToast("Note deleted", () =>
        setNotes((all) => {
          const copy = [...all];
          copy.splice(Math.min(index, copy.length), 0, gone);
          return copy;
        }),
      );
    }
  };

  /* ----- block editing ----- */
  const handleText = (block: Block, value: string) => {
    if (!current) return;
    /* type "- ", "[] " or "# " at the start of a line to switch its style */
    if (block.type === "text") {
      const m = /^(- |\* |\[\] |# )/.exec(value);
      if (m) {
        const type: BlockType = m[1] === "# " ? "heading" : m[1] === "[] " ? "todo" : "bullet";
        patchBlocks(current.id, (bs) => bs.map((x) => (x.id === block.id ? { ...x, type, text: value.slice(m[1].length) } : x)));
        focusNext.current = { id: block.id, pos: 0 };
        return;
      }
    }
    patchBlocks(current.id, (bs) => bs.map((x) => (x.id === block.id ? { ...x, text: value } : x)));
  };

  const onKey = (block: Block, i: number) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!current || e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const id = current.id;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!block.text && block.type !== "text") {
        patchBlocks(id, (bs) => bs.map((b) => (b.id === block.id ? { ...b, type: "text" } : b)));
        focusNext.current = { id: block.id, pos: 0 };
        return;
      }
      const before = el.value.slice(0, el.selectionStart);
      const after = el.value.slice(el.selectionEnd);
      const next = blk(block.type === "heading" ? "text" : block.type, after);
      patchBlocks(id, (bs) => {
        const copy = bs.map((b) => (b.id === block.id ? { ...b, text: before } : b));
        copy.splice(i + 1, 0, next);
        return copy;
      });
      focusNext.current = { id: next.id, pos: 0 };
      return;
    }

    if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (block.type !== "text") {
        e.preventDefault();
        patchBlocks(id, (bs) => bs.map((b) => (b.id === block.id ? { ...b, type: "text" } : b)));
        focusNext.current = { id: block.id, pos: 0 };
      } else if (i > 0) {
        e.preventDefault();
        const prev = current.blocks[i - 1];
        focusNext.current = { id: prev.id, pos: prev.text.length };
        patchBlocks(id, (bs) => {
          const copy = [...bs];
          copy[i - 1] = { ...copy[i - 1], text: copy[i - 1].text + block.text };
          copy.splice(i, 1);
          return copy;
        });
      }
      return;
    }

    /* arrow keys travel between lines */
    if (e.key === "ArrowUp" && el.selectionStart === 0 && i > 0) {
      e.preventDefault();
      const prev = current.blocks[i - 1];
      refs.current[prev.id]?.focus();
      refs.current[prev.id]?.setSelectionRange(prev.text.length, prev.text.length);
    }
    if (e.key === "ArrowDown" && el.selectionEnd === el.value.length && i < current.blocks.length - 1) {
      e.preventDefault();
      const nextB = current.blocks[i + 1];
      refs.current[nextB.id]?.focus();
      refs.current[nextB.id]?.setSelectionRange(0, 0);
    }
  };

  const setType = (type: BlockType) => {
    if (!current) return;
    const targetId = activeBlock && current.blocks.some((b) => b.id === activeBlock) ? activeBlock : current.blocks[current.blocks.length - 1].id;
    patchBlocks(current.id, (bs) => bs.map((b) => (b.id === targetId ? { ...b, type: b.type === type ? "text" : type, done: false } : b)));
    focusNext.current = { id: targetId, pos: refs.current[targetId]?.value.length ?? 0 };
  };
  const activeType = current?.blocks.find((b) => b.id === activeBlock)?.type ?? "text";

  /* ----- list data ----- */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => !isEmpty(n))
      .filter((n) => filter === "all" || n.subject === filter)
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.blocks.some((b) => b.text.toLowerCase().includes(q)))
      .sort((a, b) => b.updated - a.updated);
  }, [notes, filter, query]);
  const pinned = visible.filter((n) => n.pinned);
  const rest = visible.filter((n) => !n.pinned);

  const countFor = (id: string) => notes.filter((n) => (id === "all" ? true : n.subject === id) && !isEmpty(n)).length;

  const summary = useMemo(() => {
    const real = notes.filter((n) => !isEmpty(n));
    const t = real.reduce((acc, n) => {
      const s = taskStats(n);
      return { done: acc.done + s.done, total: acc.total + s.total };
    }, { done: 0, total: 0 });
    const noteLabel = `${real.length} ${real.length === 1 ? "note" : "notes"}`;
    return t.total ? `${noteLabel}, ${t.done} of ${t.total} tasks done` : noteLabel;
  }, [notes]);

  const currentTasks = current ? taskStats(current) : { done: 0, total: 0 };
  const activeSubject = subjectOf(categories, filter);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    html, body { background-color: ${CANVAS}; overscroll-behavior: none; }
    @keyframes nt-rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
    @keyframes nt-drop { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
    .nt-rise { animation: nt-rise .4s cubic-bezier(.22,1,.36,1) backwards }
    .nt-drop { animation: nt-drop .25s cubic-bezier(.22,1,.36,1) backwards }
    .nt-scroll { scrollbar-width: none }
    .nt-scroll::-webkit-scrollbar { display: none }
    .nt-root button, .nt-root [role="button"] { -webkit-tap-highlight-color: transparent }
    .nt-root :focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px }
    .nt-root input:focus-visible, .nt-root textarea:focus-visible { outline: none }
    .nt-field { transition: box-shadow .2s ease }
    .nt-field:focus-within { box-shadow: 0 0 0 3px rgba(91,63,224,.14) }
    .nt-card { box-shadow: 0 1px 2px rgba(16,16,20,.04), 0 10px 28px -14px rgba(16,16,20,.12); transition: transform .2s ease, box-shadow .25s ease }
    .nt-card:active { transform: scale(.985) }
    @media (hover: hover) { .nt-card:hover { box-shadow: 0 1px 2px rgba(16,16,20,.05), 0 16px 34px -14px rgba(16,16,20,.2) } }
    @media (prefers-reduced-motion: reduce) { .nt-rise, .nt-drop { animation: none !important } .nt-root * { transition-duration: .01ms !important } }
  `;

  return (
    <div className="nt-root relative flex w-full flex-col overflow-hidden" style={{ height: "100dvh", backgroundColor: CANVAS, fontFamily: BODY, color: INK }}>
      <style>{css}</style>

      <div className="mx-auto flex w-full max-w-5xl shrink-0 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 pb-2 pt-4 sm:px-8 sm:pt-8">
          <Link to="/discussions" search={{ classId }} aria-label="Back to class" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight sm:text-[26px]" style={{ fontFamily: DISPLAY }}>
              Notes
            </h1>
            <p className="truncate text-[12px] font-medium" style={{ color: INK_SOFT }}>
              {summary}
            </p>
          </div>
          <button
            onClick={() => {
              setSearching((v) => !v);
              if (searching) setQuery("");
            }}
            aria-label={searching ? "Close search" : "Search notes"}
            aria-expanded={searching}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90"
            style={{ border: `1px solid ${LINE}` }}
          >
            {searching ? <X className="h-[18px] w-[18px]" /> : <Search className="h-[18px] w-[18px]" />}
          </button>
          <button
            onClick={newNote}
            className="hidden h-10 shrink-0 items-center gap-1.5 rounded-full pl-3.5 pr-4 text-[13px] font-bold text-white transition-transform active:scale-95 sm:inline-flex"
            style={{ backgroundColor: ACCENT, boxShadow: "0 10px 22px -10px rgba(91,63,224,0.65)" }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            New note
          </button>
        </header>

        {/* Search (slides open) */}
        <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: searching ? "1fr" : "0fr" }}>
          <div className="overflow-hidden">
            <div className="px-4 pb-2 pt-1 sm:px-8">
              <label className="nt-field flex h-11 items-center gap-2.5 rounded-full bg-white px-4" style={{ border: `1px solid ${LINE}` }}>
                <Search className="h-4 w-4 shrink-0" style={{ color: INK_SOFT }} />
                <input
                  autoFocus={searching}
                  tabIndex={searching ? 0 : -1}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your notes"
                  aria-label="Search your notes"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#A3A5B5]"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Subject filter */}
        <div className="nt-scroll flex shrink-0 gap-2 overflow-x-auto px-4 pb-3 pt-1 sm:px-8" role="tablist" aria-label="Filter by class">
          {addingCat ? (
            <div className="nt-field nt-drop inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white pl-3.5 pr-1.5" style={{ border: `1px solid ${LINE}` }}>
              <input
                autoFocus
                value={catName}
                maxLength={40}
                onChange={(e) => setCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  } else if (e.key === "Escape") closeCatInput();
                }}
                onBlur={() => {
                  if (!catName.trim()) closeCatInput();
                }}
                placeholder="Category name"
                aria-label="New category name"
                className="w-32 bg-transparent text-[13px] font-semibold outline-none placeholder:text-[#A3A5B5]"
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={addCategory}
                aria-label="Add category"
                className="grid h-6 w-6 place-items-center rounded-full text-white transition-transform active:scale-90"
                style={{ backgroundColor: ACCENT }}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCat(true)}
              aria-label="New category"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-3 pr-3.5 text-[13px] font-bold transition-transform active:scale-95"
              style={{ backgroundColor: WASH, color: ACCENT }}
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              New category
            </button>
          )}
          {[{ id: "all", name: "All" }, ...categories].map((s) => {
            const on = filter === s.id;
            const sub = subjectOf(categories, s.id);
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(s.id)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-all duration-300 active:scale-95"
                style={on ? { backgroundColor: INK, color: "#fff" } : { backgroundColor: "#fff", color: "#3E4150", border: `1px solid ${LINE}` }}
              >
                {sub && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sub.ink }} />}
                {s.name}
                <span className="text-[11px] font-bold tabular-nums" style={{ opacity: on ? 0.6 : 0.45 }}>
                  {countFor(s.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <main className="nt-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 pt-1 sm:px-8" style={{ paddingBottom: "112px" }}>
          <SharedInbox classId={classId} onSave={(s) => { setNotes((all) => [{ id: uid(), title: s.title, blocks: s.blocks.map((b) => ({ ...b, id: uid() })), subject: s.class_id, pinned: false, updated: Date.now() }, ...all]); showToast("Saved to your notes"); }} />
          {visible.length === 0 ? (
            <div className="nt-rise flex flex-col items-center px-8 pt-20 text-center sm:pt-28">
              <span className="grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: WASH, color: ACCENT }}>
                <NotebookPen className="h-7 w-7" strokeWidth={1.7} />
              </span>
              <p className="mt-5 text-[17px] font-extrabold" style={{ fontFamily: DISPLAY }}>
                {query ? "No matching notes" : activeSubject ? `No ${activeSubject.name} notes yet` : "No notes yet"}
              </p>
              <p className="mt-1.5 max-w-xs text-[13.5px] leading-[20px]" style={{ color: INK_SOFT }}>
                {query ? "Try a different word, or clear the search." : "Write down what you learn in class so you can revise it later."}
              </p>
              {!query && (
                <button
                  onClick={newNote}
                  className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition-transform active:scale-95"
                  style={{ backgroundColor: WASH, color: ACCENT }}
                >
                  <Plus className="h-4 w-4" strokeWidth={2.4} />
                  New note
                </button>
              )}
            </div>
          ) : (
            <div key={filter}>
              {pinned.length > 0 && (
                <>
                  <p className="mb-2.5 px-1 text-[12px] font-bold" style={{ color: INK_SOFT }}>
                    Pinned
                  </p>
                  <div className="columns-2 gap-3 md:columns-3 md:gap-4">
                    {pinned.map((n, i) => (
                      <NoteCard key={n.id} note={n} subject={subjectOf(categories, n.subject)} index={i} onOpen={() => openNote(n.id)} onToggle={(bid) => toggleFromCard(n.id, bid)} />
                    ))}
                  </div>
                </>
              )}
              {rest.length > 0 && (
                <>
                  <p className={`mb-2.5 px-1 text-[12px] font-bold ${pinned.length ? "mt-5" : ""}`} style={{ color: INK_SOFT }}>
                    {pinned.length ? "Recent" : "All notes"}
                  </p>
                  <div className="columns-2 gap-3 md:columns-3 md:gap-4">
                    {rest.map((n, i) => (
                      <NoteCard key={n.id} note={n} subject={subjectOf(categories, n.subject)} index={i + pinned.length} onOpen={() => openNote(n.id)} onToggle={(bid) => toggleFromCard(n.id, bid)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* New note (phones) */}
      <button
        onClick={newNote}
        aria-label="New note"
        className="absolute right-5 z-20 grid h-14 w-14 place-items-center rounded-[18px] text-white transition-all duration-300 active:scale-90 sm:hidden"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          backgroundColor: ACCENT,
          boxShadow: "0 14px 28px -10px rgba(91,63,224,0.65)",
          opacity: openId ? 0 : 1,
          transform: openId ? "scale(.6)" : "scale(1)",
          pointerEvents: openId ? "none" : "auto",
        }}
      >
        <Plus className="h-6 w-6" strokeWidth={2.2} />
      </button>

      {/* Editor: full screen on phones, side panel on larger screens */}
      <div
        aria-hidden={!editorOn}
        className="fixed inset-0 z-30"
        style={{ visibility: openId ? "visible" : "hidden", pointerEvents: editorOn ? "auto" : "none" }}
      >
        <div
          onClick={closeEditor}
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(20,22,31,0.32)", opacity: editorOn ? 1 : 0, transition: "opacity .35s ease" }}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Note editor"
          className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden sm:w-[min(680px,92vw)] sm:rounded-l-[28px]"
          style={{
            backgroundColor: CANVAS,
            transform: editorOn ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
            transition: "transform .42s cubic-bezier(.22,1,.36,1)",
            boxShadow: editorOn ? "-12px 0 40px rgba(20,22,31,0.10)" : "none",
            willChange: "transform",
          }}
        >
          {current && (
            <>
              <div className="flex items-center gap-2 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <button onClick={closeEditor} aria-label="Back to notes" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}>
                  <ChevronLeft className="h-5 w-5 sm:hidden" />
                  <X className="hidden h-[18px] w-[18px] sm:block" />
                </button>
                <p className="min-w-0 flex-1 px-1 text-[12px] font-semibold transition-opacity duration-300" style={{ color: INK_SOFT }} aria-live="polite">
                  {saved ? "Saved" : "Saving"}
                </p>
                <ShareNoteButton note={current} />
                <button
                  onClick={() => {
                    patch(current.id, (n) => ({ ...n, pinned: !n.pinned }));
                    showToast(current.pinned ? "Unpinned" : "Pinned to top");
                  }}
                  aria-label={current.pinned ? "Unpin note" : "Pin note"}
                  aria-pressed={current.pinned}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white transition-transform active:scale-90"
                  style={{ border: `1px solid ${LINE}`, color: current.pinned ? ACCENT : INK }}
                >
                  {current.pinned ? <PinOff className="h-[18px] w-[18px]" /> : <Pin className="h-[18px] w-[18px]" />}
                </button>
                <button onClick={removeNote} aria-label="Delete note" className="grid h-10 w-10 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}>
                  <Trash2 className="h-[18px] w-[18px]" />
                </button>
              </div>

              <div className="nt-scroll min-h-0 flex-1 overflow-y-auto px-5 sm:px-10" style={{ paddingBottom: "120px" }}>
                <input
                  ref={titleRef}
                  value={current.title}
                  onChange={(e) => patch(current.id, (n) => ({ ...n, title: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      const first = current.blocks[0];
                      if (first) refs.current[first.id]?.focus();
                    }
                  }}
                  aria-label="Note title"
                  placeholder="Title"
                  className="mt-3 w-full bg-transparent text-[30px] font-extrabold leading-[1.1] tracking-tight outline-none placeholder:text-[#C3C5D1]"
                  style={{ fontFamily: DISPLAY }}
                />
                <p className="mt-2 text-[12px] font-medium" style={{ color: FAINT }}>
                  {whenLabel(current.updated)}, {wordCount(current)} words
                  {currentTasks.total > 0 && `, ${currentTasks.done} of ${currentTasks.total} tasks done`}
                </p>

                {/* Subject */}
                <div className="nt-scroll -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-10 sm:px-10">
                  {categories.map((s) => {
                    const on = current.subject === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => patch(current.id, (n) => ({ ...n, subject: on ? null : s.id }))}
                        aria-pressed={on}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-all duration-300 active:scale-95"
                        style={on ? { backgroundColor: s.tint, color: s.ink } : { backgroundColor: "transparent", color: INK_SOFT, border: `1px solid ${LINE}` }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.ink, opacity: on ? 1 : 0.5 }} />
                        {s.name}
                      </button>
                    );
                  })}
                </div>

                {/* Body */}
                <div className="mt-5 space-y-0.5">
                  {current.blocks.map((b, i) => (
                    <BlockRow
                      key={b.id}
                      block={b}
                      setRef={(el) => {
                        refs.current[b.id] = el;
                      }}
                      onText={(v) => handleText(b, v)}
                      onToggle={() => patchBlocks(current.id, (bs) => bs.map((x) => (x.id === b.id ? { ...x, done: !x.done } : x)))}
                      onKey={onKey(b, i)}
                      onFocus={() => setActiveBlock(b.id)}
                    />
                  ))}
                  {/* tap below the last line to keep writing */}
                  <button
                    aria-label="Continue writing"
                    tabIndex={-1}
                    className="block h-40 w-full cursor-text"
                    onClick={() => {
                      const last = current.blocks[current.blocks.length - 1];
                      if (last.text.trim()) {
                        const nb = blk("text");
                        patchBlocks(current.id, (bs) => [...bs, nb]);
                        focusNext.current = { id: nb.id, pos: 0 };
                      } else {
                        refs.current[last.id]?.focus();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Format bar */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
                <div className="pointer-events-auto flex items-center gap-1 rounded-[20px] bg-white p-1.5" style={{ border: `1px solid ${LINE}`, boxShadow: FLOAT }}>
                  {(
                    [
                      { t: "heading", Icon: Heading1, label: "Heading" },
                      { t: "text", Icon: Type, label: "Text" },
                      { t: "bullet", Icon: List, label: "Bullet list" },
                      { t: "todo", Icon: ListChecks, label: "Checklist" },
                    ] as const
                  ).map(({ t, Icon, label }) => {
                    const on = activeType === t;
                    return (
                      <button
                        key={t}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setType(t)}
                        aria-label={label}
                        aria-pressed={on}
                        className="grid h-11 w-11 place-items-center rounded-[14px] transition-all duration-300 active:scale-90"
                        style={{ backgroundColor: on ? WASH : "transparent", color: on ? ACCENT : INK_SOFT }}
                      >
                        <Icon className="h-[19px] w-[19px]" strokeWidth={1.9} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div role="status" className="nt-drop pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)" }}>
          <div className="pointer-events-auto flex items-center gap-3 rounded-full py-2.5 pl-4 pr-2.5 text-[13px] font-semibold text-white" style={{ backgroundColor: INK, boxShadow: FLOAT }}>
            {toast.msg}
            {toast.undo && (
              <button
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="rounded-full px-3 py-1 text-[12px] font-bold transition-transform active:scale-95"
                style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
              >
                Undo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}