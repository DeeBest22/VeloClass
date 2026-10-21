import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, ExternalLink, Check, X, ChevronRight } from "lucide-react";
import type { CollabInvite } from "./useCollabInvites";

interface Props {
  invites: CollabInvite[];
  onRespond: (inviteId: string, action: "accept" | "decline") => Promise<boolean>;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const glass: React.CSSProperties = {
  background: "rgba(14, 13, 22, 0.95)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
};

// ─── Individual invite card ────────────────────────────────────────────────────
function InviteCard({
  invite,
  onAccept,
  onDecline,
}: {
  invite: CollabInvite;
  onAccept: () => Promise<boolean>;
  onDecline: () => Promise<boolean>;
}) {
  const [acting, setActing] = useState<"accept" | "decline" | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (action: "accept" | "decline", cb: () => Promise<boolean>) => {
    if (acting) return;
    setActing(action);
    setError(null);
    const ok = await cb();
    if (!ok) {
      setActing(null);
      setError("Something went wrong. Please try again.");
      return;
    }
    if (action === "accept") {
      // Show the accepted state with an open-board link before the card is
      // removed from the list by the parent.
      setAccepted(true);
    }
    // For decline, parent removes the card immediately via setInvites filter.
  };

  // Accepted state: show a success row with a link to open the board
  if (accepted) {
    return (
      <div style={{
        padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 600,
            color: "rgba(225,225,255,0.95)", fontFamily: "system-ui, sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {invite.boardTitle}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#22c55e", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={11} strokeWidth={2.5} /> Joined
          </p>
        </div>
        <a
          href={`/whiteboard?room=${invite.roomId}&name=${encodeURIComponent(invite.boardTitle)}`}
          target="_blank"
          rel="noreferrer"
          style={{
            flexShrink: 0,
            height: 32, padding: "0 12px", borderRadius: 8,
            background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            color: "rgba(167,139,250,1)", textDecoration: "none",
            fontSize: 12, fontWeight: 600, fontFamily: "system-ui, sans-serif",
          }}
          title="Open board"
        >
          <ExternalLink size={12} strokeWidth={2} />
          Open
        </a>
      </div>
    );
  }

  return (
    <div style={{
      padding: "12px 14px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      transition: "background 0.15s",
    }}>
      {/* Board title + inviter */}
      <div style={{ marginBottom: 8 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.3,
          color: "rgba(225,225,255,0.95)", fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.01em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {invite.boardTitle}
        </p>
        <p style={{
          margin: "3px 0 0", fontSize: 11.5, color: "rgba(120,120,155,0.75)",
          fontFamily: "system-ui, sans-serif",
        }}>
          <span style={{ color: "rgba(167,139,250,0.85)", fontWeight: 500 }}>{invite.inviterName}</span>
          {" "}invited you · {timeAgo(invite.invitedAt)}
        </p>
        {error && (
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(239,68,68,0.85)", fontFamily: "system-ui, sans-serif" }}>
            {error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => handle("accept", onAccept)}
          disabled={acting !== null}
          style={{
            flex: 1, height: 32, borderRadius: 8, border: "none",
            background: acting === "accept" ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
            color: "#22c55e", fontSize: 12, fontWeight: 600,
            cursor: acting ? "not-allowed" : "pointer",
            fontFamily: "system-ui, sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            transition: "background 0.15s",
          } as React.CSSProperties}
          onMouseEnter={e => { if (!acting) (e.currentTarget as HTMLButtonElement).style.background = "rgba(34,197,94,0.25)"; }}
          onMouseLeave={e => { if (!acting) (e.currentTarget as HTMLButtonElement).style.background = "rgba(34,197,94,0.15)"; }}
        >
          {acting === "accept"
            ? <div style={{ width: 11, height: 11, borderRadius: "50%", border: "1.5px solid rgba(34,197,94,0.4)", borderTopColor: "#22c55e", animation: "spin 0.6s linear infinite" }} />
            : <Check size={12} strokeWidth={2.5} />
          }
          Accept
        </button>

        <button
          onClick={() => handle("decline", onDecline)}
          disabled={acting !== null}
          style={{
            flex: 1, height: 32, borderRadius: 8, border: "none",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(170,170,200,0.7)", fontSize: 12, fontWeight: 500,
            cursor: acting ? "not-allowed" : "pointer",
            fontFamily: "system-ui, sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            transition: "background 0.15s",
          } as React.CSSProperties}
          onMouseEnter={e => { if (!acting) (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; }}
          onMouseLeave={e => { if (!acting) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
        >
          {acting === "decline"
            ? <div style={{ width: 11, height: 11, borderRadius: "50%", border: "1.5px solid rgba(239,68,68,0.4)", borderTopColor: "#ef4444", animation: "spin 0.6s linear infinite" }} />
            : <X size={12} strokeWidth={2.5} />
          }
          Decline
        </button>
      </div>
    </div>
  );
}

// ─── Dropdown panel ────────────────────────────────────────────────────────────
function InvitePanel({
  invites,
  onRespond,
  onClose,
  anchorRect,
}: {
  invites: CollabInvite[];
  onRespond: (id: string, action: "accept" | "decline") => Promise<boolean>;
  onClose: () => void;
  anchorRect: DOMRect;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const tid = setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", key);
    }, 40);
    return () => {
      clearTimeout(tid);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  // Position below-right of the anchor button
  const top  = anchorRect.bottom + 8;
  const left = anchorRect.left;

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed", zIndex: 9999,
        top, left,
        width: "min(320px, calc(100vw - 1.5rem))",
        borderRadius: 16, overflow: "hidden",
        ...glass,
        animation: "invite-drop 0.2s cubic-bezier(0.34,1.5,0.64,1) both",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "13px 16px 11px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Bell size={14} style={{ color: "rgba(167,139,250,0.9)" }} strokeWidth={1.9} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(225,225,255,0.95)", fontFamily: "system-ui, sans-serif", letterSpacing: "-0.01em" }}>
            Board Invitations
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
            background: "rgba(139,92,246,0.22)", border: "1px solid rgba(139,92,246,0.35)",
            color: "rgba(167,139,250,1)", fontFamily: "system-ui, sans-serif",
          }}>
            {invites.length}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(150,150,180,0.5)", display: "flex", alignItems: "center",
            padding: 4, borderRadius: 6, transition: "color 0.15s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(200,200,230,0.9)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(150,150,180,0.5)")}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Invite list */}
      <div style={{ maxHeight: 380, overflowY: "auto" }}>
        {invites.length === 0 ? (
          <p style={{ margin: 0, padding: "20px 16px", textAlign: "center", fontSize: 13, color: "rgba(110,110,145,0.7)", fontFamily: "system-ui, sans-serif" }}>
            No pending invitations.
          </p>
        ) : (
          invites.map(invite => (
            <InviteCard
              key={invite.id}
              invite={invite}
              onAccept={() => onRespond(invite.id, "accept")}
              onDecline={() => onRespond(invite.id, "decline")}
            />
          ))
        )}
      </div>

      <style>{`
        @keyframes invite-drop {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}

// ─── Bell button — the exported component ─────────────────────────────────────
export default function CollabInviteNotification({ invites, onRespond }: Props) {
  const [open, setOpen]         = useState(false);
  const btnRef                  = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchor] = useState<DOMRect | null>(null);

  const count = invites.length;

  const toggle = () => {
    if (!open && btnRef.current) setAnchor(btnRef.current.getBoundingClientRect());
    setOpen(o => !o);
  };

  if (count === 0 && !open) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title={`${count} pending board invitation${count !== 1 ? "s" : ""}`}
        aria-label="Board invitations"
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 11, cursor: "pointer",
          background: open ? "rgba(139,92,246,0.22)" : "rgba(14,13,22,0.82)",
          backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: open ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
          transition: "background 0.15s, border-color 0.15s",
          WebkitTapHighlightColor: "transparent",
          color: open ? "rgba(167,139,250,1)" : "rgba(190,190,220,0.85)",
        }}
      >
        <Bell size={15} strokeWidth={1.9} />
        {/* Badge */}
        {count > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 99,
            background: "rgba(139,92,246,1)",
            border: "2px solid rgba(14,13,22,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 800, color: "#fff",
            fontFamily: "system-ui, sans-serif",
            padding: "0 3px",
            boxShadow: "0 0 8px rgba(139,92,246,0.7)",
            animation: "badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && anchorRect && (
        <InvitePanel
          invites={invites}
          onRespond={onRespond}
          onClose={() => setOpen(false)}
          anchorRect={anchorRect}
        />
      )}

      <style>{`
        @keyframes badge-pop {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }
      `}</style>
    </>
  );
}