import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, FileText, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";

export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  text: string;
  options: string[];
  correct: number;
  difficulty: Difficulty;
};

type Level = "easier" | "balanced" | "harder";
type Stage = "setup" | "generating" | "review";

/** Share of easy, medium and hard questions for each difficulty level. */
const LEVELS: Record<Level, { label: string; mix: [number, number, number] }> = {
  easier: { label: "Easier", mix: [60, 30, 10] },
  balanced: { label: "Balanced", mix: [30, 50, 20] },
  harder: { label: "Harder", mix: [10, 40, 50] },
};

const MAX_QUESTIONS = 20;
const COUNT_PRESETS = [5, 10, 15, 20];
const DEFAULT_COUNT = "10";
const LETTERS = ["A", "B", "C", "D"];
const ALLOWED = ["pdf", "doc", "docx", "ppt", "pptx", "txt"];
const ACCEPT = ALLOWED.map((e) => `.${e}`).join(",");
const TIER_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const TIER_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

const hideScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/* ---------- Sample questions ----------
   These stand in for the AI while the real service is not connected.
   Delete this block once generate() calls your backend. */
const SAMPLE_POOL: Question[] = [
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
    id: "s3",
    difficulty: "easy",
    text: "Which of these is a vector quantity?",
    options: ["Mass", "Speed", "Time", "Velocity"],
    correct: 3,
  },
  {
    id: "s4",
    difficulty: "easy",
    text: "The moment of a force about a point equals the force multiplied by what?",
    options: [
      "The perpendicular distance to the point",
      "The mass of the body",
      "The time the force acts",
      "The angle of the force",
    ],
    correct: 0,
  },
  {
    id: "s5",
    difficulty: "medium",
    text: "A 10 N force acts at a perpendicular distance of 0.5 m from a point. What is its moment about that point?",
    options: ["5 N·m", "20 N·m", "0.05 N·m", "10.5 N·m"],
    correct: 0,
  },
  {
    id: "s6",
    difficulty: "medium",
    text: "Which set of conditions must hold for a rigid body in equilibrium under coplanar forces?",
    options: [
      "ΣFx = 0 and ΣFy = 0 only",
      "ΣFx = 0, ΣFy = 0 and ΣM = 0",
      "ΣM = 0 only",
      "ΣFx = ΣFy",
    ],
    correct: 1,
  },
  {
    id: "s7",
    difficulty: "medium",
    text: "The coefficient of friction is the ratio of limiting friction to what?",
    options: [
      "The weight of the surface",
      "The applied force",
      "The normal reaction",
      "The area of contact",
    ],
    correct: 2,
  },
  {
    id: "s8",
    difficulty: "medium",
    text: "The centroid of a triangle lies at what distance from its base?",
    options: [
      "One half of its height",
      "One third of its height",
      "Two thirds of its height",
      "One quarter of its height",
    ],
    correct: 1,
  },
  {
    id: "s9",
    difficulty: "medium",
    text: "A car accelerates uniformly from rest to 20 m/s in 5 s. What is its acceleration?",
    options: ["4 m/s²", "100 m/s²", "0.25 m/s²", "15 m/s²"],
    correct: 0,
  },
  {
    id: "s10",
    difficulty: "medium",
    text: "Two forces of 30 N and 40 N act at a point at 90° to each other. What is the magnitude of the resultant?",
    options: ["70 N", "10 N", "50 N", "35 N"],
    correct: 2,
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
  {
    id: "s13",
    difficulty: "hard",
    text: "A 20 kg block slides down a smooth 30° incline. Taking g = 9.81 m/s², what is its acceleration?",
    options: ["9.81 m/s²", "4.9 m/s²", "8.5 m/s²", "2.5 m/s²"],
    correct: 1,
  },
];

