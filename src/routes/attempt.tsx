import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  Link2,
  ListChecks,
  Paperclip,
  Pencil,
  Award,
  Timer,
  Upload,
  X,
} from "lucide-react";
import type { WorkType } from "@/components/WorkFloatingActionButton";
import type { Question } from "@/components/QuestionBuilder";
import { submitWork, useWorkDetail } from "@/lib/work";

export const Route = createFileRoute("/attempt")({
  validateSearch: (search: Record<string, unknown>): { id?: string; classId?: string; workId?: string } => {
    const id = search["id"];
    return { ...(typeof id === "string" ? { id } : {}), ...(typeof search.classId === "string" ? { classId: search.classId } : {}), ...(typeof search.workId === "string" ? { workId: search.workId } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Attempt | Virtual Classroom" },
      {
        name: "description",
        content: "Read the instructions and complete your assignment, classwork or assessment.",
      },
    ],
  }),
  component: AttemptPage,
});

/* ---------- Data ----------
   Sample work so both versions of the page can be tried:
   /attempt?id=a1  assignment, hand in files, links, photos or notes
   /attempt?id=q1  timed assessment with multiple choice questions
   /attempt?id=c1  classwork with a short multiple choice set, no timer
   Replace getWork() with a lookup in your own store or API. */

type Work = {
  id: string;
  type: WorkType;
  className: string;
  title: string;
  instructions: string;
  due: Date;
  points: number | null;
  allowLate: boolean;
  durationMin: number | null;
  showResults: boolean;
  attachments: { name: string; size: string }[];
  questions: Question[];
};

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "s1",
    difficulty: "easy",
    text: "What is the SI unit of force?",
    options: ["Newton", "Joule", "Pascal", "Watt"],
    correct: 0,
  },
  {
    id: "s2",
    difficulty: "easy",
    text: "Which law states that every action has an equal and opposite reaction?",
    options: [
      "Newton's first law",
      "Newton's second law",
      "Newton's third law",
      "The law of gravitation",
    ],
    correct: 2,
  },
  {
    id: "s5",
    difficulty: "medium",
    text: "A 10 N force acts at a perpendicular distance of 0.5 m from a point. What is its moment about that point?",
    options: ["5 N·m", "20 N·m", "0.05 N·m", "10.5 N·m"],
    correct: 0,
  },
  {
    id: "s11",
    difficulty: "hard",
    text: "A 10 kg block slides on a rough horizontal surface with μ = 0.3. Taking g = 9.81 m/s², what is the friction force?",
    options: ["29.43 N", "98.1 N", "3.0 N", "32.7 N"],
    correct: 0,
  },
  {
    id: "s12",
    difficulty: "hard",
    text: "What is the moment of inertia of a rectangle of base b and height h about its centroidal axis parallel to the base?",
    options: ["bh³/3", "b³h/12", "bh³/12", "bh²/6"],
    correct: 2,
  },
];

function getWork(id: string | undefined, now: Date): Work {
  const at = (days: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 23, 59);

  const all: Work[] = [
    {
      id: "a1",
      type: "Assignment",
      className: "MCE 201",
      title: "Statics problem set 3",
      instructions:
        "Solve questions 1 to 6 from the attached problem set. Show every step of your working and draw a clear free body diagram for each problem.\n\nYou can hand in a scan, a photo of your handwritten work, or a typed document. If you worked in a shared document, paste the link instead.",
      due: at(3),
      points: 20,
      allowLate: true,
      durationMin: null,
      showResults: false,
      attachments: [{ name: "Problem-set-3.pdf", size: "1.2 MB" }],
      questions: [],
    },
    {
      id: "q1",
      type: "Assessment",
      className: "MCE 201",
      title: "Mid-semester test",
      instructions:
        "Answer every question. Each question has one correct answer. Calculators are allowed. Read each question carefully before you choose.",
      due: at(7),
      points: 50,
      allowLate: false,
      durationMin: 20,
      showResults: true,
      attachments: [],
      questions: SAMPLE_QUESTIONS,
    },
    {
      id: "c1",
      type: "Classwork",
      className: "MCE 201",
      title: "Quick check: forces and moments",
      instructions: "A short warm up on today's topic. Take your time, there is no timer.",
      due: at(1),
      points: 10,
      allowLate: true,
      durationMin: null,
      showResults: false,
      attachments: [],
      questions: SAMPLE_QUESTIONS.slice(0, 3),
    },
  ];
  return all.find((w) => w.id === id) ?? all[0];
}

