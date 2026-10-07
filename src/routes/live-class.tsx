import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  MessageSquareText,
  Files,
  Presentation,
  Mic,
  MicOff,
  LogOut,
  X,
  Paperclip,
  Send,
  Play,
  Pause,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileGeneric,
  Plus,
  PenLine,
  Undo2,
  Trash2,
  Hand,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Users,
  LayoutDashboard,
  Gauge,
  Megaphone,
} from "lucide-react";
import lecturerPic from "@/assets/avatars/lecturer.png";
import chiomaPic from "@/assets/avatars/chioma.png";
import taiwoPic from "@/assets/avatars/taiwo.png";
import amakaPic from "@/assets/avatars/amaka.png";
import seyiPic from "@/assets/avatars/seyi.png";
import Whiteboard from "./whiteboard/Whiteboard";

export const Route = createFileRoute("/live-class")({
  head: () => ({
    meta: [
      { title: "Live class | Classroom" },
      {
        name: "description",
        content: "Audio-only live class with chat, announcements, sketches, files and a shared whiteboard.",
      },
    ],
  }),
  component: LiveClassPage,
});

/* ---------- tokens (same family as the home page) ---------- */
const INK = "#14161F";
const INK_SOFT = "#6B6C76";
const CANVAS = "#F8F7F4";
const FLAME = "#FF5A36";
const GREEN = "#0D9B57";
const ACCENT = "#5B3FE0"; // Organic Chemistry II accent
const ACCENT_SOFT = "#D9CFFB"; // Organic Chemistry II background
const BLUE = "#2F6BFF";
const LINE = "rgba(0,0,0,0.07)";
const SHADOW = "0 10px 30px rgba(20,22,31,0.08)";
const CHIP = "#ECEAF4";
const FIELD = "#F4F3F8";

/*
  One adaptive screen. Replace with your real role.
  Instructor: Message / Announcement composer and "End".
  Student: plain message composer and "Leave".
*/
const ROLE: "student" | "instructor" = "instructor";
const isInstructor = ROLE === "instructor";

type Person = { id: string; name: string; pic: string };

const ADA: Person = { id: "ada", name: "Dr. Bello", pic: lecturerPic };
const OTHERS: Person[] = [
  { id: "chioma", name: "Chioma", pic: chiomaPic },
  { id: "taiwo", name: "Taiwo", pic: taiwoPic },
  { id: "amaka", name: "Amaka", pic: amakaPic },
  { id: "seyi", name: "Seyi", pic: seyiPic },
];

/* "You" wears the lecturer picture for instructors, and Seyi's picture for students. */
const ME: Person = { id: "me", name: "You", pic: isInstructor ? lecturerPic : seyiPic };

const PEOPLE: Person[] = [ME, ...(isInstructor ? [] : [ADA]), ...OTHERS.filter((p) => isInstructor || p.id !== "seyi")];

/* Messages written as "ada" or "seyi" belong to "You" when that is your own picture. */
const resolveId = (id: string) => ((id === "ada" && isInstructor) || (id === "seyi" && !isInstructor) ? "me" : id);
const personOf = (id: string): Person => {
  const r = resolveId(id);
  return PEOPLE.find((p) => p.id === r) ?? ME;
};

type Content =
  | { kind: "text"; text: string }
  | { kind: "voice"; length: string }
  | { kind: "doc"; name: string; size: string }
  | { kind: "sketch"; src: string }
  | { kind: "announce"; title: string; body: string; important: boolean; replies: number; unread: boolean };
type Msg = { id: string; from: string; time: string } & Content;
type Announce = Extract<Msg, { kind: "announce" }>;

const SEED: Msg[] = [
  {
    id: "a1", from: "ada", time: "9:41 AM", kind: "announce", important: true, replies: 7, unread: true,
    title: "Lab report moved to Friday",
    body: "Today's lab report on substitution reactions is now due Friday at 5 PM. Attendance is being taken in this session.",
  },
  { id: "m1", from: "chioma", time: "10:02 AM", kind: "text", text: "Is the SN2 mechanism example in the slides?" },
  { id: "m2", from: "ada", time: "10:03 AM", kind: "text", text: "Yes, slide 14. I shared the notes too." },
  { id: "m3", from: "taiwo", time: "10:04 AM", kind: "doc", name: "Substitution_notes.pdf", size: "1.2 MB" },
];

const SEED_FILES = [
  { id: "f1", name: "Lecture 6 slides.pptx", by: "Dr. Bello", size: "4.8 MB", tag: "PPT" },
  { id: "f2", name: "Substitution_notes.pdf", by: "Taiwo", size: "1.2 MB", tag: "PDF" },
  { id: "f3", name: "Worked examples.docx", by: "Chioma", size: "640 KB", tag: "DOC" },
];

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const nowLabel = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* ---------- small parts ---------- */
function Avatar({ p, size, ring, gap = CANVAS }: { p: Person; size: number; ring?: boolean; gap?: string }) {
  return (
    <img
      src={p.pic}
      alt={p.name}
      draggable={false}
      className="shrink-0 rounded-full object-cover transition-shadow duration-200"
      style={{
        width: size,
        height: size,
        backgroundColor: ACCENT_SOFT,
        boxShadow: ring ? `0 0 0 3px ${gap}, 0 0 0 5px ${ACCENT}` : "none",
      }}
    />
  );
}

