import { useEffect, useRef, useState } from "react";
import { STROKE_COLORS, BG_COLORS, STROKE_WIDTHS } from "./types";
import type { ElementStyle } from "./types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

interface StylePanelProps {
  style: ElementStyle;
  onChange: (style: ElementStyle) => void;
  visible: boolean;
}

function CheckerPattern() {
  return (
    <svg width="100%" height="100%" className="absolute inset-0 rounded-[3px]">
      <pattern id="checker" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="3" height="3" fill="hsl(var(--muted-foreground) / 0.3)" />
        <rect x="3" y="3" width="3" height="3" fill="hsl(var(--muted-foreground) / 0.3)" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#checker)" />
    </svg>
  );
}

function Section({ children, label, last = false }: { children: React.ReactNode; label: string; last?: boolean }) {
  return (
    <div className={cn("px-4 py-3", !last && "border-b border-panel-border")}>
      <span className="block text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2.5">
        {label}
      </span>
      {children}
    </div>
  );
}

function ColorSwatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-md transition-all duration-150 outline-none",
        "active:scale-95",
        "w-7 h-7 md:w-6 md:h-6",
        active && "swatch-ring scale-110"
      )}
      style={color !== "transparent" ? { backgroundColor: color } : undefined}
      aria-label={`Color ${color}`}
    >
      {color === "transparent" && <CheckerPattern />}
    </button>
  );
}

function StylePanelContent({ style, onChange }: { style: ElementStyle; onChange: (style: ElementStyle) => void }) {
  const progress = ((style.opacity - 0.1) / 0.9) * 100;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-panel-border">
        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
        <span className="text-[11px] font-mono font-semibold tracking-[0.08em] text-foreground">
          STYLE
        </span>
      </div>

      {/* Stroke Color */}
      <Section label="Stroke">
        <div className="flex flex-wrap gap-2 md:gap-1.5">
          {STROKE_COLORS.map((c) => (
            <ColorSwatch key={c} color={c} active={style.strokeColor === c} onClick={() => onChange({ ...style, strokeColor: c })} />
          ))}
        </div>
      </Section>

      {/* Fill Color */}
      <Section label="Fill">
        <div className="flex flex-wrap gap-2 md:gap-1.5">
          {BG_COLORS.map((c) => (
            <ColorSwatch key={c} color={c} active={style.backgroundColor === c} onClick={() => onChange({ ...style, backgroundColor: c })} />
          ))}
        </div>
      </Section>

      {/* Stroke Width */}
      <Section label="Width">
        <div className="flex gap-2 md:gap-1.5">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => onChange({ ...style, strokeWidth: w })}
              className={cn(
                "flex-1 flex items-center justify-center py-2.5 md:py-2 rounded-lg border transition-all duration-150",
                "text-xs font-mono font-medium",
                style.strokeWidth === w
                  ? "border-primary bg-primary/15 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.2)]"
                  : "border-panel-border bg-panel-surface text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-5 rounded-full transition-colors",
                  style.strokeWidth === w ? "bg-primary" : "bg-muted-foreground"
                )}
                style={{ height: Math.max(w, 1.5) }}
              />
            </button>
          ))}
        </div>
      </Section>

      {/* Opacity */}
      <Section label="Opacity" last>
        <div className="flex items-center gap-3">
          <input
            type="range" min="0.1" max="1" step="0.05"
            value={style.opacity}
            className="slider-track flex-1"
            style={{ "--progress": `${progress}%` } as React.CSSProperties}
            onChange={(e) => onChange({ ...style, opacity: parseFloat(e.target.value) })}
          />
          <span className="text-xs font-mono font-semibold text-primary w-9 text-right tabular-nums">
            {Math.round(style.opacity * 100)}%
          </span>
        </div>
      </Section>
    </>
  );
}

export default function StylePanel({ style, onChange, visible }: StylePanelProps) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // On mobile, visible prop triggers drawer
  useEffect(() => {
    if (isMobile && visible) {
      setMobileOpen(true);
    }
  }, [isMobile, visible]);

  if (!visible) return null;

  // Desktop: fixed left sidebar (unchanged from original)
  if (!isMobile) {
    return (
      <div className="fixed left-4 top-3 z-30 w-56 rounded-xl bg-card border border-border panel-shadow animate-panel-in overflow-hidden">
        <StylePanelContent style={style} onChange={onChange} />
      </div>
    );
  }

  // Mobile: bottom drawer
  if (!mobileOpen) {
    return (
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 bottom-20 z-30 w-10 h-10 rounded-xl bg-card border border-border panel-shadow
          flex items-center justify-center text-foreground animate-fade-in"
        aria-label="Open style panel"
      >
        <div className="w-4 h-4 rounded-sm border-2 border-primary" style={{ backgroundColor: style.backgroundColor === "transparent" ? "transparent" : style.backgroundColor }} />
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="drawer-overlay" onClick={() => setMobileOpen(false)} />
      {/* Drawer */}
      <div ref={panelRef} className="drawer-content panel-shadow">
        <div className="drawer-handle" />
        <div className="flex items-center justify-between px-4 pt-1 pb-0">
          <span className="text-xs font-mono font-semibold text-foreground tracking-wide">STYLE</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground"
            aria-label="Close style panel"
          >
            <X size={16} />
          </button>
        </div>
        <StylePanelContent style={style} onChange={onChange} />
      </div>
    </>
  );
}

