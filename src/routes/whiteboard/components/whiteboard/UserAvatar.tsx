import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { LogOut, ChevronDown, User } from "lucide-react";
import type { AuthUser } from "./AuthContext";

interface UserAvatarProps {
  user: AuthUser | null;
  onLogout?: () => void;
  /** When true, hides the name label to save horizontal space (iPad/tablet) */
  compact?: boolean;
}

function nameToHue(name: string): number {
  return [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
}

function AvatarCircle({ user, size = 26 }: { user: AuthUser | null; size?: number }) {
  if (!user) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
      }}>
        <User size={size * 0.52} strokeWidth={1.8} color="rgba(160,160,190,0.7)" />
      </div>
    );
  }

  const initials = (user.firstName || user.name || "?")[0].toUpperCase();
  const hue = nameToHue(user.name || "User");

  if (user.profilePicture) {
    return (
      <img src={user.profilePicture} alt={user.name} referrerPolicy="no-referrer"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, hsl(${hue} 65% 55%), hsl(${(hue + 45) % 360} 72% 38%))`,
      fontSize: Math.round(size * 0.4), fontWeight: 700, color: "#fff",
      fontFamily: "system-ui, sans-serif", userSelect: "none",
      boxShadow: `0 0 0 1.5px hsla(${hue}, 60%, 60%, 0.3)`,
    }}>
      {initials}
    </div>
  );
}

const glass: React.CSSProperties = {
  background: "rgba(14, 13, 22, 0.92)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 0 0 1px rgba(0,0,0,0.45), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
};

function DesktopDropdown({ user, onLogout, onClose, btnRef }: {
  user: AuthUser | null; onLogout?: () => void; onClose: () => void;
  btnRef: React.RefObject<HTMLButtonElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const tid = setTimeout(() => {
      document.addEventListener("mousedown", down);
      document.addEventListener("keydown", key);
    }, 40);
    return () => { clearTimeout(tid); document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [onClose, btnRef]);

  return (
    <div ref={ref} style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0,
      zIndex: 9999, width: 216, borderRadius: 14, overflow: "hidden",
      ...glass, animation: "ua-drop 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
    }}>
      <div style={{ padding: "12px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AvatarCircle user={user} size={36} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(232,232,255,0.95)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "system-ui, sans-serif" }}>
              {user?.name ?? "Guest"}
            </p>
            {user?.email ? (
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(130,130,165,0.7)", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </p>
            ) : (
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(130,130,165,0.5)", fontFamily: "system-ui, sans-serif", fontStyle: "italic" }}>
                Not signed in
              </p>
            )}
          </div>
        </div>
        {user?.authProvider && user.authProvider !== "local" && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(139,92,246,0.8)" }} />
            <span style={{ fontSize: 9.5, fontFamily: "monospace", fontWeight: 600, color: "rgba(130,130,160,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              via {user.authProvider}
            </span>
          </div>
        )}
      </div>

   
    </div>
  );
}

function MobileSheet({ user, onLogout, onClose }: {
  user: AuthUser | null; onLogout?: () => void; onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [dismiss]);

  return createPortal(
    <>
      <div onClick={dismiss} style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        opacity: visible ? 1 : 0, transition: "opacity 0.22s ease",
      }} />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999,
        borderRadius: "18px 18px 0 0", ...glass,
        boxShadow: "0 -2px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)",
        paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.28s cubic-bezier(0.34,1.3,0.64,1), opacity 0.22s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 32, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.15)" }} />
        </div>
        <div style={{ padding: "10px 20px 16px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <AvatarCircle user={user} size={52} />
          </div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "rgba(232,232,255,0.97)", fontFamily: "system-ui, sans-serif", letterSpacing: "-0.02em" }}>
            {user?.name ?? "Guest"}
          </p>
          {user?.email ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(130,130,165,0.65)", fontFamily: "monospace" }}>
              {user.email}
            </p>
          ) : (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(130,130,165,0.45)", fontFamily: "system-ui, sans-serif", fontStyle: "italic" }}>
              Not signed in
            </p>
          )}
          {user?.authProvider && user.authProvider !== "local" && (
            <p style={{ margin: "6px 0 0", fontSize: 9.5, fontFamily: "monospace", fontWeight: 600, color: "rgba(130,130,160,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              via {user.authProvider}
            </p>
          )}
        </div>
        <div style={{ padding: "10px 14px 4px" }}>
       
        </div>
      </div>
    </>,
    document.body
  );
}

export default function UserAvatar({ user, onLogout, compact = false }: UserAvatarProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const isMobile = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const displayName = user ? (user.firstName || user.name.split(" ")[0]) : "Guest";

  return (
    <>
      <style>{`
        @keyframes ua-drop {
          from { opacity: 0; transform: translateY(-5px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={{ position: "relative" }}>
        <button
          ref={btnRef}
          onClick={() => setOpen(o => !o)}
          title={user?.name ?? "Guest"}
          aria-label={`Account: ${user?.name ?? "Guest"}`}
          aria-expanded={open}
          style={{
            display: "flex", alignItems: "center", gap: compact ? 0 : 7,
            height: 36, padding: compact ? "0 5px" : "0 9px 0 5px", borderRadius: 11, cursor: "pointer",
            background: open ? "rgba(139,92,246,0.14)" : "rgba(14,13,22,0.82)",
            backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)",
            border: open ? "1px solid rgba(139,92,246,0.45)" : "1px solid rgba(255,255,255,0.08)",
            boxShadow: open
              ? "0 0 0 1px rgba(139,92,246,0.25), 0 4px 20px rgba(139,92,246,0.18), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)"
              : "0 0 0 1px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
            transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <AvatarCircle user={user} size={24} />
          {!compact && (
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: user ? "rgba(210,210,240,0.92)" : "rgba(150,150,175,0.65)",
              maxWidth: 80, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              fontFamily: "system-ui, sans-serif", letterSpacing: "-0.01em",
            }}>
              {displayName}
            </span>
          )}
          {!compact && (
            <ChevronDown size={11} strokeWidth={2.2} style={{
              color: "rgba(140,140,170,0.5)", flexShrink: 0,
              transition: "transform 0.18s", transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }} />
          )}
        </button>

        {open && !isMobile && (
          <DesktopDropdown user={user} onLogout={onLogout} onClose={() => setOpen(false)} btnRef={btnRef} />
        )}
      </div>

      {open && isMobile && (
        <MobileSheet user={user} onLogout={onLogout} onClose={() => setOpen(false)} />
      )}
    </>
  );
}