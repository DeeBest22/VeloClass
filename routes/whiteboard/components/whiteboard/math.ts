import type { Point, Viewport, WhiteboardElement, ResizeHandle } from "./types";

export function screenToScene(sx: number, sy: number, vp: Viewport): Point {
  return {
    x: (sx - vp.x) / vp.zoom,
    y: (sy - vp.y) / vp.zoom,
  };
}

export function sceneToScreen(px: number, py: number, vp: Viewport): Point {
  return {
    x: px * vp.zoom + vp.x,
    y: py * vp.zoom + vp.y,
  };
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function pointInRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  padding = 0
): boolean {
  return (
    px >= rx - padding &&
    px <= rx + rw + padding &&
    py >= ry - padding &&
    py <= ry + rh + padding
  );
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Distance from point to a quadratic bezier curve (approximate) */
function distToQuadBezier(p: Point, start: Point, control: Point, end: Point, samples = 20): number {
  let minDist = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const it = 1 - t;
    const bx = it * it * start.x + 2 * it * t * control.x + t * t * end.x;
    const by = it * it * start.y + 2 * it * t * control.y + t * t * end.y;
    const d = distance(p, { x: bx, y: by });
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/** Rotate a point around a center by -angle (inverse rotation for hit testing) */
function unrotatePoint(px: number, py: number, cx: number, cy: number, angle: number): Point {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function hitTestElement(
  el: WhiteboardElement,
  px: number,
  py: number,
  threshold = 10
): boolean {
  if (el.isDeleted) return false;

  // If the element is rotated, unrotate the pointer into local space
  let lpx = px, lpy = py;
  if (el.angle) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const lp = unrotatePoint(px, py, cx, cy, el.angle);
    lpx = lp.x;
    lpy = lp.y;
  }

  const { x, y, width: w, height: h } = el;

  switch (el.type) {
    case "rectangle":
      // Always hit if inside (for move cursor); border-only if transparent fill
      if (el.style.backgroundColor !== "transparent") return pointInRect(lpx, lpy, x, y, w, h);
      return (
        pointInRect(lpx, lpy, x, y, w, h, threshold) &&
        !pointInRect(lpx, lpy, x, y, w, h, -threshold)
      );

    case "diamond": {
      const cx = x + w / 2, cy = y + h / 2;
      const pts: Point[] = [
        { x: cx, y },
        { x: x + w, y: cy },
        { x: cx, y: y + h },
        { x, y: cy },
      ];
      for (let i = 0; i < 4; i++) {
        if (distToSegment({ x: lpx, y: lpy }, pts[i], pts[(i + 1) % 4]) < threshold) return true;
      }
      if (el.style.backgroundColor !== "transparent") {
        const dx = Math.abs(lpx - cx) / (w / 2);
        const dy = Math.abs(lpy - cy) / (h / 2);
        return dx + dy <= 1;
      }
      return false;
    }

    case "ellipse": {
      const cx = x + w / 2, cy = y + h / 2;
      const rx = w / 2, ry = h / 2;
      const norm = ((lpx - cx) / rx) ** 2 + ((lpy - cy) / ry) ** 2;
      if (el.style.backgroundColor !== "transparent") return norm <= 1.1;
      return Math.abs(norm - 1) < threshold / Math.min(rx, ry);
    }

    case "line":
    case "arrow": {
      if (el.bendPoint) {
        const start = { x, y };
        const control = { x: x + el.bendPoint.x, y: y + el.bendPoint.y };
        const end = { x: x + w, y: y + h };
        return distToQuadBezier({ x: lpx, y: lpy }, start, control, end) < threshold;
      }
      return distToSegment(
        { x: lpx, y: lpy },
        { x, y },
        { x: x + w, y: y + h }
      ) < threshold;
    }

    case "freedraw": {
      if (!el.points || el.points.length === 0) return false;
      for (let i = 0; i < el.points.length - 1; i++) {
        const a = { x: el.x + el.points[i].x, y: el.y + el.points[i].y };
        const b = { x: el.x + el.points[i + 1].x, y: el.y + el.points[i + 1].y };
        if (distToSegment({ x: lpx, y: lpy }, a, b) < threshold) return true;
      }
      return false;
    }

    case "text":
      return pointInRect(lpx, lpy, x, y, w || 100, h || 24, threshold);

    default:
      return pointInRect(lpx, lpy, x, y, w, h, threshold);
  }
}

export function getElementBounds(el: WhiteboardElement) {
  if (el.type === "freedraw" && el.points && el.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of el.points) {
      minX = Math.min(minX, el.x + p.x);
      minY = Math.min(minY, el.y + p.y);
      maxX = Math.max(maxX, el.x + p.x);
      maxY = Math.max(maxY, el.y + p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  if ((el.type === "line" || el.type === "arrow")) {
    const x1 = el.x, y1 = el.y;
    const x2 = el.x + el.width, y2 = el.y + el.height;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);
    if (el.bendPoint) {
      const bx = el.x + el.bendPoint.x;
      const by = el.y + el.bendPoint.y;
      return {
        x: Math.min(minX, bx),
        y: Math.min(minY, by),
        width: Math.max(maxX, bx) - Math.min(minX, bx),
        height: Math.max(maxY, by) - Math.min(minY, by),
      };
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

/** Get resize handle positions for a selected element */
export function getResizeHandles(el: WhiteboardElement): { handle: ResizeHandle; x: number; y: number }[] {
  if (el.type === "line" || el.type === "arrow") {
    const handles: { handle: ResizeHandle; x: number; y: number }[] = [
      { handle: "nw", x: el.x, y: el.y }, // start point
      { handle: "se", x: el.x + el.width, y: el.y + el.height }, // end point
    ];
    // Bend control point
    if (el.bendPoint) {
      handles.push({ handle: "bend", x: el.x + el.bendPoint.x, y: el.y + el.bendPoint.y });
    } else {
      // Default bend handle at midpoint
      handles.push({ handle: "bend", x: el.x + el.width / 2, y: el.y + el.height / 2 });
    }
    return handles;
  }

  if (el.type === "freedraw") return [];

  // text falls through to standard 8-handle shape logic below
  const { x, y, width: w, height: h } = el;
  return [
    { handle: "nw", x, y },
    { handle: "n", x: x + w / 2, y },
    { handle: "ne", x: x + w, y },
    { handle: "e", x: x + w, y: y + h / 2 },
    { handle: "se", x: x + w, y: y + h },
    { handle: "s", x: x + w / 2, y: y + h },
    { handle: "sw", x, y: y + h },
    { handle: "w", x, y: y + h / 2 },
  ];
}

/** Checks if point is inside element's full bounding box (rotation-aware). Used for drag/move. */
export function hitTestElementBounds(el: WhiteboardElement, px: number, py: number): boolean {
  if (el.isDeleted) return false;
  if (el.type === "line" || el.type === "arrow" || el.type === "freedraw") {
    return hitTestElement(el, px, py);
  }
  let lpx = px, lpy = py;
  if (el.angle) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const p = unrotatePoint(px, py, cx, cy, el.angle);
    lpx = p.x; lpy = p.y;
  }
  return lpx >= el.x && lpx <= el.x + el.width && lpy >= el.y && lpy <= el.y + el.height;
}
export function hitTestResizeHandle(
  el: WhiteboardElement,
  px: number,
  py: number,
  vp: Viewport,
  screenThreshold = 8
): ResizeHandle | null {
  const t = screenThreshold / vp.zoom;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;

  // Unrotate pointer into element local space for all handle checks
  const lp = el.angle ? unrotatePoint(px, py, cx, cy, el.angle) : { x: px, y: py };

  // Rotation handle — 20px above top-center in the element's local (unrotated) space
  if (el.type !== "line" && el.type !== "arrow" && el.type !== "freedraw") {
    const rotHandleX = cx;                    // horizontally centered
    const rotHandleY = el.y - 4 - 20 / vp.zoom; // 20 screen-px above the top edge (with 4px padding offset)
    if (Math.abs(lp.x - rotHandleX) < t && Math.abs(lp.y - rotHandleY) < t) return "rotate";
  }

  const handles = getResizeHandles(el);
  const cornerHandles = ["nw", "ne", "se", "sw"] as ResizeHandle[];

  // Corners
  for (const h of handles) {
    if (!cornerHandles.includes(h.handle)) continue;
    if (Math.abs(lp.x - h.x) < t && Math.abs(lp.y - h.y) < t) return h.handle;
  }

  // Edge handles
  for (const handle of handles) {
    if (cornerHandles.includes(handle.handle)) continue;
    if (handle.handle === "n" || handle.handle === "s") {
      if (Math.abs(lp.y - handle.y) < t && lp.x >= el.x - t && lp.x <= el.x + el.width + t)
        return handle.handle;
    }
    if (handle.handle === "e" || handle.handle === "w") {
      if (Math.abs(lp.x - handle.x) < t && lp.y >= el.y - t && lp.y <= el.y + el.height + t)
        return handle.handle;
    }
  }

  // Bend handle for lines/arrows
  for (const h of handles) {
    if (h.handle === "bend" && Math.abs(lp.x - h.x) < t && Math.abs(lp.y - h.y) < t)
      return h.handle;
  }

  return null;
}