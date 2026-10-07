import { useState, useRef, useEffect } from "react";
import { useRouter, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────────────
// Shared with CreateClass — same paper-white surface, warm-charcoal ink,
// violet brand accent, chalk-gradient callback.
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

// Same alphabet CreateClass uses to generate codes — no 0/O/1/I.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUP_LEN = 4;

const chalkColors = ["#6C63FF", "#2E8B74", "#E0A63A", "#D9707A", "#4C8BF5", "#6B7A8F"];
const mockClasses = [
  "Organic Chemistry II",
  "Design Studio",
  "World Geography",
  "Intro to Statistics",
  "Studio Art I",
  "Modern Poetry",
];

// Deterministic "lookup" so the same code always resolves to the same class —
// stands in for a real API call.
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function JoinClass() {
  const router = useRouter();
  const goBack = () => router.history.back();

  const [step, setStep] = useState("entry"); // 'entry' | 'success'
  const [chars, setChars] = useState(Array(GROUP_LEN * 2).fill(""));
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);

  const code = chars.join("");
  const complete = chars.every((c) => c !== "");

  useEffect(() => {
    if (step === "entry") inputsRef.current[0]?.focus();
  }, [step]);

  const setCharAt = (i, val) => {
    setChars((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const handleChange = (i, raw) => {
    const val = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    if (val && !CODE_CHARS.includes(val)) return;
    setCharAt(i, val);
    if (val && i < chars.length - 1) inputsRef.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
      setCharAt(i - 1, "");
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < chars.length - 1) {
      inputsRef.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, chars.length)
      .split("");
    if (pasted.length === 0) return;
    setChars((prev) => {
      const next = [...prev];
      pasted.forEach((c, idx) => {
        if (CODE_CHARS.includes(c)) next[idx] = c;
      });
      return next;
    });
    inputsRef.current[Math.min(pasted.length, chars.length - 1)]?.focus();
  };

  const handleJoin = () => {
    if (!complete || loading) return;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setStep("success");
    }, 700);
  };

  const retry = () => {
    setStep("entry");
    setChars(Array(GROUP_LEN * 2).fill(""));
    setLoading(false);
  };

  const h = hashCode(code);
  const matchedName = mockClasses[h % mockClasses.length];
  const matchedColor = chalkColors[h % chalkColors.length];

  return (
    <div
      style={{ background: tokens.bg, fontFamily: "'Manrope', sans-serif", color: tokens.ink }}
      className="min-h-screen flex items-start justify-center p-0 sm:p-6"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .jc-display { font-family: 'Fraunces', serif; }
        .jc-mono { font-family: 'IBM Plex Mono', monospace; }

        .jc-fade-in { animation: jcFadeIn 0.5s ease both; }
        .jc-fade-in-delay { animation: jcFadeIn 0.5s ease 0.1s both; }
        .jc-pop-in { animation: jcPopIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .jc-chalk-draw { animation: jcChalkDraw 0.9s ease 0.35s both; }
        .jc-shake { animation: jcShake 0.4s ease; }

        @keyframes jcFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes jcPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes jcChalkDraw {
          from { stroke-dashoffset: 340; opacity: 0; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes jcShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .jc-fade-in, .jc-fade-in-delay, .jc-pop-in, .jc-chalk-draw, .jc-shake {
            animation: none !important;
          }
        }

        .jc-box {
          width: 38px;
          height: 48px;
          text-align: center;
          font-size: 20px;
          font-weight: 600;
          border-radius: 12px;
          background: ${tokens.surface};
          border: 1.5px solid ${tokens.border};
          color: ${tokens.ink};
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .jc-box:focus {
          border-color: ${tokens.accent};
          box-shadow: 0 0 0 3px ${tokens.accentTint};
        }
      `}</style>

      <div
        className="w-full sm:max-w-md sm:mt-6 sm:mb-6 sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: tokens.bg,
          minHeight: "100vh",
          boxShadow: "0 1px 3px rgba(23,22,28,0.04)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-6 pb-4 sticky top-0 z-10"
          style={{ background: tokens.bg }}
        >
          <button
            onClick={step === "success" ? retry : goBack}
            aria-label={step === "success" ? "Enter a different code" : "Back"}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: tokens.inkMuted }} />
          </button>

          {step === "entry" && (
            <button
              onClick={handleJoin}
              disabled={!complete || loading}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
              style={{
                background: complete && !loading ? tokens.accent : tokens.border,
                color: complete && !loading ? "#FFFFFF" : tokens.inkFaint,
                cursor: complete && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Joining…" : "Join"}
            </button>
          )}
        </div>

        {step === "entry" ? (
          <div className="flex-1 flex flex-col px-6 pt-4 pb-10">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2 jc-fade-in"
              style={{ color: tokens.inkMuted, letterSpacing: "0.14em" }}
            >
              Join a class
            </p>
            <h1 className="jc-display text-2xl mb-2 jc-fade-in-delay" style={{ fontWeight: 500 }}>
              Enter your class code
            </h1>
            <p className="text-sm mb-9 jc-fade-in-delay" style={{ color: tokens.inkMuted }}>
              Ask your teacher for the code, or find it on the class roster.
            </p>

            <div className="flex items-center justify-center gap-2 mb-3">
              {chars.slice(0, GROUP_LEN).map((c, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  value={c}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  maxLength={1}
                  inputMode="text"
                  autoCapitalize="characters"
                  className="jc-mono jc-box"
                />
              ))}
              <span className="text-lg" style={{ color: tokens.inkFaint }}>–</span>
              {chars.slice(GROUP_LEN).map((c, idx) => {
                const i = idx + GROUP_LEN;
                return (
                  <input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    value={c}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    maxLength={1}
                    inputMode="text"
                    autoCapitalize="characters"
                    className="jc-mono jc-box"
                  />
                );
              })}
            </div>

            <p className="text-center text-xs mb-10" style={{ color: tokens.inkFaint }}>
              Codes use letters and numbers only - no 0, O, 1 or I.
            </p>

            <button
              onClick={handleJoin}
              disabled={!complete || loading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95 mt-auto"
              style={{
                background: complete && !loading ? tokens.accent : tokens.border,
                color: complete && !loading ? "#FFFFFF" : tokens.inkFaint,
                cursor: complete && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Joining…" : "Join class"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col px-6 pt-4 pb-10">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 jc-pop-in"
                style={{ background: matchedColor }}
              >
                <Check className="w-6 h-6" style={{ color: "#FFFFFF" }} />
              </div>

              <p
                className="text-xs font-bold uppercase tracking-widest mb-2 jc-fade-in"
                style={{ color: tokens.inkMuted, letterSpacing: "0.14em" }}
              >
                You're in
              </p>

              <h1 className="jc-display text-2xl mb-1 px-4 jc-fade-in-delay" style={{ fontWeight: 500 }}>
                {matchedName}
              </h1>

              <div className="relative jc-fade-in-delay mb-2">
                <span className="jc-mono text-xs" style={{ color: tokens.inkFaint, letterSpacing: "0.08em" }}>
                  {chars.slice(0, GROUP_LEN).join("")}-{chars.slice(GROUP_LEN).join("")}
                </span>
                <svg viewBox="0 0 120 10" width="100%" height="10" className="jc-chalk-draw" style={{ marginTop: 2 }}>
                  <path
                    d="M4 6 C 24 9, 50 2, 62 6 S 100 9, 116 4"
                    fill="none"
                    stroke={matchedColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="140"
                    strokeDashoffset="0"
                  />
                </svg>
              </div>
            </div>

            <button
              onClick={() => {
                /* dummy — real navigation to the class page not wired up yet */
              }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95 mt-6"
              style={{ background: tokens.accent, color: "#FFFFFF" }}
            >
              Go to class
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={retry}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 mt-2"
              style={{ background: "transparent", color: tokens.inkMuted }}
            >
              Wrong class? Try another code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/join")({
  component: JoinClass,
});
