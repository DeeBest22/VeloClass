import { Minus, Plus, Maximize } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  return (
    <>
      {/* Desktop: horizontal row */}
      <div className="hidden md:flex fixed bottom-8 right-4 z-30 items-center gap-1 toolbar-panel px-1.5 py-1 animate-fade-in">
        <button className="tool-button" onClick={onZoomOut} title="Zoom out">
          <Minus size={16} strokeWidth={2} />
        </button>
        <button
          className="tool-button w-14 text-xs font-medium"
          onClick={onReset}
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button className="tool-button" onClick={onZoomIn} title="Zoom in">
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>


    </>
  );
}