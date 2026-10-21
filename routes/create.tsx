import { useState, useRef, useEffect } from "react";
import { useRouter, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Copy, Share2, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { createClass, updateClass, useClassOverview } from "@/lib/classes";
import { profileFromUser, useAuth } from "@/lib/auth";

// ── Design tokens ────────────────────────────────────────────────────────
// Cool paper-white surface, near-black warm-charcoal ink, violet brand accent.
// Cover-color options are named after literal chalk colors, a deliberate
// callback to ConvoSpace's existing chalk-gradient logo mark.
const tokens = {
  bg: "#F6F6F9",
  surface: "#FFFFFF",
  ink: "#17161C",
  inkMuted: "#8A8894",
  inkFaint: "#B7B4C0",
  accent: "#6C63FF",
  accentDeep: "#4B41E0",
  accentTint: "#EEECFF",
  border: "#E5E4EB",
  error: "#D6455B",
};

const chalkColors = [
  { name: "Violet", hex: "#6C63FF" },
  { name: "Chalkboard green", hex: "#2E8B74" },
  { name: "Chalk amber", hex: "#E0A63A" },
  { name: "Chalk coral", hex: "#D9707A" },
  { name: "Chalk blue", hex: "#4C8BF5" },
  { name: "Slate", hex: "#6B7A8F" },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CreateClass() {
  const router = useRouter();
  const { user } = useAuth();
  const { classId } = Route.useSearch();
  const overviewQuery = useClassOverview(classId);
  const editing = Boolean(classId);
  const goBack = () => router.history.back();

  const [step, setStep] = useState("form"); // 'form' | 'success'
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [createdClassId, setCreatedClassId] = useState("");
  const [copyState, setCopyState] = useState("idle"); // idle | copied

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState(chalkColors[0].hex);
  const [description, setDescription] = useState("");
  const [selectedDays, setSelectedDays] = useState<Array<"Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun">>(["Mon", "Thu"]);
  const [time, setTime] = useState("10:00");
  const [skipSchedule, setSkipSchedule] = useState(false);
  const [department, setDepartment] = useState("");

  const [touched, setTouched] = useState({ name: false, code: false });

  const nameRef = useRef(null);

  useEffect(() => {
    const overview = overviewQuery.data;
    if (!editing || !overview || overview.myRole !== "teacher") return;
    setName(overview.name); setCode(overview.courseCode); setColor(overview.color); setDescription(overview.description ?? ""); setDepartment(overview.department ?? ""); setSelectedDays((overview.scheduleDays ?? ["Mon", "Thu"]) as Array<"Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun">); setTime(overview.scheduleTime ?? "10:00"); setSkipSchedule(!overview.scheduleDays);
  }, [editing, overviewQuery.data]);

  const nameError = touched.name && name.trim().length === 0;
  const codeError = touched.code && code.trim().length === 0;
  const canSubmit = name.trim().length > 0 && code.trim().length > 0 && !loading;

  const toggleDay = (d) => {
    setSelectedDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleCreate = async () => {
    setTouched({ name: true, code: true });
    if (name.trim().length === 0 || code.trim().length === 0 || loading) return;
    setLoading(true);
    try {
      const input = {
        name,
        courseCode: code,
        color,
        description: description.trim() || null,
        department: department.trim() || null,
        scheduleDays: skipSchedule ? null : selectedDays,
        scheduleTime: skipSchedule ? null : time,
        displayName: profileFromUser(user).name || null,
      };
      if (editing && classId) {
        await updateClass(classId, input);
        toast.success("Class updated");
        router.navigate({ to: "/class", search: { classId } });
        return;
      }
      const result = await createClass(input);
      setJoinCode(`${result.joinCode.slice(0, 4)}-${result.joinCode.slice(4)}`);
      setCreatedClassId(result.id);
      setLoading(false);
      setStep("success");
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : "We couldn't create your class. Please try again.");
    }
  };

  const resetAll = () => {
    setStep("form");
    setLoading(false);
    setJoinCode("");
    setCreatedClassId("");
    setCopyState("idle");
    setName("");
    setCode("");
    setColor(chalkColors[0].hex);
    setDescription("");
    setSelectedDays(["Mon", "Thu"]);
    setTime("10:00");
    setSkipSchedule(false);
    setDepartment("");
    setTouched({ name: false, code: false });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
    } catch (e) {
      /* clipboard may be unavailable in this preview — state still updates */
    }
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1600);
  };

  const handleShare = async () => {
    const text = `Join ${name || "my class"} on ConvoSpace with code ${joinCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (e) {
        /* user cancelled share sheet — no action needed */
      }
    } else {
      handleCopy();
    }
  };

  useEffect(() => {
    if (step === "form" && nameRef.current) nameRef.current.focus();
  }, [step]);

  return (
    <div
      style={{ background: tokens.bg, fontFamily: "'Manrope', sans-serif", color: tokens.ink }}
      className="min-h-screen flex items-start justify-center p-0 sm:p-6"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .cc-display { font-family: 'Fraunces', serif; }
        .cc-mono { font-family: 'IBM Plex Mono', monospace; }

        .cc-fade-in { animation: ccFadeIn 0.5s ease both; }
        .cc-fade-in-delay { animation: ccFadeIn 0.5s ease 0.1s both; }
        .cc-code-in { animation: ccCodeIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .cc-chalk-draw { animation: ccChalkDraw 0.9s ease 0.35s both; }

        @keyframes ccFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ccCodeIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ccChalkDraw {
          from { stroke-dashoffset: 340; opacity: 0; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cc-fade-in, .cc-fade-in-delay, .cc-code-in, .cc-chalk-draw {
            animation: none !important;
          }
        }

        .cc-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'Manrope', sans-serif;
          color: ${tokens.ink};
        }
        .cc-input::placeholder { color: ${tokens.inkFaint}; }
      `}</style>

      <div
        className="w-full sm:max-w-md sm:mt-6 sm:mb-6 sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: tokens.bg,
          minHeight: "100vh",
          boxShadow: "0 1px 3px rgba(23,22,28,0.04)",
        }}
      >
        {step === "form" ? (
          <FormStep
            {...{
              name, setName, code, setCode, color, setColor, description, setDescription,
              selectedDays, toggleDay, time, setTime, skipSchedule, setSkipSchedule,
              department, setDepartment, nameError, codeError, touched, setTouched,
              canSubmit, loading, handleCreate, nameRef, resetAll, goBack,
            }}
          />
        ) : (
          <SuccessStep
            {...{ name, joinCode, copyState, handleCopy, handleShare, resetAll, goBack, createdClassId }}
          />
        )}
      </div>
    </div>
  );
}

