import { useRef, useCallback, useEffect } from "react";
import type { ToolType } from "./types";

/**
 * useLineDrawMode
 *
 * Two behaviours for line / arrow tools:
 *
 *  DRAG  — pointerdown, drag > threshold, pointerup  → commits on release. Done.
 *
 *  CLICK — pointerdown + pointerup without moving     → starts the element but
 *          suppresses the commit; endpoint follows cursor until a second click
 *          (another pointerdown) commits it. Escape cancels.
 *
 * Every other tool passes through untouched.
 */

const DRAG_THRESHOLD_PX = 6;

type PH = (e: React.PointerEvent<HTMLCanvasElement>) => void;

interface Options {
  activeTool: ToolType;
  onPointerDown: PH;
  onPointerMove: PH;
  onPointerUp: PH;
  onClickModeChange?: (active: boolean) => void;
}

export function useLineDrawMode({
  activeTool,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClickModeChange,
}: Options) {
  const isLineTool = activeTool === "line" || activeTool === "arrow";

  // All mutable state in refs — no re-renders needed inside the hook itself
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const inClickMode = useRef(false);
  const latestMove = useRef<React.PointerEvent<HTMLCanvasElement> | null>(null);

  const setClickMode = useCallback((val: boolean) => {
    inClickMode.current = val;
    onClickModeChange?.(val);
  }, [onClickModeChange]);

  // Cancel: fire a pointerup at last known position so useWhiteboard tidies up
  const cancel = useCallback(() => {
    if (!inClickMode.current) return;
    if (latestMove.current) onPointerUp(latestMove.current);
    setClickMode(false);
    pressOrigin.current = null;
  }, [onPointerUp, setClickMode]);

  // Escape key cancels click-mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inClickMode.current) cancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cancel]);

  // Reset when tool changes away from line/arrow
  useEffect(() => {
    if (!isLineTool && inClickMode.current) cancel();
  }, [isLineTool, cancel]);

  // ── wrappedPointerDown ───────────────────────────────────────────────────
  const wrappedPointerDown: PH = useCallback((e) => {
    if (!isLineTool) {
      onPointerDown(e);
      return;
    }

    if (inClickMode.current) {
      // Second click — commit by firing pointerUp at this position, then reset
      onPointerUp(e);
      setClickMode(false);
      pressOrigin.current = null;
      return;
    }

    // First press — record origin and start drawing
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    onPointerDown(e);
  }, [isLineTool, onPointerDown, onPointerUp, setClickMode]);

  // ── wrappedPointerMove ───────────────────────────────────────────────────
  const wrappedPointerMove: PH = useCallback((e) => {
    latestMove.current = e;
    onPointerMove(e);
  }, [onPointerMove]);

  // ── wrappedPointerUp ─────────────────────────────────────────────────────
  const wrappedPointerUp: PH = useCallback((e) => {
    if (!isLineTool || !pressOrigin.current) {
      // Not a line tool, or no recorded press — pass straight through
      onPointerUp(e);
      return;
    }

    const dx = e.clientX - pressOrigin.current.x;
    const dy = e.clientY - pressOrigin.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= DRAG_THRESHOLD_PX) {
      // ── DRAG: release mouse commits the line. Done. ──
      onPointerUp(e);
      pressOrigin.current = null;
      // safety: ensure click-mode is off
      if (inClickMode.current) setClickMode(false);
    } else {
      // ── TAP/CLICK: suppress the commit, enter click-mode ──
      // The element was started by pointerDown above; we keep it "live"
      // so pointermove continues to update the endpoint in real-time.
      // The next pointerDown (above) will fire onPointerUp to commit it.
      setClickMode(true);
      // Do NOT call onPointerUp here — that would commit with zero length
    }
  }, [isLineTool, onPointerUp, setClickMode]);

  return {
    wrappedPointerDown,
    wrappedPointerMove,
    wrappedPointerUp,
    /** Whether we're currently waiting for a second click to commit */
    clickModeActive: inClickMode.current,
    cancelClickMode: cancel,
  };
}