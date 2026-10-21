import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type {
  ToolType,
  WhiteboardElement,
  Viewport,
  Point,
  ElementStyle,
  HistoryEntry,
  ResizeHandle,
} from "./types";
import { DEFAULT_STYLE, TOOL_KEYS } from "./types";
import {
  screenToScene,
  hitTestElement,
  hitTestElementBounds,
  normalizeRect,
  pointInRect,
  getElementBounds,
  hitTestResizeHandle,
} from "./math";
import {
  fitTextInBox,
  computeTextLayout,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  MIN_TEXT_WIDTH,
  MIN_TEXT_HEIGHT,
  MIN_FONT_SIZE,
} from "./TextTool";

// ─── Anchor-based resize origin (from resizeElements pattern) ─────────────────

type ResizeAnchor =
  | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  | "west-side" | "north-side" | "east-side" | "south-side"
  | "center";

function getResizeAnchor(handle: ResizeHandle): ResizeAnchor {
  switch (handle) {
    case "n":  return "south-side";
    case "e":  return "west-side";
    case "s":  return "north-side";
    case "w":  return "east-side";
    case "ne": return "bottom-left";
    case "nw": return "bottom-right";
    case "se": return "top-left";
    case "sw": return "top-right";
    default:   return "top-left";
  }
}

