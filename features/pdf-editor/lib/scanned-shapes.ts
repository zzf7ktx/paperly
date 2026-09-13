import type { VectorBlock } from '../types';

type Segment = { horizontal: boolean; start: number; end: number; fixed: number; low: number; high: number };

/** Reconstruct axis-aligned scan borders without treating shaded fills as thick rules. */
export function detectScannedShapes(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number,
  originX: number,
  originTop: number,
  stamp: number,
): VectorBlock[] {
  const light = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    return pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
  };
  const dark = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height && pixels[(y * width + x) * 4 + 3] > 180 && light(x, y) < 165;
  const tolerance = Math.max(2, Math.round(scale));
  const raw: Segment[] = [];
  for (const horizontal of [true, false]) {
    const limit = horizontal ? width : height,
      rows = horizontal ? height : width;
    const minimum = horizontal ? Math.max(40 * scale, limit * 0.065) : Math.max(24 * scale, limit * 0.035);
    for (let fixed = 0; fixed < rows; fixed++) {
      let start = -1,
        last = -1;
      for (let moving = 0; moving <= limit; moving++) {
        if (moving < limit && (horizontal ? dark(moving, fixed) : dark(fixed, moving))) {
          if (start < 0) start = moving;
          last = moving;
        } else if (start >= 0 && (moving - last > tolerance || moving === limit)) {
          if (last - start + 1 >= minimum)
            raw.push({ horizontal, start, end: last, fixed, low: fixed, high: fixed });
          start = -1;
        }
      }
    }
  }
  const segments: Segment[] = [];
  for (const segment of raw) {
    const match = segments.find(
      (prior) =>
        prior.horizontal === segment.horizontal &&
        segment.fixed - prior.high <= tolerance &&
        segment.fixed >= prior.low &&
        Math.abs(segment.start - prior.start) <= tolerance * 3 &&
        Math.abs(segment.end - prior.end) <= tolerance * 3,
    );
    if (match) {
      match.high = segment.fixed;
      match.fixed = (match.low + match.high) / 2;
      match.start = Math.min(match.start, segment.start);
      match.end = Math.max(match.end, segment.end);
    } else segments.push({ ...segment });
  }
  // Text rows and solid graphic bands should not be emitted as heavy strokes.
  const rules = segments.filter((segment) => segment.high - segment.low + 1 <= Math.max(5, scale * 3));
  const horizontals = rules.filter((segment) => segment.horizontal).sort((a, b) => a.fixed - b.fixed);
  const rectangles: { left: number; right: number; top: number; bottom: number; strokeWidth: number }[] = [];
  const coverage = (x: number, top: number, bottom: number) => {
    let count = 0;
    let gap = 0;
    for (let y = Math.round(top); y <= Math.round(bottom); y++) {
      let found = false;
      for (let dx = -tolerance; dx <= tolerance; dx++)
        if (dark(Math.round(x) + dx, y)) {
          found = true;
          break;
        }
      if (found) {
        count++;
        gap = 0;
      } else if (++gap > Math.max(4, scale * 3)) return 0;
    }
    return count / Math.max(1, Math.round(bottom) - Math.round(top) + 1);
  };
  for (let index = 0; index < horizontals.length; index++) {
    const top = horizontals[index];
    for (const bottom of horizontals.slice(index + 1)) {
      if (bottom.fixed - top.fixed < Math.max(4, scale * 3)) continue;
      if (
        Math.abs(bottom.start - top.start) > tolerance * 3 ||
        Math.abs(bottom.end - top.end) > tolerance * 3
      )
        continue;
      const left = (top.start + bottom.start) / 2,
        right = (top.end + bottom.end) / 2;
      if (coverage(left, top.fixed, bottom.fixed) < 0.8 || coverage(right, top.fixed, bottom.fixed) < 0.8)
        continue;
      rectangles.push({
        left,
        right,
        top: top.fixed,
        bottom: bottom.fixed,
        strokeWidth: (top.high - top.low + bottom.high - bottom.low + 2) / 2,
      });
      // The shared divider can also be the top of the next cell.
      break;
    }
  }
  const color = (left: number, top: number, right: number, bottom: number, interior: boolean) => {
    const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
    const step = Math.max(1, Math.floor(Math.min(right - left, bottom - top) / 20));
    for (let y = Math.max(0, Math.ceil(top)); y <= Math.min(height - 1, Math.floor(bottom)); y += step)
      for (let x = Math.max(0, Math.ceil(left)); x <= Math.min(width - 1, Math.floor(right)); x += step) {
        const offset = (y * width + x) * 4;
        if (pixels[offset + 3] < 180 || (!interior && light(x, y) >= 165)) continue;
        const r = pixels[offset],
          g = pixels[offset + 1],
          b = pixels[offset + 2];
        const key = (r >> 3) * 1024 + (g >> 3) * 32 + (b >> 3);
        const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
        bucket.count++;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        buckets.set(key, bucket);
      }
    const winner = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
    return winner
      ? `#${[winner.r, winner.g, winner.b]
          .map((value) =>
            Math.round(value / winner.count)
              .toString(16)
              .padStart(2, '0'),
          )
          .join('')}`
      : interior
        ? '#ffffff'
        : '#000000';
  };
  const vectors: VectorBlock[] = rectangles.map((rectangle, index) => {
    const { left, right, top, bottom } = rectangle;
    const inset = Math.max(tolerance * 2, rectangle.strokeWidth + 1);
    return {
      id: `ocr-rectangle-${stamp}-${index}`,
      kind: 'rectangle',
      x: originX + left / scale,
      top: originTop + top / scale,
      width: (right - left) / scale,
      height: (bottom - top) / scale,
      fill: color(left + inset, top + inset, right - inset, bottom - inset, true),
      stroke: color(left, top - tolerance, right, top + tolerance, false),
      strokeWidth: Math.max(0.35, rectangle.strokeWidth / scale),
      added: true,
    };
  });
  // Subtract rectangle borders from the rules, including partial vertical sides.
  for (const [index, rule] of rules.entries()) {
    let spans = [[rule.start, rule.end]];
    for (const rectangle of rectangles) {
      const sides = rule.horizontal ? [rectangle.top, rectangle.bottom] : [rectangle.left, rectangle.right];
      if (!sides.some((fixed) => Math.abs(fixed - rule.fixed) <= tolerance * 2)) continue;
      const start = rule.horizontal ? rectangle.left : rectangle.top;
      const end = rule.horizontal ? rectangle.right : rectangle.bottom;
      spans = spans.flatMap(([a, b]) =>
        end < a || start > b
          ? [[a, b]]
          : [
              [a, Math.min(b, start)],
              [Math.max(a, end), b],
            ].filter(([x, y]) => y - x > tolerance * 2),
      );
    }
    for (const [part, [start, end]] of spans.entries()) {
      if (end - start < 12 * scale) continue;
      const x = originX + (rule.horizontal ? start : rule.fixed) / scale;
      const top = originTop + (rule.horizontal ? rule.fixed : start) / scale;
      const endX = originX + (rule.horizontal ? end : rule.fixed) / scale;
      const endTop = originTop + (rule.horizontal ? rule.fixed : end) / scale;
      vectors.push({
        id: `ocr-line-${stamp}-${index}-${part}`,
        kind: 'line',
        x,
        top,
        width: Math.max(0.5, endX - x),
        height: Math.max(0.5, endTop - top),
        fill: 'transparent',
        stroke: color(
          rule.horizontal ? start : rule.low,
          rule.horizontal ? rule.low : start,
          rule.horizontal ? end : rule.high,
          rule.horizontal ? rule.high : end,
          false,
        ),
        strokeWidth: Math.max(0.35, (rule.high - rule.low + 1) / scale),
        points: [
          { x, top },
          { x: endX, top: endTop },
        ],
        added: true,
      });
    }
  }
  return vectors.slice(0, 240);
}