function Wave({ color }: { color: string }) {
  return (
    <div className="flex h-5 flex-1 items-center gap-[2px]">
      {Array.from({ length: 20 }).map((_, i) => (
        <span key={i} className="w-[3px] rounded-full" style={{ height: 5 + Math.abs(Math.sin(i * 1.7)) * 13, backgroundColor: color, opacity: 0.75 }} />
      ))}
    </div>
  );
}

function VoiceBubble({ length, mine }: { length: string; mine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const fg = mine ? "white" : ACCENT;
  return (
    <div className="flex min-w-[190px] items-center gap-2.5">
      <button
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        onClick={() => setPlaying((v) => !v)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: mine ? "rgba(255,255,255,0.22)" : ACCENT_SOFT, color: fg }}
      >
        {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="h-3.5 w-3.5" fill="currentColor" />}
      </button>
      <Wave color={fg} />
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: mine ? "rgba(255,255,255,0.85)" : INK_SOFT }}>
        {length}
      </span>
    </div>
  );
}

function FileIcon({ tag }: { tag: string }) {
  const t = tag.toLowerCase();
  const cls = "h-7 w-7 shrink-0";
  if (t.startsWith("ppt")) return <Presentation className={cls} strokeWidth={1.5} style={{ color: "#F2762E" }} />;
  if (t === "pdf") return <FileText className={cls} strokeWidth={1.5} style={{ color: "#E5484D" }} />;
  if (t.startsWith("doc") || t === "txt" || t === "rtf") return <FileText className={cls} strokeWidth={1.5} style={{ color: "#3B82F6" }} />;
  if (t.startsWith("xls") || t === "csv") return <FileSpreadsheet className={cls} strokeWidth={1.5} style={{ color: "#16A34A" }} />;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(t)) return <FileImage className={cls} strokeWidth={1.5} style={{ color: "#8B5CF6" }} />;
  return <FileGeneric className={cls} strokeWidth={1.5} style={{ color: INK_SOFT }} />;
}

function DocBubble({ name, size, mine }: { name: string; size: string; mine: boolean }) {
  return (
    <div className="flex min-w-[190px] items-center gap-2.5">
      <div
        className="grid h-10 w-9 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: mine ? "rgba(255,255,255,0.22)" : ACCENT_SOFT, color: mine ? "white" : ACCENT }}
      >
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold">{name}</p>
        <p className="text-[11px]" style={{ color: mine ? "rgba(255,255,255,0.8)" : INK_SOFT }}>
          {size}
        </p>
      </div>
    </div>
  );
}

/* Same format as the announcements screen */
function AnnouncementCard({ m }: { m: Announce }) {
  const p = personOf(m.from);
  const who = p.id === "me" ? "You" : p.id === "ada" ? "Dr. Ada Bello" : p.name;
  return (
    <article className="rounded-3xl bg-white p-4" style={{ border: `1px solid ${LINE}`, boxShadow: SHADOW }}>
      <div className="flex items-center gap-3">
        <Avatar p={p} size={40} gap="white" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-tight">{who}</p>
          <p className="text-[11.5px]" style={{ color: INK_SOFT }}>
            Lecturer · {m.time}
          </p>
        </div>
        {m.unread && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BLUE }} />}
      </div>
      {m.important && (
        <span className="mt-3 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "#FDE2E2", color: "#D3402E" }}>
          Important
        </span>
      )}
      <h3 className="mt-2 text-[16px] font-bold leading-snug">{m.title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed" style={{ color: INK_SOFT }}>
        {m.body}
      </p>
      <div className="mt-3 flex items-center gap-2 pt-3 text-[12px]" style={{ borderTop: `1px solid ${LINE}`, color: INK_SOFT }}>
        <span className="grid h-6 w-6 place-items-center rounded-full" style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}>
          <Reply className="h-3 w-3" />
        </span>
        {m.replies} class {m.replies === 1 ? "reply" : "replies"}
      </div>
    </article>
  );
}

/* ---------- dummy whiteboard (swap for the ConvoSpace board) ---------- */
type Stroke = { color: string; pts: [number, number][] };
const PEN_COLORS = [INK, ACCENT, FLAME, GREEN];

