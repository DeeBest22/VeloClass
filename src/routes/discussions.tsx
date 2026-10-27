import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getLastOpenedClassId, useClassOverview, formatSchedule } from "@/lib/classes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/client";
import { getLiveMembers, liveFileUrl, uploadLiveFile, type LiveMessage } from "@/lib/live-class";
import { PollsSheet, PollCard } from "@/components/PollsSheet";
import { QuestionsSheet, QuestionCard } from "@/components/QuestionsSheet";
import { listQuestions, toggleMeToo, type Question } from "@/lib/questions";
import { QuizSheet, QuizCard } from "@/components/QuizSheet";
import { listQuizzes, type QuizSummary } from "@/lib/quizzes";
import Whiteboard from "./whiteboard/Whiteboard";
import Workspaces from "@/components/Workspaces";
import { listPolls, votePoll, closePoll, type Poll } from "@/lib/polls";
import { getDiscussionMessages, postDiscussionMessage } from "@/lib/discussions";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Mic,
  Video,
  X,
  Paperclip,
  Send,
  Play,
  Pause,
  FileText,
  FileSpreadsheet,
  FileImage,
  Presentation,
  File as FileGeneric,
  Plus,
  PenLine,
  Undo2,
  Trash2,
  Reply,
  Megaphone,
  Download,
  Bell,
  BellOff,
  Search,
  Calendar,
  MapPin,
  Hash,
  Copy,
  LayoutDashboard,
} from "lucide-react";
/*
  Avatars. Save the uploaded illustrations in src/assets/avatars/ with these names
  (or change the paths below to match your files):
    lecturer.png      the cat (lecturer)
    car.png           the red car (class picture)
    wolverine.png     the wolverine
    dog.png           the schnauzer
    creme-brulee.png  the creme brulee
*/
import lecturerPic from "@/assets/avatars/taiwo.png";
import carPic from "@/assets/avatars/lecturer.png";
import wolverinePic from "@/assets/avatars/amaka.png";
import dogPic from "@/assets/avatars/lecturer.png";
import cremePic from "@/assets/avatars/chioma.png";

/* Tool icons. Keep these files in src/assets/icons/ */
import pollIcon from "@/assets/icons/poll_icon.png";
import quizIcon from "@/assets/icons/quiz_icon.png";
import whiteboardIcon from "@/assets/icons/whiteboard_icon.png";
import questionIcon from "@/assets/icons/question_icon.png";
import workspacesIcon from "@/assets/icons/workspaces_icon.png";
import notesIcon from "@/assets/icons/Notes_icon.png";

/* Class header artwork. Keep this file in src/assets/images/ */
import headerBg from "@/assets/chemistry-banner.jpg";

export const Route = createFileRoute("/discussions")({
  validateSearch: (q: Record<string, unknown>): { classId?: string } => (typeof q["classId"] === "string" ? { classId: q["classId"] } : {}),
  head: () => ({
    meta: [
      { title: "Discussions | Classroom" },
      { name: "description", content: "Chat with your class, read announcements, share sketches, voice notes and files." },
    ],
  }),
  component: ClassChatPage,
});

/* ---------- design tokens ----------
  Quiet paper-white canvas, ink for "me", violet reserved for the lecturer and the primary action,
  coral only for things that need attention (recording, important).
*/
const INK = "#14161F";
const INK_SOFT = "#707285";
const CANVAS = "#F5F5FA";
const FLAME = "#FF5A36";
const GREEN = "#0D9B57";
const ACCENT = "#5B3FE0";
const ACCENT_SOFT = "#D9CFFB";
const WASH = "#EEEAFD";
const LINE = "rgba(20,22,31,0.07)";
const CHIP = "#E9E9F1";
const FLOAT = "0 8px 28px rgba(20,22,31,0.08)";
const DISPLAY = "'Bricolage Grotesque', 'Plus Jakarta Sans', system-ui, sans-serif";
const NAME_COLORS = ["#2F6BFF", "#0D9B57", "#C2410C", "#A21CAF", "#0E7490"];
const CARD_SHADOW = "0 1px 2px rgba(16,16,20,.04), 0 10px 28px -14px rgba(16,16,20,.12)";

/* ---------- avatars ---------- */
const CLASS_PIC = carPic;
const STUDENT_PICS = [cremePic, wolverinePic, dogPic];

/* ---------- types ---------- */
type Person = { id: string; name: string; pic: string; lec?: boolean };
type Member = Person & { role: "Lecturer" | "Student"; online: boolean };

type Body =
  | { kind: "text"; text: string }
  | { kind: "voice"; length: string; url: string | null }
  | { kind: "doc"; name: string; size: string; url: string | null }
  | { kind: "sketch"; src: string }
  | { kind: "poll"; poll: Poll }
  | { kind: "question"; q: Question }
  | { kind: "quiz"; quiz: QuizSummary }
  | { kind: "announce"; title: string; body: string; important: boolean; replies: number; unread: boolean };
type Msg = { id: string; fromId: string; time: string; at?: number } & Body;
type Announce = Extract<Msg, { kind: "announce" }>;

// `url` on voice/doc bodies holds the storage path; it is resolved to a signed URL when opened.
const toMsg = (r: LiveMessage, me?: string): Msg => {
  const base = { id: r.id, at: Date.parse(r.created_at), fromId: r.sender_id === me ? "me" : r.sender_id, time: new Date(r.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) };
  if (r.kind === "announcement") return { ...base, kind: "announce", title: r.title ?? "", body: r.body ?? "", important: r.important, replies: 0, unread: false };
  if (r.kind === "file") return { ...base, kind: "doc", name: r.file_name ?? "File", size: fmtSize(r.file_size ?? 0), url: r.storage_path };
  if (r.kind === "sketch") return { ...base, kind: "sketch", src: r.body ?? "" };
  if (r.kind === "voice") return { ...base, kind: "voice", length: r.body ?? "0:00", url: r.storage_path };
  return { ...base, kind: "text", text: r.body ?? "" };
};
const VISIBLE_MEMBERS = 6;

type Tab = "chat" | "announcements" | "files";
const TABS: { id: Tab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "announcements", label: "Announcements" },
  { id: "files", label: "Files" },
];

/* ---------- class tools (shown in the tools sheet) ---------- */
type ToolId = "poll" | "quiz" | "whiteboard" | "questions" | "workspaces" | "notes";
const TOOLS: { id: ToolId; label: string; src: string }[] = [
  { id: "poll", label: "Poll", src: pollIcon },
  { id: "quiz", label: "Quiz", src: quizIcon },
  { id: "whiteboard", label: "Whiteboard", src: whiteboardIcon },
  { id: "questions", label: "Questions", src: questionIcon },
  { id: "workspaces", label: "Workspaces", src: workspacesIcon },
  { id: "notes", label: "Notes", src: notesIcon },
];

const fmtSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const nowLabel = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const extOf = (name: string) => (name.split(".").pop() ?? "file").slice(0, 4).toUpperCase();
const nameColor = (id: string) => NAME_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % NAME_COLORS.length] ?? INK;
const rise = (n: number): React.CSSProperties => ({ animationDelay: `${n * 60}ms` });

