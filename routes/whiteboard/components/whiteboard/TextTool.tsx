import { useRef, useEffect, useCallback } from "react";
import type { WhiteboardElement, Viewport } from "./types";
import { sceneToScreen } from "./math";

export const TEXT_FONT_FAMILY = "'Patrick Hand', cursive, sans-serif";
export const DEFAULT_TEXT_FONT_SIZE = 28;
export const DEFAULT_LINE_HEIGHT = 1.35;
export const MIN_TEXT_WIDTH = 60;
export const MIN_TEXT_HEIGHT = 36;
export const MIN_FONT_SIZE = 8;

// ─── Canvas text measurement ─────────────────────────────────────────────────

let _measureCanvas: HTMLCanvasElement | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!_measureCanvas) _measureCanvas = document.createElement("canvas");
  return _measureCanvas.getContext("2d")!;
}

export function getLineWidth(text: string, fontSize: number): number {
  const ctx = getMeasureCtx();
  ctx.font = `${fontSize}px ${TEXT_FONT_FAMILY}`;
  return ctx.measureText(text).width;
}

/** Wrap text to fit within maxWidth. Hard breaks on \n, word-wrap, char-break as last resort. */
export function wrapText(text: string, fontSize: number, maxWidth: number): string {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return text;
  const resultLines: string[] = [];
  for (const originalLine of text.split("\n")) {
    if (getLineWidth(originalLine, fontSize) <= maxWidth) {
      resultLines.push(originalLine);
      continue;
    }
    const words = originalLine.split(" ");
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      if (getLineWidth(testLine, fontSize) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) { resultLines.push(currentLine); currentLine = word; }
        else {
          let charLine = "";
          for (const char of word) {
            if (getLineWidth(charLine + char, fontSize) <= maxWidth) { charLine += char; }
            else { if (charLine) resultLines.push(charLine); charLine = char; }
          }
          currentLine = charLine;
        }
      }
    }
    if (currentLine !== undefined) resultLines.push(currentLine);
  }
  return resultLines.join("\n");
}

/**
 * STRICT FIT: binary-search for the LARGEST fontSize such that the wrapped
 * text fits entirely within boxWidth x boxHeight.
 * Grows AND shrinks — enlarging the box grows the font, shrinking it shrinks it.
 */
export function fitTextInBox(
  originalText: string,
  boxWidth: number,
  boxHeight: number,
  _hint: number = DEFAULT_TEXT_FONT_SIZE,
): { text: string; fontSize: number } {
  const clampedW = Math.max(boxWidth,  MIN_TEXT_WIDTH);
  const clampedH = Math.max(boxHeight, MIN_TEXT_HEIGHT);

  const fits = (size: number) => {
    const wrapped = wrapText(originalText, size, clampedW);
    const lines   = wrapped.split("\n");
    return lines.length * size * DEFAULT_LINE_HEIGHT <= clampedH;
  };

  // If even MIN_FONT_SIZE does not fit, return it anyway (box is extremely small)
  if (!fits(MIN_FONT_SIZE)) {
    const wrapped = wrapText(originalText, MIN_FONT_SIZE, clampedW);
    return { text: wrapped, fontSize: MIN_FONT_SIZE };
  }

  // Binary search: lo always fits, hi never fits
  let lo = MIN_FONT_SIZE;
  let hi = Math.max(clampedH, 400);

  for (let i = 0; i < 64; i++) {
    if (hi - lo < 0.25) break;
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }

  const fontSize = Math.max(MIN_FONT_SIZE, lo);
  const text = wrapText(originalText, fontSize, clampedW);
  return { text, fontSize };
}

/**
 * Public layout helper used by useWhiteboard on resize & finish.
 * Always enforces that the result fits within boxWidth × boxHeight.
 */
