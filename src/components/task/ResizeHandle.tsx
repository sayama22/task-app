"use client";

import { useCallback, useEffect, useRef } from "react";
import { GripVertical } from "lucide-react";

interface ResizeHandleProps {
  onDrag: (delta: number) => void;
  className?: string;
}

export function ResizeHandle({ onDrag, className = "" }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onDrag(delta);
    },
    [onDrag]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      role="separator"
      aria-label="ペイン境界ドラッグ"
      onMouseDown={handleMouseDown}
      className={
        "group relative flex items-center justify-center w-1.5 shrink-0 cursor-col-resize " +
        "hover:bg-primary/20 active:bg-primary/30 transition-colors z-10 " +
        className
      }
    >
      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground pointer-events-none">
        <GripVertical className="h-4 w-4" />
      </div>
    </div>
  );
}
