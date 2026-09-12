'use client';

import { useEffect, useRef } from 'react';
import { formBackdropGeometry, formBackdropPrimitiveGeometry } from '../lib/pdf-geometry';
import type { FormBlock, FormEdit } from '../types';

export function FormBackdropLayer({ field, edit, zoom }: { field: FormBlock; edit: FormEdit; zoom: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geometry = formBackdropGeometry(field, edit);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !field.backdrop) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = Math.max(1, geometry.width * zoom);
    const cssHeight = Math.max(1, geometry.height * zoom);
    canvas.width = Math.max(1, Math.ceil(cssWidth * ratio));
    canvas.height = Math.max(1, Math.ceil(cssHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);
    field.backdrop.primitives.forEach((primitive) => {
      const item = formBackdropPrimitiveGeometry(field, primitive, edit);
      const x = (item.x - geometry.x) * zoom;
      const top = (item.top - geometry.top) * zoom;
      const width = item.width * zoom;
      const height = item.height * zoom;
      if (primitive.fill) {
        context.fillStyle = primitive.fill;
        context.fillRect(x, top, width, height);
      }
      if (primitive.stroke && item.strokeWidth > 0) {
        context.strokeStyle = primitive.stroke;
        context.lineWidth = Math.max(1 / ratio, item.strokeWidth * zoom);
        context.strokeRect(x, top, width, height);
      }
    });
  }, [edit, field, geometry.height, geometry.top, geometry.width, geometry.x, zoom]);
  return (
    <canvas
      ref={canvasRef}
      className="form-backdrop-canvas"
      aria-hidden="true"
      style={{
        left: geometry.x * zoom,
        top: geometry.top * zoom,
        width: geometry.width * zoom,
        height: geometry.height * zoom,
      }}
    />
  );
}