// ── Step 1: Form ─────────────────────────────────────────────────────────

function FormStep({
  name, setName, code, setCode, color, setColor, description, setDescription,
  selectedDays, toggleDay, time, setTime, skipSchedule, setSkipSchedule,
  department, setDepartment, nameError, codeError, touched, setTouched,
  canSubmit, loading, handleCreate, nameRef, resetAll, goBack,
}) {
  return (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-6 pb-4 sticky top-0 z-10"
        style={{ background: tokens.bg }}
      >
        <button
          onClick={goBack}
          aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: tokens.inkMuted }} />
        </button>

        <button
          onClick={handleCreate}
          disabled={!canSubmit}
          className="px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
          style={{
            background: canSubmit ? tokens.accent : tokens.border,
            color: canSubmit ? "#FFFFFF" : tokens.inkFaint,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Creating…" : "Create"}
        </button>
      </div>

      <div className="px-5 pb-10 flex-1 overflow-y-auto cc-fade-in">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: tokens.inkMuted, letterSpacing: "0.14em" }}
        >
          New class
        </p>
        <h1 className="cc-display text-3xl leading-tight mb-7" style={{ fontWeight: 500 }}>
          Give your class a name
        </h1>

        {/* Class name — the title field */}
        <div className="mb-7">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="e.g. Fluid Mechanics II"
            className="cc-input cc-display text-2xl pb-2"
            style={{
              borderBottom: `2px solid ${nameError ? tokens.error : tokens.ink}`,
              fontWeight: 500,
            }}
          />
          {nameError && (
            <p className="text-xs mt-2" style={{ color: tokens.error }}>
              Give this class a name before continuing.
            </p>
          )}
        </div>

        {/* Class code */}
        <Field label="Class code">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, code: true }))}
            placeholder="AEE 302"
            className="cc-input cc-mono text-base py-3 px-4 rounded-2xl"
            style={{
              background: tokens.surface,
              border: `1px solid ${codeError ? tokens.error : tokens.border}`,
            }}
          />
          <p className="text-xs mt-2" style={{ color: tokens.inkMuted }}>
            {codeError ? (
              <span style={{ color: tokens.error }}>A class code is required.</span>
            ) : (
              "Students will see this alongside the class name."
            )}
          </p>
        </Field>

        {/* Cover color */}
        <Field label="Cover color">
          <div className="flex items-center gap-3 pt-1">
            {chalkColors.map((c) => {
              const selected = color === c.hex;
              return (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  aria-label={c.name}
                  aria-pressed={selected}
                  className="rounded-full transition-transform active:scale-90"
                  style={{
                    width: 34,
                    height: 34,
                    background: c.hex,
                    boxShadow: selected
                      ? `0 0 0 2px ${tokens.bg}, 0 0 0 4px ${c.hex}`
                      : "0 0 0 2px transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected && <Check className="w-4 h-4" style={{ color: "#FFFFFF" }} />}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Description */}
        <Field label="Description" optional>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will students learn in this class?"
            rows={3}
            className="cc-input text-sm py-3 px-4 rounded-2xl resize-none"
            style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}
          />
        </Field>

        {/* Schedule */}
        <Field label="Schedule">
          <div
            className="flex flex-wrap gap-2 mb-3"
            style={{ opacity: skipSchedule ? 0.4 : 1, pointerEvents: skipSchedule ? "none" : "auto" }}
          >
            {days.map((d) => {
              const active = selectedDays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className="px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: active ? tokens.accentTint : tokens.surface,
                    color: active ? tokens.accentDeep : tokens.inkMuted,
                    border: `1px solid ${active ? tokens.accent : tokens.border}`,
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-2 mb-3"
            style={{ opacity: skipSchedule ? 0.4 : 1, pointerEvents: skipSchedule ? "none" : "auto" }}
          >
            <div
              className="flex items-center gap-2 py-3 px-4 rounded-2xl"
              style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}
            >
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="cc-input cc-mono text-sm"
              />
              <ChevronDown className="w-3.5 h-3.5" style={{ color: tokens.inkMuted }} />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span
              onClick={() => setSkipSchedule((s) => !s)}
              className="w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0"
              style={{
                background: skipSchedule ? tokens.accent : tokens.surface,
                border: `1px solid ${skipSchedule ? tokens.accent : tokens.border}`,
              }}
            >
              {skipSchedule && <Check className="w-3 h-3" style={{ color: "#FFFFFF" }} />}
            </span>
            <span
              onClick={() => setSkipSchedule((s) => !s)}
              className="text-xs"
              style={{ color: tokens.inkMuted }}
            >
              I'll schedule sessions later
            </span>
          </label>
        </Field>

        {/* Department */}
        <Field label="Department or institution" optional last>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Agricultural Engineering, FUNAAB"
            className="cc-input text-sm py-3 px-4 rounded-2xl"
            style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}
          />
        </Field>
      </div>
    </>
  );
}

function Field({ label, optional, last, children }) {
  return (
    <div className={last ? "mb-2" : "mb-7"}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.inkMuted, letterSpacing: "0.1em" }}>
          {label}
        </span>
        {optional && (
          <span className="text-[10px] font-medium" style={{ color: tokens.inkFaint }}>
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Step 2: Success ──────────────────────────────────────────────────────

function SuccessStep({ name, joinCode, copyState, handleCopy, handleShare, resetAll, goBack, createdClassId }) {
  const router = useRouter();
  return (
    <div className="flex-1 flex flex-col px-6 pt-6 pb-10">
      <button
        onClick={goBack}
        aria-label="Close"
        className="w-9 h-9 rounded-full flex items-center justify-center self-start mb-8 transition-transform active:scale-90"
        style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}
      >
        <X className="w-4 h-4" style={{ color: tokens.inkMuted }} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-5 cc-fade-in"
          style={{ background: tokens.accentTint }}
        >
          <Check className="w-5 h-5" style={{ color: tokens.accentDeep }} />
        </div>

        <p
          className="text-xs font-bold uppercase tracking-widest mb-2 cc-fade-in"
          style={{ color: tokens.inkMuted, letterSpacing: "0.14em" }}
        >
          Class created
        </p>

        <h1 className="cc-display text-2xl mb-8 px-4 cc-fade-in-delay" style={{ fontWeight: 500 }}>
          {name || "Untitled class"}
        </h1>

        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: tokens.inkFaint, letterSpacing: "0.12em" }}>
          Join code
        </p>

        <div className="relative cc-code-in mb-8">
          <span
            className="cc-mono block px-2"
            style={{ fontSize: 34, fontWeight: 600, letterSpacing: "0.06em", color: tokens.ink }}
          >
            {joinCode}
          </span>
          <svg
            viewBox="0 0 220 20"
            width="100%"
            height="20"
            className="cc-chalk-draw"
            style={{ marginTop: 2 }}
          >
            <path
              d="M6 8 C 40 16, 90 2, 110 9 S 180 16, 214 7"
              fill="none"
              stroke={tokens.accent}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="340"
              strokeDashoffset="0"
            />
          </svg>
        </div>

        <div className="flex items-center gap-3 w-full max-w-xs">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, color: tokens.ink }}
          >
            {copyState === "copied" ? (
              <>
                <Check className="w-4 h-4" style={{ color: tokens.accentDeep }} />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" style={{ color: tokens.inkMuted }} />
                Copy code
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, color: tokens.ink }}
          >
            <Share2 className="w-4 h-4" style={{ color: tokens.inkMuted }} />
            Share
          </button>
        </div>
      </div>

      <button
        onClick={() => router.navigate({ to: "/class", search: { classId: createdClassId } })}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95 mt-6"
        style={{ background: tokens.accent, color: "#FFFFFF" }}
      >
        Go to class
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
export const Route = createFileRoute("/create")({
  validateSearch: (search: Record<string, unknown>): { classId?: string } => {
    const classId = search["classId"];
    return typeof classId === "string" ? { classId } : {};
  },
  component: CreateClass,
});
