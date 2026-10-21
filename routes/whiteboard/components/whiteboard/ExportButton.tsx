import { useState, useRef, useEffect } from "react";
import { Share, FileImage, FileCode, Sparkles, Check, X } from "lucide-react";
import type { WhiteboardElement, Viewport } from "./types";
import { renderForExport } from "./renderer";
import { useIsMobile } from "@/hooks/use-mobile";

interface ExportButtonProps {
  elements: WhiteboardElement[];
  viewport: Viewport;
}

const exportOptions = [
  { id: "png-all", label: "Image", description: "High-res PNG of everything", icon: FileImage, fmt: "png" as const, scope: "all" as const },
  { id: "png-view", label: "Snapshot", description: "PNG of your current view", icon: Sparkles, fmt: "png" as const, scope: "view" as const },
  { id: "svg-all", label: "Vector", description: "Scalable SVG for any size", icon: FileCode, fmt: "svg" as const, scope: "all" as const },
];

export default function ExportButton({ elements, viewport }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const active = (elements ?? []).filter((el) => !el.isDeleted);
  const isEmpty = active.length === 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const doExport = async (id: string, format: "png" | "svg", scope: "view" | "all") => {
    if (isEmpty) return;
    setExporting(id);
    setDone(null);
    try {
      if (format === "png") await exportPNG(active, viewport, scope);
      else exportSVG(active, viewport, scope);
      setDone(id);
      setTimeout(() => { setDone(null); setOpen(false); }, 1200);
    } finally {
      setExporting(null);
    }
  };

  const exportContent = (
    <>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Download canvas</p>
          {isMobile && (
            <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground" aria-label="Close">
              <X size={16} />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">Choose a format to save your work</p>
      </div>
      <div className="px-2 pb-2 flex flex-col gap-1">
        {exportOptions.map(({ id, label, description, icon: Icon, fmt, scope }) => {
          const isExporting = exporting === id;
          const isDone = done === id;
          return (
            <button
              key={id}
              onClick={() => doExport(id, fmt, scope)}
              disabled={isEmpty || isExporting}
              className={`
                group/item relative flex items-center gap-3 w-full px-3 py-3.5 md:py-3
                rounded-xl text-left transition-all duration-150
                ${isDone ? "bg-green-950/30" : "hover:bg-secondary/80 active:scale-[0.98]"}
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              <div className={`
                flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg shrink-0 transition-colors duration-150
                ${isDone ? "bg-green-900/40 text-green-400" : "bg-secondary text-muted-foreground"}
              `}>
                {isDone ? <Check size={16} strokeWidth={2.5} /> :
                 isExporting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> :
                 <Icon size={16} strokeWidth={1.8} />}
              </div>
              <div className="min-w-0">
                <p className={`text-[13px] font-medium leading-tight ${isDone ? "text-green-400" : "text-foreground"}`}>
                  {isDone ? "Saved!" : label}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{description}</p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground/70 text-center">
          {isEmpty ? "Add elements to the canvas to export" : `${active.length} element${active.length !== 1 ? "s" : ""} on canvas`}
        </p>
      </div>
    </>
  );

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          group flex items-center justify-center h-9 w-9 rounded-xl
          transition-all duration-200 select-none
          ${open
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            : "bg-card text-foreground border border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/10"
          }
        `}
        title="Export canvas"
        aria-label="Export canvas"
      >
        <Share size={14} strokeWidth={2} className={`transition-transform duration-200 ${open ? "rotate-12" : ""}`} />
      </button>

      {open && !isMobile && (
        <div
          className="absolute top-full right-0 mt-2 z-50 w-64 rounded-2xl bg-card/95 backdrop-blur-xl border border-border overflow-hidden animate-panel-in"
          style={{ boxShadow: "0 4px 16px hsl(220 20% 10% / 0.08), 0 16px 48px hsl(220 20% 10% / 0.12)" }}
        >
          {exportContent}
        </div>
      )}

      {open && isMobile && (
        <>
          <div className="drawer-overlay" onClick={() => setOpen(false)} />
          <div className="drawer-content panel-shadow">
            <div className="drawer-handle" />
            {exportContent}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PNG export ───────────────────────────────────────────────────────────────
async function exportPNG(elements: WhiteboardElement[], viewport: Viewport, scope: "view" | "all") {
  const PADDING = 40;
  const DPR = 2;
  let vp: Viewport, canvasW: number, canvasH: number;

  if (scope === "all" && elements.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      const pts = el.points ?? [];
      if (pts.length > 0) {
        for (const p of pts) { minX = Math.min(minX, el.x + p.x); minY = Math.min(minY, el.y + p.y); maxX = Math.max(maxX, el.x + p.x); maxY = Math.max(maxY, el.y + p.y); }
      } else { minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.width); maxY = Math.max(maxY, el.y + el.height); }
    }
    canvasW = maxX - minX + PADDING * 2; canvasH = maxY - minY + PADDING * 2;
    vp = { x: -minX + PADDING, y: -minY + PADDING, zoom: 1 };
  } else {
    canvasW = window.innerWidth; canvasH = window.innerHeight; vp = viewport;
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasW * DPR; canvas.height = canvasH * DPR;
  Object.defineProperty(canvas, "clientWidth", { get: () => canvasW });
  Object.defineProperty(canvas, "clientHeight", { get: () => canvasH });
  renderForExport(canvas, elements, vp);
  await new Promise((r) => setTimeout(r, 60));
  renderForExport(canvas, elements, vp);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `canvas-${Date.now()}.png`; a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

// ─── SVG export ───────────────────────────────────────────────────────────────
function exportSVG(elements: WhiteboardElement[], _viewport: Viewport, _scope: "view" | "all") {
  const PADDING = 40;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const pts = el.points ?? [];
    if (pts.length > 0) {
      for (const p of pts) { minX = Math.min(minX, el.x + p.x); minY = Math.min(minY, el.y + p.y); maxX = Math.max(maxX, el.x + p.x); maxY = Math.max(maxY, el.y + p.y); }
    } else { minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.width); maxY = Math.max(maxY, el.y + el.height); }
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
  const vbX = minX - PADDING, vbY = minY - PADDING, vbW = maxX - minX + PADDING * 2, vbH = maxY - minY + PADDING * 2;

  const shapes = elements.map((el) => {
    const t = `rotate(${((el.angle || 0) * 180) / Math.PI} ${el.x + el.width / 2} ${el.y + el.height / 2})`;
    const stroke = el.style.strokeColor;
    const fill = el.style.backgroundColor === "transparent" ? "none" : el.style.backgroundColor;
    const sw = el.style.strokeWidth; const op = el.style.opacity;
    switch (el.type) {
      case "rectangle": { const r = Math.min(16, el.width * 0.12, el.height * 0.12); return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${r}" ry="${r}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}" transform="${t}"/>`; }
      case "ellipse": { const cx = el.x + el.width / 2, cy = el.y + el.height / 2; return `<ellipse cx="${cx}" cy="${cy}" rx="${el.width / 2}" ry="${el.height / 2}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}" transform="${t}"/>`; }
      case "diamond": { const cx = el.x + el.width / 2, cy = el.y + el.height / 2; const pts = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`; return `<polygon points="${pts}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}" transform="${t}"/>`; }
      case "line": case "arrow": { const x2 = el.x + el.width, y2 = el.y + el.height; return `<line x1="${el.x}" y1="${el.y}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="round"/>`; }
      case "freedraw": { if (!el.points || el.points.length < 2) return ""; const d = el.points.map((p, i) => `${i === 0 ? "M" : "L"}${el.x + p.x},${el.y + p.y}`).join(" "); return `<path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="none" opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`; }
      case "text": { if (!el.text) return ""; const lines = el.text.split("\n"); const fs = el.fontSize ?? 28; const lh = fs * 1.35; const totalH = lines.length * lh; const yStart = el.y + Math.max(0, (el.height - totalH) / 2) + fs; return lines.map((line, i) => `<text x="${el.x}" y="${yStart + i * lh}" font-size="${fs}" fill="${stroke}" opacity="${op}" font-family="'Patrick Hand', cursive" transform="${t}">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`).join("\n"); }
      case "image": { if (!el.imageData) return ""; return `<image href="${el.imageData}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" opacity="${op}" transform="${t}" preserveAspectRatio="xMidYMid meet"/>`; }
      default: return "";
    }
  }).join("\n  ");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${vbW}" height="${vbH}">\n  <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="white"/>\n  ${shapes}\n</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `canvas-${Date.now()}.svg`; a.click();
  URL.revokeObjectURL(url);
}