/* ---------- Helpers ---------- */

const LETTERS = ["A", "B", "C", "D"];
const label = "text-[11px] font-bold tracking-[0.18em] text-muted-foreground";
const hideScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDue(due: Date) {
  const day = due.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

function relativeTo(due: Date, now: Date) {
  const diff = due.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  const hr = Math.round(abs / 3600000);
  const day = Math.round(abs / 86400000);
  const unit =
    min < 60
      ? `${Math.max(min, 1)} min`
      : hr < 24
        ? `${hr} ${hr === 1 ? "hour" : "hours"}`
        : `${day} ${day === 1 ? "day" : "days"}`;
  return diff >= 0 ? `in ${unit}` : `${unit} overdue`;
}

function clock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  const withProtocol = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProtocol);
    return u.hostname.includes(".") ? u : null;
  } catch {
    return null;
  }
}

/* ---------- Shared pieces ---------- */

function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out ${
        open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
      }`}
    >
      <div className="-mx-1 overflow-hidden px-1 pb-1">
        <div className="pt-3">{children}</div>
      </div>
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20">
      <div className="mx-auto w-full max-w-md bg-gradient-to-t from-background via-background/95 to-transparent px-6 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

function BackButton({ onClick, icon = "arrow" }: { onClick: () => void; icon?: "arrow" | "close" }) {
  return (
    <button
      type="button"
      aria-label={icon === "close" ? "Leave" : "Go back"}
      onClick={onClick}
      className="-ml-1 grid size-9 place-items-center rounded-full text-foreground transition-colors active:bg-muted"
    >
      {icon === "close" ? (
        <X className="size-[22px]" strokeWidth={2.2} />
      ) : (
        <ArrowLeft className="size-[22px]" strokeWidth={2.2} />
      )}
    </button>
  );
}

function Header({ work, now }: { work: Work; now: Date }) {
  const past = work.due.getTime() < now.getTime();
  return (
    <header className="px-6 pt-5">
      <p className="text-[13px] font-medium text-muted-foreground">
        {work.type} · {work.className}
      </p>
      <h1 className="mt-2 text-[30px] font-extrabold leading-[1.1] tracking-tight text-foreground">
        {work.title}
      </h1>
      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold">
        <CalendarDays className="size-4 text-feature" strokeWidth={2.2} />
        <span className="text-foreground">{formatDue(work.due)}</span>
        <span className={past ? "text-red-500" : "text-muted-foreground"}>
          · {relativeTo(work.due, now)}
        </span>
      </p>
    </header>
  );
}

const FACT_ICONS: Record<string, typeof Award> = {
  POINTS: Award,
  FILES: Paperclip,
  QUESTIONS: ListChecks,
  TIME: Timer,
};

function FactIcon({ label }: { label: string }) {
  const I = FACT_ICONS[label] ?? Award;
  return <I className="size-[18px]" strokeWidth={2.2} />;
}

function Facts({ items, stack = false }: { items: { label: string; value: string }[]; stack?: boolean }) {
  return (
    <ul
      className="mx-6 mt-7 grid gap-3"
      style={stack ? undefined : { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((f) => (
        <li key={f.label} className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-feature/10 text-feature">
            <FactIcon label={f.label} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-extrabold leading-tight tracking-tight text-foreground">
              {f.value}
            </span>
            <span className="mt-0.5 block text-[10px] font-bold tracking-[0.16em] text-muted-foreground">
              {f.label}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Instructions({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 320;
  return (
    <section className="mt-8 px-6">
      <p className={label}>INSTRUCTIONS</p>
      <p
        className={`mt-3 whitespace-pre-line text-[15px] font-medium leading-relaxed text-foreground/90 ${
          long && !open ? "line-clamp-5" : ""
        }`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 text-[13px] font-bold text-feature transition-opacity active:opacity-60"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </section>
  );
}

function Reference({ files }: { files: Work["attachments"] }) {
  if (files.length === 0) return null;
  return (
    <section className="mt-8 px-6">
      <p className={label}>REFERENCE MATERIAL</p>
      <ul className="mt-2 divide-y divide-border">
        {files.map((f) => (
          <li key={f.name}>
            {/* Connect this to your file download. */}
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-left transition-opacity active:opacity-60"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-foreground">
                <FileText className="size-[18px]" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold text-foreground">
                  {f.name}
                </span>
                <span className="block text-[12px] font-medium text-muted-foreground">
                  {f.size}
                </span>
              </span>
              <Download className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={2.2} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Submission (no questions) ---------- */

type ItemKind = "file" | "photo" | "link" | "note";
type Item = {
  id: number;
  kind: ItemKind;
  name: string;
  meta: string;
  preview?: string;
  file?: File;
  body?: string;
};

const METHODS = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "link", label: "Link", icon: Link2 },
  { id: "camera", label: "Camera", icon: Camera },
  { id: "write", label: "Write", icon: Pencil },
] as const;

function ItemIcon({ item }: { item: Item }) {
  if (item.preview)
    return <img src={item.preview} alt="" className="size-full object-cover" draggable={false} />;
  const Icon = item.kind === "link" ? Link2 : item.kind === "note" ? Pencil : item.kind === "photo" ? Camera : FileText;
  return <Icon className="size-[18px]" strokeWidth={2} />;
}

function Submission({ work, now, onSubmit }: { work: Work; now: Date; onSubmit: (body: string, files: File[]) => Promise<void> }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [panel, setPanel] = useState<"link" | "write" | null>(null);
  const [linkText, setLinkText] = useState("");
  const [linkError, setLinkError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [phase, setPhase] = useState<"edit" | "sending" | "done">("edit");
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(1);
  const itemsRef = useRef<Item[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  itemsRef.current = items;

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    },
    [],
  );

  useEffect(() => {
    if (panel === "link") linkRef.current?.focus();
    if (panel === "write") noteRef.current?.focus();
  }, [panel]);

  const past = work.due.getTime() < now.getTime();
  const closed = past && !work.allowLate;

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (picked.length === 0) return;
    const created: Item[] = picked.map((f) => {
      const isImage = f.type.startsWith("image/");
      return {
        id: nextId.current++,
        kind: isImage ? "photo" : "file",
        name: f.name || "Photo",
        meta: formatSize(f.size),
        ...(isImage ? { preview: URL.createObjectURL(f) } : {}),
        file: f,
      };
    });
    setItems((cur) => [...cur, ...created]);
  };

  const addLink = () => {
    const url = normalizeUrl(linkText);
    if (!url) {
      setLinkError("Enter a valid link.");
      return;
    }
    setItems((cur) => [
      ...cur,
      { id: nextId.current++, kind: "link", name: url.hostname.replace(/^www\./, ""), meta: url.href },
    ]);
    setLinkText("");
    setLinkError("");
    setPanel(null);
  };

  const addNote = () => {
    const text = noteText.trim();
    if (!text) return;
    const words = text.split(/\s+/).length;
    setItems((cur) => [
      ...cur,
      {
        id: nextId.current++,
        kind: "note",
        name: text.length > 44 ? `${text.slice(0, 44)}...` : text,
        meta: `Note · ${words} ${words === 1 ? "word" : "words"}`,
        body: text,
      },
    ]);
    setNoteText("");
    setPanel(null);
  };

  const removeItem = (id: number) => {
    const target = items.find((i) => i.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    setItems((cur) => cur.filter((i) => i.id !== id));
  };

  const onTile = (id: (typeof METHODS)[number]["id"]) => {
    if (id === "upload") uploadRef.current?.click();
    else if (id === "camera") cameraRef.current?.click();
    else setPanel((cur) => (cur === id ? null : id));
  };

  const ready = items.length > 0 && !closed && phase === "edit";

  const turnIn = async () => {
    if (!ready) return;
    setPanel(null);
    setError(""); setPhase("sending");
    try { await onSubmit(items.filter((item) => item.kind === "note" || item.kind === "link").map((item) => item.kind === "link" ? item.meta : item.body ?? item.name).join("\n\n"), items.flatMap((item) => item.file ? [item.file] : [])); setSentAt(new Date()); setPhase("done"); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "We couldn't submit your work."); setPhase("edit"); }
  };

  const facts = [
    { label: "POINTS", value: work.points === null ? "Ungraded" : String(work.points) },
    { label: "FILES", value: String(work.attachments.length) },
  ];

  if (phase === "done") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-6">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span
            className="at-anim grid size-20 place-items-center rounded-full bg-feature text-white"
            style={{ animation: "at-pop 0.5s cubic-bezier(.2,.9,.3,1.2) both" }}
          >
            <Check className="size-9" strokeWidth={3} />
          </span>
          <div className="at-anim" style={{ animation: "at-rise 0.5s ease-out 0.25s both" }}>
            <h1 className="mt-7 text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
              Turned in
            </h1>
            <p className="mx-auto mt-2 max-w-[18rem] truncate text-[14px] font-medium text-muted-foreground">
              {work.title}
            </p>
            <p className="mt-1 text-[13px] font-medium text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"} ·{" "}
              {sentAt?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              {past ? " · Late" : ""}
            </p>
          </div>
        </div>
        <div
          className="at-anim flex flex-col gap-2 pb-8"
          style={{ animation: "at-rise 0.5s ease-out 0.4s both" }}
        >
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-14 w-full rounded-full bg-feature text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            Back to class
          </button>
          <button
            type="button"
            onClick={() => setPhase("edit")}
            className="h-12 w-full rounded-full text-[14px] font-bold text-muted-foreground transition-opacity active:opacity-60"
          >
            Unsubmit and edit
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-16">
      <div className="flex items-center justify-between px-6 pt-7">
        <BackButton onClick={() => router.history.back()} />
        {!closed && (<button type="button" disabled={!ready || phase === "sending"} onClick={() => void turnIn()} className="h-9 rounded-full bg-feature px-4 text-[13px] font-bold text-white transition-all active:scale-95 disabled:opacity-40">{phase === "sending" ? "Submitting…" : "Turn in"}</button>)}
      </div>
      <Header work={work} now={now} />
      <Facts items={facts} />
      <Instructions text={work.instructions} />
      <Reference files={work.attachments} />

      <section className="mt-8 px-6">
        <p className={label}>YOUR WORK</p>

        {closed ? (
          <p className="mt-3 rounded-2xl bg-surface p-4 text-[14px] font-medium text-muted-foreground">
            Submissions are closed. This {work.type.toLowerCase()} no longer accepts work.
          </p>
        ) : (
          <>
            <input
              ref={uploadRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <ul className="mt-3 grid grid-cols-4 gap-2">
              {METHODS.map(({ id, label: text, icon: Icon }) => {
                const active = panel === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onTile(id)}
                      className={`flex h-[78px] w-full flex-col items-center justify-center gap-2 rounded-2xl text-[12px] font-bold transition-all duration-300 active:scale-95 ${
                        active ? "bg-feature/10 text-feature" : "bg-surface text-foreground"
                      }`}
                    >
                      <Icon className="size-5" strokeWidth={2.1} />
                      {text}
                    </button>
                  </li>
                );
              })}
            </ul>

            <Collapse open={panel === "link"}>
              <div className="flex items-center gap-2">
                <input
                  ref={linkRef}
                  type="url"
                  inputMode="url"
                  aria-label="Link"
                  value={linkText}
                  onChange={(e) => {
                    setLinkText(e.target.value);
                    setLinkError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && addLink()}
                  placeholder="Paste a link"
                  autoComplete="off"
                  className="h-12 min-w-0 flex-1 rounded-[8px] bg-surface px-4 text-[15px] font-medium text-foreground outline-none transition-shadow placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-feature/30"
                />
                <button
                  type="button"
                  onClick={addLink}
                  disabled={!linkText.trim()}
                  className="h-12 shrink-0 rounded-full bg-feature px-5 text-[14px] font-bold text-white transition-all active:scale-95 disabled:bg-surface disabled:text-muted-foreground"
                >
                  Add
                </button>
              </div>
              <p className="mt-2 min-h-[16px] pl-1 text-[12px] font-medium text-red-500">
                {linkError}
              </p>
            </Collapse>

            <Collapse open={panel === "write"}>
              <textarea
                ref={noteRef}
                aria-label="Written answer"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type your answer"
                rows={5}
                className="block w-full resize-none rounded-[8px] bg-surface p-4 text-[15px] font-medium leading-relaxed text-foreground outline-none transition-shadow placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-feature/30"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={addNote}
                  disabled={!noteText.trim()}
                  className="h-11 rounded-full bg-feature px-5 text-[14px] font-bold text-white transition-all active:scale-95 disabled:bg-surface disabled:text-muted-foreground"
                >
                  Add note
                </button>
              </div>
            </Collapse>

            {items.length > 0 && (
              <ul className="mt-4 divide-y divide-border">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="at-anim flex items-center gap-3 py-3"
                    style={{ animation: "at-rise 0.3s ease-out both" }}
                  >
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface text-foreground">
                      <ItemIcon item={item} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-foreground">
                        {item.name}
                      </span>
                      <span className="block truncate text-[12px] font-medium text-muted-foreground">
                        {item.meta}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeItem(item.id)}
                      className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors active:bg-muted"
                    >
                      <X className="size-[18px]" strokeWidth={2.2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
          </>
        )}
      </section>
    </main>
  );
}

/* ---------- Quiz (multiple choice) ---------- */

type Stage = "brief" | "quiz" | "review" | "result" | "answers";

function Quiz({ work, now, onSubmit }: { work: Work; now: Date; onSubmit: (answers: Record<string, number>) => Promise<void> }) {
  const router = useRouter();
  const questions = work.questions;
  const n = questions.length;
  const timed = work.durationMin !== null;

  const [stage, setStage] = useState<Stage>("brief");
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [index, setIndex] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [shown, setShown] = useState(0);
  const [ringOn, setRingOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const touchX = useRef<number | null>(null);

  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === questions[i].correct).length;
  const perQuestion = work.points !== null ? work.points / n : null;
  const marks = perQuestion !== null ? Math.round(correct * perQuestion * 100) / 100 : null;

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : null;
  const inQuiz = stage === "quiz" || stage === "review";

  const finish = async (timeUp = false) => {
    if (submitting) return;
    setSubmitting(true);
    try { await onSubmit(Object.fromEntries(questions.map((question, index) => [question.id, answers[index] ?? -1]))); } catch (error) { alert(error instanceof Error ? error.message : "We couldn't submit your answers."); setSubmitting(false); return; }
    setEndsAt(null);
    setTimedOut(timeUp);
    setLeaving(false);
    setStage("result");
    setSubmitting(false);
  };

  const start = () => {
    if (timed && work.durationMin !== null) setEndsAt(Date.now() + work.durationMin * 60000);
    setIndex(0);
    setStage("quiz");
  };

  const go = (delta: number) => setIndex((i) => Math.max(0, Math.min(i + delta, n - 1)));

  const choose = (q: number, k: number) =>
    setAnswers((cur) => cur.map((a, i) => (i === q ? (a === k ? null : k) : a)));

  // Clock
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (remaining === 0 && inQuiz) void finish(true);
  }, [remaining, inQuiz]);

  // Arrow keys move between questions
  useEffect(() => {
    if (stage !== "quiz") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, n]);

  // Score count-up
  useEffect(() => {
    if (stage !== "result") return;
    setRingOn(true);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || correct === 0) {
      setShown(correct);
      return;
    }
    let raf = 0;
    const startAt = performance.now();
    const step = (t: number) => {
      const p = Math.min((t - startAt) / 900, 1);
      setShown(Math.round(correct * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [stage, correct]);

  const timerPill =
    remaining !== null ? (
      <span
        className={`flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-[12px] font-bold tabular-nums transition-colors duration-300 ${
          remaining <= 60 ? "text-red-500" : "text-foreground"
        }`}
      >
        <Clock className="size-3.5" strokeWidth={2.4} /> {clock(remaining)}
      </span>
    ) : null;

  const styles = (
    <style>{`
      @keyframes at-pop { 0% { transform: scale(.5); opacity: 0 } 70% { transform: scale(1.06); opacity: 1 } 100% { transform: scale(1) } }
      @keyframes at-rise { 0% { transform: translateY(12px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
      @media (prefers-reduced-motion: reduce) {
        .at-anim { animation: none !important; opacity: 1 !important; transform: none !important }
      }
    `}</style>
  );

  /* ----- Brief ----- */
  if (stage === "brief") {
    const facts = [
      { label: "QUESTIONS", value: String(n) },
      { label: "TIME", value: timed ? `${work.durationMin} min` : "No limit" },
      { label: "POINTS", value: work.points === null ? "Ungraded" : String(work.points) },
    ];
    const rules = [
      "Choose one answer for each question.",
      "You can change your answers until you submit.",
      timed
        ? "The timer starts when you press Start and cannot be paused."
        : "There is no time limit. Take your time.",
      work.showResults
        ? "You will see your score as soon as you submit."
        : "Your teacher will share the results.",
    ];
    return (
      <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-36">
        <div className="px-6 pt-7">
          <BackButton onClick={() => router.history.back()} />
        </div>
        <Header work={work} now={now} />
        <Facts items={facts} stack />
        <Instructions text={work.instructions} />
        <Reference files={work.attachments} />

        <section className="mt-8 px-6">
          <p className={label}>BEFORE YOU BEGIN</p>
          <ul className="mt-3 space-y-3">
            {rules.map((r) => (
              <li key={r} className="flex items-start gap-3 text-[14px] font-medium leading-snug text-foreground/90">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-feature/10 text-feature">
                  <Check className="size-3" strokeWidth={3.2} />
                </span>
                {r}
              </li>
            ))}
          </ul>
        </section>

        <BottomBar>
          <button
            type="button"
            onClick={start}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-feature text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            Start
            {timed && <span className="font-semibold text-white/75">· {work.durationMin} min</span>}
          </button>
        </BottomBar>
      </main>
    );
  }

  /* ----- Quiz ----- */
  if (stage === "quiz") {
    const last = index === n - 1;
    return (
      <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-36">
        {styles}
        <div className="flex items-center justify-between px-6 pt-7">
          <BackButton icon="close" onClick={() => setLeaving((l) => !l)} />
          <div className="flex items-center gap-2">{timerPill}<button type="button" onClick={() => setStage("review")} className="h-9 rounded-full bg-feature px-4 text-[13px] font-bold text-white transition-all active:scale-95 disabled:opacity-40">Submit</button></div>
        </div>

        <div
          className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out ${
            leaving ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mx-6 mt-3 rounded-2xl bg-surface p-4">
              <p className="text-[14px] font-bold text-foreground">Leave this quiz?</p>
              <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                Your answers will not be saved.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setLeaving(false)}
                  className="h-10 flex-1 rounded-full bg-background text-[13px] font-bold text-foreground transition-transform active:scale-95"
                >
                  Keep going
                </button>
                <button
                  type="button"
                  onClick={() => router.history.back()}
                  className="h-10 flex-1 rounded-full bg-red-500 text-[13px] font-bold text-white transition-transform active:scale-95"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>

        <ul className="mt-4 flex gap-1 px-6" aria-label="Question progress">
          {questions.map((q, i) => (
            <li key={q.id} className="flex-1">
              <button
                type="button"
                aria-label={`Go to question ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className="block w-full py-2"
              >
                <span
                  className={`block h-1 rounded-full transition-colors duration-300 ${
                    i === index ? "bg-feature" : answers[i] !== null ? "bg-feature/35" : "bg-surface"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>

        <div
          className="mt-6 overflow-hidden"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
          }}
        >
          <div
            className="flex items-start transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {questions.map((q, qi) => {
              const active = qi === index;
              return (
                <section
                  key={q.id}
                  aria-hidden={!active}
                  aria-label={`Question ${qi + 1} of ${n}`}
                  className="w-full shrink-0 px-6"
                >
                  <div className="flex items-center justify-between text-[12px] font-bold text-muted-foreground">
                    <span>
                      Question {qi + 1} of {n}
                    </span>
                    {perQuestion !== null && (
                      <span>
                        {Math.round(perQuestion * 100) / 100}{" "}
                        {perQuestion === 1 ? "point" : "points"}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-[22px] font-bold leading-snug tracking-tight text-foreground">
                    {q.text}
                  </h2>
                  <div role="radiogroup" aria-label={`Answers for question ${qi + 1}`} className="mt-6 space-y-2.5">
                    {q.options.map((opt, k) => {
                      const selected = answers[qi] === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          tabIndex={active ? 0 : -1}
                          onClick={() => choose(qi, k)}
                          className={`flex w-full items-center gap-4 rounded-2xl p-3 pr-5 text-left transition-all duration-300 active:scale-[0.99] ${
                            selected ? "bg-feature/10" : "bg-surface"
                          }`}
                        >
                          <span
                            className={`grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-bold transition-all duration-300 ${
                              selected ? "bg-feature text-white" : "bg-background text-muted-foreground"
                            }`}
                          >
                            {selected ? <Check className="size-[18px]" strokeWidth={3} /> : LETTERS[k]}
                          </span>
                          <span className="text-[16px] font-semibold leading-snug text-foreground">
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <BottomBar>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous question"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="grid size-14 shrink-0 place-items-center rounded-full bg-surface text-foreground transition-all active:scale-90 disabled:opacity-35"
            >
              <ChevronLeft className="size-6" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={() => (last ? setStage("review") : go(1))}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-feature text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
            >
              {last ? "Review answers" : "Next"}
              {!last && <ArrowRight className="size-[18px]" strokeWidth={2.4} />}
            </button>
          </div>
        </BottomBar>
      </main>
    );
  }

  /* ----- Review ----- */
  if (stage === "review") {
    const missing = n - answered;
    return (
      <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-16">
        {styles}
        <div className="flex items-center justify-between px-6 pt-7">
          <BackButton onClick={() => setStage("quiz")} />
          <div className="flex items-center gap-2">{timerPill}<button type="button" disabled={submitting} onClick={() => void finish(false)} className="h-9 rounded-full bg-feature px-4 text-[13px] font-bold text-white transition-all active:scale-95 disabled:opacity-40">Submit</button></div>
        </div>
        <header className="px-6 pt-5">
          <h1 className="text-[32px] font-extrabold leading-none tracking-tight text-foreground">
            Ready to submit?
          </h1>
          <p className="mt-2 text-[13px] font-medium text-muted-foreground">
            {answered} of {n} answered
          </p>
        </header>

        <ul className="mt-8 grid grid-cols-5 gap-2.5 px-6">
          {questions.map((q, i) => {
            const done = answers[i] !== null;
            return (
              <li key={q.id}>
                <button
                  type="button"
                  aria-label={`Question ${i + 1}, ${done ? "answered" : "not answered"}`}
                  onClick={() => {
                    setIndex(i);
                    setStage("quiz");
                  }}
                  className={`grid h-14 w-full place-items-center rounded-2xl text-[16px] font-bold transition-all duration-300 active:scale-95 ${
                    done
                      ? "bg-feature/10 text-feature"
                      : "border border-dashed border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 px-6 text-[12px] font-medium text-muted-foreground">
          Tap a number to go back to that question.
        </p>
      </main>
    );
  }

  /* ----- Result ----- */
  if (stage === "result") {
    const R = 70;
    const C = 2 * Math.PI * R;
    const pct = n ? correct / n : 0;
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-6">
        {styles}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {work.showResults ? (
            <>
              <div className="relative grid size-44 place-items-center">
                <svg viewBox="0 0 160 160" className="absolute inset-0 size-full -rotate-90" fill="none">
                  <circle cx="80" cy="80" r={R} strokeWidth="10" className="stroke-surface" />
                  <circle
                    cx="80"
                    cy="80"
                    r={R}
                    strokeWidth="10"
                    strokeLinecap="round"
                    className="stroke-feature"
                    style={{
                      strokeDasharray: C,
                      strokeDashoffset: ringOn ? C * (1 - pct) : C,
                      transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)",
                    }}
                  />
                </svg>
                <span className="relative">
                  <span className="text-[48px] font-extrabold leading-none tracking-tight text-foreground tabular-nums">
                    {shown}
                  </span>
                  <span className="text-[18px] font-bold text-muted-foreground"> / {n}</span>
                </span>
              </div>
              <div className="at-anim" style={{ animation: "at-rise 0.5s ease-out 0.3s both" }}>
                <h1 className="mt-8 text-[26px] font-extrabold tracking-tight text-foreground">
                  {timedOut ? "Time is up" : "Submitted"}
                </h1>
                <p className="mt-2 text-[14px] font-medium text-muted-foreground">
                  {correct} of {n} correct
                  {marks !== null && work.points !== null ? ` · ${marks} of ${work.points} points` : ""}
                </p>
              </div>
            </>
          ) : (
            <>
              <span
                className="at-anim grid size-20 place-items-center rounded-full bg-feature text-white"
                style={{ animation: "at-pop 0.5s cubic-bezier(.2,.9,.3,1.2) both" }}
              >
                <Check className="size-9" strokeWidth={3} />
              </span>
              <div className="at-anim" style={{ animation: "at-rise 0.5s ease-out 0.25s both" }}>
                <h1 className="mt-7 text-[28px] font-extrabold tracking-tight text-foreground">
                  {timedOut ? "Time is up" : "Submitted"}
                </h1>
                <p className="mx-auto mt-2 max-w-[17rem] text-[14px] font-medium text-muted-foreground">
                  {answered} of {n} answered. Your teacher will share the results.
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2 pb-8">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-14 w-full rounded-full bg-feature text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            Back to class
          </button>
          {work.showResults && (
            <button
              type="button"
              onClick={() => setStage("answers")}
              className="h-12 w-full rounded-full text-[14px] font-bold text-muted-foreground transition-opacity active:opacity-60"
            >
              See the answers
            </button>
          )}
        </div>
      </main>
    );
  }

  /* ----- Answers ----- */
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-16">
      {styles}
      <div className="px-6 pt-7">
        <BackButton onClick={() => setStage("result")} />
      </div>
      <header className="px-6 pt-5">
        <h1 className="text-[32px] font-extrabold leading-none tracking-tight text-foreground">
          Answers
        </h1>
        <p className="mt-2 text-[13px] font-medium text-muted-foreground">
          {correct} of {n} correct
        </p>
      </header>
      <ol className="mt-8 space-y-9 px-6">
        {questions.map((q, qi) => {
          const mine = answers[qi];
          return (
            <li key={q.id}>
              <p className="text-[12px] font-bold text-muted-foreground">Question {qi + 1}</p>
              <h2 className="mt-2 text-[18px] font-bold leading-snug tracking-tight text-foreground">
                {q.text}
              </h2>
              <ul className="mt-4 space-y-2">
                {q.options.map((opt, k) => {
                  const isRight = k === q.correct;
                  const isMine = k === mine;
                  const tone = isRight
                    ? "bg-feature/10"
                    : isMine
                      ? "bg-red-500/10"
                      : "bg-surface";
                  return (
                    <li key={k} className={`flex items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4 ${tone}`}>
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                          isRight
                            ? "bg-feature text-white"
                            : isMine
                              ? "bg-red-500 text-white"
                              : "bg-background text-muted-foreground"
                        }`}
                      >
                        {isRight ? (
                          <Check className="size-4" strokeWidth={3} />
                        ) : isMine ? (
                          <X className="size-4" strokeWidth={3} />
                        ) : (
                          LETTERS[k]
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-[14px] font-semibold text-foreground">
                        {opt}
                      </span>
                      {isMine && (
                        <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                          Your answer
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {mine === null && (
                <p className="mt-2 text-[12px] font-medium text-muted-foreground">Not answered</p>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}

/* ---------- Page ---------- */

function AttemptPage() {
  const { id, classId = "", workId } = Route.useSearch();
  const detailQuery = useWorkDetail(workId ?? id);
  const [now, setNow] = useState<Date | null>(null);

  // The clock is read on the client only, which avoids a server/client mismatch.
  useEffect(() => {
    setNow(new Date());
  }, []);

  const work = useMemo(() => {
    if (!now || !detailQuery.data) return null;
    const { work: item, attachments = [], questions = [] } = detailQuery.data;
    return { id: item.id, type: item.type.charAt(0).toUpperCase() + item.type.slice(1) as WorkType, className: "", title: item.title, instructions: item.instructions, due: new Date(item.due_at), points: item.points, allowLate: item.type !== "assessment", durationMin: item.duration_minutes, showResults: false, attachments: attachments.map((file: any) => ({ name: file.name, size: formatSize(file.size) })), questions: questions.map((question: any) => ({ ...question, correct: 0 })) };
  }, [detailQuery.data, now]);

  if (!now || !work) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md animate-pulse bg-background px-6 pt-7">
        <div className="size-9 rounded-full bg-surface" />
        <div className="mt-8 h-3 w-32 rounded bg-surface" />
        <div className="mt-4 h-9 w-3/4 rounded bg-surface" />
        <div className="mt-6 h-20 w-full rounded-2xl bg-surface" />
      </main>
    );
  }

  const style = (
    <style>{`
      @keyframes at-pop { 0% { transform: scale(.5); opacity: 0 } 70% { transform: scale(1.06); opacity: 1 } 100% { transform: scale(1) } }
      @keyframes at-rise { 0% { transform: translateY(12px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
      @media (prefers-reduced-motion: reduce) {
        .at-anim { animation: none !important; opacity: 1 !important; transform: none !important }
      }
    `}</style>
  );

  return (
    <>
      {style}
      {work.questions.length > 0 ? (
        <Quiz key={work.id} work={work} now={now} onSubmit={(answers) => submitWork({ workId: work.id, classId, body: JSON.stringify({ answers }), files: [] })} />
      ) : (
        <Submission key={work.id} work={work} now={now} onSubmit={(body, files) => submitWork({ workId: work.id, classId, body, files })} />
      )}
    </>
  );
}