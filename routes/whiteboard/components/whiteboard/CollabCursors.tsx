import { useEffect, useRef, useState } from "react";
import type { Viewport } from "./types";
import type { RemoteCursor } from "./useCollaboration";
import { sceneToScreen } from "./math";

interface Props {
  cursors: Record<string, RemoteCursor>;
  viewport: Viewport;
}

interface CursorState {
  x: number; y: number;
  targetX: number; targetY: number;
  opacity: number; lastSeen: number;
}

const FADE_AFTER_MS = 3000;
const HIDE_AFTER_MS = 5000;

export default function CollabCursors({ cursors, viewport }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<Record<string, CursorState>>({});
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    for (const [uid, c] of Object.entries(cursors)) {
      const screen = sceneToScreen(c.x, c.y, viewport);
      if (!stateRef.current[uid]) {
        stateRef.current[uid] = { x: screen.x, y: screen.y, targetX: screen.x, targetY: screen.y, opacity: 1, lastSeen: now };
      } else {
        stateRef.current[uid].targetX = screen.x;
        stateRef.current[uid].targetY = screen.y;
        stateRef.current[uid].lastSeen = now;
        stateRef.current[uid].opacity = 1;
      }
    }
    for (const uid of Object.keys(stateRef.current)) {
      if (!cursors[uid]) delete stateRef.current[uid];
    }
  }, [cursors, viewport]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const tick = () => {
      const now = Date.now();
      for (const [uid, state] of Object.entries(stateRef.current)) {
        state.x += (state.targetX - state.x) * 0.18;
        state.y += (state.targetY - state.y) * 0.18;
        const idle = now - state.lastSeen;
        state.opacity = idle > FADE_AFTER_MS
          ? Math.max(0, 1 - (idle - FADE_AFTER_MS) / (HIDE_AFTER_MS - FADE_AFTER_MS))
          : 1;
        const el = container.querySelector<HTMLDivElement>(`[data-uid="${uid}"]`);
        if (el) {
          el.style.transform = `translate(${state.x}px, ${state.y}px)`;
          el.style.opacity = String(state.opacity);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  if (Object.keys(cursors).length === 0) return null;

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20, overflow: "hidden" }}>
      {Object.entries(cursors).map(([uid, cursor]) => (
        <CursorEl key={uid} uid={uid} cursor={cursor} />
      ))}
    </div>
  );
}

function CursorEl({ uid, cursor }: { uid: string; cursor: RemoteCursor }) {
  const [imgError, setImgError] = useState(false);
  const showPhoto = !!cursor.profilePicture && !imgError;
  const label = cursor.firstName || cursor.name;

  return (
    <div
      data-uid={uid}
      style={{ position: "absolute", top: 0, left: 0, willChange: "transform, opacity", pointerEvents: "none" }}
    >
      {/* SVG arrow */}
      <svg width="20" height="24" viewBox="0 0 20 24" style={{ display: "block", filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.4))` }}>
        <path d="M3 2L17 10.5L10 12L6.5 20L3 2Z" fill={cursor.color} stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>

      {/* Label pill — photo + name */}
      <div style={{
        position: "absolute", top: 18, left: 14,
        display: "flex", alignItems: "center", gap: 5,
        background: cursor.color,
        borderRadius: 20,
        padding: showPhoto ? "2px 8px 2px 2px" : "3px 8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        userSelect: "none",
      }}>
        {showPhoto && (
          <img
            src={cursor.profilePicture!}
            alt={label}
            onError={() => setImgError(true)}
            style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.4)" }}
          />
        )}
        <span style={{
          fontSize: 11, fontWeight: 600, color: "#fff",
          fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
          letterSpacing: "0.01em", textShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}>
          {label}
        </span>
      </div>
    </div>
  );
}