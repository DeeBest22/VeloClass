import {
  MousePointer2, Hand, RectangleHorizontal, Diamond, Circle,
  ArrowRight, Minus, PenLine, Type, Eraser, Undo2, Redo2, ImagePlus, X,
} from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ToolType } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onImageImport: (file: File) => void;
  /** Live class keeps the primary tool rail on the left. */
  embedded?: boolean;
}

const drawingTools: { type: ToolType; icon: any; label: string; shortcut: string }[] = [
  { type: "hand", icon: Hand, label: "Pan", shortcut: "H" },
  { type: "selection", icon: MousePointer2, label: "Select", shortcut: "V" },
];

// Shape group: rect/diamond/ellipse share one slot (mobile only)
const shapeGroup: { type: ToolType; icon: any; label: string; shortcut: string }[] = [
  { type: "rectangle", icon: RectangleHorizontal, label: "Rect", shortcut: "R" },
  { type: "diamond", icon: Diamond, label: "Diamond", shortcut: "D" },
  { type: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
];

// Line/Arrow group: share one slot (mobile only)
const lineGroup: { type: ToolType; icon: any; label: string; shortcut: string }[] = [
  { type: "arrow", icon: ArrowRight, label: "Arrow", shortcut: "A" },
  { type: "line", icon: Minus, label: "Line", shortcut: "L" },
];

// All shape+line tools flat - used on desktop where every tool has its own button
const shapeTools: { type: ToolType; icon: any; label: string; shortcut: string }[] = [
  { type: "rectangle", icon: RectangleHorizontal, label: "Rect", shortcut: "R" },
  { type: "diamond", icon: Diamond, label: "Diamond", shortcut: "D" },
  { type: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { type: "arrow", icon: ArrowRight, label: "Arrow", shortcut: "A" },
  { type: "line", icon: Minus, label: "Line", shortcut: "L" },
];

const markTools: { type: ToolType; icon: any; label: string; shortcut: string }[] = [
  { type: "freedraw", icon: PenLine, label: "Draw", shortcut: "P" },
  { type: "text", icon: Type, label: "Text", shortcut: "T" },
  { type: "eraser", icon: Eraser, label: "Erase", shortcut: "E" },
];

function ToolButton({
  type, icon: Icon, label, shortcut, activeTool, onToolChange, isMobile,
}: {
  type: ToolType; icon: any; label: string; shortcut: string;
  activeTool: ToolType; onToolChange: (tool: ToolType) => void; isMobile: boolean;
}) {
  const isActive = activeTool === type;
  const size = isMobile ? 40 : 44;
  const iconSize = isMobile ? 18 : 17;

  return (
    <button
      onClick={() => onToolChange(type)}
      title={`${label}  ·  ${shortcut}`}
      aria-label={label}
      aria-pressed={isActive}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: isMobile ? "2px" : "3px",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "10px",
        border: "none",
        cursor: "pointer",
        transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
        background: isActive
          ? "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(109,40,217,0.95) 100%)"
          : "transparent",
        boxShadow: isActive
          ? "0 0 0 1px rgba(139,92,246,0.6), 0 4px 12px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)"
          : "none",
        color: isActive ? "#fff" : "rgba(200,200,220,0.75)",
        transform: isActive ? "scale(1.06)" : "scale(1)",
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <Icon size={iconSize} strokeWidth={isActive ? 2.2 : 1.7} style={{ transition: "all 0.15s ease" }} />
      {!isMobile && (
        <span style={{
          fontSize: "8.5px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
          letterSpacing: "0.03em", opacity: isActive ? 0.95 : 0.55,
          lineHeight: 1, transition: "opacity 0.15s", userSelect: "none",
        }}>
          {label}
        </span>
      )}
      {!isMobile && (
        <span style={{
          position: "absolute", top: "3px", right: "4px", fontSize: "7px",
          fontFamily: "monospace", fontWeight: 700,
          color: isActive ? "rgba(255,255,255,0.5)" : "rgba(150,150,180,0.4)",
          lineHeight: 1, transition: "color 0.15s",
        }}>
          {shortcut}
        </span>
      )}
    </button>
  );
}

/** A grouped slot: clicking opens a portal popup showing all tools.
 *  Uses createPortal so toolbar overflow:hidden cannot clip it. */
function GroupToolButton({
  group, activeTool, onToolChange, isMobile,
}: {
  group: { type: ToolType; icon: any; label: string; shortcut: string }[];
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  isMobile: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const [lastSelected, setLastSelected] = useState<ToolType>(group[0].type);

  const isGroupActive = group.some((t) => t.type === activeTool);
  const displayType = isGroupActive ? activeTool : lastSelected;
  const displayTool = group.find((t) => t.type === displayType) ?? group[0];
  const Icon = displayTool.icon;
  const size = isMobile ? 40 : 44;
  const iconSize = isMobile ? 18 : 17;

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopupPos({
        x: rect.left + rect.width / 2,
        // mobile: toolbar at bottom → popup above; desktop: toolbar at top → popup below
        y: isMobile ? rect.top : rect.bottom + 8,
      });
    }
    // Activate the currently displayed tool immediately so the user can
    // start drawing straight away even without picking from the popup
    onToolChange(displayType);
    setOpen((o) => !o);
  };

  const handleSelect = (type: ToolType) => {
    setLastSelected(type);
    onToolChange(type);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Close popup when user starts drawing on the canvas (pointerdown anywhere except the popup itself)
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the popup panel or the slot button itself
      if (target.closest("[data-group-popup]") || target === btnRef.current || btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Use capture so we hear the event before anything else, including canvas handlers
    window.addEventListener("pointerdown", handler, { capture: true });
    return () => window.removeEventListener("pointerdown", handler, { capture: true });
  }, [open]);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* Portal popup - rendered into body, immune to parent overflow:hidden */}
      {open && createPortal(
          <div style={{
            position: "fixed",
            left: popupPos.x,
            transform: "translateX(-50%)",
            // mobile: anchor bottom edge of popup to top of button; desktop: anchor top to below button
            ...(isMobile
              ? { bottom: `calc(100vh - ${popupPos.y}px + 8px)`, top: "auto" }
              : { top: popupPos.y, bottom: "auto" }
            ),
            zIndex: 9999,
            display: "flex",
            flexDirection: "row",
            gap: "4px",
            padding: "6px",
            borderRadius: "12px",
            background: "rgba(14, 13, 22, 0.96)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4)",
          }} data-group-popup="true">
            {group.map((tool) => {
              const isActive = activeTool === tool.type;
              return (
                <button
                  key={tool.type}
                  onClick={() => handleSelect(tool.type)}
                  title={`${tool.label}  ·  ${tool.shortcut}`}
                  aria-label={tool.label}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: "3px",
                    width: `${size}px`, height: `${size}px`,
                    borderRadius: "8px", border: "none", cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(109,40,217,0.95) 100%)"
                      : "rgba(255,255,255,0.05)",
                    boxShadow: isActive
                      ? "0 0 0 1px rgba(139,92,246,0.6), 0 4px 12px rgba(139,92,246,0.35)"
                      : "none",
                    color: isActive ? "#fff" : "rgba(200,200,220,0.75)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <tool.icon size={iconSize} strokeWidth={isActive ? 2.2 : 1.7} />
                  {!isMobile && (
                    <span style={{
                      fontSize: "8.5px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                      letterSpacing: "0.03em", opacity: isActive ? 0.95 : 0.55,
                      lineHeight: 1, userSelect: "none",
                    }}>
                      {tool.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
        document.body
      )}

      {/* Slot button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        title={`${displayTool.label}  ·  ${displayTool.shortcut}`}
        aria-label={displayTool.label}
        aria-pressed={isGroupActive}
        style={{
          position: "relative",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: isMobile ? "2px" : "3px",
          width: `${size}px`, height: `${size}px`,
          borderRadius: "10px", border: "none", cursor: "pointer",
          transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
          background: isGroupActive
            ? "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(109,40,217,0.95) 100%)"
            : "transparent",
          boxShadow: isGroupActive
            ? "0 0 0 1px rgba(139,92,246,0.6), 0 4px 12px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)"
            : "none",
          color: isGroupActive ? "#fff" : "rgba(200,200,220,0.75)",
          transform: isGroupActive ? "scale(1.06)" : "scale(1)",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <Icon size={iconSize} strokeWidth={isGroupActive ? 2.2 : 1.7} style={{ transition: "all 0.15s ease" }} />
        {!isMobile && (
          <span style={{
            fontSize: "8.5px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
            letterSpacing: "0.03em", opacity: isGroupActive ? 0.95 : 0.55,
            lineHeight: 1, transition: "opacity 0.15s", userSelect: "none",
          }}>
            {displayTool.label}
          </span>
        )}
        {!isMobile && (
          <span style={{
            position: "absolute", top: "3px", right: "4px", fontSize: "7px",
            fontFamily: "monospace", fontWeight: 700,
            color: isGroupActive ? "rgba(255,255,255,0.5)" : "rgba(150,150,180,0.4)",
            lineHeight: 1, transition: "color 0.15s",
          }}>
            {displayTool.shortcut}
          </span>
        )}
      </button>
    </div>
  );
}


function Divider({ isMobile, vertical = false }: { isMobile: boolean; vertical?: boolean }) {
  if (vertical) {
    return (
      <div style={{
        width: "24px", height: "1px",
        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.1) 70%, transparent)",
        margin: "2px 0", flexShrink: 0,
      }} />
    );
  }
  if (isMobile) {
    return (
      <div style={{
        width: "1px", height: "24px",
        background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.1) 70%, transparent)",
        margin: "0 2px", flexShrink: 0,
      }} />
    );
  }
  return (
    <div style={{
      width: "1px", height: "32px",
      background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.1) 70%, transparent)",
      margin: "0 4px", flexShrink: 0,
    }} />
  );
}

function ActionButton({ onClick, title, children, isMobile }: {
  onClick: () => void; title: string; children: React.ReactNode; isMobile: boolean;
}) {
  const sz = isMobile ? 40 : 36;
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: `${sz}px`, height: `${sz}px`, borderRadius: "8px", border: "none",
        cursor: "pointer", background: "transparent", color: "rgba(190,190,215,0.65)",
        transition: "all 0.15s ease", flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

function ClassicToolbar({ activeTool, onToolChange, onUndo, onRedo, onImageImport, embedded = false }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const isVertical = embedded;

  useEffect(() => {
    const handler = () => fileInputRef.current?.click();
    window.addEventListener("whiteboard:open-image-picker", handler);
    return () => window.removeEventListener("whiteboard:open-image-picker", handler);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onImageImport(file); e.target.value = ""; }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes toolbar-rise {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0px); }
        }
        @keyframes toolbar-rise-mobile {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0px); }
        }
      `}</style>

      {/* Undo / Redo: sits below the zoom controls, above the toolbar.
          Toolbar is at bottom:12px (~48px tall → top at ~60px).
          We place undo/redo at bottom:68px - just above the toolbar with an 8px gap. */}
      {isMobile && (
        <div style={{
          position: "fixed",
          bottom: embedded
            ? "calc(20px + var(--wb-safe-bottom, env(safe-area-inset-bottom, 0px)))"
            : "calc(67px + var(--wb-safe-bottom, env(safe-area-inset-bottom, 0px)))",
          right: "max(12px, var(--wb-safe-right, env(safe-area-inset-right, 12px)))",
          zIndex: 31,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px",
          borderRadius: "12px",
          background: "rgba(14, 13, 22, 0.82)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          <ActionButton onClick={onUndo} title="Undo  ·  Ctrl+Z" isMobile={isMobile}>
            <Undo2 size={17} strokeWidth={1.8} />
          </ActionButton>
          <ActionButton onClick={onRedo} title="Redo  ·  Ctrl+Shift+Z" isMobile={isMobile}>
            <Redo2 size={17} strokeWidth={1.8} />
          </ActionButton>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          ...(isVertical
            ? {
                top: "12px", left: "12px", right: "auto",
                transform: "none", flexDirection: "column",
              }
            : isMobile
            ? { bottom: "calc(6px + var(--wb-safe-bottom, env(safe-area-inset-bottom, 0px)))", left: "50%", top: "auto", transform: "translateX(-50%)" }
            : { top: "calc(16px + var(--wb-safe-top, env(safe-area-inset-top, 0px)))", left: "50%", transform: "translateX(-50%)" }
          ),
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "1px" : "2px",
          padding: isMobile ? "4px 6px" : "6px 10px",
          borderRadius: isMobile ? "16px" : "18px",
          background: "rgba(14, 13, 22, 0.82)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: `
            0 0 0 1px rgba(0,0,0,0.4),
            0 8px 32px rgba(0,0,0,0.45),
            0 2px 8px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.06)
          `,
          animation: "toolbar-rise 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
          maxWidth: isVertical ? "52px" : isMobile ? "calc(100vw - 16px)" : "none",
          maxHeight: isVertical ? "calc(100% - 24px)" : "none",
          overflowX: "hidden",
          overflowY: isVertical ? "auto" : "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        role="toolbar"
        aria-label="Drawing tools"
      >
        {drawingTools.map((tool) => (
          <ToolButton key={tool.type} {...tool} activeTool={activeTool} onToolChange={onToolChange} isMobile={isMobile} />
        ))}
        <Divider isMobile={isMobile} vertical={isVertical} />

        {/* Desktop: all shape/line tools as individual buttons (original behaviour) */}
        {/* Mobile: grouped slots - shapes share one slot, line/arrow share one slot */}
        {!isMobile ? (
          shapeTools.map((tool) => (
            <ToolButton key={tool.type} {...tool} activeTool={activeTool} onToolChange={onToolChange} isMobile={isMobile} />
          ))
        ) : (
          <>
            <GroupToolButton group={shapeGroup} activeTool={activeTool} onToolChange={onToolChange} isMobile={isMobile} />
            <GroupToolButton group={lineGroup} activeTool={activeTool} onToolChange={onToolChange} isMobile={isMobile} />
          </>
        )}

        <Divider isMobile={isMobile} vertical={isVertical} />
        {markTools.map((tool) => (
          <ToolButton key={tool.type} {...tool} activeTool={activeTool} onToolChange={onToolChange} isMobile={isMobile} />
        ))}
        <Divider isMobile={isMobile} vertical={isVertical} />

        {/* Image import */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image  ·  I"
          aria-label="Insert Image"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: isMobile ? "2px" : "3px",
            width: isMobile ? "40px" : "44px", height: isMobile ? "40px" : "44px",
            borderRadius: "10px", border: "none", cursor: "pointer",
            background: "transparent", color: "rgba(200,200,220,0.75)",
            transition: "all 0.18s ease", position: "relative", flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <ImagePlus size={isMobile ? 18 : 17} strokeWidth={1.7} />
          {!isMobile && (
            <span style={{
              fontSize: "8.5px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              letterSpacing: "0.03em", opacity: 0.55, lineHeight: 1, userSelect: "none",
            }}>Image</span>
          )}
          {!isMobile && (
            <span style={{
              position: "absolute", top: "3px", right: "4px", fontSize: "7px",
              fontFamily: "monospace", fontWeight: 700, color: "rgba(150,150,180,0.4)", lineHeight: 1,
            }}>I</span>
          )}
        </button>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

        {/* Undo / Redo - desktop only (mobile version is above toolbar) */}
        {!isMobile && (
          <>
            <Divider isMobile={isMobile} vertical={isVertical} />
            <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
              <ActionButton onClick={onUndo} title="Undo  ·  Ctrl+Z" isMobile={isMobile}>
                <Undo2 size={16} strokeWidth={1.8} />
              </ActionButton>
              <ActionButton onClick={onRedo} title="Redo  ·  Ctrl+Shift+Z" isMobile={isMobile}>
                <Redo2 size={16} strokeWidth={1.8} />
              </ActionButton>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Live class only: the "Tool Orb".
   A single orb sits in the top-left corner and wears the icon of the active tool.
   Tap it and the tools fan out in three quarter-circle rings, grouped by purpose:
     ring 1  pointers : pan, select, erase
     ring 2  marks    : draw, text, image
     ring 3  shapes   : rect, diamond, ellipse, arrow, line
   Picking a tool collapses the fan, so the canvas stays clear while teaching.
   ───────────────────────────────────────────────────────────────────────────── */

const DOCK_ORB = 48;
const DOCK_ITEM = 40;
const DOCK_INSET = (DOCK_ORB - DOCK_ITEM) / 2;

type DockEntry = { type: ToolType | "image"; icon: any; label: string; shortcut: string };

const byType = (list: { type: ToolType; icon: any; label: string; shortcut: string }[], t: ToolType) =>
  list.find((x) => x.type === t)!;

const dockRings: { radius: number; entries: DockEntry[] }[] = [
  {
    radius: 68,
    entries: [byType(drawingTools, "hand"), byType(drawingTools, "selection"), byType(markTools, "eraser")],
  },
  {
    radius: 114,
    entries: [
      byType(markTools, "freedraw"),
      byType(markTools, "text"),
      { type: "image", icon: ImagePlus, label: "Image", shortcut: "I" },
    ],
  },
  {
    radius: 160,
    entries: [
      byType(shapeTools, "rectangle"),
      byType(shapeTools, "diamond"),
      byType(shapeTools, "ellipse"),
      byType(shapeTools, "arrow"),
      byType(shapeTools, "line"),
    ],
  },
];

function ringPosition(radius: number, index: number, count: number) {
  const deg = count === 1 ? 45 : (90 / (count - 1)) * index;
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

function RadialToolDock({ activeTool, onToolChange, onUndo, onRedo, onImageImport }: Omit<ToolbarProps, "embedded">) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => fileInputRef.current?.click();
    window.addEventListener("whiteboard:open-image-picker", handler);
    return () => window.removeEventListener("whiteboard:open-image-picker", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onImageImport(file); e.target.value = ""; }
  };

  const activeEntry =
    dockRings.flatMap((r) => r.entries).find((en) => en.type === activeTool) ?? byType(drawingTools, "selection");
  const OrbIcon = activeEntry.icon;

  const pick = (entry: DockEntry) => {
    if (entry.type === "image") {
      fileInputRef.current?.click();
    } else {
      onToolChange(entry.type);
    }
    setOpen(false);
  };

  let flatIndex = 0;

  return (
    <>
      <style>{`
        @keyframes dock-scrim-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dock-orb-breathe {
          0%, 100% { box-shadow: 0 0 0 1px rgba(139,92,246,0.55), 0 6px 18px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.22); }
          50%      { box-shadow: 0 0 0 1px rgba(139,92,246,0.55), 0 6px 26px rgba(139,92,246,0.6),  inset 0 1px 0 rgba(255,255,255,0.22); }
        }
      `}</style>

      {/* Soft scrim: tapping anywhere outside the fan simply closes it */}
      {open && (
        <div
          onPointerDown={(e) => { e.stopPropagation(); setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 29,
            background: "radial-gradient(circle at 36px 36px, rgba(14,13,22,0.15) 0%, rgba(14,13,22,0.6) 100%)",
            animation: "dock-scrim-in 0.2s ease-out both",
          }}
        />
      )}

      {/* Undo / redo: unchanged position, bottom right */}
      <div style={{
        position: "fixed",
        bottom: "calc(20px + var(--wb-safe-bottom, env(safe-area-inset-bottom, 0px)))",
        right: "max(12px, var(--wb-safe-right, env(safe-area-inset-right, 12px)))",
        zIndex: 31, display: "flex", alignItems: "center", gap: "4px", padding: "4px", borderRadius: "12px",
        background: "rgba(14, 13, 22, 0.82)",
        backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}>
        <ActionButton onClick={onUndo} title="Undo  ·  Ctrl+Z" isMobile>
          <Undo2 size={17} strokeWidth={1.8} />
        </ActionButton>
        <ActionButton onClick={onRedo} title="Redo  ·  Ctrl+Shift+Z" isMobile>
          <Redo2 size={17} strokeWidth={1.8} />
        </ActionButton>
      </div>

      <div
        role="toolbar"
        aria-label="Drawing tools"
        style={{ position: "fixed", top: "12px", left: "12px", width: DOCK_ORB, height: DOCK_ORB, zIndex: 30 }}
      >
        {/* Faint guide arcs that the tools travel along */}
        <svg
          width={DOCK_ORB} height={DOCK_ORB} viewBox={`0 0 ${DOCK_ORB} ${DOCK_ORB}`}
          style={{
            position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none",
            opacity: open ? 1 : 0, transition: "opacity 0.3s ease",
          }}
        >
          {dockRings.map((ring) => {
            const c = DOCK_ORB / 2;
            return (
              <path
                key={ring.radius}
                d={`M ${c + ring.radius} ${c} A ${ring.radius} ${ring.radius} 0 0 1 ${c} ${c + ring.radius}`}
                fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={1} strokeDasharray="2 5" strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* The fanned tools */}
        {dockRings.map((ring) =>
          ring.entries.map((entry, i) => {
            const { x, y } = ringPosition(ring.radius, i, ring.entries.length);
            const delay = open ? flatIndex * 24 : 0;
            flatIndex += 1;
            const Icon = entry.icon;
            const isActive = entry.type === activeTool;
            return (
              <button
                key={entry.type}
                type="button"
                onClick={() => pick(entry)}
                title={`${entry.label}  ·  ${entry.shortcut}`}
                aria-label={entry.label}
                aria-pressed={isActive}
                tabIndex={open ? 0 : -1}
                style={{
                  position: "absolute", left: DOCK_INSET, top: DOCK_INSET, zIndex: 1,
                  width: DOCK_ITEM, height: DOCK_ITEM, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", WebkitTapHighlightColor: "transparent",
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.1)",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(109,40,217,0.98) 100%)"
                    : "rgba(14, 13, 22, 0.9)",
                  backdropFilter: "blur(16px) saturate(160%)", WebkitBackdropFilter: "blur(16px) saturate(160%)",
                  color: isActive ? "#fff" : "rgba(210,210,230,0.85)",
                  boxShadow: isActive
                    ? "0 0 0 1px rgba(139,92,246,0.6), 0 4px 14px rgba(139,92,246,0.45)"
                    : "0 4px 14px rgba(0,0,0,0.45)",
                  transform: open ? `translate(${x}px, ${y}px) scale(1)` : "translate(0px, 0px) scale(0.2)",
                  opacity: open ? 1 : 0,
                  pointerEvents: open ? "auto" : "none",
                  transition: `transform 0.42s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, opacity 0.2s ease ${delay}ms`,
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </button>
            );
          })
        )}

        {/* The orb: shows the active tool, turns into a close button while open */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title={open ? "Close tools" : `Tools  ·  ${activeEntry.label}`}
          aria-label={open ? "Close tools" : "Open tools"}
          aria-expanded={open}
          style={{
            position: "absolute", inset: 0, zIndex: 2,
            width: DOCK_ORB, height: DOCK_ORB, borderRadius: "50%", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", WebkitTapHighlightColor: "transparent",
            background: "linear-gradient(135deg, rgba(139,92,246,0.98) 0%, rgba(109,40,217,1) 100%)",
            animation: open ? "none" : "dock-orb-breathe 3.2s ease-in-out infinite",
            boxShadow: open
              ? "0 0 0 1px rgba(139,92,246,0.6), 0 8px 28px rgba(139,92,246,0.6), inset 0 1px 0 rgba(255,255,255,0.22)"
              : undefined,
            transform: open ? "scale(0.94)" : "scale(1)",
            transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <span style={{
            position: "absolute", display: "grid", placeItems: "center",
            opacity: open ? 0 : 1, transform: open ? "rotate(90deg) scale(0.4)" : "rotate(0deg) scale(1)",
            transition: "all 0.25s ease",
          }}>
            <OrbIcon size={20} strokeWidth={2} />
          </span>
          <span style={{
            position: "absolute", display: "grid", placeItems: "center",
            opacity: open ? 1 : 0, transform: open ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.4)",
            transition: "all 0.25s ease",
          }}>
            <X size={20} strokeWidth={2.2} />
          </span>
        </button>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
      </div>
    </>
  );
}

/** Live class (embedded) gets the Tool Orb. Everywhere else keeps the classic toolbar. */
export default function Toolbar(props: ToolbarProps) {
  if (props.embedded) {
    return (
      <RadialToolDock
        activeTool={props.activeTool}
        onToolChange={props.onToolChange}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
        onImageImport={props.onImageImport}
      />
    );
  }
  return <ClassicToolbar {...props} />;
}