function DrawPad({ floating, onSend, backdrop }: { floating?: boolean; onSend?: (src: string) => void; backdrop?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const down = useRef(false);
  const [color, setColor] = useState(INK);

  const paint = () => {
    const c = cv.current;
    if (!c) return;
    const x = c.getContext("2d");
    if (!x) return;
    x.clearRect(0, 0, c.width, c.height);
    x.lineCap = "round";
    x.lineJoin = "round";
    x.lineWidth = 3;
    for (const s of strokes.current) {
      x.strokeStyle = s.color;
      x.beginPath();
      s.pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
      if (s.pts.length === 1) x.lineTo(s.pts[0][0] + 0.1, s.pts[0][1]);
      x.stroke();
    }
  };

  useEffect(() => {
    const w = wrap.current;
    const c = cv.current;
    if (!w || !c) return;
    const ro = new ResizeObserver(() => {
      c.width = w.clientWidth;
      c.height = w.clientHeight;
      paint();
    });
    ro.observe(w);
    return () => ro.disconnect();
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const end = () => {
    down.current = false;
  };

  const tools = (
    <div
      className={
        floating
          ? "absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl bg-white p-2"
          : "flex items-center gap-1.5 px-1 pb-2"
      }
      style={floating ? { border: `1px solid ${LINE}`, boxShadow: SHADOW } : undefined}
    >
      {PEN_COLORS.map((c) => (
        <button
          key={c}
          aria-label="Pen color"
          onClick={() => setColor(c)}
          className="h-6 w-6 rounded-full transition-transform"
          style={{
            backgroundColor: c,
            transform: color === c ? "scale(1.15)" : "scale(1)",
            boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none",
          }}
        />
      ))}
      <span className="mx-1 h-5 w-px" style={{ backgroundColor: LINE }} />
      <button
        aria-label="Undo"
        onClick={() => {
          strokes.current.pop();
          paint();
        }}
        className="grid h-9 w-9 place-items-center rounded-xl active:bg-black/5"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        aria-label="Clear board"
        onClick={() => {
          strokes.current = [];
          paint();
        }}
        className="grid h-9 w-9 place-items-center rounded-xl active:bg-black/5"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className={floating ? "relative h-full w-full" : "flex h-full flex-col"}>
      {!floating && tools}
      <div
        ref={wrap}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={
          floating
            ? { backgroundColor: "#FBFAFF", backgroundImage: "radial-gradient(rgba(91,63,224,0.18) 1px, transparent 1px)", backgroundSize: "22px 22px", height: "100%" }
            : { backgroundColor: "white", border: `1px solid ${LINE}`, borderRadius: 16 }
        }
      >
        {backdrop && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 560" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <text x="200" y="250" textAnchor="middle" fontSize="32" fontWeight="300" fill={INK}>
              F = G · m₁m₂ / d²
            </text>
            <text x="200" y="280" textAnchor="middle" fontSize="12" fill={INK_SOFT}>
              Newton&apos;s law of gravitation
            </text>
            <circle cx="130" cy="350" r="12" fill="none" stroke={ACCENT} strokeWidth="2.5" />
            <circle cx="270" cy="350" r="20" fill="none" stroke={ACCENT} strokeWidth="2.5" />
            <path d="M142 350H250" stroke={ACCENT} strokeWidth="2.5" strokeDasharray="5 5" />
          </svg>
        )}
        <canvas
          ref={cv}
          className="absolute inset-0 cursor-crosshair touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            down.current = true;
            strokes.current.push({ color, pts: [pos(e)] });
            paint();
          }}
          onPointerMove={(e) => {
            if (!down.current) return;
            const last = strokes.current[strokes.current.length - 1];
            if (!last) return;
            last.pts.push(pos(e));
            paint();
          }}
          onPointerUp={end}
          onPointerCancel={end}
        />
      </div>
      {floating && tools}
      {onSend && (
        <button
          onClick={() => {
            const c = cv.current;
            if (!c) return;
            const out = document.createElement("canvas");
            out.width = c.width;
            out.height = c.height;
            const x = out.getContext("2d");
            if (!x) return;
            x.fillStyle = "white";
            x.fillRect(0, 0, out.width, out.height);
            x.drawImage(c, 0, 0);
            onSend(out.toDataURL("image/png"));
            strokes.current = [];
            paint();
          }}
          className="mt-2 flex items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-bold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          <Send className="h-4 w-4" /> Send sketch
        </button>
      )}
    </div>
  );
}

/* ---------- page ---------- */
type Tab = "chat" | "announcements" | "files";
const TABS: { id: Tab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "announcements", label: "Announcements" },
  { id: "files", label: "Files" },
];

