import { useEffect, useRef, useState } from "react";
import { useWhiteboard } from "./components/whiteboard/useWhiteboard";
import WhiteboardCanvas from "./components/whiteboard/WhiteboardCanvas";
import Toolbar from "./components/whiteboard/Toolbar";
import StylePanel from "./components/whiteboard/StylePanel";
import ZoomControls from "./components/whiteboard/ZoomControls";
import ExportButton from "./components/whiteboard/ExportButton";
import { useLineDrawMode } from "./components/whiteboard/useLineDrawMode";
import { Maximize2, Minimize2 } from "lucide-react";
import "./whiteboard.css";


// ─────────────────────────────────────────────────────────────────────────────

interface WhiteboardProps {
  /** Keeps the board inside the live-class stage instead of covering the page. */
  embedded?: boolean;
  /** Used by hosts that provide a dedicated return action. */
  onClose?: () => void;
}

export function Whiteboard({ embedded = false, onClose }: WhiteboardProps) {
  const wb = useWhiteboard();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clickModeActive, setClickModeActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === rootRef.current) {
      await document.exitFullscreen();
      return;
    }
    await rootRef.current?.requestFullscreen();
  };

  // ── Safe-area override for embedded contexts (e.g. meeting iframe) ────────
  // env(safe-area-inset-*) is unreliable inside a nested <iframe> document on
  // Android WebView, so the parent page (which reads real insets correctly)
  // passes them in as query params. When present, they override env() via
  // the --wb-safe-* CSS vars everywhere below. When absent (standalone load),
  // the var() falls through to the real env() value automatically.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const top = params.get("safeTop");
    const bottom = params.get("safeBottom");
    const left = params.get("safeLeft");
    const right = params.get("safeRight");
    const root = document.documentElement.style;
    if (top !== null) root.setProperty("--wb-safe-top", `${top}px`);
    if (bottom !== null) root.setProperty("--wb-safe-bottom", `${bottom}px`);
    if (left !== null) root.setProperty("--wb-safe-left", `${left}px`);
    if (right !== null) root.setProperty("--wb-safe-right", `${right}px`);
  }, []);

  // ── Keyboard / scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener("keydown", wb.onKeyDown);
    window.addEventListener("keyup", wb.onKeyUp);
    return () => {
      window.removeEventListener("keydown", wb.onKeyDown);
      window.removeEventListener("keyup", wb.onKeyUp);
    };
  }, [wb.onKeyDown, wb.onKeyUp]);

  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest("canvas")) e.preventDefault();
    };
    document.addEventListener("touchmove", preventScroll, { passive: false });
    return () => document.removeEventListener("touchmove", preventScroll);
  }, []);

  // ── Image import ───────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => wb.insertImage(dataUrl, img.naturalWidth, img.naturalHeight);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Line draw mode ─────────────────────────────────────────────────────────
  const { wrappedPointerDown, wrappedPointerMove, wrappedPointerUp } =
    useLineDrawMode({
      activeTool: wb.activeTool,
      onPointerDown: wb.onPointerDown,
      onPointerMove: wb.onPointerMove,
      onPointerUp: wb.onPointerUp,
      onClickModeChange: setClickModeActive,
    });

  const isLineTool = wb.activeTool === "line" || wb.activeTool === "arrow";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      className={`whiteboard-root ${embedded ? "absolute inset-0 whiteboard-root--embedded" : "fixed inset-0"} ${isFullscreen ? "whiteboard-root--fullscreen" : ""} bg-canvas overflow-hidden`}
      style={embedded ? { transform: "translateZ(0)" } : undefined}
    >
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <Toolbar
        activeTool={wb.activeTool}
        onToolChange={wb.setActiveTool}
        onUndo={wb.undo}
        onRedo={wb.redo}
        onImageImport={() => fileInputRef.current?.click()}
        embedded={embedded}
      />

      <StylePanel style={wb.currentStyle} onChange={wb.applyStyle} visible={true} embedded={embedded} />

      <WhiteboardCanvas
        elements={wb.elements}
        viewport={wb.viewport}
        selectedIds={wb.selectedIds}
        selectionRect={wb.selectionRect}
        activeTool={wb.activeTool}
        isPanning={wb.isPanning}
        editingTextId={wb.editingTextId}
        onPointerDown={wrappedPointerDown}
        onPointerMove={wrappedPointerMove}
        onPointerUp={wrappedPointerUp}
        onWheel={wb.onWheel}
        updateTextElement={wb.updateTextElement}
        finishTextEdit={wb.finishTextEdit}
      />

      {/* ── Click-mode hint pill ── */}
      {isLineTool && clickModeActive && (
        <div style={{
          position: "fixed",
          bottom: "calc(4.5rem + var(--wb-safe-bottom, env(safe-area-inset-bottom, 0px)))",
          left: "50%", transform: "translateX(-50%)",
          zIndex: 40, display: "flex", alignItems: "center", gap: 8,
          padding: "7px 14px", borderRadius: 99,
          background: "rgba(14,13,22,0.88)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          border: "1px solid rgba(139,92,246,0.35)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 4px 20px rgba(139,92,246,0.18), 0 8px 32px rgba(0,0,0,0.4)",
          animation: "wb-fade-in 0.2s ease-out both",
          pointerEvents: "none", userSelect: "none",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: "rgba(139,92,246,1)",
            boxShadow: "0 0 8px rgba(139,92,246,0.9)",
            animation: "hint-pulse 1.4s ease-in-out infinite",
            display: "inline-block",
          }} />
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: "rgba(210,210,240,0.9)",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-0.01em", whiteSpace: "nowrap",
          }}>
            Click to set endpoint · Esc to cancel
          </span>
        </div>
      )}

      {/* ── Top-right: local board actions ── */}
      <div className="animate-fade-in" style={{
        position: "fixed", zIndex: 30,
        top: "max(0.5rem, var(--wb-safe-top, env(safe-area-inset-top, 0.5rem)))",
        right: "max(0.75rem, calc(var(--wb-safe-right, env(safe-area-inset-right, 0px)) + 0.5rem))",
        display: "flex", alignItems: "center", gap: 8,
        maxWidth: "calc(100vw - 1.5rem)",
      }}>
        <ExportButton elements={wb.elements} viewport={wb.viewport} />
        {embedded && (
          <button
            onClick={() => void toggleFullscreen()}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-foreground transition hover:border-primary/30"
            type="button"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen whiteboard"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen whiteboard"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        )}
        {onClose && !embedded && (
          <button onClick={onClose} className="rounded-lg border border-white/15 bg-black/80 px-3 py-2 text-xs font-medium text-white" type="button">
            Back to class
          </button>
        )}
      </div>

      <ZoomControls
        zoom={wb.viewport.zoom}
        onZoomIn={() => wb.zoom(0.1)}
        onZoomOut={() => wb.zoom(-0.1)}
        onReset={wb.resetZoom}
      />

      <style>{`
        @keyframes hint-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

export default Whiteboard;
