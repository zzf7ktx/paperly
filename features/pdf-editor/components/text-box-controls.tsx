'use client';

import { type PointerEvent as ReactPointerEvent } from 'react';

export function TextBoxControls({
  mode,
  x,
  top,
  width,
  height,
  zoom,
  resizeKey,
  onMove,
  onResize,
}: {
  mode: 'page' | 'local';
  x: number;
  top: number;
  width: number;
  height: number;
  zoom: number;
  resizeKey?: string;
  onMove: (event: ReactPointerEvent) => void;
  onResize: (event: ReactPointerEvent) => void;
}) {
  const moveStyle =
    mode === 'page'
      ? x * zoom < 22
        ? { left: x * zoom + 2, top: top * zoom + 2, borderRadius: 4, opacity: 0.88 }
        : { left: x * zoom - 22, top: top * zoom - 1 }
      : undefined;
  const resizeStyle =
    mode === 'page' ? { left: (x + width) * zoom - 6, top: (top + height) * zoom - 6 } : undefined;
  return (
    <>
      <button
        className={`text-move-handle ${mode} ${x * zoom < 22 ? 'edge-left' : ''}`}
        aria-label="Move text box"
        title="Drag to move text box"
        onPointerDown={onMove}
        style={moveStyle}
      >
        ⠿
      </button>
      <button
        className={`text-resize-handle ${mode}`}
        data-existing-resize-key={resizeKey}
        aria-label="Resize text box"
        title="Drag to resize text box"
        onPointerDown={onResize}
        style={resizeStyle}
      />
    </>
  );
}
