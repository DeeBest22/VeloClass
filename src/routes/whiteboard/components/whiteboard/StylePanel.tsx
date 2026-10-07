import { useEffect, useRef, useState } from "react";
import { STROKE_COLORS, BG_COLORS, STROKE_WIDTHS } from "./types";
import type { ElementStyle } from "./types";
import { cn } from "@/lib/utils";
import { X, Droplets, PaintBucket, SlidersHorizontal, Circle, Minus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "./useResponsive";

interface StylePanelProps {
  style: ElementStyle;
  onChange: (style: ElementStyle) => void;
  visible: boolean;
  /** The live-class board reserves less bottom space than the standalone board. */
  embedded?: boolean;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function CheckerPattern({ id = "checker" }: { id?: string }) {
  return (
    <svg width="100%" height="100%" className="absolute inset-0 rounded-[2px]" style={{ pointerEvents: "none" }}>
      <defs>
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="rgba(150,150,150,0.3)" />
          <rect x="3" y="3" width="3" height="3" fill="rgba(150,150,150,0.3)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function ColorSwatch({
  color, active, onClick, checkerId,
}: { color: string; active: boolean; onClick: () => void; checkerId?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Color ${color}`}
      className={cn(
        "group relative w-4 h-4 rounded-[4px] outline-none transition-all duration-150 shrink-0",
        active
          ? "ring-[1.5px] ring-offset-[1.5px] ring-[hsl(var(--foreground)/0.8)] ring-offset-[hsl(var(--card))] shadow-[0_0_6px_rgba(0,0,0,0.2)]"
          : "hover:brightness-110 hover:ring-1 hover:ring-[hsl(var(--foreground)/0.15)] hover:ring-offset-1 hover:ring-offset-[hsl(var(--card))] active:scale-90",
      )}
      style={color !== "transparent" ? { backgroundColor: color } : undefined}
    >
      {color === "transparent" && <CheckerPattern id={checkerId ?? "checker-sw"} />}
      {active && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" className="drop-shadow-sm">
            <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.5))" }} />
          </svg>
        </div>
      )}
    </button>
  );
}

function Section({ children, label, icon, last = false }: { children: React.ReactNode; label: string; icon?: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn("px-3 py-2.5", !last && "border-b border-[hsl(var(--border)/0.5)]")}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Popover shell ────────────────────────────────────────────────────────────

interface PopoverShellProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  arrowIndex: 0 | 1 | 2;
  icon?: React.ReactNode;
}

function PopoverShell({ title, children, onClose, arrowIndex, icon }: PopoverShellProps) {
  const arrowLeft = [14, 64, 114][arrowIndex];

  return (
    <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 animate-popover-in" style={{ transformOrigin: "bottom left" }}>
      <div
        className="relative w-52 rounded-xl overflow-hidden border border-[hsl(var(--border)/0.6)]"
        style={{
          background: "hsl(var(--card)/0.97)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div className="absolute top-0 inset-x-0 h-[0.5px]" style={{ background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.1) 50%, transparent 90%)" }} />
        <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border)/0.4)]">
          <div className="flex items-center gap-1.5">
            {icon && <span className="text-primary/80">{icon}</span>}
            <span className="text-[10px] font-semibold tracking-[0.08em] text-foreground/90 uppercase">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-[hsl(var(--muted))] transition-all duration-150"
            aria-label="Close"
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        </div>
        {children}
      </div>

      {/* Arrow */}
      <div className="relative h-2" style={{ width: 208 }}>
        <div
          className="absolute overflow-hidden"
          style={{ left: arrowLeft, width: 12, height: 8, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}
        >
          <div
            style={{
              width: 12, height: 12,
              background: "hsl(var(--card)/0.97)",
              border: "1px solid hsl(var(--border)/0.6)",
              transform: "rotate(-45deg)",
              transformOrigin: "top right",
              marginTop: -5,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes popover-in {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-popover-in {
          animation: popover-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </div>
  );
}

// ─── Individual popovers ──────────────────────────────────────────────────────

function StrokePopover({ style, onChange, onClose }: { style: ElementStyle; onChange: (s: ElementStyle) => void; onClose: () => void }) {
  return (
    <PopoverShell title="Stroke" onClose={onClose} arrowIndex={0} icon={<Droplets size={11} />}>
      <Section label="Colors" icon={<Circle size={8} />} last>
        <div className="flex flex-wrap gap-[6px]">
          {STROKE_COLORS.map((c, i) => (
            <ColorSwatch key={c} color={c} active={style.strokeColor === c}
              onClick={() => onChange({ ...style, strokeColor: c })} checkerId={`sc-${i}`} />
          ))}
        </div>
      </Section>
    </PopoverShell>
  );
}

function FillPopover({ style, onChange, onClose }: { style: ElementStyle; onChange: (s: ElementStyle) => void; onClose: () => void }) {
  return (
    <PopoverShell title="Fill" onClose={onClose} arrowIndex={0} icon={<PaintBucket size={11} />}>
      <Section label="Colors" icon={<Circle size={8} />} last>
        <div className="flex flex-wrap gap-[6px]">
          {BG_COLORS.map((c, i) => (
            <ColorSwatch key={c} color={c} active={style.backgroundColor === c}
              onClick={() => onChange({ ...style, backgroundColor: c })} checkerId={`fc-${i}`} />
          ))}
        </div>
      </Section>
    </PopoverShell>
  );
}

function WidthOpacityPopover({ style, onChange, onClose }: { style: ElementStyle; onChange: (s: ElementStyle) => void; onClose: () => void }) {
  const progress = ((style.opacity - 0.1) / 0.9) * 100;
  return (
    <PopoverShell title="Style" onClose={onClose} arrowIndex={0} icon={<SlidersHorizontal size={11} />}>
      <Section label="Stroke width" icon={<Minus size={8} />}>
        <div className="flex gap-1.5">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => onChange({ ...style, strokeWidth: w })}
              className={cn(
                "flex-1 flex items-center justify-center py-2 rounded-lg border transition-all duration-200",
                style.strokeWidth === w
                  ? "border-[hsl(var(--foreground)/0.3)] bg-[hsl(var(--foreground)/0.08)] shadow-sm"
                  : "border-[hsl(var(--border)/0.5)] bg-transparent hover:bg-[hsl(var(--muted)/0.5)]"
              )}
            >
              <div
                className={cn("w-4 rounded-full transition-colors", style.strokeWidth === w ? "bg-foreground" : "bg-muted-foreground/50")}
                style={{ height: Math.max(w, 1.5) }}
              />
            </button>
          ))}
        </div>
      </Section>
      <Section label="Opacity" last>
        <div className="flex items-center gap-2">
          <input
            type="range" min="0.1" max="1" step="0.05"
            value={style.opacity}
            className="slider-track flex-1"
            style={{ "--progress": `${progress}%` } as React.CSSProperties}
            onChange={(e) => onChange({ ...style, opacity: parseFloat(e.target.value) })}
          />
          <span className="text-[10px] font-semibold text-foreground/70 w-8 text-right tabular-nums">
            {Math.round(style.opacity * 100)}%
          </span>
        </div>
      </Section>
    </PopoverShell>
  );
}

// ─── Trigger button ───────────────────────────────────────────────────────────

function TriggerButton({ children, label, isActive, onClick }: {
  children: React.ReactNode; label: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "relative w-10 h-10 rounded-xl border transition-all duration-200 active:scale-90",
        "flex items-center justify-center",
        isActive
          ? "bg-foreground border-foreground shadow-lg scale-105"
          : "bg-card/90 border-[hsl(var(--border)/0.6)] hover:border-[hsl(var(--foreground)/0.3)] hover:shadow-md backdrop-blur-sm",
      )}
    >
      {children}
    </button>
  );
}

// ─── Mobile 3-button trigger group ───────────────────────────────────────────

type ActivePanel = "stroke" | "fill" | "width" | null;

function MobileStyleButtons({ style, onChange, embedded = false }: { style: ElementStyle; onChange: (s: ElementStyle) => void; embedded?: boolean }) {
  const [active, setActive] = useState<ActivePanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = (panel: ActivePanel) => setActive((prev) => (prev === panel ? null : panel));

  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="fixed z-30 flex items-center gap-1.5"
      style={{
        bottom: embedded
          ? "calc(20px + var(--wb-safe-bottom, env(safe-area-inset-bottom, 0px)))"
          : "calc(5rem + var(--wb-safe-bottom, env(safe-area-inset-bottom, 0px)))",
        left: "max(0.75rem, var(--wb-safe-left, env(safe-area-inset-left, 0.75rem)))",
      }}
    >
      <TriggerButton label="Stroke color" isActive={active === "stroke"} onClick={() => toggle("stroke")}>
        <Droplets size={16} className={cn("transition-colors", active === "stroke" ? "text-background" : "text-foreground/70")} strokeWidth={2} />
      </TriggerButton>

      <TriggerButton label="Fill color" isActive={active === "fill"} onClick={() => toggle("fill")}>
        <PaintBucket size={16} className={cn("transition-colors", active === "fill" ? "text-background" : "text-foreground/70")} strokeWidth={2} />
      </TriggerButton>

      <TriggerButton label="Width and opacity" isActive={active === "width"} onClick={() => toggle("width")}>
        <SlidersHorizontal size={16} className={cn("transition-colors", active === "width" ? "text-background" : "text-foreground/70")} strokeWidth={2} />
      </TriggerButton>

      {active === "stroke" && <StrokePopover style={style} onChange={onChange} onClose={() => setActive(null)} />}
      {active === "fill"   && <FillPopover   style={style} onChange={onChange} onClose={() => setActive(null)} />}
      {active === "width"  && <WidthOpacityPopover style={style} onChange={onChange} onClose={() => setActive(null)} />}
    </div>
  );
}

// ─── Desktop content ──────────────────────────────────────────────────────────

function DesktopContent({ style, onChange }: { style: ElementStyle; onChange: (s: ElementStyle) => void }) {
  const progress = ((style.opacity - 0.1) / 0.9) * 100;
  return (
    <>
      <Section label="Stroke" icon={<Droplets size={9} />}>
        <div className="flex flex-wrap gap-[6px]">
          {STROKE_COLORS.map((c, i) => (
            <ColorSwatch key={c} color={c} active={style.strokeColor === c} onClick={() => onChange({ ...style, strokeColor: c })} checkerId={`ds-${i}`} />
          ))}
        </div>
      </Section>
      <Section label="Fill" icon={<PaintBucket size={9} />}>
        <div className="flex flex-wrap gap-[6px]">
          {BG_COLORS.map((c, i) => (
            <ColorSwatch key={c} color={c} active={style.backgroundColor === c} onClick={() => onChange({ ...style, backgroundColor: c })} checkerId={`df-${i}`} />
          ))}
        </div>
      </Section>
      <Section label="Width" icon={<Minus size={9} />}>
        <div className="flex gap-1.5">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => onChange({ ...style, strokeWidth: w })}
              className={cn(
                "flex-1 flex items-center justify-center py-2 rounded-lg border transition-all duration-200",
                style.strokeWidth === w
                  ? "border-[hsl(var(--foreground)/0.3)] bg-[hsl(var(--foreground)/0.08)] shadow-sm"
                  : "border-[hsl(var(--border)/0.5)] bg-transparent hover:bg-[hsl(var(--muted)/0.5)]"
              )}
            >
              <div
                className={cn("w-4 rounded-full transition-colors", style.strokeWidth === w ? "bg-foreground" : "bg-muted-foreground/50")}
                style={{ height: Math.max(w, 1.5) }}
              />
            </button>
          ))}
        </div>
      </Section>
      <Section label="Opacity" icon={<Droplets size={9} />} last>
        <div className="flex items-center gap-2">
          <input
            type="range" min="0.1" max="1" step="0.05"
            value={style.opacity}
            className="slider-track flex-1"
            style={{ "--progress": `${progress}%` } as React.CSSProperties}
            onChange={(e) => onChange({ ...style, opacity: parseFloat(e.target.value) })}
          />
          <span className="text-[10px] font-semibold text-foreground/70 w-8 text-right tabular-nums">
            {Math.round(style.opacity * 100)}%
          </span>
        </div>
      </Section>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function StylePanel({ style, onChange, visible, embedded = false }: StylePanelProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  if (!visible) return null;

  if (isMobile) {
    return <MobileStyleButtons style={style} onChange={onChange} embedded={embedded} />;
  }

  // On iPad/tablet the toolbar sits at the top-centre and the style panel's
  // default 0.75rem top would overlap it. Push it down to clear the toolbar
  // (~56px tall) with extra breathing room. Desktop and phone are untouched.
  const panelTop = isTablet
    ? "calc(6.5rem + var(--wb-safe-top, env(safe-area-inset-top, 0px)))"
    : "calc(0.75rem + var(--wb-safe-top, env(safe-area-inset-top, 0px)))";

  return (
    <div
      className="fixed left-4 z-30 w-52 rounded-xl bg-card/95 border border-[hsl(var(--border)/0.6)] animate-panel-in overflow-hidden"
      style={{
        top: panelTop,
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="absolute top-0 inset-x-0 h-[0.5px]" style={{ background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.08) 50%, transparent 90%)" }} />
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[hsl(var(--border)/0.4)]">
        <SlidersHorizontal size={11} className="text-primary/70" />
        <span className="text-[10px] font-semibold tracking-[0.08em] text-foreground/90 uppercase">Style</span>
      </div>
      <DesktopContent style={style} onChange={onChange} />
    </div>
  );
}