/* ---------- small parts ---------- */
function Avatar({ p, size }: { p: Person; size: number }) {
  // Fixed-size wrapper that can never shrink, with the image clipped inside: always a perfect circle.
  return (
    <span
      className="block shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size, minWidth: size, minHeight: size, backgroundColor: ACCENT_SOFT, boxShadow: "0 0 0 1px rgba(20,22,31,0.06)" }}
    >
      <img src={p.pic} alt={p.name} draggable={false} className="block h-full w-full object-cover" style={{ maxWidth: "none" }} />
    </span>
  );
}

const BARS = 26;
function Wave({ color, progress = 0 }: { color: string; progress?: number }) {
  return (
    <div className="flex h-7 flex-1 items-center justify-between">
      {Array.from({ length: BARS }).map((_, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full transition-opacity duration-200"
          style={{ height: 6 + Math.abs(Math.sin(i * 1.3) * Math.cos(i * 0.45)) * 18, backgroundColor: color, opacity: progress > 0 ? (i < progress * BARS ? 1 : 0.3) : 0.55 }}
        />
      ))}
    </div>
  );
}

function VoiceBubble({ length, mine, url }: { length: string; mine: boolean; url: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  async function toggle() {
    if (!url) return;
    if (!audio.current) {
      try {
      const a = new Audio(await liveFileUrl(url));
      a.ontimeupdate = () => setPct(a.duration ? a.currentTime / a.duration : 0);
      a.onended = () => { setPlaying(false); setPct(0); };
      audio.current = a;
      } catch { return; }
    }
    if (audio.current.paused) { await audio.current.play().catch(() => {}); setPlaying(true); } else { audio.current.pause(); setPlaying(false); }
  }
  const fg = mine ? "white" : ACCENT;
  return (
    <div className="flex w-[216px] max-w-full items-center gap-3">
      <button
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        onClick={() => void toggle()}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-90"
        style={{ backgroundColor: mine ? "rgba(255,255,255,0.18)" : "white", color: fg, boxShadow: mine ? "none" : `0 0 0 1px ${LINE}` }}
      >
        {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />}
      </button>
      <Wave color={fg} progress={pct} />
      <span className="w-8 text-right text-[11px] font-semibold tabular-nums" style={{ color: mine ? "rgba(255,255,255,0.75)" : INK_SOFT }}>
        {length}
      </span>
    </div>
  );
}

function fileMeta(tag: string): { Icon: typeof FileText; color: string } {
  const t = tag.toLowerCase();
  if (t.startsWith("ppt")) return { Icon: Presentation, color: "#F2762E" };
  if (t === "pdf") return { Icon: FileText, color: "#E5484D" };
  if (t.startsWith("doc") || t === "txt" || t === "rtf") return { Icon: FileText, color: "#3B82F6" };
  if (t.startsWith("xls") || t === "csv") return { Icon: FileSpreadsheet, color: "#16A34A" };
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(t)) return { Icon: FileImage, color: "#8B5CF6" };
  return { Icon: FileGeneric, color: INK_SOFT };
}

function DocBubble({ name, size, mine }: { name: string; size: string; mine: boolean }) {
  const { Icon, color } = fileMeta(extOf(name));
  return (
    <div className="flex w-[232px] max-w-full items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: mine ? "rgba(255,255,255,0.16)" : `${color}1A`, color: mine ? "white" : color }}>
        <Icon className="h-5 w-5" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold leading-snug">{name}</p>
        <p className="text-[11px]" style={{ color: mine ? "rgba(255,255,255,0.7)" : INK_SOFT }}>
          {extOf(name)} · {size}
        </p>
      </div>
    </div>
  );
}

function AnnouncementCard({ m, who, p, seen }: { m: Announce; who: string; p: Person; seen: boolean }) {
  // Same look as the Announcements page cards
  return (
    <article className="w-full rounded-[24px] bg-white p-[18px] text-left ring-1 ring-black/[0.035]" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-3">
        <Avatar p={p} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold" style={{ color: "#15171C" }}>{who}</p>
          <p className="text-[12px]" style={{ color: "#8E9098" }}>Lecturer · {m.time}</p>
        </div>
        {m.unread && !seen && <span className="h-2 w-2 rounded-full" style={{ background: "#3162F4" }} aria-label="Unread" />}
      </div>

      <div className="mt-4">
        {m.important && (
          <span className="mb-2 inline-flex rounded-full px-2 py-[3px] text-[11px] font-semibold" style={{ background: "#FDEEEE", color: "#D6343A" }}>
            Important
          </span>
        )}
        <h3 className="text-[17px] font-semibold leading-[23px] tracking-[-0.015em]" style={{ color: "#15171C" }}>{m.title}</h3>
        <p className="mt-1.5 text-[14.5px] leading-[21px]" style={{ color: "#5C5F66" }}>{m.body}</p>
      </div>

      <div className="mt-4 flex items-center gap-2 pt-3.5 text-[12.5px]" style={{ borderTop: "1px solid #EFEFEC", color: "#8E9098" }}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "#EAF0FE", color: "#3162F4" }}>
          <Reply size={12.5} strokeWidth={2.1} />
        </span>
        {m.replies} class {m.replies === 1 ? "reply" : "replies"}
      </div>
    </article>
  );
}