function pickQuestions(count: number, mix: [number, number, number]): Question[] {
  const n = Math.min(count, SAMPLE_POOL.length);
  const wantEasy = Math.round((n * mix[0]) / 100);
  const wantHard = Math.round((n * mix[2]) / 100);
  const wantMedium = Math.max(n - wantEasy - wantHard, 0);

  const tiers: Record<Difficulty, Question[]> = {
    easy: SAMPLE_POOL.filter((q) => q.difficulty === "easy"),
    medium: SAMPLE_POOL.filter((q) => q.difficulty === "medium"),
    hard: SAMPLE_POOL.filter((q) => q.difficulty === "hard"),
  };

  const chosen: Question[] = [
    ...tiers.easy.splice(0, wantEasy),
    ...tiers.medium.splice(0, wantMedium),
    ...tiers.hard.splice(0, wantHard),
  ];
  // If a tier ran short, fill the gap from whatever is left.
  for (const tier of ["medium", "easy", "hard"] as Difficulty[]) {
    while (chosen.length < n && tiers[tier].length > 0) chosen.push(tiers[tier].shift()!);
  }

  return chosen
    .sort((a, b) => TIER_ORDER[a.difficulty] - TIER_ORDER[b.difficulty])
    .map((q) => ({ ...q, options: [...q.options] }));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");
const extLabel = (name: string) => {
  const e = extOf(name);
  return e === "docx" ? "DOC" : e === "pptx" ? "PPT" : e.toUpperCase().slice(0, 3);
};
const isDocument = (f: File) => ALLOWED.includes(extOf(f.name));

/** A small sheet of paper. With `stacked` it sits on two more sheets, with `label` it shows a file type. */
function Paper({
  label,
  stacked = false,
  plus = false,
  lifted = false,
}: {
  label?: string;
  stacked?: boolean;
  plus?: boolean;
  lifted?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative block h-[60px] w-[46px] shrink-0 transition-transform duration-300 ease-out ${
        lifted ? "-translate-y-1.5 scale-105" : ""
      }`}
    >
      {stacked && (
        <>
          <span className="absolute inset-0 -rotate-6 rounded-[6px] bg-surface ring-1 ring-border" />
          <span className="absolute inset-0 rotate-[5deg] rounded-[6px] bg-surface ring-1 ring-border" />
        </>
      )}
      <svg viewBox="0 0 46 60" className="absolute inset-0 size-full" fill="none">
        <path
          d="M6 1h24l15 15v38a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5V6a5 5 0 0 1 5-5z"
          className="fill-background stroke-border"
          strokeWidth="1.2"
        />
        <path
          d="M30 1v10a5 5 0 0 0 5 5h10"
          className="fill-surface stroke-border"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {!label && (
          <path
            d="M10 28h26M10 35h26M10 42h16"
            className="stroke-muted-foreground/30"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}
      </svg>
      {label && (
        <span className="absolute inset-x-0 bottom-3.5 text-center text-[10px] font-extrabold tracking-wide text-feature">
          {label}
        </span>
      )}
      {plus && (
        <span className="absolute -bottom-1.5 -right-2 grid size-6 place-items-center rounded-full bg-feature text-white ring-2 ring-background">
          <Plus className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-9 text-[11px] font-bold tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      aria-label={label}
      rows={2}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="block w-full resize-none bg-transparent text-[20px] font-bold leading-snug tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
    />
  );
}

export default function QuestionBuilder({
  initial,
  files,
  onClose,
}: {
  initial: Question[];
  files: File[];
  onClose: (questions: Question[]) => void;
}) {
  const [stage, setStage] = useState<Stage>(initial.length > 0 ? "review" : "setup");
  const [drafts, setDrafts] = useState<Question[]>(initial);

  const [source, setSource] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [focus, setFocus] = useState("");
  const [level, setLevel] = useState<Level>("balanced");
  const [countText, setCountText] = useState(DEFAULT_COUNT);

  const [phase, setPhase] = useState(0);
  const [active, setActive] = useState(0);
  const [attempted, setAttempted] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const count = parseInt(countText, 10);
  const countValid = Number.isFinite(count) && count >= 1;
  const mix = LEVELS[level].mix;
  const levelIndex = (Object.keys(LEVELS) as Level[]).indexOf(level);

  // The pad behind the number presets keeps its last position while a custom number is typed.
  const presetIndex = COUNT_PRESETS.findIndex((p) => String(p) === countText);
  const [lastPreset, setLastPreset] = useState(
    Math.max(COUNT_PRESETS.indexOf(Number(DEFAULT_COUNT)), 0),
  );
  useEffect(() => {
    if (presetIndex >= 0) setLastPreset(presetIndex);
  }, [presetIndex]);

  const onCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 2);
    setCountText(Number(digits) > MAX_QUESTIONS ? String(MAX_QUESTIONS) : digits);
  };

  const acceptFile = (f: File) => {
    if (!isDocument(f)) {
      setFileError("Use a PDF, Word, PowerPoint or text file.");
      return;
    }
    setFileError("");
    setSource(f);
  };

  const onPickSource = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) acceptFile(picked);
    e.target.value = "";
  };

  /* ----- Generate ----- */
  const generate = () => {
    if (!source || !countValid) return;
    clearTimers();
    setPhase(0);
    setStage("generating");

    // Replace this block with your AI call. Send `source`, `focus`, `mix` and `count`,
    // then call setDrafts(...) with the Question[] that comes back and setStage("review").
    timers.current = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => {
        setDrafts(pickQuestions(count, mix));
        setActive(0);
        setAttempted(false);
        setStage("review");
      }, 3000),
    ];
  };

  /* ----- Editing ----- */
  const updateQuestion = (i: number, patch: Partial<Question>) =>
    setDrafts((cur) => cur.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const updateOption = (i: number, o: number, value: string) =>
    setDrafts((cur) =>
      cur.map((q, idx) =>
        idx === i ? { ...q, options: q.options.map((x, k) => (k === o ? value : x)) } : q,
      ),
    );

  const removeQuestion = (i: number) => setDrafts((cur) => cur.filter((_, idx) => idx !== i));

  const hasSpare = SAMPLE_POOL.some((q) => !drafts.some((d) => d.id === q.id));

  const replaceQuestion = (i: number) => {
    const current = drafts[i];
    if (!current) return;
    const spare = SAMPLE_POOL.filter((q) => !drafts.some((d) => d.id === q.id));
    const next = spare.find((q) => q.difficulty === current.difficulty) ?? spare[0];
    if (!next) return;
    setDrafts((cur) =>
      cur.map((q, idx) => (idx === i ? { ...next, options: [...next.options] } : q)),
    );
  };

  /* ----- Carousel ----- */
  const goTo = (i: number, smooth = true) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.max(0, Math.min(i, drafts.length - 1)));
  };

  // Keep the position valid when the last cards are removed.
  useEffect(() => {
    const max = Math.max(drafts.length - 1, 0);
    if (active > max) {
      setActive(max);
      goTo(max, false);
    }
  }, [drafts.length]);

  /* ----- Finish ----- */
  const firstIssue = drafts.findIndex((q) => !q.text.trim() || q.options.some((o) => !o.trim()));

  const done = () => {
    if (firstIssue >= 0) {
      setAttempted(true);
      goTo(firstIssue);
      return;
    }
    onClose(
      drafts.map((q) => ({
        ...q,
        text: q.text.trim(),
        options: q.options.map((o) => o.trim()),
      })),
    );
  };

  const close = () => {
    clearTimers();
    onClose(drafts);
  };

  const onBack = () => (stage === "review" ? done() : close());

  const styles = (
    <style>{`
      @keyframes qb-pulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.1) } }
      @keyframes qb-ring { 0% { transform: scale(.7); opacity: .45 } 100% { transform: scale(1.6); opacity: 0 } }
      @keyframes qb-bar { 0% { width: 0 } 100% { width: 100% } }
      @keyframes qb-drop { 0% { transform: translateY(-10px) scale(.9); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
      @keyframes qb-rise { 0% { transform: translateY(12px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
      @media (prefers-reduced-motion: reduce) {
        .qb-anim { animation: none !important; opacity: 1 !important; transform: none !important }
      }
    `}</style>
  );

  const backButton = (
    <button
      type="button"
      aria-label="Back"
      onClick={onBack}
      className="-ml-1 grid size-9 place-items-center rounded-full text-foreground transition-colors active:bg-muted"
    >
      <ArrowLeft className="size-[22px]" strokeWidth={2.2} />
    </button>
  );

  /* ---------- Generating ---------- */
  if (stage === "generating") {
    const steps = [
      `Reading ${source?.name ?? "your document"}`,
      "Finding the key ideas",
      `Writing ${count} ${count === 1 ? "question" : "questions"}`,
    ];
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-6">
        {styles}
        <div className="pt-7">{backButton}</div>
        <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <div className="relative grid size-24 place-items-center">
            <span
              className="qb-anim absolute inset-0 rounded-full bg-feature/25"
              style={{ animation: "qb-ring 1.6s ease-out infinite" }}
            />
            <span
              className="qb-anim relative grid size-20 place-items-center rounded-full bg-feature text-white"
              style={{ animation: "qb-pulse 1.6s ease-in-out infinite" }}
            >
              <Sparkles className="size-8" strokeWidth={2.2} />
            </span>
          </div>
          <h1 className="mt-8 text-[24px] font-extrabold tracking-tight text-foreground">
            Writing your questions
          </h1>
          <ul role="status" className="mt-6 w-full max-w-[17rem] space-y-3 text-left">
            {steps.map((s, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 text-[14px] font-semibold transition-colors duration-500 ${
                  i <= phase ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                <span className="grid size-5 shrink-0 place-items-center">
                  {i < phase ? (
                    <Check className="size-4 text-feature" strokeWidth={3} />
                  ) : (
                    <span
                      className={`size-2 rounded-full ${i === phase ? "bg-feature" : "bg-border"}`}
                    />
                  )}
                </span>
                <span className="truncate">{s}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-surface">
            <span
              className="qb-anim block h-full rounded-full bg-feature"
              style={{ animation: "qb-bar 3s linear forwards" }}
            />
          </div>
        </div>
      </main>
    );
  }

  /* ---------- Review ---------- */
  if (stage === "review") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-16">
        {styles}
        <div className="flex items-center justify-between px-6 pt-7">
          {backButton}
          {drafts.length > 0 && (
            <span className="rounded-full bg-surface px-3.5 py-1.5 text-[11px] font-bold text-muted-foreground">
              {active + 1} / {drafts.length}
            </span>
          )}
        </div>

        <header className="px-6 pt-5">
          <h1 className="text-[32px] font-extrabold leading-none tracking-tight text-foreground">
            Review
          </h1>
          <p className="mt-2 text-[13px] font-medium text-muted-foreground">
            {drafts.length === 0
              ? "No questions yet"
              : `${drafts.length} ${drafts.length === 1 ? "question" : "questions"} · swipe to browse`}
          </p>
        </header>

        {drafts.length === 0 ? (
          <div className="px-6 pt-16 text-center">
            <p className="text-[15px] font-semibold text-muted-foreground">
              Every question was removed.
            </p>
            <button
              type="button"
              onClick={() => setStage("setup")}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-feature px-6 text-[14px] font-bold text-white transition-transform active:scale-[0.98]"
            >
              <Sparkles className="size-4" strokeWidth={2.2} />
              Generate questions
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-5 flex gap-1 px-6" aria-label="Question progress">
              {drafts.map((q, i) => (
                <li key={q.id} className="flex-1">
                  <button
                    type="button"
                    aria-label={`Go to question ${i + 1}`}
                    aria-current={i === active}
                    onClick={() => goTo(i)}
                    className="block w-full py-2"
                  >
                    <span
                      className={`block h-1 rounded-full transition-colors duration-300 ${
                        i === active ? "bg-feature" : "bg-surface"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>

            <div
              ref={trackRef}
              onScroll={onScroll}
              className={`mt-5 flex snap-x snap-mandatory items-start overflow-x-auto ${hideScrollbar}`}
            >
              {drafts.map((q, i) => (
                <section
                  key={q.id}
                  aria-label={`Question ${i + 1} of ${drafts.length}`}
                  className="w-full shrink-0 snap-center px-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-foreground">
                        Question {i + 1}
                      </span>
                      <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                        {TIER_LABEL[q.difficulty]}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Replace this question"
                        disabled={!hasSpare}
                        onClick={() => replaceQuestion(i)}
                        className="grid size-9 place-items-center rounded-full text-muted-foreground transition-all active:scale-90 active:bg-muted disabled:opacity-30"
                      >
                        <RefreshCw className="size-[18px]" strokeWidth={2.2} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove this question"
                        onClick={() => removeQuestion(i)}
                        className="grid size-9 place-items-center rounded-full text-muted-foreground transition-all active:scale-90 active:bg-muted"
                      >
                        <Trash2 className="size-[18px]" strokeWidth={2.2} />
                      </button>
                    </span>
                  </div>

                  <div className="mt-4">
                    <AutoTextarea
                      label={`Question ${i + 1} text`}
                      value={q.text}
                      onChange={(v) => updateQuestion(i, { text: v })}
                      placeholder="Type the question"
                    />
                  </div>

                  <ul className="mt-5 space-y-2">
                    {q.options.map((opt, k) => {
                      const correct = q.correct === k;
                      return (
                        <li
                          key={k}
                          className={`flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4 transition-colors duration-300 ${
                            correct ? "bg-feature/10" : "bg-surface"
                          }`}
                        >
                          <button
                            type="button"
                            aria-pressed={correct}
                            aria-label={`Mark option ${LETTERS[k]} as the correct answer`}
                            onClick={() => updateQuestion(i, { correct: k })}
                            className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold transition-all duration-300 active:scale-90 ${
                              correct
                                ? "bg-feature text-white"
                                : "bg-background text-muted-foreground"
                            }`}
                          >
                            {correct ? (
                              <Check className="size-4" strokeWidth={3} />
                            ) : (
                              LETTERS[k]
                            )}
                          </button>
                          <input
                            aria-label={`Option ${LETTERS[k]}`}
                            value={opt}
                            onChange={(e) => updateOption(i, k, e.target.value)}
                            placeholder={`Option ${LETTERS[k]}`}
                            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            <p className="mt-4 px-6 text-center text-[12px] font-medium text-muted-foreground">
              Tap a letter to set the correct answer
            </p>

            <div className="mt-8 px-6">
              <button
                type="button"
                onClick={done}
                className="h-14 w-full rounded-full bg-feature text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
              >
                Done
              </button>
              <p className="mt-3 min-h-[18px] text-center text-[12px] font-medium text-red-500">
                {attempted && firstIssue >= 0
                  ? `Question ${firstIssue + 1} needs a question and four options.`
                  : ""}
              </p>
              <button
                type="button"
                onClick={() => setStage("setup")}
                className="mt-1 h-11 w-full rounded-full text-[14px] font-bold text-muted-foreground transition-opacity active:opacity-60"
              >
                Make a new set
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  /* ---------- Setup ---------- */
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-16">
      {styles}
      <div className="flex items-center justify-between px-6 pt-7">
        {backButton}
        <button
          type="button"
          onClick={generate}
          disabled={!source || !countValid}
          className={`h-10 rounded-full px-5 text-[14px] font-bold transition-all duration-300 active:scale-95 ${
            source && countValid ? "bg-feature text-white" : "bg-surface text-muted-foreground"
          }`}
        >
          Generate
        </button>
      </div>

      <header className="px-6 pt-5">
        <h1 className="text-[32px] font-extrabold leading-none tracking-tight text-foreground">
          Questions
        </h1>
        <p className="mt-2 text-[13px] font-medium text-muted-foreground">
          Multiple choice · drafted from your document, approved by you
        </p>
      </header>

      <div className="px-6">
        {/* Source */}
        <Label>SOURCE DOCUMENT</Label>
        <input ref={fileRef} type="file" accept={ACCEPT} onChange={onPickSource} className="hidden" />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) acceptFile(dropped);
          }}
        >
          {source ? (
            <div
              className={`qb-anim mt-3 flex items-center gap-4 rounded-[7px] p-4 transition-colors duration-300 ${
                dragging ? "bg-feature/10" : "bg-surface"
              }`}
              style={{ animation: "qb-rise 0.3s ease-out both" }}
            >
              <span
                className="qb-anim"
                style={{ animation: "qb-drop 0.45s cubic-bezier(.2,.9,.3,1.2) both" }}
              >
                <Paper label={extLabel(source.name)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-foreground">
                  {source.name}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                  <Check className="size-3.5 shrink-0 text-feature" strokeWidth={3} />
                  Ready · {formatSize(source.size)}
                </span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 text-[12px] font-bold text-feature transition-opacity active:opacity-60"
                >
                  Change
                </button>
              </span>
              <button
                type="button"
                aria-label="Remove document"
                onClick={() => setSource(null)}
                className="grid size-9 shrink-0 place-items-center rounded-[7px] text-muted-foreground transition-colors active:bg-muted"
              >
                <X className="size-[18px]" strokeWidth={2.2} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`mt-3 flex w-full items-center gap-5 rounded-[7px] border border-dashed p-5 text-left transition-all duration-300 active:scale-[0.99] ${
                dragging ? "border-feature bg-feature/5" : "border-border active:bg-surface"
              }`}
            >
              <Paper stacked plus lifted={dragging} />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-bold text-foreground">
                  {dragging ? "Drop it here" : "Choose a document"}
                </span>
                <span className="mt-1 block text-[12px] font-medium text-muted-foreground">
                  PDF, Word, PowerPoint or text
                </span>
              </span>
            </button>
          )}
        </div>

        <p role="alert" className="mt-2 min-h-[16px] text-[12px] font-medium text-red-500">
          {fileError}
        </p>

        {!source && files.some(isDocument) && (
          <div className="mt-2">
            <p className="text-[12px] font-medium text-muted-foreground">
              Or use one of your attachments
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {files.filter(isDocument).map((f, i) => (
                <li key={`${f.name}-${f.size}-${i}`} className="max-w-full">
                  <button
                    type="button"
                    onClick={() => acceptFile(f)}
                    className="flex max-w-full items-center gap-2 rounded-[7px] bg-surface px-3.5 py-2 text-[12px] font-bold text-foreground transition-transform active:scale-95"
                  >
                    <FileText className="size-3.5 shrink-0 text-feature" strokeWidth={2.2} />
                    <span className="truncate">{f.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Focus */}
        <Label>FOCUS (OPTIONAL)</Label>
        <input
          aria-label="Focus topic"
          value={focus}
          onChange={(e) => setFocus(e.target.value.slice(0, 120))}
          placeholder="e.g. Chapter 3, friction and equilibrium"
          autoComplete="off"
          className="mt-3 h-14 w-full rounded-[7px] bg-surface px-5 text-[15px] font-medium text-foreground outline-none transition-shadow placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-feature/30"
        />

        {/* Difficulty */}
        <Label>DIFFICULTY</Label>
        <div
          role="group"
          aria-label="Difficulty"
          className="relative mt-3 grid grid-cols-3 rounded-full bg-surface p-1"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-background shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(${levelIndex * 100}%)` }}
          />
          {(Object.keys(LEVELS) as Level[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={level === key}
              onClick={() => setLevel(key)}
              className={`relative z-10 h-10 rounded-full text-[13px] font-bold transition-colors duration-300 ${
                level === key ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {LEVELS[key].label}
            </button>
          ))}
        </div>
        <div className="mt-5 flex h-2.5 w-full gap-1 overflow-hidden rounded-full" aria-hidden="true">
          <span
            className="h-full rounded-full bg-feature/25 transition-[width] duration-500 ease-out"
            style={{ width: `${mix[0]}%` }}
          />
          <span
            className="h-full rounded-full bg-feature/55 transition-[width] duration-500 ease-out"
            style={{ width: `${mix[1]}%` }}
          />
          <span
            className="h-full rounded-full bg-feature transition-[width] duration-500 ease-out"
            style={{ width: `${mix[2]}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-[12px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-feature/25" /> Easy {mix[0]}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-feature/55" /> Medium {mix[1]}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-feature" /> Hard {mix[2]}%
          </span>
        </div>

        {/* Count */}
        <Label>HOW MANY</Label>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1.5 pl-1">
            <input
              aria-label="Number of questions"
              inputMode="numeric"
              pattern="[0-9]*"
              value={countText}
              onChange={onCountChange}
              onBlur={() => !countValid && setCountText(DEFAULT_COUNT)}
              placeholder="0"
              style={{ width: `${Math.max(countText.length, 1) + 0.6}ch` }}
              className="bg-transparent text-[36px] font-extrabold leading-none tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30"
            />
            <span className="text-[14px] font-bold text-muted-foreground">questions</span>
          </div>
          <div
            role="group"
            aria-label="Quick pick"
            className="relative flex shrink-0 rounded-full bg-surface p-1"
          >
            <span
              aria-hidden="true"
              className="absolute left-1 top-1 h-9 w-9 rounded-full bg-background shadow-sm transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none"
              style={{
                transform: `translateX(${(presetIndex >= 0 ? presetIndex : lastPreset) * 100}%)`,
                opacity: presetIndex >= 0 ? 1 : 0,
              }}
            />
            {COUNT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={countText === String(p)}
                onClick={() => setCountText(String(p))}
                className={`relative z-10 h-9 w-9 rounded-full text-[12px] font-bold transition-colors duration-300 ${
                  countText === String(p) ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-[12px] font-medium text-muted-foreground">
          You review and edit every question before it is shared.
        </p>
      </div>
    </main>
  );
}