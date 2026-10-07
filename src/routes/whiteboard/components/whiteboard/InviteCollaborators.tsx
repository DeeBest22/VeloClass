import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { UserPlus, X, Mail, Check, Trash2, Send, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../../../config";

interface Props {
  roomId: string;
  boardTitle?: string | null;
  /** The logged-in owner's id — we skip-validate against this */
  ownerId?: string;
}

interface InviteEntry {
  email: string;
  status: "idle" | "sending" | "sent" | "error";
  error?: string;
}

const GMAIL_RE = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;

function validate(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!GMAIL_RE.test(email.trim())) return "Only Gmail addresses are supported.";
  return null;
}

// ─── Small avatar-pill for added-but-not-yet-sent emails ─────────────────────
function EmailPill({ entry, onRemove }: { entry: InviteEntry; onRemove: () => void }) {
  const color =
    entry.status === "sent"  ? "rgba(34,197,94,0.18)"  :
    entry.status === "error" ? "rgba(239,68,68,0.18)"  :
    "rgba(139,92,246,0.14)";
  const border =
    entry.status === "sent"  ? "1px solid rgba(34,197,94,0.35)"  :
    entry.status === "error" ? "1px solid rgba(239,68,68,0.35)"  :
    "1px solid rgba(139,92,246,0.3)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "4px 8px 4px 10px", borderRadius: 99,
      background: color, border,
      fontSize: 12, color: "rgba(220,220,255,0.9)",
      fontFamily: "system-ui, sans-serif",
      maxWidth: "100%",
    }}>
      {entry.status === "sending" && (
        <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(139,92,246,0.6)", borderTopColor: "transparent", animation: "spin 0.6s linear infinite", flexShrink: 0 }} />
      )}
      {entry.status === "sent" && <Check size={11} strokeWidth={2.5} style={{ color: "#22c55e", flexShrink: 0 }} />}
      {entry.status === "error" && <AlertCircle size={11} style={{ color: "#ef4444", flexShrink: 0 }} />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{entry.email}</span>
      {entry.status !== "sending" && (
        <button
          onClick={onRemove}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", color: "rgba(180,180,210,0.5)",
            transition: "color 0.15s", flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(239,68,68,0.8)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(180,180,210,0.5)")}
          aria-label={`Remove ${entry.email}`}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
function InviteModal({ roomId, boardTitle, onClose }: Props & { onClose: () => void }) {
  const [input, setInput]       = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [entries, setEntries]   = useState<InviteEntry[]>([]);
  const [visible, setVisible]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 260);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dismiss]);

  const addEmail = () => {
    const email = input.trim().toLowerCase();
    const err = validate(email);
    if (err) { setInputError(err); return; }
    if (entries.some(e => e.email === email)) { setInputError("Already added."); return; }
    setEntries(prev => [...prev, { email, status: "idle" }]);
    setInput("");
    setInputError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Always stop propagation so no keypress leaks to the whiteboard's
    // window-level handler (which would intercept Backspace, letter keys, etc.)
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); addEmail(); }
    if (e.key === ",")     { e.preventDefault(); addEmail(); }
    // Escape is handled by the window listener added in useEffect above — let it bubble
  };

  const removeEntry = (email: string) => {
    setEntries(prev => prev.filter(e => e.email !== email));
  };

  const sendAll = async () => {
    const pending = entries.filter(e => e.status === "idle" || e.status === "error");
    if (pending.length === 0) return;

    const token = localStorage.getItem("sessionToken");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Mark all pending as "sending"
    setEntries(prev => prev.map(e =>
      pending.some(p => p.email === e.email) ? { ...e, status: "sending" } : e
    ));

    await Promise.all(pending.map(async (entry) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/boards/invite`, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            roomId,
            email: entry.email,
            boardTitle: boardTitle ?? "Untitled Board",
          }),
        });
        const data = await res.json().catch(() => ({}));
        setEntries(prev => prev.map(e =>
          e.email === entry.email
            ? { ...e, status: res.ok ? "sent" : "error", error: res.ok ? undefined : (data.message ?? "Could not send invite. Try again.") }
            : e
        ));
      } catch {
        setEntries(prev => prev.map(e =>
          e.email === entry.email ? { ...e, status: "error", error: "Network error — check your connection." } : e
        ));
      }
    }));
  };

  const allSent   = entries.length > 0 && entries.every(e => e.status === "sent");
  const anySending = entries.some(e => e.status === "sending");
  const pendingCount = entries.filter(e => e.status === "idle" || e.status === "error").length;

  const glass: React.CSSProperties = {
    background: "rgba(14, 13, 22, 0.95)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
  };

  // Block ALL keyboard events from reaching the whiteboard's window-level
  // listeners while the modal is open. Backspace, letter keys, shortcuts —
  // none should reach the canvas while the user is typing in this modal.
  const stopKeys = (e: React.KeyboardEvent) => e.stopPropagation();

  return createPortal(
    <div onKeyDown={stopKeys} onKeyUp={stopKeys} style={{ all: "unset" }}>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0, transition: "opacity 0.22s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", zIndex: 9999,
        top: "50%", left: "50%",
        transform: visible
          ? "translate(-50%, -50%) scale(1)"
          : "translate(-50%, -50%) scale(0.96)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.26s cubic-bezier(0.34,1.4,0.64,1), opacity 0.22s ease",
        width: "min(460px, calc(100vw - 2rem))",
        ...glass,
        borderRadius: 18,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <UserPlus size={16} style={{ color: "rgba(167,139,250,1)" }} strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "rgba(232,232,255,0.97)", fontFamily: "system-ui, sans-serif", letterSpacing: "-0.02em" }}>
                Invite Collaborators
              </p>
              {boardTitle && (
                <p style={{ margin: "1px 0 0", fontSize: 11, color: "rgba(130,130,165,0.6)", fontFamily: "system-ui, sans-serif" }}>
                  to &ldquo;{boardTitle}&rdquo;
                </p>
              )}
            </div>
          </div>
          <button onClick={dismiss} style={{
            background: "none", border: "none", cursor: "pointer",
            width: 30, height: 30, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(160,160,190,0.5)", transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(200,200,230,0.9)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(160,160,190,0.5)"; }}
          aria-label="Close">
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px 20px" }}>
          {/* Input row */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Mail size={14} style={{
                position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                color: inputError ? "rgba(239,68,68,0.7)" : "rgba(130,130,165,0.5)", pointerEvents: "none",
              }} strokeWidth={1.8} />
              <input
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); if (inputError) setInputError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="collaborator@gmail.com"
                type="email"
                style={{
                  width: "100%", boxSizing: "border-box",
                  height: 40, paddingLeft: 32, paddingRight: 12,
                  borderRadius: 10, fontSize: 13,
                  background: "rgba(255,255,255,0.05)",
                  border: inputError ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(220,220,255,0.95)", fontFamily: "system-ui, sans-serif",
                  outline: "none", transition: "border-color 0.15s",
                  WebkitAppearance: "none",
                }}
                onFocus={e => { if (!inputError) (e.target as HTMLInputElement).style.borderColor = "rgba(139,92,246,0.5)"; }}
                onBlur={e => { if (!inputError) (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>
            <button
              onClick={addEmail}
              style={{
                height: 40, padding: "0 14px", borderRadius: 10, border: "none",
                background: "rgba(139,92,246,0.18)", color: "rgba(167,139,250,1)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
                border: "1px solid rgba(139,92,246,0.35)",
                transition: "background 0.15s",
              } as React.CSSProperties}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.28)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.18)")}
            >
              Add
            </button>
          </div>

          {inputError && (
            <p style={{ margin: "6px 0 0 2px", fontSize: 11.5, color: "rgba(239,68,68,0.85)", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={11} strokeWidth={2} /> {inputError}
            </p>
          )}

          {/* Pills */}
          {entries.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {entries.map(e => (
                <EmailPill key={e.email} entry={e} onRemove={() => removeEntry(e.email)} />
              ))}
            </div>
          )}

          {/* Errors detail */}
          {entries.some(e => e.status === "error" && e.error) && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {entries.filter(e => e.status === "error").map(e => (
                <p key={e.email} style={{ margin: 0, fontSize: 11.5, color: "rgba(252,165,165,0.9)", fontFamily: "system-ui, sans-serif" }}>
                  {e.email}: {e.error}
                </p>
              ))}
            </div>
          )}

          {/* Helper text */}
          <p style={{ margin: "12px 0 0", fontSize: 11, color: "rgba(110,110,145,0.7)", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
            Enter a Gmail address and press Enter or click Add. Invited users will see a notification when they open their boards.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px 18px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button onClick={dismiss} style={{
            height: 38, padding: "0 16px", borderRadius: 10,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(180,180,210,0.8)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "system-ui, sans-serif",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)")}>
            {allSent ? "Done" : "Cancel"}
          </button>

          {!allSent && (
            <button
              onClick={sendAll}
              disabled={anySending || pendingCount === 0}
              style={{
                height: 38, padding: "0 18px", borderRadius: 10,
                background: anySending || pendingCount === 0 ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.9)",
                border: "1px solid rgba(139,92,246,0.5)",
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: anySending || pendingCount === 0 ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif",
                display: "flex", alignItems: "center", gap: 6,
                transition: "background 0.15s", opacity: anySending || pendingCount === 0 ? 0.65 : 1,
              }}
              onMouseEnter={e => { if (!anySending && pendingCount > 0) (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,1)"; }}
              onMouseLeave={e => { if (!anySending && pendingCount > 0) (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.9)"; }}
            >
              {anySending
                ? <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.6s linear infinite" }} />Sending…</>
                : <><Send size={13} strokeWidth={2} />Send {pendingCount > 1 ? `${pendingCount} Invites` : "Invite"}</>
              }
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}

// ─── Trigger button — sits beside ExportButton in the top-right cluster ───────
export default function InviteCollaborators({ roomId, boardTitle, ownerId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Invite collaborators"
        aria-label="Invite collaborators"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 11, cursor: "pointer",
          background: open ? "rgba(139,92,246,0.22)" : "rgba(14,13,22,0.82)",
          backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: open ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: open
            ? "0 0 0 1px rgba(139,92,246,0.25), 0 4px 20px rgba(139,92,246,0.2)"
            : "0 0 0 1px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
          transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
          WebkitTapHighlightColor: "transparent",
          color: open ? "rgba(167,139,250,1)" : "rgba(190,190,220,0.85)",
        }}
      >
        <UserPlus size={15} strokeWidth={1.9} />
      </button>

      {open && (
        <InviteModal
          roomId={roomId}
          boardTitle={boardTitle}
          ownerId={ownerId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}