export function computeTextLayout(
  originalText: string,
  fontSize: number,
  boxWidth: number,
  boxHeight?: number,
): { text: string; width: number; height: number; fontSize: number } {
  const clampedW = Math.max(boxWidth, MIN_TEXT_WIDTH);

  if (boxHeight !== undefined) {
    const clampedH = Math.max(boxHeight, MIN_TEXT_HEIGHT);
    const fit = fitTextInBox(originalText, clampedW, clampedH, fontSize);
    return { text: fit.text, width: clampedW, height: clampedH, fontSize: fit.fontSize };
  }

  // No height constraint — wrap to width, measure height freely
  const wrapped = wrapText(originalText, fontSize, clampedW);
  const lines = wrapped.split("\n");
  const lineHeightPx = fontSize * DEFAULT_LINE_HEIGHT;
  let maxLineW = MIN_TEXT_WIDTH;
  for (const line of lines) {
    const w = getLineWidth(line || " ", fontSize);
    if (w > maxLineW) maxLineW = w;
  }
  return {
    text: wrapped,
    width: Math.max(maxLineW, MIN_TEXT_WIDTH),
    height: Math.max(lines.length * lineHeightPx, MIN_TEXT_HEIGHT),
    fontSize,
  };
}

/** Measures raw (unwrapped) text for live size feedback while editing. */
export function measureTextElement(
  text: string,
  fontSize: number,
): { width: number; height: number } {
  const lines = text.split("\n");
  const lineHeightPx = fontSize * DEFAULT_LINE_HEIGHT;
  let maxW = MIN_TEXT_WIDTH;
  for (const line of lines) {
    const w = getLineWidth(line || " ", fontSize);
    if (w > maxW) maxW = w;
  }
  return {
    width: Math.max(maxW, MIN_TEXT_WIDTH),
    height: Math.max(lines.length * lineHeightPx, MIN_TEXT_HEIGHT),
  };
}

// ─── TextTool component ───────────────────────────────────────────────────────

interface TextToolProps {
  element: WhiteboardElement;
  viewport: Viewport;
  onTextChange: (id: string, originalText: string, width: number, height: number) => void;
  onFinish: () => void;
}

export default function TextTool({ element, viewport, onTextChange, onFinish }: TextToolProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mountedAt = useRef(Date.now());

  const fontSize = element.fontSize || DEFAULT_TEXT_FONT_SIZE;
  const screenPos = sceneToScreen(element.x, element.y, viewport);

  // Textarea dimensions are EXACTLY the element box — the box is the hard boundary.
  const screenW = Math.max(element.width  * viewport.zoom, MIN_TEXT_WIDTH  * viewport.zoom);
  const screenH = Math.max(element.height * viewport.zoom, MIN_TEXT_HEIGHT * viewport.zoom);
  const scaledFontSize = fontSize * viewport.zoom;

  const rawText = element.originalText ?? element.text ?? "";

  const syncSize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const measured = measureTextElement(ta.value || " ", fontSize);
    onTextChange(element.id, ta.value, measured.width, measured.height);
  }, [fontSize, element.id, onTextChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.selectionStart = ta.value.length;
      ta.selectionEnd = ta.value.length;
      syncSize();
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); onFinish(); }
    if (e.key === "Enter") { requestAnimationFrame(syncSize); }
  };

  const handleBlur = () => {
    if (Date.now() - mountedAt.current < 200) {
      setTimeout(() => textareaRef.current?.focus(), 10);
      return;
    }
    onFinish();
  };

  return (
    <textarea
      ref={textareaRef}
      style={{
        position: "absolute",
        left: screenPos.x,
        top: screenPos.y,
        // HARD BOX: textarea is exactly the element bounding box.
        // Text cannot visually overflow because the box clips it.
        width: screenW,
        height: screenH,
        fontSize: scaledFontSize,
        lineHeight: DEFAULT_LINE_HEIGHT,
        fontFamily: TEXT_FONT_FAMILY,
        color: element.style.strokeColor,
        transform: `rotate(${element.angle}rad)`,
        transformOrigin: "top left",
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        // CRITICAL: clip overflow so text never bleeds outside the box visually
        overflow: "hidden",
        padding: 0,
        margin: 0,
        border: "none",
        outline: "none",
        boxShadow: "none",
        background: "transparent",
        resize: "none",
        boxSizing: "border-box",
        caretColor: element.style.strokeColor,
        zIndex: 100,
        appearance: "none",
        WebkitAppearance: "none",
      }}
      value={rawText}
      onChange={syncSize}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
    />
  );
}