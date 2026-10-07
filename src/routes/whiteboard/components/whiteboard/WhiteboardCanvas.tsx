import { useRef, useEffect, useCallback, useState } from "react";
import type { WhiteboardElement, Viewport } from "./types";
import { render } from "./renderer";
import { screenToScene, hitTestResizeHandle, hitTestElement } from "./math";
import TextTool from "./TextTool";

interface Props {
  elements: WhiteboardElement[];
  viewport: Viewport;
  selectedIds: Set<string>;
  selectionRect: { x: number; y: number; width: number; height: number } | null;
  activeTool: string;
  isPanning: boolean;
  editingTextId: string | null;
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  updateTextElement: (id: string, originalText: string, width: number, height: number) => void;
  finishTextEdit: () => void;
}

const HANDLE_CURSORS: Record<string, string> = {
  nw: "nw-resize", ne: "ne-resize", se: "se-resize", sw: "sw-resize",
  n: "ns-resize",  s: "ns-resize",  e: "ew-resize",  w: "ew-resize",
  rotate: "grab",  bend: "pointer",
};

export default function WhiteboardCanvas({
  elements, viewport, selectedIds, selectionRect, activeTool, isPanning,
  editingTextId, onPointerDown, onPointerMove, onPointerUp, onWheel,
  updateTextElement, finishTextEdit,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [cursor, setCursor] = useState<string>("default");

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    render(canvas, elements, viewport, selectedIds, selectionRect, editingTextId);
  }, [elements, viewport, selectedIds, selectionRect, editingTextId]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(rafRef.current);
  }, [renderCanvas]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.style.width = "100%";
        canvasRef.current.style.height = "100%";
        renderCanvas();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderCanvas]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (activeTool === "selection" && !isPanning) {
        const rect = e.currentTarget.getBoundingClientRect();
        const scene = screenToScene(e.clientX - rect.left, e.clientY - rect.top, viewport);

        for (const el of elements) {
          if (!selectedIds.has(el.id)) continue;
          const handle = hitTestResizeHandle(el, scene.x, scene.y, viewport);
          if (handle && HANDLE_CURSORS[handle]) {
            setCursor(selectedIds.size > 1 ? "move" : HANDLE_CURSORS[handle]);
            onPointerMove(e); return;
          }
        }

        for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];
          if (el.isDeleted) continue;
          if (hitTestElement(el, scene.x, scene.y)) { setCursor("move"); onPointerMove(e); return; }
          if (el.type !== "line" && el.type !== "arrow" && el.type !== "freedraw") {
            let lpx = scene.x, lpy = scene.y;
            if (el.angle) {
              const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
              const cos = Math.cos(-el.angle), sin = Math.sin(-el.angle);
              const dx = scene.x - cx, dy = scene.y - cy;
              lpx = cx + dx * cos - dy * sin; lpy = cy + dx * sin + dy * cos;
            }
            if (lpx >= el.x && lpx <= el.x + el.width && lpy >= el.y && lpy <= el.y + el.height) {
              setCursor("move"); onPointerMove(e); return;
            }
          }
        }
        setCursor("default");
      } else if (isPanning) {
        setCursor("grabbing");
      } else {
        setCursor("crosshair");
      }
      onPointerMove(e);
    },
    [activeTool, isPanning, viewport, elements, selectedIds, onPointerMove],
  );

  const editingEl = editingTextId ? elements.find(e => e.id === editingTextId) : null;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas w-full h-full"
        onPointerDown={onPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        style={{ touchAction: "none", cursor }}
      />
      {editingEl && (
        <TextTool
          element={editingEl}
          viewport={viewport}
          onTextChange={updateTextElement}
          onFinish={finishTextEdit}
        />
      )}
    </div>
  );
}
