import { useState, useRef, useEffect } from "react";
import { Link2, Wifi, WifiOff, Copy, Check } from "lucide-react";
import type { CollabUser } from "./useCollaboration";

interface Props {
  connected: boolean;
  roomId: string | null;
  users: CollabUser[];
  self: CollabUser | null;
  /** When true, hides text labels to save horizontal space (iPad/tablet) */
  compact?: boolean;
}

const MAX_VISIBLE = 5;

function AvatarBubble({ user, size = 28, ring = false }: { user: CollabUser; size?: number; ring?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const showPhoto = !!user.profilePicture && !imgError;
  const initial = (user.firstName || user.name || "?").slice(0, 1).toUpperCase();

  return (
    <div
      title={user.name + (user.status === "idle" ? " (idle)" : "")}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: showPhoto ? "transparent" : user.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, overflow: "hidden",
        boxShadow: ring
          ? `0 0 0 2px rgba(14,13,22,0.9), 0 0 0 3.5px ${user.color}80`
          : "0 0 0 2px rgba(14,13,22,0.9)",
        opacity: user.status === "idle" ? 0.55 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      {showPhoto ? (
        <img
          src={user.profilePicture!}
          alt={user.name}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span style={{
          fontSize: size * 0.42, fontWeight: 700, color: "#fff",
          fontFamily: "system-ui, sans-serif", userSelect: "none",
        }}>
          {initial}
        </span>
      )}
    </div>
  );
}

export default function CollabPresence({ connected, roomId, users, self, compact = false }: Props) {
  const [copied, setCopied] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);

  const others = users.filter(u => u.id !== self?.id);
  const allVisible = self ? [self, ...others] : others;
  const visible = allVisible.slice(0, MAX_VISIBLE);
  const overflow = allVisible.length - MAX_VISIBLE;

  const copyRoomLink = () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    // no-op — kept for potential future use
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6}}>

      {/* Connection dot */}
      <div
        title={connected ? "Connected" : "Reconnecting…"}
        style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: connected ? "#22c55e" : "#f59e0b",
          boxShadow: connected
            ? "0 0 0 2px rgba(34,197,94,0.25), 0 0 6px rgba(34,197,94,0.5)"
            : "0 0 0 2px rgba(245,158,11,0.25)",
          animation: connected ? "collab-pulse 2.5s ease-in-out infinite" : "none",
        }}
      />

      {/* Stacked avatars */}
      {visible.length > 0 && (
        <div style={{ display: "flex", alignItems: "center" }}>
          {visible.map((user, i) => (
            <div key={user.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i, position: "relative" }}>
              <AvatarBubble user={user} size={26} ring={user.id === self?.id} />
            </div>
          ))}
          {overflow > 0 && (
            <div style={{
              marginLeft: -8, zIndex: 0, width: 26, height: 26, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)", border: "2px solid rgba(14,13,22,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 700, color: "rgba(200,200,220,0.8)", fontFamily: "system-ui, sans-serif",
            }}>+{overflow}</div>
          )}
        </div>
      )}

      {roomId && !compact && <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />}

      {/* Room chip — click to copy invite link immediately */}
      {roomId && (
        <div ref={roomRef} style={{ position: "relative" }}>
          <button
            onClick={copyRoomLink}
            title="Click to copy invite link"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              height: 28, padding: "0 9px", borderRadius: 8, border: "none", cursor: "pointer",
              background: copied ? "rgba(34,197,94,0.18)" : "transparent",
              color: copied ? "#22c55e" : "rgba(180,180,210,0.8)", fontSize: 11, fontWeight: 500,
              fontFamily: "system-ui, sans-serif", transition: "background 0.15s, color 0.15s",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            {copied
              ? <><Check size={12} strokeWidth={2.5} />{!compact && <span style={{ fontFamily: "system-ui, sans-serif" }}>Copied!</span>}</>
              : <><Link2 size={12} strokeWidth={2.2} />{!compact && <span style={{ fontFamily: "monospace", letterSpacing: "0.04em" }}>{roomId.slice(0, 8)}</span>}</>
            }
          </button>
        </div>
      )}

      <style>{`
        @keyframes collab-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25), 0 0 6px rgba(34,197,94,0.5); }
          50%       { box-shadow: 0 0 0 4px rgba(34,197,94,0.1), 0 0 10px rgba(34,197,94,0.4); }
        }
        @keyframes collab-drop {
          from { opacity: 0; transform: translateY(-4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}