function LiveClassPage() {
  const navigate = useNavigate();

  const [view, setView] = useState<"class" | "board">("class");
  const [sheet, setSheet] = useState<Tab | null>(null);
  const [micOn, setMicOn] = useState(isInstructor);
  const [handUp, setHandUp] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsView, setToolsView] = useState<"menu" | "pace">("menu");
  const [pace, setPace] = useState({ fast: 3, got: 14, lost: 2 });
  const [myPace, setMyPace] = useState<"fast" | "got" | "lost" | null>(null);
  const votePace = (k: "fast" | "got" | "lost") => {
    setPace((c) => {
      const n = { ...c };
      if (myPace) n[myPace] -= 1;
      if (myPace !== k) n[k] += 1;
      return n;
    });
    setMyPace((cur) => (cur === k ? null : k));
  };
  const lastTab = useRef<Tab>("chat");
  const tabDir = useRef(1);
  const wasOpen = useRef(false);
  const tabAnim = useRef(false);
  const tabEls = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const [pill, setPill] = useState({ l: 0, w: 0 });
  if (sheet && sheet !== lastTab.current) {
    tabDir.current = TABS.findIndex((x) => x.id === sheet) > TABS.findIndex((x) => x.id === lastTab.current) ? 1 : -1;
    tabAnim.current = wasOpen.current;
    lastTab.current = sheet;
  }
  const shownTab: Tab = sheet ?? lastTab.current;
  useEffect(() => {
    wasOpen.current = !!sheet;
  }, [sheet]);
  useEffect(() => {
    const el = tabEls.current[shownTab];
    if (el) setPill((p) => (p.l === el.offsetLeft && p.w === el.offsetWidth ? p : { l: el.offsetLeft, w: el.offsetWidth }));
  }, [shownTab]);
  const [others, setOthers] = useState<string[]>(isInstructor ? ["chioma"] : ["ada"]);
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [files, setFiles] = useState(SEED_FILES);
  const [unread, setUnread] = useState(2);
  const [compose, setCompose] = useState<"message" | "announcement">("message");
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [important, setImportant] = useState(false);
  const [sketchOpen, setSketchOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const listEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recording) return;
    setRecSecs(0);
    const t = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1700);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const box = listEnd.current?.parentElement;
    box?.scrollTo({ top: box.scrollHeight, behavior: sheet ? "smooth" : "auto" });
  }, [msgs]);

  // Switching tabs: jump to the latest message before paint so the slide-in stays steady
  useLayoutEffect(() => {
    const box = listEnd.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [shownTab]);

  /*
    DEMO ONLY: randomly opens and closes other people's mics so the speaking states show.
    Delete this effect and drive `others` from your audio layer's active-speaker events.
  */
  useEffect(() => {
    const pool = PEOPLE.filter((p) => p.id !== "me").map((p) => p.id);
    const t = setInterval(() => {
      const id = pool[Math.floor(Math.random() * pool.length)];
      setOthers((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 3 ? [...cur, id] : cur));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const speaking = [...(micOn ? ["me"] : []), ...others];
  const mainId = micOn && isInstructor ? "me" : others.includes("ada") ? "ada" : speaking[0];
  const main = mainId ? personOf(mainId) : null;
  const mainName = main ? (main.id === "me" ? "You" : main.name) : "Quiet for now";
  const mainLabel = !main
    ? "No one is speaking"
    : main.id === "me"
      ? "Your mic is on"
      : main.id === "ada"
        ? "Instructor speaking"
        : "Speaking";

  const push = (c: Content) => setMsgs((cur) => [...cur, { id: uid(), from: "me", time: nowLabel(), ...c }]);

  function openSheet(t: Tab) {
    setSheet(t);
    if (t === "chat") setUnread(0);
  }

  function closeSheet() {
    setSheet(null);
    setSketchOpen(false);
  }

  function toggleMic() {
    setMicOn((v) => !v);
    setToast(micOn ? "Your mic is off" : "Your mic is on");
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    if (compose === "announcement") {
      if (!title.trim()) {
        setToast("Add a title first");
        return;
      }
      push({ kind: "announce", title: title.trim(), body: text, important, replies: 0, unread: false });
      setTitle("");
      setImportant(false);
      setCompose("message");
      setSheet("announcements");
      setToast("Announcement posted");
    } else {
      push({ kind: "text", text });
    }
    setDraft("");
  }

  function voiceOrSend() {
    if (draft.trim()) return send();
    if (!recording) {
      setRecording(true);
      setToast("Recording, tap again to send");
      return;
    }
    /* Plug MediaRecorder in here and upload the blob. */
    push({ kind: "voice", length: mmss(recSecs) });
    setRecording(false);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const size = f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`;
    const ext = (f.name.split(".").pop() ?? "FILE").slice(0, 3).toUpperCase();
    push({ kind: "doc", name: f.name, size });
    setFiles((cur) => [{ id: uid(), name: f.name, by: "You", size, tag: ext }, ...cur]);
    setToast("Document shared");
    e.target.value = "";
    if (sheet === "files") return;
    openSheet("chat");
  }

  const shown = shownTab === "announcements" ? msgs.filter((m) => m.kind === "announce") : msgs;

  const dockItem = (label: string, Icon: typeof MessageSquareText, onClick: () => void, opts?: { badge?: number; on?: boolean }) => (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative grid h-12 w-11 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-90"
      style={{ color: opts?.on ? "white" : "rgba(255,255,255,0.58)", backgroundColor: opts?.on ? "rgba(255,255,255,0.12)" : "transparent" }}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.6} />
      {opts?.badge ? (
        <span className="absolute right-0 top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: FLAME, border: "2px solid #2A2B32" }}>
          {opts.badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div
      className="native-edge-to-edge relative mx-auto flex w-full max-w-md flex-col overflow-hidden overscroll-none"
      style={{ backgroundColor: CANVAS, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: INK }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        /* This is also the colour that shows behind Android's transparent bars
           while this full-screen class view is open. */
        html, body { background-color: #F8F7F4; height: 100%; overflow: hidden; overscroll-behavior: none; }
        @keyframes lc-ring { 0% { transform: scale(.72); opacity: .55 } 100% { transform: scale(1.4); opacity: 0 } }
        @keyframes lc-bar { 0%,100% { height: 3px } 50% { height: 14px } }
        @keyframes lc-tab-r { from { opacity: 0; transform: translateX(28px) } to { opacity: 1; transform: none } }
        @keyframes lc-tab-l { from { opacity: 0; transform: translateX(-28px) } to { opacity: 1; transform: none } }
        @keyframes lc-pulse { 50% { opacity: .3 } }
        @media (prefers-reduced-motion: reduce) { .lc-anim, .lc-tab { animation: none !important } }
      `}</style>

      {/* Top bar */}
      <header className="flex items-center gap-2.5 px-4 pb-2" style={{ paddingTop: "16px" }}>
        <Link to="/class" aria-label="Back to class" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white" style={{ border: `1px solid ${LINE}` }}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight">Organic Chemistry II</p>
          <p className="truncate text-[11.5px]" style={{ color: INK_SOFT }}>
            {isInstructor ? "You are teaching" : "Dr. Ada Bello"} · 24 in class
          </p>
        </div>
        <button
          onClick={() => {
            setHandUp((v) => !v);
            setToast(handUp ? "Hand lowered" : "Hand raised");
          }}
          aria-pressed={handUp}
          aria-label={handUp ? "Lower hand" : "Raise hand"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: handUp ? ACCENT_SOFT : "white", color: handUp ? ACCENT : INK, border: `1px solid ${LINE}` }}
        >
          <Hand className="h-[18px] w-[18px]" />
        </button>
        <div className="relative shrink-0">
          <button
            onClick={() => {
              if (!toolsOpen) setToolsView("menu");
              setToolsOpen((v) => !v);
            }}
            aria-expanded={toolsOpen}
            aria-label="Class tools"
            className="grid h-10 w-10 place-items-center rounded-2xl transition-all active:scale-90"
            style={{ backgroundColor: toolsOpen ? ACCENT : "white", color: toolsOpen ? "white" : INK, border: `1px solid ${toolsOpen ? ACCENT : LINE}`, boxShadow: toolsOpen ? "0 6px 16px rgba(91,63,224,0.35)" : "none" }}
          >
            <LayoutDashboard className="h-[18px] w-[18px]" />
          </button>
          {toolsOpen && <div className="fixed inset-0 z-20" onClick={() => setToolsOpen(false)} />}
          <div
            className="absolute right-0 top-full z-30 mt-2 w-[228px] origin-top-right rounded-3xl bg-white p-3 transition-all duration-200"
            style={{ border: `1px solid ${LINE}`, boxShadow: "0 18px 44px rgba(20,22,31,0.18)", opacity: toolsOpen ? 1 : 0, transform: toolsOpen ? "scale(1)" : "scale(0.92) translateY(-6px)", pointerEvents: toolsOpen ? "auto" : "none" }}
            aria-hidden={!toolsOpen}
          >
            {toolsView === "pace" ? (
              <>
                <button onClick={() => setToolsView("menu")} className="mb-2 flex items-center gap-1 px-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: INK_SOFT }}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Pace check
                </button>
                {(() => {
                  const total = Math.max(1, pace.fast + pace.got + pace.lost);
                  return ([
                    ["fast", "Too fast"],
                    ["got", "Got it"],
                    ["lost", "I'm lost"],
                  ] as const).map(([k, label]) => (
                    <button key={k} onClick={() => votePace(k)} className="relative mb-1.5 flex w-full items-center justify-between overflow-hidden rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition-all active:scale-[0.98]" style={{ backgroundColor: CANVAS, boxShadow: myPace === k ? `inset 0 0 0 1.5px ${ACCENT}` : "none" }}>
                      <span className="absolute inset-y-0 left-0 transition-all duration-500" style={{ width: `${(pace[k] / total) * 100}%`, backgroundColor: ACCENT_SOFT, opacity: 0.7 }} />
                      <span className="relative">{label}</span>
                      <span className="relative tabular-nums" style={{ color: myPace === k ? ACCENT : INK_SOFT }}>{pace[k]}</span>
                    </button>
                  ));
                })()}
                <p className="px-1 pt-1 text-[11px]" style={{ color: INK_SOFT }}>{isInstructor ? "Live responses from your class" : "Tap to tell your lecturer how it's going"}</p>
              </>
            ) : (
              <>
            <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: INK_SOFT }}>Class tools</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { Icon: Presentation, label: view === "board" ? "Back to class" : "Whiteboard", run: () => setView(view === "board" ? "class" : "board") },
                { Icon: Files, label: "Files", run: () => openSheet("files") },
                { Icon: Megaphone, label: "Announce", run: () => openSheet("announcements") },
                { Icon: Gauge, label: "Pace check", keep: true, run: () => setToolsView("pace") },
              ].map(({ Icon, label, run, keep }: { Icon: typeof Gauge; label: string; run: () => void; keep?: boolean }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (!keep) setToolsOpen(false);
                    run();
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-[12px] font-semibold transition-all active:scale-95"
                  style={{ backgroundColor: CANVAS }}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  {label}
                </button>
              ))}
            </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main area: class stage or the shared local whiteboard experience */}
      {view === "board" ? (
        <main
          className="relative mx-4 mb-3 mt-1 min-h-0 flex-1 overflow-hidden rounded-[28px]"
          style={{ border: `1px solid ${LINE}`, boxShadow: SHADOW }}
          aria-label="Live class whiteboard"
        >
          <Whiteboard embedded />
        </main>
      ) : (
        <>
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden overscroll-none px-6">
            <div className="relative mb-5 grid h-[150px] w-[150px] place-items-center">
              {main &&
                [0, 0.7, 1.4].map((d) => (
                  <span key={d} className="lc-anim absolute inset-0 rounded-full" style={{ border: `2px solid ${ACCENT}`, opacity: 0, animation: `lc-ring 2.2s ${d}s infinite` }} />
                ))}
              {main ? (
                <Avatar p={main} size={104} />
              ) : (
                <div className="grid h-[104px] w-[104px] place-items-center rounded-full" style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}>
                  <MicOff className="h-8 w-8" />
                </div>
              )}
            </div>
            <p className="text-[21px] font-extrabold leading-tight">{mainName}</p>
            <p className="mt-1.5 flex items-center gap-2 text-[13px]" style={{ color: INK_SOFT }}>
              {main && (
                <span className="inline-flex h-3.5 items-end gap-[2px]" aria-hidden>
                  {[0, 0.15, 0.3, 0.45].map((d) => (
                    <i key={d} className="lc-anim w-[3px] rounded-full" style={{ backgroundColor: ACCENT, height: 3, animation: `lc-bar .9s ${d}s infinite ease-in-out` }} />
                  ))}
                </span>
              )}
              {mainLabel}
            </p>
          </main>

          <section className="px-4 pb-3">
            <div className="mb-2.5 flex items-baseline justify-between px-1">
              <h2 className="text-[13px] font-semibold">In class</h2>
              <span className="text-[11.5px] font-medium" style={{ color: INK_SOFT }}>
                {speaking.length} {speaking.length === 1 ? "mic" : "mics"} on
              </span>
            </div>
            <div className="-mx-4 flex gap-3.5 overflow-x-auto px-5 pb-2 pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {PEOPLE.map((p) => {
                const talking = speaking.includes(p.id);
                return (
                  <div key={p.id} className="flex w-[54px] shrink-0 flex-col items-center gap-1.5">
                    <div className="relative">
                      <Avatar p={p} size={50} ring={talking} />
                      <span
                        className="absolute -bottom-0.5 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-white"
                        style={{ color: talking ? GREEN : INK_SOFT, border: `1px solid ${LINE}` }}
                      >
                        {talking ? <Mic className="h-2.5 w-2.5" strokeWidth={2.6} /> : <MicOff className="h-2.5 w-2.5" strokeWidth={2.6} />}
                      </span>
                    </div>
                    <span className="w-full truncate text-center text-[11px] font-medium" style={{ color: talking ? INK : INK_SOFT }}>
                      {p.name}
                    </span>
                  </div>
                );
              })}
              <div className="flex w-[54px] shrink-0 flex-col items-center gap-1.5">
                <span className="grid h-[50px] w-[50px] place-items-center rounded-full text-[13px] font-bold" style={{ backgroundColor: CHIP, color: INK_SOFT }}>
                  +{24 - PEOPLE.length}
                </span>
                <span className="text-[11px] font-medium" style={{ color: INK_SOFT }}>
                  More
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Control bar */}
      <div className="px-4" style={{ paddingBottom: "16px" }}>
        <nav className="flex items-center gap-0.5 rounded-[32px] p-2" style={{ backgroundColor: "#2A2B32", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 18px 40px rgba(20,22,31,0.38), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          <button
            onClick={toggleMic}
            aria-pressed={micOn}
            aria-label={micOn ? "Turn mic off" : "Turn mic on"}
            className="mr-1 flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-bold text-white transition-all duration-300 active:scale-95"
            style={{
              background: micOn ? `linear-gradient(135deg, #7A5CFF, ${ACCENT})` : "rgba(255,255,255,0.1)",
              boxShadow: micOn ? "0 6px 18px rgba(91,63,224,0.5)" : "none",
              color: micOn ? "white" : "rgba(255,255,255,0.75)",
            }}
          >
            {micOn ? <Mic className="h-5 w-5 shrink-0" strokeWidth={2} /> : <MicOff className="h-5 w-5 shrink-0" strokeWidth={2} />}
            <span className="truncate">{micOn ? "Mic on" : "Muted"}</span>
          </button>
          {dockItem("Chat", MessageSquareText, () => openSheet("chat"), { badge: unread })}
          {dockItem("Files", Files, () => openSheet("files"))}
          {view === "board"
            ? dockItem("Class", Users, () => setView("class"), { on: true })
            : dockItem("Board", Presentation, () => setView("board"))}
          <button
            onClick={() => navigate({ to: "/class" })}
            aria-label={isInstructor ? "End class" : "Leave class"}
            className="grid h-12 w-11 shrink-0 place-items-center rounded-full transition-all active:scale-90"
            style={{ color: "#FF7A5C" }}
          >
            <LogOut className="h-[22px] w-[22px]" strokeWidth={1.6} />
          </button>
        </nav>
      </div>

      {/* Scrim */}
      <div
        onClick={closeSheet}
        className="absolute inset-0 transition-opacity duration-200"
        style={{ backgroundColor: "rgba(20,22,31,0.4)", opacity: sheet ? 1 : 0, pointerEvents: sheet ? "auto" : "none" }}
      />

      {/* Slide-over sheet: chat, announcements, files */}
      <div
        className="absolute inset-x-0 bottom-0 flex h-[84%] flex-col rounded-t-[28px] transition-transform duration-300"
        style={{
          backgroundColor: CANVAS,
          transform: sheet ? "translate3d(0,0,0)" : "translate3d(0,105%,0)",
          willChange: "transform",
          transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)",
          boxShadow: "0 -10px 40px rgba(20,22,31,0.18)",
        }}
        role="dialog"
        aria-hidden={!sheet}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.12)" }} />
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
          <div className="relative flex rounded-full p-[3px]" style={{ backgroundColor: CHIP }}>
            <span
              className="absolute bottom-[3px] top-[3px] rounded-full bg-white"
              style={{ left: pill.l, width: pill.w, boxShadow: "0 1px 4px rgba(20,22,31,0.12)", transition: "left .35s cubic-bezier(.2,.8,.2,1), width .35s cubic-bezier(.2,.8,.2,1)" }}
            />
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabEls.current[t.id] = el;
                }}
                onClick={() => openSheet(t.id)}
                className="relative z-10 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition-colors duration-300"
                style={{ color: shownTab === t.id ? INK : INK_SOFT }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={closeSheet} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: CHIP }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div key={shownTab} className="lc-tab flex min-h-0 flex-1 flex-col overflow-hidden" style={tabAnim.current ? { animation: `${tabDir.current > 0 ? "lc-tab-r" : "lc-tab-l"} .35s cubic-bezier(.2,.8,.2,1) both` } : undefined}>
        {shownTab === "files" ? (
          <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-6 pt-1">
            <p className="pb-1 text-[11.5px] font-semibold" style={{ color: INK_SOFT }}>
              {files.length} {files.length === 1 ? "file" : "files"} shared
            </p>
            {files.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3.5 py-3.5" style={{ borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}>
                <FileIcon tag={f.tag} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold leading-snug">{f.name}</p>
                  <p className="text-[11.5px]" style={{ color: INK_SOFT }}>
                    {f.by} · {f.size}
                  </p>
                </div>
              </div>
            ))}
            <button onClick={() => fileInput.current?.click()} className="mt-3 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[13.5px] font-bold transition-all active:scale-[0.98]" style={{ color: ACCENT, backgroundColor: ACCENT_SOFT }}>
              <Plus className="h-4 w-4" /> Share a document
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-2">
              {shown.length === 0 && (
                <p className="m-auto text-[13px]" style={{ color: INK_SOFT }}>
                  No announcements yet.
                </p>
              )}
              {shown.map((m) => {
                if (m.kind === "announce") return <AnnouncementCard key={m.id} m={m} />;
                const p = personOf(m.from);
                const mine = p.id === "me";
                return (
                  <div key={m.id} className={`flex max-w-[90%] gap-2 ${mine ? "flex-row-reverse self-end" : ""}`}>
                    <div className="mt-5">
                      <Avatar p={p} size={28} />
                    </div>
                    <div>
                      <p className={`mb-1 text-[11px] ${mine ? "text-right" : ""}`} style={{ color: INK_SOFT }}>
                        <b style={{ color: INK }}>{mine ? "You" : p.name}</b> · {m.time}
                      </p>
                      <div
                        className="px-3.5 py-2.5 text-[14px] leading-snug"
                        style={{
                          backgroundColor: mine ? ACCENT : "white",
                          color: mine ? "white" : INK,
                          border: mine ? "none" : `1px solid ${LINE}`,
                          borderRadius: mine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                        }}
                      >
                        {m.kind === "text" && m.text}
                        {m.kind === "voice" && <VoiceBubble length={m.length} mine={mine} />}
                        {m.kind === "doc" && <DocBubble name={m.name} size={m.size} mine={mine} />}
                        {m.kind === "sketch" && <img src={m.src} alt="Sketch" className="w-[220px] rounded-xl bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={listEnd} />
            </div>

            {/* Composer */}
            <div className="relative px-3 pt-2" style={{ borderTop: `1px solid ${LINE}`, paddingBottom: "calc(var(--safe-bottom) + 12px)" }}>
              {sketchOpen && (
                <div className="absolute inset-x-3 bottom-full mb-2 flex h-[330px] flex-col rounded-3xl bg-white p-3" style={{ border: `1px solid ${LINE}`, boxShadow: "0 16px 40px rgba(20,22,31,0.18)" }}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-[13px] font-bold">Quick sketch</p>
                    <button onClick={() => setSketchOpen(false)} aria-label="Close sketch" className="grid h-7 w-7 place-items-center rounded-full" style={{ backgroundColor: CHIP }}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1">
                    <DrawPad
                      onSend={(src) => {
                        push({ kind: "sketch", src });
                        setSketchOpen(false);
                        setSheet("chat");
                      }}
                    />
                  </div>
                </div>
              )}

              {isInstructor && (
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex rounded-full p-[3px]" style={{ backgroundColor: CHIP }}>
                    {(["message", "announcement"] as const).map((c) => (
                      <button key={c} onClick={() => setCompose(c)} className="rounded-full px-3 py-1 text-[12px] font-bold capitalize" style={{ backgroundColor: compose === c ? "white" : "transparent", color: compose === c ? INK : INK_SOFT }}>
                        {c}
                      </button>
                    ))}
                  </div>
                  {compose === "announcement" && (
                    <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold" style={{ color: important ? "#D3402E" : INK_SOFT }}>
                      <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} className="accent-[#D3402E]" /> Important
                    </label>
                  )}
                </div>
              )}

              {isInstructor && compose === "announcement" && (
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" className="mb-2 h-10 w-full rounded-2xl px-4 text-[14px] font-semibold outline-none placeholder:text-[#6B6C76]" style={{ backgroundColor: FIELD }} />
              )}

              <div className="flex items-center gap-2">
                <div className="flex h-12 flex-1 items-center rounded-3xl pl-4 pr-1" style={{ backgroundColor: FIELD }}>
                  {recording ? (
                    <span className="flex flex-1 items-center gap-2 text-[14px] font-semibold" style={{ color: FLAME }}>
                      <span className="lc-anim h-2 w-2 rounded-full" style={{ backgroundColor: FLAME, animation: "lc-pulse 1s infinite" }} />
                      Recording {mmss(recSecs)}
                    </span>
                  ) : (
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && send()}
                      placeholder={isInstructor && compose === "announcement" ? "Write the announcement" : "Message the class"}
                      className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#6B6C76]"
                    />
                  )}
                  <button onClick={() => setSketchOpen((v) => !v)} aria-label="Sketch a calculation or diagram" className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ color: sketchOpen ? ACCENT : INK_SOFT, backgroundColor: sketchOpen ? ACCENT_SOFT : "transparent" }}>
                    <PenLine className="h-5 w-5" />
                  </button>
                  <button onClick={() => fileInput.current?.click()} aria-label="Share a document" className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ color: INK_SOFT }}>
                    <Paperclip className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={voiceOrSend}
                  aria-label={draft.trim() ? "Send" : recording ? "Send voice note" : "Record voice note"}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: recording ? FLAME : draft.trim() ? ACCENT : CHIP, color: recording || draft.trim() ? "white" : INK }}
                >
                  {draft.trim() || recording ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      <input ref={fileInput} type="file" className="hidden" onChange={onPickFile} />

      {/* Toast */}
      <div
        className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-semibold text-white transition-all duration-300"
        style={{ backgroundColor: INK, opacity: toast ? 1 : 0, transform: `translate(-50%, ${toast ? 0 : -12}px)` }}
      >
        {toast}
      </div>
    </div>
  );
}
