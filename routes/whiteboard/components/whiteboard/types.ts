export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type ToolType =
  | "selection"
  | "hand"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "line"
  | "arrow"
  | "freedraw"
  | "text"
  | "image"
  | "eraser";

export type ElementType = Exclude<ToolType, "selection" | "hand" | "eraser">;

export type FillStyle = "solid" | "hachure" | "cross-hatch";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "bend" | "rotate";

export interface ElementStyle {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
}

export interface WhiteboardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  /** Wrapped text (newlines inserted by wrapText). Rendered on canvas. */
  text?: string;
  /** Raw text as typed by user — source of truth for re-wrapping. */
  originalText?: string;
  fontSize?: number;
  /** Unitless line height multiplier (e.g. 1.35). fontSize × lineHeight = px per line. */
  lineHeight?: number;
  /** Base64 data URL for image elements */
  imageData?: string;
  style: ElementStyle;
  angle: number;
  seed: number;
  isDeleted?: boolean;
  /** Control point for bending lines/arrows, relative to element origin */
  bendPoint?: Point;
}

export interface HistoryEntry {
  elements: WhiteboardElement[];
}

export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "hachure",
  strokeWidth: 2,
  roughness: 1,
  opacity: 1,
};

export const STROKE_COLORS = [
  "#1e1e1e",
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
  "#7048e8",
  "#0c8599",
  "#e64980",
];

export const BG_COLORS = [
  "transparent",
  "#ffc9c9",
  "#b2f2bb",
  "#a5d8ff",
  "#ffec99",
  "#d0bfff",
  "#99e9f2",
  "#fcc2d7",
];

export const STROKE_WIDTHS = [1, 2, 4];
export const ROUGHNESS_VALUES = [0, 1, 2];

export const TOOL_KEYS: Record<string, ToolType> = {
  v: "selection",
  "1": "selection",
  h: "hand",
  r: "rectangle",
  "2": "rectangle",
  d: "diamond",
  "3": "diamond",
  o: "ellipse",
  "4": "ellipse",
  a: "arrow",
  "5": "arrow",
  l: "line",
  "6": "line",
  p: "freedraw",
  "7": "freedraw",
  t: "text",
  "8": "text",
  i: "image",
  "9": "image",
  e: "eraser",
  "0": "eraser",
};