function getResizedOrigin(
  prevX: number, prevY: number,
  prevW: number, prevH: number,
  newW:  number, newH:  number,
  angle: number,
  handle: ResizeHandle,
): { x: number; y: number } {
  const anchor = getResizeAnchor(handle);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  switch (anchor) {
    case "top-left":
      return {
        x: prevX + (prevW - newW) / 2 + ((newW - prevW) / 2) * cos + ((prevH - newH) / 2) * sin,
        y: prevY + (prevH - newH) / 2 + ((newW - prevW) / 2) * sin + ((newH - prevH) / 2) * cos,
      };
    case "top-right":
      return {
        x: prevX + ((prevW - newW) / 2) * (cos + 1) + ((prevH - newH) / 2) * sin,
        y: prevY + (prevH - newH) / 2 + ((prevW - newW) / 2) * sin + ((newH - prevH) / 2) * cos,
      };
    case "bottom-left":
      return {
        x: prevX + ((prevW - newW) / 2) * (1 - cos) + ((newH - prevH) / 2) * sin,
        y: prevY + ((prevH - newH) / 2) * (cos + 1) + ((newW - prevW) / 2) * sin,
      };
    case "bottom-right":
      return {
        x: prevX + ((prevW - newW) / 2) * (cos + 1) + ((newH - prevH) / 2) * sin,
        y: prevY + ((prevH - newH) / 2) * (cos + 1) + ((prevW - newW) / 2) * sin,
      };
    case "center":
      return { x: prevX - (newW - prevW) / 2, y: prevY - (newH - prevH) / 2 };
    case "east-side":
      return {
        x: prevX + ((prevW - newW) / 2) * (cos + 1),
        y: prevY + ((prevW - newW) / 2) * sin + (prevH - newH) / 2,
      };
    case "west-side":
      return {
        x: prevX + ((prevW - newW) / 2) * (1 - cos),
        y: prevY + ((newW - prevW) / 2) * sin + (prevH - newH) / 2,
      };
    case "north-side":
      return {
        x: prevX + (prevW - newW) / 2 + ((prevH - newH) / 2) * sin,
        y: prevY + ((newH - prevH) / 2) * (cos - 1),
      };
    case "south-side":
      return {
        x: prevX + (prevW - newW) / 2 + ((newH - prevH) / 2) * sin,
        y: prevY + ((prevH - newH) / 2) * (cos + 1),
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function useWhiteboard() {
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTool, setActiveTool] = useState<ToolType>("selection");
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [currentStyle, setCurrentStyle] = useState<ElementStyle>({ ...DEFAULT_STYLE });
  const [selectionRect, setSelectionRect] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const drawing = useRef(false);
  const dragStart = useRef<Point | null>(null);
  const dragElement = useRef<string | null>(null);
  const currentElementId = useRef<string | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const spaceHeld = useRef(false);

  const resizing = useRef(false);
  const resizeHandle = useRef<ResizeHandle | null>(null);
  const resizeElementId = useRef<string | null>(null);
  const resizeOrigin = useRef<{ x: number; y: number; w: number; h: number; bendPoint?: Point } | null>(null);
  const resizeStartScene = useRef<Point | null>(null);
  const lastTextClickTime = useRef<number>(0);
  const lastTextClickId = useRef<string | null>(null);

  const rotating = useRef(false);
  const rotateElementId = useRef<string | null>(null);
  const rotateStartAngle = useRef<number>(0);

  const twoClickLine = useRef(false);

  // ── Clipboard ─────────────────────────────────────────────────────────────
  const clipboard = useRef<WhiteboardElement[]>([]);
  const pasteOffset = useRef<number>(0);

  const history = useRef<HistoryEntry[]>([{ elements: [] }]);
  const historyIndex = useRef(0);

  const pushHistory = useCallback((els: WhiteboardElement[]) => {
    const next = history.current.slice(0, historyIndex.current + 1);
    next.push({ elements: els.map(e => ({ ...e, points: e.points ? [...e.points] : undefined, bendPoint: e.bendPoint ? { ...e.bendPoint } : undefined })) });
    if (next.length > 100) next.shift();
    history.current = next;
    historyIndex.current = next.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      setElements(history.current[historyIndex.current].elements.map(e => ({ ...e })));
      setSelectedIds(new Set());
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current++;
      setElements(history.current[historyIndex.current].elements.map(e => ({ ...e })));
      setSelectedIds(new Set());
    }
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const next = elements.filter(el => !selectedIds.has(el.id));
    setElements(next);
    setSelectedIds(new Set());
    pushHistory(next);
  }, [elements, selectedIds, pushHistory]);

  // ── updateTextElement: sync bounding box to measured raw text during editing ──
  const updateTextElement = useCallback(
    (id: string, originalText: string, width: number, height: number) => {
      setElements(prev => prev.map(el => {
        if (el.id !== id) return el;
        // During live editing the box tracks the raw (unwrapped) content size.
        // We don't re-wrap or re-fit here — that only happens on finish.
        const newW = Math.max(width,  MIN_TEXT_WIDTH);
        const newH = Math.max(height, MIN_TEXT_HEIGHT);
        return { ...el, originalText, text: originalText, width: newW, height: newH };
      }));
    },
    [],
  );

  // ── finishTextEdit: wrap text, fit font strictly inside box, write fontSize back ──
  const finishTextEdit = useCallback(() => {
    if (!editingTextId) return;
    const el = elements.find(e => e.id === editingTextId);
    if (!el) { setEditingTextId(null); return; }

    const originalText = el.originalText ?? el.text ?? "";

    if (!originalText.trim()) {
      const next = elements.filter(e => e.id !== editingTextId);
      setElements(next);
      pushHistory(next);
      setSelectedIds(new Set());
    } else {
      // Fit strictly: fontSize chosen so text fills but never overflows the box
      const fit = fitTextInBox(originalText, el.width, el.height, el.fontSize ?? DEFAULT_TEXT_FONT_SIZE);
      const next = elements.map(e =>
        e.id !== editingTextId
          ? e
          : { ...e, originalText, text: fit.text, fontSize: fit.fontSize },
      );
      setElements(next);
      pushHistory(next);
      setSelectedIds(new Set([editingTextId]));
    }
    setEditingTextId(null);
  }, [editingTextId, elements, pushHistory]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const copySelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    clipboard.current = elements
      .filter(el => selectedIds.has(el.id) && !el.isDeleted)
      .map(el => ({ ...el, points: el.points ? [...el.points] : undefined, bendPoint: el.bendPoint ? { ...el.bendPoint } : undefined }));
    pasteOffset.current = 1;
  }, [elements, selectedIds]);

  // ── Cut ───────────────────────────────────────────────────────────────────
  const cutSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    clipboard.current = elements
      .filter(el => selectedIds.has(el.id) && !el.isDeleted)
      .map(el => ({ ...el, points: el.points ? [...el.points] : undefined, bendPoint: el.bendPoint ? { ...el.bendPoint } : undefined }));
    pasteOffset.current = 1;
    const next = elements.filter(el => !selectedIds.has(el.id));
    setElements(next);
    setSelectedIds(new Set());
    pushHistory(next);
  }, [elements, selectedIds, pushHistory]);

  // ── Paste ─────────────────────────────────────────────────────────────────
  const pasteClipboard = useCallback(() => {
    if (clipboard.current.length === 0) return;
    const offset = pasteOffset.current * 16;
    const newEls = clipboard.current.map(el => ({
      ...el,
      id: nanoid(10),
      x: el.x + offset,
      y: el.y + offset,
      points: el.points ? el.points.map(p => ({ ...p })) : undefined,
      bendPoint: el.bendPoint ? { ...el.bendPoint } : undefined,
    }));
    pasteOffset.current += 1;
    const next = [...elements, ...newEls];
    setElements(next);
    setSelectedIds(new Set(newEls.map(el => el.id)));
    pushHistory(next);
    setActiveTool("selection");
  }, [elements, pushHistory]);

  // ── Duplicate (Ctrl+D) ────────────────────────────────────────────────────
  const duplicateSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const toCopy = elements
      .filter(el => selectedIds.has(el.id) && !el.isDeleted)
      .map(el => ({ ...el, points: el.points ? [...el.points] : undefined, bendPoint: el.bendPoint ? { ...el.bendPoint } : undefined }));
    if (toCopy.length === 0) return;
    const newEls = toCopy.map(el => ({
      ...el,
      id: nanoid(10),
      x: el.x + 16,
      y: el.y + 16,
      points: el.points ? el.points.map(p => ({ ...p })) : undefined,
      bendPoint: el.bendPoint ? { ...el.bendPoint } : undefined,
    }));
    const next = [...elements, ...newEls];
    setElements(next);
    setSelectedIds(new Set(newEls.map(el => el.id)));
    pushHistory(next);
  }, [elements, selectedIds, pushHistory]);

  // ── Insert Image ──────────────────────────────────────────────────────────
  const insertImage = useCallback((dataUrl: string, naturalWidth: number, naturalHeight: number) => {
    const MAX_W = 480;
    const scale = naturalWidth > MAX_W ? MAX_W / naturalWidth : 1;
    const w = Math.round(naturalWidth * scale);
    const h = Math.round(naturalHeight * scale);
    const cx = (window.innerWidth  / 2 - viewport.x) / viewport.zoom;
    const cy = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
    const id = nanoid(10);
    const newEl: WhiteboardElement = {
      id, type: "image",
      x: cx - w / 2, y: cy - h / 2,
      width: w, height: h,
      imageData: dataUrl,
      style: { ...DEFAULT_STYLE, opacity: 1 },
      angle: 0,
      seed: Math.floor(Math.random() * 2 ** 31),
    };
    const next = [...elements, newEl];
    setElements(next);
    setSelectedIds(new Set([id]));
    setActiveTool("selection");
    pushHistory(next);
  }, [elements, viewport, pushHistory]);

  // ── Sync currentStyle FROM selected elements ──────────────────────────────
  // When selection changes, read style off the first selected element so the
  // panel reflects what's actually on the canvas.
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const first = elements.find(el => selectedIds.has(el.id) && !el.isDeleted);
    if (first) setCurrentStyle({ ...first.style });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // ── Apply style changes TO selected elements (and update currentStyle) ────
  const applyStyle = useCallback((style: ElementStyle) => {
    setCurrentStyle(style);
    if (selectedIds.size === 0) return;
    setElements(prev => prev.map(el =>
      selectedIds.has(el.id) && !el.isDeleted ? { ...el, style } : el
    ));
  }, [selectedIds]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const scene = screenToScene(e.clientX - rect.left, e.clientY - rect.top, viewport);

      if (spaceHeld.current || activeTool === "hand") {
        isPanning.current = true;
        panStart.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
        return;
      }
      if (e.button === 1) {
        isPanning.current = true;
        panStart.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
        return;
      }

      drawing.current = true;
      dragStart.current = scene;

      if (activeTool === "selection") {
        if (selectedIds.size === 1) {
          for (const el of elements) {
            if (!selectedIds.has(el.id)) continue;
            const handle = hitTestResizeHandle(el, scene.x, scene.y, viewport);
            if (handle === "rotate") {
              rotating.current = true;
              rotateElementId.current = el.id;
              const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
              rotateStartAngle.current = Math.atan2(scene.y - cy, scene.x - cx) - (el.angle || 0);
              drawing.current = false;
              return;
            }
            if (handle) {
              resizing.current = true;
              resizeHandle.current = handle;
              resizeElementId.current = el.id;
              resizeOrigin.current = { x: el.x, y: el.y, w: el.width, h: el.height, bendPoint: el.bendPoint ? { ...el.bendPoint } : undefined };
              resizeStartScene.current = scene;
              drawing.current = false;
              return;
            }
          }
        } else if (selectedIds.size > 1) {
          for (const el of elements) {
            if (!selectedIds.has(el.id)) continue;
            const handle = hitTestResizeHandle(el, scene.x, scene.y, viewport);
            if (handle) {
              dragElement.current = el.id;
              drawing.current = true;
              return;
            }
          }
        }

        let hitEl: WhiteboardElement | null = null;
        for (let i = elements.length - 1; i >= 0; i--) {
          if (hitTestElementBounds(elements[i], scene.x, scene.y)) { hitEl = elements[i]; break; }
        }

        if (hitEl) {
          if (hitEl.type === "text") {
            const now = Date.now();
            const isDoubleTap = lastTextClickId.current === hitEl.id && now - lastTextClickTime.current < 300;
            lastTextClickTime.current = now;
            lastTextClickId.current = hitEl.id;
            if (isDoubleTap) {
              setSelectedIds(new Set([hitEl.id]));
              setEditingTextId(hitEl.id);
              drawing.current = false;
              return;
            }
          }
          if (!e.shiftKey && !selectedIds.has(hitEl.id)) setSelectedIds(new Set([hitEl.id]));
          else if (e.shiftKey) {
            const s = new Set(selectedIds);
            s.has(hitEl.id) ? s.delete(hitEl.id) : s.add(hitEl.id);
            setSelectedIds(s);
          }
          dragElement.current = hitEl.id;
          dragStart.current = scene;
        } else {
          setSelectedIds(new Set());
          dragElement.current = null;
          setSelectionRect({ x: scene.x, y: scene.y, width: 0, height: 0 });
        }
        return;
      }

      if (activeTool === "eraser") {
        for (let i = elements.length - 1; i >= 0; i--) {
          if (hitTestElementBounds(elements[i], scene.x, scene.y)) {
            const next = elements.filter((_, idx) => idx !== i);
            setElements(next); pushHistory(next); break;
          }
        }
        return;
      }

      if (activeTool === "text") {
        const id = nanoid(10);
        const newEl: WhiteboardElement = {
          id, type: "text",
          x: scene.x, y: scene.y,
          width: MIN_TEXT_WIDTH * 4,
          height: DEFAULT_TEXT_FONT_SIZE * DEFAULT_LINE_HEIGHT * 2,
          text: "", originalText: "",
          fontSize: DEFAULT_TEXT_FONT_SIZE,
          lineHeight: DEFAULT_LINE_HEIGHT,
          style: { ...currentStyle },
          angle: 0,
          seed: Math.floor(Math.random() * 2 ** 31),
        };
        setElements(prev => [...prev, newEl]);
        setEditingTextId(id);
        setSelectedIds(new Set([id]));
        drawing.current = false;
        return;
      }

      if (twoClickLine.current && currentElementId.current && (activeTool === "line" || activeTool === "arrow")) {
        setElements(prev => prev.map(el => el.id === currentElementId.current ? { ...el, width: scene.x - el.x, height: scene.y - el.y } : el));
        pushHistory(elements);
        const newId = currentElementId.current;
        twoClickLine.current = false; currentElementId.current = null; drawing.current = false;
        setActiveTool("selection"); setSelectedIds(new Set([newId]));
        return;
      }

      const id = nanoid(10);
      currentElementId.current = id;
      setElements(prev => [...prev, {
        id, type: activeTool as any,
        x: scene.x, y: scene.y, width: 0, height: 0,
        points: activeTool === "freedraw" ? [{ x: 0, y: 0 }] : undefined,
        style: { ...currentStyle }, angle: 0,
        seed: Math.floor(Math.random() * 2 ** 31),
      }]);

      if (activeTool === "line" || activeTool === "arrow") {
        twoClickLine.current = true; drawing.current = false;
      }
    },
    [activeTool, viewport, elements, selectedIds, currentStyle, pushHistory],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scene = screenToScene(e.clientX - rect.left, e.clientY - rect.top, viewport);

      if (isPanning.current) {
        setViewport(v => ({ ...v, x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y }));
        return;
      }

      if (rotating.current && rotateElementId.current) {
        setElements(prev => prev.map(el => {
          if (el.id !== rotateElementId.current) return el;
          const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
          return { ...el, angle: Math.atan2(scene.y - cy, scene.x - cx) - rotateStartAngle.current };
        }));
        return;
      }

      // ── Resize ───────────────────────────────────────────────────────────
      if (resizing.current && resizeElementId.current && resizeStartScene.current && resizeOrigin.current) {
        const handle = resizeHandle.current!;
        const origin = resizeOrigin.current;
        const dx = scene.x - resizeStartScene.current.x;
        const dy = scene.y - resizeStartScene.current.y;

        setElements(prev => prev.map(el => {
          if (el.id !== resizeElementId.current) return el;

          if (handle === "bend") {
            return { ...el, bendPoint: { x: el.width / 2 + (scene.x - (el.x + el.width / 2)), y: el.height / 2 + (scene.y - (el.y + el.height / 2)) } };
          }

          if (el.type === "line" || el.type === "arrow") {
            if (handle === "nw") return { ...el, x: origin.x + dx, y: origin.y + dy, width: origin.w - dx, height: origin.h - dy };
            if (handle === "se") return { ...el, width: origin.w + dx, height: origin.h + dy };
            return el;
          }

          // Compute new raw dimensions from handle movement.
          // For rotated elements we must project (dx,dy) onto the element's
          // local X and Y axes so corners always resize both dimensions together.
          const angle = el.angle || 0;
          let ldx = dx, ldy = dy;
          if (angle) {
            const cos = Math.cos(angle), sin = Math.sin(angle);
            // Project world-space delta onto element-local axes
            ldx =  dx * cos + dy * sin;
            ldy = -dx * sin + dy * cos;
          }

          let newW = origin.w, newH = origin.h;
          if (handle.includes("e")) newW = origin.w + ldx;
          if (handle.includes("w")) newW = origin.w - ldx;
          if (handle.includes("s")) newH = origin.h + ldy;
          if (handle.includes("n")) newH = origin.h - ldy;
          newW = Math.max(newW, MIN_TEXT_WIDTH);
          newH = Math.max(newH, MIN_TEXT_HEIGHT);

          // Anchor-correct origin keeps the opposite corner fixed
          const newOrigin = getResizedOrigin(origin.x, origin.y, origin.w, origin.h, newW, newH, angle, handle);

          if (el.type === "text") {
            const originalText = el.originalText ?? el.text ?? "";
            // STRICT: fit font inside new box, write fontSize back immediately
            const fit = fitTextInBox(originalText, newW, newH, el.fontSize ?? DEFAULT_TEXT_FONT_SIZE);
            return {
              ...el,
              x: newOrigin.x, y: newOrigin.y,
              width: newW, height: newH,
              fontSize: fit.fontSize,
              text: fit.text,
              originalText,
            };
          }

          return { ...el, x: newOrigin.x, y: newOrigin.y, width: newW, height: newH };
        }));
        return;
      }

      if (!drawing.current && !twoClickLine.current) return;

      if (!drawing.current && twoClickLine.current) {
        if (!currentElementId.current) return;
        setElements(prev => prev.map(el => el.id === currentElementId.current ? { ...el, width: scene.x - el.x, height: scene.y - el.y } : el));
        return;
      }
      if (!dragStart.current) return;

      if (activeTool === "selection") {
        if (dragElement.current) {
          const dx = scene.x - dragStart.current.x;
          const dy = scene.y - dragStart.current.y;
          dragStart.current = scene;
          setElements(prev => prev.map(el => selectedIds.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el));
        } else {
          setSelectionRect(normalizeRect(dragStart.current.x, dragStart.current.y, scene.x, scene.y));
        }
        return;
      }

      if (activeTool === "eraser") {
        for (let i = elements.length - 1; i >= 0; i--) {
          if (hitTestElementBounds(elements[i], scene.x, scene.y)) {
            setElements(elements.filter((_, idx) => idx !== i)); break;
          }
        }
        return;
      }

      if (!currentElementId.current) return;

      setElements(prev => prev.map(el => {
        if (el.id !== currentElementId.current) return el;
        if (el.type === "freedraw") return { ...el, points: [...(el.points || []), { x: scene.x - el.x, y: scene.y - el.y }] };
        if (el.type === "line" || el.type === "arrow") return { ...el, width: scene.x - el.x, height: scene.y - el.y };
        const r = normalizeRect(dragStart.current!.x, dragStart.current!.y, scene.x, scene.y);
        return { ...el, x: r.x, y: r.y, width: r.width, height: r.height };
      }));
    },
    [activeTool, viewport, selectedIds, elements, pushHistory],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isPanning.current) { isPanning.current = false; return; }

      if (rotating.current) {
        rotating.current = false; rotateElementId.current = null;
        pushHistory(elements); return;
      }

      if (resizing.current) {
        resizing.current = false; resizeHandle.current = null;
        resizeElementId.current = null; resizeOrigin.current = null; resizeStartScene.current = null;
        pushHistory(elements); return;
      }

      if (activeTool === "selection" && !dragElement.current && selectionRect) {
        const r = selectionRect;
        const ids = new Set<string>();
        for (const el of elements) {
          if (el.isDeleted) continue;
          const b = getElementBounds(el);
          if (pointInRect(b.x, b.y, r.x, r.y, r.width, r.height) && pointInRect(b.x + b.width, b.y + b.height, r.x, r.y, r.width, r.height))
            ids.add(el.id);
        }
        setSelectedIds(ids);
        setSelectionRect(null);
      }

      if (drawing.current && dragElement.current && activeTool === "selection") pushHistory(elements);

      if (drawing.current && currentElementId.current && activeTool !== "selection") {
        if (!twoClickLine.current) {
          pushHistory(elements);
          if (activeTool !== "freedraw" && activeTool !== "text") {
            const newId = currentElementId.current;
            setActiveTool("selection"); setSelectedIds(new Set([newId]));
          }
        }
      }

      drawing.current = false; dragStart.current = null; dragElement.current = null;
      if (!twoClickLine.current) currentElementId.current = null;
      setSelectionRect(null);
    },
    [activeTool, elements, selectionRect, pushHistory],
  );

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      setViewport(v => {
        const newZoom = Math.max(0.1, Math.min(5, v.zoom * (1 + delta)));
        const ratio = newZoom / v.zoom;
        return { x: mx - (mx - v.x) * ratio, y: my - (my - v.y) * ratio, zoom: newZoom };
      });
    } else {
      setViewport(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (editingTextId) return;
    const key = e.key.toLowerCase();
    if (key === " ") { e.preventDefault(); spaceHeld.current = true; return; }
    if (key === "escape" && twoClickLine.current && currentElementId.current) {
      setElements(prev => prev.filter(el => el.id !== currentElementId.current));
      twoClickLine.current = false; currentElementId.current = null; return;
    }
    if ((e.ctrlKey || e.metaKey) && key === "z") {
      e.preventDefault(); e.shiftKey ? redo() : undo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && key === "c") { e.preventDefault(); copySelected(); return; }
    if ((e.ctrlKey || e.metaKey) && key === "x") { e.preventDefault(); cutSelected(); return; }
    if ((e.ctrlKey || e.metaKey) && key === "v") { e.preventDefault(); pasteClipboard(); return; }
    if ((e.ctrlKey || e.metaKey) && key === "d") { e.preventDefault(); duplicateSelected(); return; }
    if (key === "delete" || key === "backspace") { e.preventDefault(); deleteSelected(); return; }
    if ((e.ctrlKey || e.metaKey) && key === "a") {
      e.preventDefault();
      setSelectedIds(new Set(elements.filter(e => !e.isDeleted).map(e => e.id))); return;
    }
    if (TOOL_KEYS[key] && !e.ctrlKey && !e.metaKey) {
      if (TOOL_KEYS[key] === "image") {
        window.dispatchEvent(new CustomEvent("whiteboard:open-image-picker"));
        return;
      }
      setActiveTool(TOOL_KEYS[key]);
    }
  }, [editingTextId, undo, redo, deleteSelected, copySelected, cutSelected, pasteClipboard, duplicateSelected, elements]);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === " ") spaceHeld.current = false;
  }, []);

  const zoom = useCallback((delta: number) => {
    setViewport(v => ({ ...v, zoom: Math.max(0.1, Math.min(5, v.zoom + delta)) }));
  }, []);

  const resetZoom = useCallback(() => setViewport({ x: 0, y: 0, zoom: 1 }), []);

  return {
    elements, selectedIds, activeTool, viewport, currentStyle,
    selectionRect, editingTextId, isPanning: isPanning.current,
    setActiveTool, setCurrentStyle, applyStyle,
    onPointerDown, onPointerMove, onPointerUp, onWheel, onKeyDown, onKeyUp,
    undo, redo, deleteSelected, copySelected, cutSelected, pasteClipboard, duplicateSelected,
    insertImage, updateTextElement, finishTextEdit, zoom, resetZoom,
    setElements,
  };
}