import rough from "roughjs";
import {
  TEXT_FONT_FAMILY,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  getLineWidth,
  fitTextInBox,
  MIN_FONT_SIZE,
} from "./TextTool";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { WhiteboardElement, Viewport } from "./types";
import { getResizeHandles } from "./math";

let rc: RoughCanvas | null = null;

// ── Image cache: keyed by data URL to avoid re-decoding every frame ──────────
const imageCache = new Map<string, HTMLImageElement>();
function getCachedImage(src: string): HTMLImageElement {
  if (imageCache.has(src)) return imageCache.get(src)!;
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img;
}

function getRoughCanvas(canvas: HTMLCanvasElement): RoughCanvas {
  if (!rc) rc = rough.canvas(canvas);
  return rc;
}

export function resetRoughCanvas() {
  rc = null;
}

function getRoughOptions(el: WhiteboardElement) {
  return {
    seed: el.seed,
    stroke: el.style.strokeColor,
    strokeWidth: el.style.strokeWidth,
    fill: el.style.backgroundColor === "transparent" ? undefined : el.style.backgroundColor,
    fillStyle: el.style.fillStyle,
    roughness: el.style.roughness,
  };
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number, size: number,
  color: string, lineWidth: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
  ctx.restore();
}

function renderElement(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  el: WhiteboardElement,
) {
  if (el.isDeleted) return;

  const roughCanvas = getRoughCanvas(canvas);
  const opts = getRoughOptions(el);

  ctx.save();
  ctx.globalAlpha = el.style.opacity;

  if (el.angle) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(el.angle);
    ctx.translate(-cx, -cy);
  }

  switch (el.type) {
    case "rectangle": {
      const r = Math.min(16, el.width * 0.12, el.height * 0.12);
      const { x, y, width: w, height: h } = el;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (el.style.backgroundColor !== "transparent") {
        ctx.fillStyle = el.style.backgroundColor;
        ctx.fill();
      }
      ctx.strokeStyle = el.style.strokeColor;
      ctx.lineWidth = el.style.strokeWidth;
      ctx.lineJoin = "round";
      ctx.stroke();
      break;
    }

    case "diamond": {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = el.width * 0.06;
      const ry = el.height * 0.06;
      const top    = { x: cx,              y: el.y             };
      const right  = { x: el.x + el.width, y: cy               };
      const bottom = { x: cx,              y: el.y + el.height  };
      const left   = { x: el.x,            y: cy               };
      ctx.beginPath();
      ctx.moveTo(top.x - rx, top.y + ry);
      ctx.quadraticCurveTo(top.x, top.y, top.x + rx, top.y + ry);
      ctx.lineTo(right.x - rx, right.y - ry);
      ctx.quadraticCurveTo(right.x, right.y, right.x - rx, right.y + ry);
      ctx.lineTo(bottom.x + rx, bottom.y - ry);
      ctx.quadraticCurveTo(bottom.x, bottom.y, bottom.x - rx, bottom.y - ry);
      ctx.lineTo(left.x + rx, left.y + ry);
      ctx.quadraticCurveTo(left.x, left.y, left.x + rx, left.y - ry);
      ctx.closePath();
      if (el.style.backgroundColor !== "transparent") {
        ctx.fillStyle = el.style.backgroundColor;
        ctx.fill();
      }
      ctx.strokeStyle = el.style.strokeColor;
      ctx.lineWidth = el.style.strokeWidth;
      ctx.lineJoin = "round";
      ctx.stroke();
      break;
    }

    case "ellipse": {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
      if (el.style.backgroundColor !== "transparent") {
        ctx.fillStyle = el.style.backgroundColor;
        ctx.fill();
      }
      ctx.strokeStyle = el.style.strokeColor;
      ctx.lineWidth = el.style.strokeWidth;
      ctx.stroke();
      break;
    }

    case "line": {
      if (el.bendPoint) {
        ctx.strokeStyle = el.style.strokeColor;
        ctx.lineWidth = el.style.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.quadraticCurveTo(
          el.x + el.bendPoint.x,
          el.y + el.bendPoint.y,
          el.x + el.width,
          el.y + el.height,
        );
        ctx.stroke();
      } else {
        roughCanvas.line(el.x, el.y, el.x + el.width, el.y + el.height, opts);
      }
      break;
    }

    case "arrow": {
      const x1 = el.x, y1 = el.y;
      const x2 = el.x + el.width, y2 = el.y + el.height;
      if (el.bendPoint) {
        const cpx = el.x + el.bendPoint.x;
        const cpy = el.y + el.bendPoint.y;
        ctx.strokeStyle = el.style.strokeColor;
        ctx.lineWidth = el.style.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpx, cpy, x2, y2);
        ctx.stroke();
        const angle = Math.atan2(y2 - cpy, x2 - cpx);
        const headSize = Math.max(15, el.style.strokeWidth * 5);
        drawArrowhead(ctx, x2, y2, angle, headSize, el.style.strokeColor, el.style.strokeWidth);
      } else {
        roughCanvas.line(x1, y1, x2, y2, opts);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headSize = Math.max(15, el.style.strokeWidth * 5);
        drawArrowhead(ctx, x2, y2, angle, headSize, el.style.strokeColor, el.style.strokeWidth);
      }
      break;
    }

    case "freedraw": {
      if (!el.points || el.points.length < 2) break;
      ctx.strokeStyle = el.style.strokeColor;
      ctx.lineWidth = el.style.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        const prev = el.points[i - 1];
        const curr = el.points[i];
        const mx = el.x + (prev.x + curr.x) / 2;
        const my = el.y + (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(el.x + prev.x, el.y + prev.y, mx, my);
      }
      const last = el.points[el.points.length - 1];
      ctx.lineTo(el.x + last.x, el.y + last.y);
      ctx.stroke();
      break;
    }

    case "text": {
      const displayText = el.text || el.originalText || "";
      if (!displayText) break;

      // ── STRICT CONTAINMENT ──────────────────────────────────────────────
      // Compute the font size that actually fits the stored text inside the
      // element box RIGHT NOW. We never blindly trust el.fontSize because
      // the box may have changed (resize, load from history, etc.).
      const hintSize = el.fontSize ?? DEFAULT_TEXT_FONT_SIZE;
      const fit = fitTextInBox(displayText, el.width, el.height, hintSize);
      const fontSize   = fit.fontSize;
      const lines      = fit.text.split("\n");
      const lineHeightPx = fontSize * DEFAULT_LINE_HEIGHT;
      const totalTextH   = lines.length * lineHeightPx;

      ctx.font = `${fontSize}px ${TEXT_FONT_FAMILY}`;
      ctx.fillStyle = el.style.strokeColor;
      ctx.textBaseline = "top";

      // Set a clip rect matching the element box so nothing bleeds out,
      // even if floating-point math gives us 1–2px extra.
      ctx.save();
      ctx.beginPath();
      ctx.rect(el.x, el.y, el.width, el.height);
      ctx.clip();

      // Vertically centre the text block within the box
      const yOffset = Math.max(0, (el.height - totalTextH) / 2);
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + yOffset + i * lineHeightPx);
      });

      ctx.restore(); // pops the clip
      break;
    }

    case "image": {
      if (!el.imageData) {
        // Placeholder — grey rect while no data
        ctx.fillStyle = "hsl(220 10% 88%)";
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.strokeStyle = "hsl(220 10% 70%)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      } else {
        const img = getCachedImage(el.imageData);
        ctx.save();
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.width, el.height);
        ctx.clip();
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, el.x, el.y, el.width, el.height);
        } else {
          // Still loading — grey placeholder; next RAF will repaint
          ctx.fillStyle = "hsl(220 10% 88%)";
          ctx.fillRect(el.x, el.y, el.width, el.height);
        }
        ctx.restore();
        // Subtle bounding border
        ctx.strokeStyle = "hsl(220 10% 75% / 0.6)";
        ctx.lineWidth = 1;
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      }
      break;
    }
  }

  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  width: number,
  height: number,
) {
  // Clean square grid: one-device-pixel hairlines, very faint, even 50px cells.
  let gap = 50 * vp.zoom;
  // When zoomed far out, merge cells so the grid never turns into noise.
  while (gap < 25) gap *= 2;
  const offsetX = vp.x % gap;
  const offsetY = vp.y % gap;
  const cssVal = getComputedStyle(document.documentElement)
    .getPropertyValue("--canvas-dot").trim();

  // Snap in DEVICE pixels (not CSS pixels) so a line is always exactly one
  // physical pixel wide, even at fractional scales like 125% / 150%.
  const dpr = window.devicePixelRatio || 1;
  const snap = (v: number) => (Math.round(v * dpr) + 0.5) / dpr;

  ctx.save();
  ctx.strokeStyle = `hsl(${cssVal || "220 10% 82%"})`;
  ctx.globalAlpha = 0.25; // matches reference: darkest grid pixel ~rgb(245,246,247)
  ctx.lineWidth = 1 / dpr;
  ctx.beginPath();
  for (let x = offsetX; x < width; x += gap) {
    const px = snap(x);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
  }
  for (let y = offsetY; y < height; y += gap) {
    const py = snap(y);
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
  }
  ctx.stroke();
  ctx.restore();
}