/* ---------- class info parts ---------- */
function DetailRow({
  Icon,
  label,
  value,
  top,
  onAction,
  ActionIcon,
}: {
  Icon: typeof Calendar;
  label: string;
  value: string;
  top?: boolean | undefined;
  onAction?: (() => void) | undefined;
  ActionIcon?: typeof Copy | undefined;
}) {
  return (
    <div className="flex items-center gap-3.5 py-3" style={{ borderTop: top ? `1px solid ${LINE}` : "none" }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: WASH, color: ACCENT }}>
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium" style={{ color: INK_SOFT }}>{label}</p>
        <p className="truncate text-[14px] font-semibold leading-snug">{value}</p>
      </div>
      {onAction && ActionIcon && (
        <button onClick={onAction} aria-label={`Copy ${label}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors active:bg-black/5" style={{ color: INK_SOFT }}>
          <ActionIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function MemberRow({ m, top, style }: { m: Member; top: boolean; style?: React.CSSProperties | undefined }) {
  return (
    <li className="flex items-center gap-3.5 py-3" style={{ borderTop: top ? `1px solid ${LINE}` : "none", ...style }}>
      <span className="relative shrink-0">
        <Avatar p={m} size={44} />
        {m.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full" style={{ backgroundColor: "#22C55E", boxShadow: "0 0 0 2px white" }} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold leading-snug">{m.id === "me" ? "You" : m.name}</p>
        <p className="text-[12px]" style={{ color: INK_SOFT }}>
          {m.online ? "Online" : "Offline"}
        </p>
      </div>
      {m.role === "Lecturer" && (
        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: WASH, color: ACCENT }}>
          Lecturer
        </span>
      )}
    </li>
  );
}

function ActionTile({ Icon, label, onClick }: { Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-w-0 flex-col items-center gap-2 transition-transform duration-200 active:scale-95">
      <span className="grid h-14 w-full place-items-center rounded-[20px] bg-white ring-1 ring-black/[0.035]" style={{ boxShadow: CARD_SHADOW }}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
      </span>
      <span className="text-[13px] font-semibold">{label}</span>
    </button>
  );
}

/* ---------- quick sketch pad ---------- */
type Stroke = { color: string; pts: [number, number][] };
const PEN_COLORS = [INK, ACCENT, FLAME, GREEN];

function DrawPad({ onSend }: { onSend: (src: string) => void }) {
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-1 pb-2.5">
        {PEN_COLORS.map((c) => (
          <button
            key={c}
            aria-label="Pen color"
            onClick={() => setColor(c)}
            className="h-6 w-6 rounded-full transition-transform duration-200"
            style={{ backgroundColor: c, transform: color === c ? "scale(1.12)" : "scale(1)", boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none" }}
          />
        ))}
        <span className="ml-auto" />
        <button aria-label="Undo" onClick={() => { strokes.current.pop(); paint(); }} className="grid h-9 w-9 place-items-center rounded-full active:bg-black/5">
          <Undo2 className="h-4 w-4" />
        </button>
        <button aria-label="Clear board" onClick={() => { strokes.current = []; paint(); }} className="grid h-9 w-9 place-items-center rounded-full active:bg-black/5">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div ref={wrap} className="relative min-h-0 flex-1 overflow-hidden" style={{ backgroundColor: "#FBFBFE", border: `1px solid ${LINE}`, borderRadius: 18 }}>
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
        className="mt-2.5 flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-bold text-white transition-transform active:scale-[0.98]"
        style={{ backgroundColor: ACCENT }}
      >
        <Send className="h-4 w-4" /> Send sketch
      </button>
    </div>
  );
}

/* ---------- page ---------- */
/* ---------- tools sheet ---------- */
function ToolItem({ src, label, onClick, badge, index, open }: { src: string; label: string; onClick: () => void; badge?: number; index: number; open: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 transition-[background-color,transform] duration-200 active:scale-95 active:bg-black/[0.04]"
      style={{
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0)" : "translateY(14px)",
        transition: `opacity .4s ease ${open ? 120 + index * 45 : 0}ms, transform .5s cubic-bezier(.22,1,.36,1) ${open ? 120 + index * 45 : 0}ms, background-color .2s`,
      }}
    >
      <span className="relative grid h-16 w-16 place-items-center">
        <img src={src} alt="" aria-hidden draggable={false} className="block h-full w-full object-contain" style={{ maxWidth: "none" }} />
        {badge ? (
          <span
            className="absolute right-0 top-0 grid h-[19px] min-w-[19px] place-items-center rounded-full px-1 text-[10.5px] font-bold text-white"
            style={{ backgroundColor: ACCENT, boxShadow: "0 0 0 2px #fff" }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="w-full truncate text-center text-[12.5px] font-semibold">{label}</span>
    </button>
  );
}

function ClassChatPage() {
  const { classId: sid } = Route.useSearch();
  const { user } = useAuth();
  const classId = sid ?? getLastOpenedClassId(user?.id) ?? undefined;
  const navigate = Route.useNavigate();
  const overview = useClassOverview(classId).data;
  const isInstructor = overview?.myRole === "teacher";
  const className = overview?.name ?? "Class chat";

  const qc = useQueryClient();
  const membersQ = useQuery({ queryKey: ["live-members", classId], enabled: !!classId, queryFn: () => getLiveMembers(classId!) });
  const messagesQ = useQuery({ queryKey: ["discussion-messages", classId], enabled: !!classId, queryFn: () => getDiscussionMessages(classId!), refetchInterval: 10000 });
  const [online, setOnline] = useState<string[]>([]);
  const chan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (!classId || !user) return;
    const ch = supabase.channel(`discussion:${classId}`, { config: { presence: { key: user.id } } });
    ch.on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState())))
      .on("broadcast", { event: "changed" }, () => void qc.invalidateQueries({ queryKey: ["discussion-messages", classId] }))
      .on("broadcast", { event: "polls" }, () => void qc.invalidateQueries({ queryKey: ["polls", classId] }))
      .on("broadcast", { event: "quizzes" }, () => { void qc.invalidateQueries({ queryKey: ["quizzes", classId] }); void qc.invalidateQueries({ queryKey: ["quiz-results"] }); })
      .on("broadcast", { event: "questions" }, () => { void qc.invalidateQueries({ queryKey: ["questions", classId] }); void qc.invalidateQueries({ queryKey: ["answers", classId] }); })
      .subscribe((st: string) => { if (st === "SUBSCRIBED") void ch.track({ at: Date.now() }); });
    chan.current = ch;
    return () => { chan.current = null; void supabase.removeChannel(ch); };
  }, [classId, user?.id, qc]);

  const people = useMemo<Record<string, Person>>(() => {
    const o: Record<string, Person> = { me: { id: "me", name: "You", pic: isInstructor ? lecturerPic : dogPic, lec: isInstructor } };
    for (const m of membersQ.data ?? []) {
      const me = m.id === user?.id;
      o[me ? "me" : m.id] = { id: me ? "me" : m.id, name: me ? "You" : m.name, pic: m.avatar_url ?? (m.role === "teacher" ? lecturerPic : dogPic), lec: m.role === "teacher" };
    }
    return o;
  }, [membersQ.data, user?.id, isInstructor]);
  const personOf = (id: string): Person => people[id] ?? { id, name: "Member", pic: cremePic };

  const roster = useMemo<Member[]>(
    () => (membersQ.data ?? []).map((m) => { const me = m.id === user?.id; return { ...(people[me ? "me" : m.id] as Person), role: m.role === "teacher" ? "Lecturer" : "Student", online: me || online.includes(m.id) } as Member; }),
    [membersQ.data, people, online, user?.id],
  );
  const DETAILS = { code: overview?.courseCode ?? "", schedule: formatSchedule(overview?.scheduleDays ?? null, overview?.scheduleTime ?? null) ?? "Not scheduled", classCode: overview?.joinCode ?? "", about: overview?.description || "The home for this class. Ask questions, share notes and keep up with announcements from your lecturer." };
  const memberPreview = roster.slice(0, 4).map((m) => m.name).join(", ");

  const pollsQ = useQuery({ queryKey: ["polls", classId], enabled: !!classId, queryFn: () => listPolls(classId!), refetchInterval: 10000 });
  const questionsQ = useQuery({ queryKey: ["questions", classId], enabled: !!classId, queryFn: () => listQuestions(classId!), refetchInterval: 10000 });
  const quizzesQ = useQuery({ queryKey: ["quizzes", classId], enabled: !!classId, queryFn: () => listQuizzes(classId!), refetchInterval: 10000 });
  const who = (id: string | null) => (id ? personOf(id === user?.id ? "me" : id) : null);
  const msgs = useMemo(() => {
    const t = membersQ.data?.find((m) => m.role === "teacher")?.id;
    const tid = t === user?.id ? "me" : (t ?? "poll");
    const polls = (pollsQ.data ?? []).map((p): Msg => ({ id: `poll-${p.id}`, fromId: tid, at: Date.parse(p.created_at), time: new Date(p.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), kind: "poll", poll: p }));
    const qms = (questionsQ.data ?? []).map((q): Msg => ({ id: `q-${q.id}`, fromId: q.asker_id ? (q.asker_id === user?.id ? "me" : q.asker_id) : "anon", at: Date.parse(q.created_at), time: new Date(q.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), kind: "question", q }));
    const qzs = (quizzesQ.data ?? []).map((quiz): Msg => ({ id: `quiz-${quiz.id}`, fromId: tid, at: Date.parse(quiz.created_at), time: new Date(quiz.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), kind: "quiz", quiz }));
    return [...(messagesQ.data ?? []).map((r) => toMsg(r, user?.id)), ...polls, ...qms, ...qzs].sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  }, [messagesQ.data, pollsQ.data, questionsQ.data, quizzesQ.data, membersQ.data, user?.id]);
  const qAct = (pr: Promise<unknown>) => {
    const sync = () => { void qc.invalidateQueries({ queryKey: ["questions", classId] }); void chan.current?.send({ type: "broadcast", event: "questions", payload: {} }); };
    pr.then(sync).catch((e: Error) => { setToast(e.message); sync(); });
  };
  const pollAct = (pr: Promise<unknown>, ok: string) => {
    const sync = () => { void qc.invalidateQueries({ queryKey: ["polls", classId] }); void chan.current?.send({ type: "broadcast", event: "polls", payload: {} }); };
    pr.then(() => { setToast(ok); sync(); }).catch((e: Error) => { setToast(e.message); sync(); });
  };
  const [tab, setTab] = useState<Tab>("chat");
  const [compose, setCompose] = useState<"message" | "announcement">("message");
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [important, setImportant] = useState(false);
  const [sketchOpen, setSketchOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [annSeen, setAnnSeen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [pollsOpen, setPollsOpen] = useState(false);
  const [qOpen, setQOpen] = useState(false);
  const [qThread, setQThread] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [wbOpen, setWbOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoKey, setInfoKey] = useState(0);
  const [muted, setMuted] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const infoScroll = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLElement>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const listEnd = useRef<HTMLDivElement>(null);
  const known = useRef<Set<string> | null>(null);
  const fresh = useRef(new Set<string>());

  if (known.current) for (const m of msgs) if (!known.current.has(m.id)) fresh.current.add(m.id);
  useEffect(() => {
    known.current = new Set(msgs.map((m) => m.id));
    const ids = [...fresh.current];
    if (!ids.length) return;
    const t = setTimeout(() => ids.forEach((i) => fresh.current.delete(i)), 700);
    return () => clearTimeout(t);
  }, [msgs]);

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
    if (!toolsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setToolsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toolsOpen]);

  useEffect(() => {
    if (tab !== "announcements") return;
    const t = setTimeout(() => setAnnSeen(true), 900);
    return () => clearTimeout(t);
  }, [tab]);

  useEffect(() => {
    const box = listEnd.current?.parentElement;
    box?.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  useLayoutEffect(() => {
    const box = listEnd.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [tab]);

  function openInfo() {
    setInfoKey((k) => k + 1);
    setInfoOpen(true);
    infoScroll.current?.scrollTo({ top: 0 });
  }
  function closeInfo() {
    setInfoOpen(false);
    setQuery("");
    setShowAll(false);
  }
  function scrollToMembers() {
    const box = infoScroll.current;
    const sec = membersRef.current;
    if (!box || !sec) return;
    const top = sec.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }
  function toggleMembers() {
    const next = !showAll;
    setShowAll(next);
    if (next) return;
    // When collapsing, glide back up so the list never jumps out from under the thumb.
    const box = infoScroll.current;
    const sec = membersRef.current;
    if (!box || !sec) return;
    const top = sec.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12;
    if (top < box.scrollTop) box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  /*
    TODO: wire each tool to its real route or panel. Until those exist, tapping a tool shows a toast.
    e.g. poll -> navigate({ to: "/polls", search: { classId } })
  */
  function openTool(id: ToolId) {
    if (id === "poll") return setPollsOpen(true);
    if (id === "questions") return setQOpen(true);
    if (id === "quiz") return setQuizOpen(true);
    if (id === "notes") { navigate({ to: "/notes", search: { classId } }); return; }
    if (id === "workspaces") return classId ? setWsOpen(true) : setToast("Open a class first");
    if (id === "whiteboard") return classId ? setWbOpen(true) : setToast("Open a class first");
    const label = TOOLS.find((t) => t.id === id)?.label ?? "This tool";
    setToast(`${label} is coming soon`);
  }

  const post = async (v: Parameters<typeof postDiscussionMessage>[1]) => {
    if (!classId) { setToast("Open a class first"); return false; }
    try {
      await postDiscussionMessage(classId, v);
      void qc.invalidateQueries({ queryKey: ["discussion-messages", classId] });
      void chan.current?.send({ type: "broadcast", event: "changed", payload: {} });
      return true;
    } catch (e) { setToast((e as Error).message); return false; }
  };

  function send() {
    const text = draft.trim();
    if (!text) return;
    if (compose === "announcement" && isInstructor) {
      if (!title.trim()) {
        setToast("Add a title first");
        return;
      }
      void post({ kind: "announcement", title: title.trim(), body: text, important });
      setTitle("");
      setImportant(false);
      setCompose("message");
      setTab("announcements");
      setToast("Announcement posted");
    } else {
      void post({ kind: "text", body: text });
    }
    setDraft("");
  }

  const rec = useRef<{ mr: MediaRecorder; chunks: Blob[]; stream: MediaStream } | null>(null);
  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), []);
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.start();
      rec.current = { mr, chunks, stream };
      setRecording(true);
    } catch { setToast("Allow microphone access to record"); }
  }
  function stopRec(sendIt: boolean) {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    const secs = recSecs;
    const keep = sendIt && secs >= 1;
    if (sendIt && !keep) setToast("Too short, hold a little longer");
    r.mr.onstop = () => {
      r.stream.getTracks().forEach((t) => t.stop());
      if (!keep || !classId) return;
      const type = (r.mr.mimeType || "audio/webm").split(";")[0] ?? "audio/webm";
      uploadLiveFile(classId, new Blob(r.chunks, { type }), `voice.${type.includes("mp4") ? "m4a" : "webm"}`, type)
        .then((path) => post({ kind: "voice", body: mmss(secs), storage_path: path, mime_type: type }))
        .catch((e) => setToast(e.message));
    };
    r.mr.stop();
    setRecording(false);
  }
  function voiceOrSend() {
    if (draft.trim()) return send();
    if (!recording) return void startRec();
    stopRec(true);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !classId) return;
    setToast("Sending file…");
    void uploadLiveFile(classId, f, f.name).then((path) => post({ kind: "file", storage_path: path, file_name: f.name, file_size: f.size, mime_type: f.type }))
      .then((ok) => { if (ok) setToast("Document shared"); }).catch((err) => setToast(err.message));
    e.target.value = "";
    if (tab !== "files") setTab("chat");
  }

  const openShared = (path: string | null) => { if (path) liveFileUrl(path).then((u) => window.open(u, "_blank", "noopener")).catch((e) => setToast(e.message)); };

  const files = msgs
    .flatMap((m) => (m.kind === "doc" ? [{ id: m.id, name: m.name, by: m.fromId === "me" ? "You" : personOf(m.fromId).name, size: m.size, tag: extOf(m.name), url: m.url }] : []))
    .reverse();
  const announcements = msgs.filter((m): m is Announce => m.kind === "announce");
  const chatMsgs = msgs.filter((m) => m.kind !== "announce");
  const shown: Msg[] = tab === "announcements" ? announcements : chatMsgs;
  const pinned = [...announcements].reverse().find((a) => a.important);
  const unreadCount = annSeen ? 0 : announcements.filter((a) => a.unread).length;
  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const canSend = draft.trim().length > 0;
  const onlineCount = roster.filter((m) => m.online).length;

  const q = query.trim().toLowerCase();
  const matches = q ? roster.filter((m) => m.name.toLowerCase().includes(q)) : roster;
  const headMembers = roster.slice(0, VISIBLE_MEMBERS);
  const restMembers = roster.slice(VISIBLE_MEMBERS);

  return (
    <div
      className="native-edge-to-edge relative mx-auto flex w-full max-w-md flex-col overflow-hidden overscroll-none"
      style={{ height: "100dvh", maxHeight: "100dvh", backgroundColor: CANVAS, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: INK }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        html, body { background-color: ${CANVAS}; height: 100%; overflow: hidden; overscroll-behavior: none; }
        @keyframes lc-pulse { 50% { opacity: .3 } }
        @keyframes lc-bar { 0%, 100% { transform: scaleY(.3) } 50% { transform: scaleY(1) } }
        @keyframes lc-msg { from { opacity: 0; transform: translateY(8px) scale(.98) } to { opacity: 1; transform: none } }
        @keyframes lc-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lc-drop { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @keyframes lc-rise { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
        .lc-msg { animation: lc-msg 300ms cubic-bezier(.22,1,.36,1) both }
        .lc-tab { animation: lc-fade .25s ease both }
        .lc-drop { animation: lc-drop .25s cubic-bezier(.22,1,.36,1) both }
        .lc-rise { animation: lc-rise .55s cubic-bezier(.22,1,.36,1) both }
        .lc-cap { transition: box-shadow .2s ease }
        .lc-cap:focus-within { box-shadow: 0 0 0 3px rgba(91,63,224,.14), ${FLOAT} !important }
        .lc-scroll { scrollbar-width: none }
        .lc-scroll::-webkit-scrollbar { display: none }
        @media (prefers-reduced-motion: reduce) { .lc-msg, .lc-tab, .lc-drop, .lc-rise, .lc-anim { animation: none !important } }
      `}</style>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: "16px" }}>
        <Link to="/class" aria-label="Back to class" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ border: `1px solid ${LINE}` }}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <button onClick={openInfo} aria-label="Open class info" className="min-w-0 flex-1 py-0.5 text-left transition-opacity duration-200 active:opacity-60">
          <h1 className="truncate text-[19px] font-extrabold leading-tight tracking-tight" style={{ fontFamily: DISPLAY }}>
            {className}
          </h1>
          <p className="truncate text-[12px]" style={{ color: INK_SOFT }}>
            {memberPreview}
          </p>
        </button>
        <button
          onClick={() => setToolsOpen(true)}
          aria-label="Open class tools"
          aria-haspopup="dialog"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90"
          style={{ border: `1px solid ${LINE}`, color: INK }}
        >
          <LayoutDashboard className="h-5 w-5" strokeWidth={1.9} />
        </button>
      </header>

      {/* Tabs */}
      <nav className="relative mx-4 flex" style={{ borderBottom: `1px solid ${LINE}` }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold transition-colors duration-300"
            style={{ color: tab === t.id ? INK : INK_SOFT }}
          >
            {t.label}
            {t.id === "announcements" && unreadCount > 0 && (
              <span className="grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: ACCENT }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[-1px] left-0 flex justify-center transition-transform duration-500"
          style={{ width: `${100 / TABS.length}%`, transform: `translateX(${tabIndex * 100}%)`, transitionTimingFunction: "cubic-bezier(.22,1,.36,1)" }}
        >
          <span className="h-[3px] w-7 rounded-full" style={{ backgroundColor: ACCENT }} />
        </span>
      </nav>

      <div key={tab} className="lc-tab flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "files" ? (
          <div className="lc-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-4">
            <p className="pb-1 text-[12px] font-semibold" style={{ color: INK_SOFT }}>
              {files.length} {files.length === 1 ? "file" : "files"} shared
            </p>
            {files.map((f, i) => {
              const { Icon, color } = fileMeta(f.tag);
              return (
                <button key={f.id} onClick={() => openShared(f.url)} className="flex items-center gap-3.5 py-3.5 text-left transition-opacity active:opacity-60" style={{ borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${color}1A`, color }}>
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold leading-snug">{f.name}</p>
                    <p className="text-[12px]" style={{ color: INK_SOFT }}>
                      {f.by} · {f.tag} · {f.size}
                    </p>
                  </div>
                  <Download className="h-[18px] w-[18px] shrink-0" style={{ color: INK_SOFT }} />
                </button>
              );
            })}
            <button onClick={() => fileInput.current?.click()} className="mt-4 flex items-center justify-center gap-2 rounded-full py-3.5 text-[13.5px] font-bold transition-transform active:scale-[0.98]" style={{ color: ACCENT, backgroundColor: WASH }}>
              <Plus className="h-4 w-4" /> Share a document
            </button>
          </div>
        ) : (
          <>
            {tab === "chat" && pinned && (
              <button
                onClick={() => setTab("announcements")}
                className="mx-4 mt-3 flex shrink-0 items-center gap-3 rounded-2xl bg-white py-2.5 pl-3 pr-2.5 text-left transition-transform active:scale-[0.99]"
                style={{ border: `1px solid ${LINE}` }}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: "#FDE7E2", color: FLAME }}>
                  <Megaphone className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold leading-tight" style={{ color: "#D3402E" }}>
                    Important
                  </span>
                  <span className="block truncate text-[13px] font-semibold leading-snug">{pinned.title}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: INK_SOFT }} />
              </button>
            )}

            <div className="lc-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
              {shown.length === 0 && (
                <p className="m-auto text-[13px]" style={{ color: INK_SOFT }}>
                  {tab === "chat" ? "No messages yet. Start the discussion." : "No announcements yet."}
                </p>
              )}
              {tab === "chat" && shown.length > 0 && (
                <span className="mb-4 self-center rounded-full px-3 py-1 text-[11px] font-semibold" style={{ backgroundColor: CHIP, color: INK_SOFT }}>
                  Today
                </span>
              )}
              {shown.map((m, i) => {
                const p = personOf(m.fromId);
                const mine = p.id === "me";
                if (m.kind === "announce") {
                  return (
                    <div key={m.id} className={`${i === 0 ? "" : "mt-3"} ${fresh.current.has(m.id) ? "lc-msg" : ""}`}>
                      <AnnouncementCard m={m} who={mine ? "You" : p.name} p={p} seen={annSeen} />
                    </div>
                  );
                }
                if (m.kind === "poll") {
                  return (
                    <div key={m.id} className={`${i === 0 ? "" : "mt-4"} ${fresh.current.has(m.id) ? "lc-msg" : ""}`}>
                      <PollCard poll={m.poll} teacher={isInstructor} meta={{ name: mine ? "You" : p.name, pic: p.pic, time: m.time }} eligible={roster.filter((r) => r.role === "Student").length} onVote={(ids) => pollAct(votePoll(m.poll.id, ids), "Vote recorded")} onClose={() => pollAct(closePoll(m.poll.id), "Poll closed")} />
                    </div>
                  );
                }
                if (m.kind === "quiz") {
                  return (
                    <div key={m.id} className={`${i === 0 ? "" : "mt-4"} ${fresh.current.has(m.id) ? "lc-msg" : ""}`}>
                      <QuizCard quiz={m.quiz} who={p} time={m.time} teacher={isInstructor} onOpen={() => { setQuizId(m.quiz.id); setQuizOpen(true); }} />
                    </div>
                  );
                }
                if (m.kind === "question") {
                  const qq = m.q;
                  return (
                    <div key={m.id} className={`${i === 0 ? "" : "mt-4"} ${fresh.current.has(m.id) ? "lc-msg" : ""}`}>
                      <QuestionCard q={qq} who={who(qq.asker_id)} viewerIsTeacher={isInstructor} onOpen={() => { setQThread(qq.id); setQOpen(true); }} onMeToo={() => qAct(toggleMeToo(qq.id))} />
                    </div>
                  );
                }
                const prev = shown[i - 1];
                const first = !prev || prev.fromId !== m.fromId || prev.kind === "poll" || prev.kind === "question" || prev.kind === "quiz";
                const lecturer = !!p.lec;
                const gap = i === 0 ? "" : first ? "mt-4" : "mt-1";
                return (
                  <div key={m.id} className={`flex min-w-0 max-w-[86%] items-start gap-2 ${mine ? "flex-row-reverse self-end" : "self-start"} ${gap} ${fresh.current.has(m.id) ? "lc-msg" : ""}`}>
                    {!mine && (first ? <Avatar p={p} size={32} /> : <span className="w-8 shrink-0" />)}
                    <div className={`flex min-w-0 flex-col ${mine ? "items-end" : "items-start"}`}>
                      {first && (
                        <p className="mb-1 flex items-center gap-1.5 px-1 text-[11.5px]" style={{ color: INK_SOFT }}>
                          {!mine && (
                            <span className="font-bold" style={{ color: lecturer ? ACCENT : nameColor(p.id) }}>
                              {p.name}
                            </span>
                          )}
                          {!mine && lecturer && (
                            <span className="rounded-full px-1.5 py-px text-[10px] font-bold" style={{ backgroundColor: WASH, color: ACCENT }}>
                              Lecturer
                            </span>
                          )}
                          <span>{m.time}</span>
                        </p>
                      )}
                      <div
                        className="max-w-full px-3.5 py-2.5 text-[14px] leading-[1.45] [overflow-wrap:anywhere]"
                        style={{
                          backgroundColor: mine ? INK : lecturer ? WASH : "white",
                          color: mine ? "white" : INK,
                          border: mine ? "none" : `1px solid ${lecturer ? "rgba(91,63,224,0.12)" : LINE}`,
                          borderRadius: first ? (mine ? "20px 6px 20px 20px" : "6px 20px 20px 20px") : 20,
                        }}
                      >
                        {m.kind === "text" && m.text}
                        {m.kind === "voice" && <VoiceBubble length={m.length} mine={mine} url={m.url} />}
                        {m.kind === "doc" && (
                          <div className="cursor-pointer" onClick={() => openShared(m.url)}>
                            <DocBubble name={m.name} size={m.size} mine={mine} />
                          </div>
                        )}
                        {m.kind === "sketch" && <img src={m.src} alt="Sketch" className="block w-[224px] rounded-xl bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={listEnd} />
            </div>

            {/* Composer */}
            <div className="relative shrink-0 px-3 pt-1" style={{ backgroundColor: CANVAS, paddingBottom: "calc(max(var(--safe-bottom, 0px), env(safe-area-inset-bottom, 0px)) + 12px)" }}>
              <div className="pointer-events-none absolute inset-x-0 -top-5 h-5" style={{ background: `linear-gradient(to top, ${CANVAS}, transparent)` }} />

              {sketchOpen && (
                <div className="lc-drop absolute inset-x-3 bottom-full mb-2 flex h-[min(340px,52dvh)] flex-col rounded-[28px] bg-white p-3.5" style={{ border: `1px solid ${LINE}`, boxShadow: "0 18px 48px rgba(20,22,31,0.18)" }}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-[14px] font-extrabold tracking-tight" style={{ fontFamily: DISPLAY }}>
                      Quick sketch
                    </p>
                    <button onClick={() => setSketchOpen(false)} aria-label="Close sketch" className="grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: CHIP }}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1">
                    <DrawPad
                      onSend={(src) => {
                        void post({ kind: "sketch", body: src });
                        setSketchOpen(false);
                        setTab("chat");
                      }}
                    />
                  </div>
                </div>
              )}

              {isInstructor && (
                <div className="mb-2 flex items-center gap-1 px-1">
                  {(["message", "announcement"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCompose(c)}
                      className="rounded-full px-3 py-1 text-[12px] font-bold capitalize transition-colors duration-200"
                      style={{ backgroundColor: compose === c ? INK : "transparent", color: compose === c ? "white" : INK_SOFT }}
                    >
                      {c}
                    </button>
                  ))}
                  {compose === "announcement" && (
                    <button role="switch" aria-checked={important} onClick={() => setImportant((v) => !v)} className="ml-auto flex items-center gap-2 text-[12px] font-semibold" style={{ color: important ? "#D3402E" : INK_SOFT }}>
                      Important
                      <span className="relative h-5 w-9 rounded-full transition-colors duration-200" style={{ backgroundColor: important ? FLAME : "#D5D5E0" }}>
                        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200" style={{ left: important ? 18 : 2 }} />
                      </span>
                    </button>
                  )}
                </div>
              )}

              {isInstructor && compose === "announcement" && (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  className="lc-drop mb-2 h-11 w-full rounded-full bg-white px-4 text-[14px] font-semibold outline-none placeholder:text-[#707285]"
                  style={{ border: `1px solid ${LINE}` }}
                />
              )}

              <div className="lc-cap flex h-[54px] items-center gap-0.5 rounded-full bg-white pl-1.5 pr-[7px]" style={{ border: `1px solid ${LINE}`, boxShadow: FLOAT }}>
                {recording ? (
                  <>
                    <button onClick={() => stopRec(false)} aria-label="Cancel recording" className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors active:bg-black/5" style={{ color: INK_SOFT }}>
                      <X className="h-[18px] w-[18px]" />
                    </button>
                    <span className="flex min-w-0 flex-1 items-center gap-2.5 pl-1 text-[14px] font-semibold tabular-nums" style={{ color: FLAME }}>
                      <span className="lc-anim h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: FLAME, animation: "lc-pulse 1s infinite" }} />
                      {mmss(recSecs)}
                      <span className="flex h-5 flex-1 items-center justify-end gap-[3px]">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <span key={i} className="lc-anim h-full w-[3px] origin-center rounded-full" style={{ backgroundColor: FLAME, opacity: 0.7, animation: `lc-bar ${0.8 + (i % 4) * 0.15}s ease-in-out ${i * 0.07}s infinite` }} />
                        ))}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <button onClick={() => fileInput.current?.click()} aria-label="Share a document" className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors active:bg-black/5" style={{ color: INK_SOFT }}>
                      <Paperclip className="h-[19px] w-[19px]" />
                    </button>
                    <button
                      onClick={() => setSketchOpen((v) => !v)}
                      aria-label="Sketch a calculation or diagram"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-200"
                      style={{ color: sketchOpen ? ACCENT : INK_SOFT, backgroundColor: sketchOpen ? WASH : "transparent" }}
                    >
                      <PenLine className="h-[19px] w-[19px]" />
                    </button>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
                      placeholder={isInstructor && compose === "announcement" ? "Write the announcement" : "Message the class"}
                      className="min-w-0 flex-1 bg-transparent px-2 text-[14.5px] outline-none placeholder:text-[#707285]"
                    />
                  </>
                )}
                <button
                  onClick={voiceOrSend}
                  aria-label={canSend ? "Send" : recording ? "Send voice note" : "Record voice note"}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-90"
                  style={{ backgroundColor: recording ? FLAME : canSend ? ACCENT : CHIP, color: recording || canSend ? "white" : INK }}
                >
                  {canSend || recording ? <Send className="h-[18px] w-[18px]" /> : <Mic className="h-[19px] w-[19px]" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <input ref={fileInput} type="file" className="hidden" onChange={onPickFile} />

      {/* Class info: slides in over the chat */}
      <div
        aria-hidden={!infoOpen}
        className="absolute inset-0 z-30 flex flex-col"
        style={{
          backgroundColor: CANVAS,
          transform: infoOpen ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
          visibility: infoOpen ? "visible" : "hidden",
          transition: `transform .45s cubic-bezier(.22,1,.36,1), visibility 0s linear ${infoOpen ? "0s" : ".45s"}`,
          boxShadow: infoOpen ? "-12px 0 40px rgba(20,22,31,0.12)" : "none",
          willChange: "transform",
        }}
      >
        <button
          onClick={closeInfo}
          aria-label="Back to chat"
          className="absolute left-4 z-20 grid h-10 w-10 place-items-center rounded-full text-white transition-transform active:scale-90"
          style={{ top: 16, backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)" }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div ref={infoScroll} className="lc-scroll relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-10">
          <div key={infoKey}>
            {/* Hero: faded cover artwork, class picture, left-aligned identity and facepile */}
            <section className="lc-rise -mx-4" style={rise(0)}>
              {/* Cover artwork: dissolves into the page colour, so it has no visible bottom edge */}
              <div className="relative h-[240px] overflow-hidden">
                <img src={headerBg} alt="" aria-hidden draggable={false} className="block h-full w-full object-cover" style={{ objectPosition: "right top", maxWidth: "none" }} />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 top-[22%]"
                  style={{
                    background: `linear-gradient(to bottom, rgba(245,245,250,0) 0%, rgba(245,245,250,0.05) 14%, rgba(245,245,250,0.18) 30%, rgba(245,245,250,0.42) 50%, rgba(245,245,250,0.72) 70%, rgba(245,245,250,0.93) 86%, ${CANVAS} 100%)`,
                  }}
                />
              </div>

              <div className="relative -mt-[76px] px-5">
                <img
                  src={CLASS_PIC}
                  alt={`${className} picture`}
                  draggable={false}
                  className="block h-[104px] w-[104px] rounded-full object-cover"
                  style={{ maxWidth: "none", border: "4px solid white", boxShadow: "0 12px 28px -8px rgba(20,22,31,0.35)" }}
                />

                <h2 className="mt-4 text-[28px] font-extrabold leading-[1.05] tracking-tight" style={{ fontFamily: DISPLAY }}>
                  {className}
                </h2>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-[12px] font-bold" style={{ backgroundColor: WASH, color: ACCENT }}>
                    {DETAILS.code}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold" style={{ backgroundColor: "#E3F6EC", color: GREEN }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#22C55E" }} />
                    {onlineCount} online
                  </span>
                </div>

                {/* Facepile */}
                <button onClick={scrollToMembers} aria-label="Jump to members" className="mt-4 flex items-center gap-3 transition-opacity active:opacity-60">
                  <span className="flex items-center">
                    {roster.slice(0, 5).map((m, i) => (
                      <span key={m.id} className="rounded-full" style={{ marginLeft: i ? -10 : 0, boxShadow: `0 0 0 2.5px ${CANVAS}` }}>
                        <Avatar p={m} size={32} />
                      </span>
                    ))}
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: INK_SOFT }}>
                    {roster.length > 5 ? `+${roster.length - 5} more` : "Members"}
                  </span>
                  <ChevronRight className="-ml-1.5 h-4 w-4" style={{ color: INK_SOFT }} />
                </button>
              </div>
            </section>

            {/* Notifications */}
            <div className="lc-rise mt-6" style={rise(3)}>
              <button
                role="switch"
                aria-checked={!muted}
                onClick={() => {
                  setMuted((v) => !v);
                  setToast(muted ? "Notifications on" : "Notifications muted");
                }}
                className="flex w-full items-center gap-3.5 rounded-[24px] bg-white px-4 py-3.5 text-left ring-1 ring-black/[0.035] transition-transform duration-200 active:scale-[0.99]"
                style={{ boxShadow: CARD_SHADOW }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-300" style={{ backgroundColor: muted ? CHIP : WASH, color: muted ? INK_SOFT : ACCENT }}>
                  {muted ? <BellOff className="h-[18px] w-[18px]" strokeWidth={1.9} /> : <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold leading-snug">Notifications</span>
                  <span className="block truncate text-[12px]" style={{ color: INK_SOFT }}>
                    {muted ? "Muted for this class" : "New messages and notices"}
                  </span>
                </span>
                <span className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300" style={{ backgroundColor: muted ? "#D5D5E0" : ACCENT }}>
                  <span
                    className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300"
                    style={{ transform: muted ? "translateX(0)" : "translateX(20px)", transitionTimingFunction: "cubic-bezier(.22,1,.36,1)" }}
                  />
                </span>
              </button>
            </div>

            {/* About */}
            <section className="lc-rise mt-3 rounded-[26px] bg-white p-5 ring-1 ring-black/[0.035]" style={{ ...rise(4), boxShadow: CARD_SHADOW }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: INK_SOFT }}>
                About
              </p>
              <p className="mt-2 text-[14.5px] leading-[22px]" style={{ color: "#3E4150" }}>
                {DETAILS.about}
              </p>
              <div className="mt-3" style={{ borderTop: `1px solid ${LINE}` }}>
                <DetailRow Icon={Calendar} label="Schedule" value={DETAILS.schedule} />
                <DetailRow
                  Icon={Hash}
                  label="Class code"
                  value={DETAILS.classCode}
                  top
                  ActionIcon={Copy}
                  onAction={() => {
                    void navigator.clipboard?.writeText(DETAILS.classCode);
                    setToast("Class code copied");
                  }}
                />
              </div>
            </section>

            {/* Members */}
            <section ref={membersRef} className="lc-rise mt-3 rounded-[26px] bg-white p-5 ring-1 ring-black/[0.035]" style={{ ...rise(5), boxShadow: CARD_SHADOW }}>
              <div className="flex items-baseline justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: INK_SOFT }}>
                  Members
                </p>
                <p className="text-[12px] font-semibold tabular-nums" style={{ color: INK_SOFT }}>
                  {roster.length}
                </p>
              </div>

              <label className="mt-3 flex h-11 items-center gap-2.5 rounded-full px-4" style={{ backgroundColor: CANVAS }}>
                <Search className="h-4 w-4 shrink-0" style={{ color: INK_SOFT }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search members"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#707285]"
                />
                {query && (
                  <button onClick={() => setQuery("")} aria-label="Clear search" className="grid h-6 w-6 place-items-center rounded-full" style={{ backgroundColor: CHIP }}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </label>

              {q ? (
                <ul className="mt-1">
                  {matches.map((m, i) => (
                    <MemberRow key={m.id} m={m} top={i > 0} />
                  ))}
                  {matches.length === 0 && (
                    <li className="py-6 text-center text-[13px]" style={{ color: INK_SOFT }}>
                      No one matches that name.
                    </li>
                  )}
                </ul>
              ) : (
                <>
                  <ul className="mt-1">
                    {headMembers.map((m, i) => (
                      <MemberRow key={m.id} m={m} top={i > 0} />
                    ))}
                  </ul>

                  {restMembers.length > 0 && (
                    <>
                      {/* The extra members live in a grid row that animates from 0fr to 1fr, so the card grows smoothly */}
                      <div
                        aria-hidden={!showAll}
                        style={{
                          display: "grid",
                          gridTemplateRows: showAll ? "1fr" : "0fr",
                          transition: "grid-template-rows .6s cubic-bezier(.22,1,.36,1)",
                        }}
                      >
                        <ul style={{ minHeight: 0, overflow: "hidden" }}>
                          {restMembers.map((m, i) => (
                            <MemberRow
                              key={m.id}
                              m={m}
                              top
                              style={{
                                opacity: showAll ? 1 : 0,
                                transform: showAll ? "none" : "translateY(-10px)",
                                transition: `opacity .45s ease ${showAll ? 120 + i * 45 : 0}ms, transform .55s cubic-bezier(.22,1,.36,1) ${showAll ? 120 + i * 45 : 0}ms`,
                              }}
                            />
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={toggleMembers}
                        aria-expanded={showAll}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-[13px] font-bold transition-transform active:scale-[0.98]"
                        style={{ color: ACCENT, backgroundColor: WASH }}
                      >
                        {showAll ? "Show fewer" : `See all ${roster.length} members`}
                        <ChevronDown className="h-4 w-4 transition-transform duration-500" style={{ transform: showAll ? "rotate(180deg)" : "none", transitionTimingFunction: "cubic-bezier(.22,1,.36,1)" }} />
                      </button>
                    </>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Tools sheet: glides up from the bottom */}
      <div
        onClick={() => setToolsOpen(false)}
        aria-hidden
        className="absolute inset-0 z-[45]"
        style={{
          backgroundColor: "rgba(20,22,31,0.38)",
          opacity: toolsOpen ? 1 : 0,
          pointerEvents: toolsOpen ? "auto" : "none",
          transition: "opacity .35s ease",
        }}
      />
      <div
        role="dialog"
        aria-label="Class tools"
        aria-hidden={!toolsOpen}
        className="absolute inset-x-0 bottom-0 z-50 rounded-t-[30px] bg-white px-4 pt-2.5"
        style={{
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          transform: toolsOpen ? "translate3d(0,0,0)" : "translate3d(0,105%,0)",
          visibility: toolsOpen ? "visible" : "hidden",
          transition: `transform .5s cubic-bezier(.22,1,.36,1), visibility 0s linear ${toolsOpen ? "0s" : ".5s"}`,
          boxShadow: "0 -12px 40px rgba(20,22,31,0.14)",
          willChange: "transform",
        }}
      >
        <span className="mx-auto mb-2 block h-1 w-9 rounded-full" style={{ backgroundColor: CHIP }} />
        <div className="grid grid-cols-3 gap-x-1 gap-y-1 px-1 pb-2 pt-1">
          {TOOLS.map((t, i) => (
            <ToolItem
              key={t.id}
              index={i}
              open={toolsOpen}
              src={t.src}
              label={t.label}
              onClick={() => {
                setToolsOpen(false);
                openTool(t.id);
              }}
            />
          ))}
        </div>
      </div>

      <PollsSheet classId={classId} isInstructor={isInstructor} open={pollsOpen} onClose={() => setPollsOpen(false)} onToast={setToast} onChanged={() => void chan.current?.send({ type: "broadcast", event: "polls", payload: {} })} />

      <QuestionsSheet classId={classId} userId={user?.id} isInstructor={isInstructor} open={qOpen} onClose={() => setQOpen(false)} onToast={setToast} thread={qThread} setThread={setQThread} who={who} onChanged={() => void chan.current?.send({ type: "broadcast", event: "questions", payload: {} })} />

      <QuizSheet classId={classId} userId={user?.id} isInstructor={isInstructor} open={quizOpen} onClose={() => setQuizOpen(false)} onToast={setToast} quizId={quizId} setQuizId={setQuizId} who={who} students={(membersQ.data ?? []).filter((m) => m.role === "student").map((m) => ({ id: m.id, name: m.name, pic: people[m.id === user?.id ? "me" : m.id]?.pic ?? cremePic }))} onChanged={() => void chan.current?.send({ type: "broadcast", event: "quizzes", payload: {} })} />

      {wbOpen && classId && (
        <div className="fixed inset-0 z-[80]">
          <Whiteboard classId={classId} onClose={() => setWbOpen(false)} />
        </div>
      )}

      {wsOpen && classId && <Workspaces classId={classId} onClose={() => setWsOpen(false)} />}

      {/* Toast */}
      <div
        className="pointer-events-none absolute left-1/2 top-20 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-semibold text-white transition-all duration-300"
        style={{ backgroundColor: INK, opacity: toast ? 1 : 0, transform: `translate(-50%, ${toast ? 0 : -12}px)` }}
      >
        {toast}
      </div>
    </div>
  );
}