function rotatePoint(px: number, py: number, cx: number, cy: number, angle: number) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = px - cx, dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  el: WhiteboardElement,
  vp: Viewport,
) {
  const accentColor = "hsl(230 80% 56%)";

  const bounds = el.type === "freedraw" && el.points
    ? (() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of el.points!) {
          minX = Math.min(minX, el.x + p.x); minY = Math.min(minY, el.y + p.y);
          maxX = Math.max(maxX, el.x + p.x); maxY = Math.max(maxY, el.y + p.y);
        }
        return { x: minX - 4, y: minY - 4, w: maxX - minX + 8, h: maxY - minY + 8 };
      })()
    : (el.type === "line" || el.type === "arrow")
      ? null
      : { x: el.x - 4, y: el.y - 4, w: el.width + 8, h: el.height + 8 };

  ctx.save();

  if (bounds) {
    const sceneCorners = [
      { x: bounds.x,            y: bounds.y            },
      { x: bounds.x + bounds.w, y: bounds.y            },
      { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
      { x: bounds.x,            y: bounds.y + bounds.h },
    ];
    const angle = el.angle || 0;
    const sceneCx = el.x + el.width / 2;
    const sceneCy = el.y + el.height / 2;
    const screenCorners = sceneCorners.map(c => {
      const r = rotatePoint(c.x, c.y, sceneCx, sceneCy, angle);
      return { x: r.x * vp.zoom + vp.x, y: r.y * vp.zoom + vp.y };
    });

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(screenCorners[i].x, screenCorners[i].y);
    ctx.closePath();
    ctx.stroke();

    const handleSize = 8;
    const handleRadius = 2.5;
    for (const c of screenCorners) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      const hx = c.x - handleSize / 2;
      const hy = c.y - handleSize / 2;
      ctx.beginPath();
      ctx.moveTo(hx + handleRadius, hy);
      ctx.lineTo(hx + handleSize - handleRadius, hy);
      ctx.quadraticCurveTo(hx + handleSize, hy, hx + handleSize, hy + handleRadius);
      ctx.lineTo(hx + handleSize, hy + handleSize - handleRadius);
      ctx.quadraticCurveTo(hx + handleSize, hy + handleSize, hx + handleSize - handleRadius, hy + handleSize);
      ctx.lineTo(hx + handleRadius, hy + handleSize);
      ctx.quadraticCurveTo(hx, hy + handleSize, hx, hy + handleSize - handleRadius);
      ctx.lineTo(hx, hy + handleRadius);
      ctx.quadraticCurveTo(hx, hy, hx + handleRadius, hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    const topMidScene = {
      x: (sceneCorners[0].x + sceneCorners[1].x) / 2,
      y: (sceneCorners[0].y + sceneCorners[1].y) / 2,
    };
    const rotHandleScene = rotatePoint(topMidScene.x, topMidScene.y, sceneCx, sceneCy, angle);
    const topEdgeAngle = angle - Math.PI / 2;
    const rotX = rotHandleScene.x * vp.zoom + vp.x + Math.cos(topEdgeAngle) * 20;
    const rotY = rotHandleScene.y * vp.zoom + vp.y + Math.sin(topEdgeAngle) * 20;
    ctx.beginPath();
    ctx.arc(rotX, rotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (el.type === "line" || el.type === "arrow") {
    const handles = getResizeHandles(el);
    const handleSize = 8;
    for (const h of handles) {
      const hx = h.x * vp.zoom + vp.x;
      const hy = h.y * vp.zoom + vp.y;
      if (h.handle === "bend") {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "hsl(340 70% 55%)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (el.bendPoint) {
          const midX = (el.x + el.x + el.width) / 2;
          const midY = (el.y + el.y + el.height) / 2;
          const msx = midX * vp.zoom + vp.x;
          const msy = midY * vp.zoom + vp.y;
          ctx.strokeStyle = "hsl(340 70% 55% / 0.4)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(msx, msy);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // Endpoint handles: hollow circles
        const endpointR = 6;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(hx, hy, endpointR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

export function render(
  canvas: HTMLCanvasElement,
  elements: WhiteboardElement[],
  vp: Viewport,
  selectedIds: Set<string>,
  selectionRect?: { x: number; y: number; width: number; height: number } | null,
  editingTextId?: string | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  resetRoughCanvas();

  const bgColor = getComputedStyle(document.documentElement).getPropertyValue("--canvas-bg").trim();
  ctx.fillStyle = `hsl(${bgColor || "0 0% 100%"})`;
  ctx.fillRect(0, 0, w, h);

  drawGrid(ctx, vp, w, h);

  ctx.save();
  ctx.translate(vp.x, vp.y);
  ctx.scale(vp.zoom, vp.zoom);

  for (const el of elements) {
    if (editingTextId && el.id === editingTextId) continue;
    renderElement(canvas, ctx, el);
  }

  ctx.restore();

  for (const el of elements) {
    if (selectedIds.has(el.id) && !el.isDeleted && el.id !== editingTextId) {
      drawSelectionBox(ctx, el, vp);
    }
  }

  if (selectionRect) {
    ctx.save();
    ctx.strokeStyle = "hsl(230 80% 56%)";
    ctx.fillStyle = "hsla(230, 80%, 56%, 0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const sr = selectionRect;
    const sx = sr.x * vp.zoom + vp.x;
    const sy = sr.y * vp.zoom + vp.y;
    ctx.fillRect(sx, sy, sr.width * vp.zoom, sr.height * vp.zoom);
    ctx.strokeRect(sx, sy, sr.width * vp.zoom, sr.height * vp.zoom);
    ctx.restore();
  }
}

/**
 * Clean export render — white background, no dot grid, no selection handles.
 * The canvas must already have .width / .height set by the caller (ExportButton).
 */
export function renderForExport(
  canvas: HTMLCanvasElement,
  elements: WhiteboardElement[],
  vp: Viewport,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = 2; // caller already sized the canvas at 2×
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  resetRoughCanvas();

  // Pure white background — no dot grid for clean export
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(vp.x, vp.y);
  ctx.scale(vp.zoom, vp.zoom);

  for (const el of elements) {
    if (!el.isDeleted) renderElement(canvas, ctx, el);
  }

  ctx.restore();
}