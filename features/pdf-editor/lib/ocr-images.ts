export type OcrBounds = { x0: number; y0: number; x1: number; y1: number };
type Component = OcrBounds & { ink: number };

export function insideOcrImage(box: OcrBounds, image: OcrBounds) {
  return box.x0 >= image.x0 && box.y0 >= image.y0 && box.x1 <= image.x1 && box.y1 <= image.y1;
}

/** Find substantial graphic marks and include nearby lettering as part of the graphic. */
export function detectOcrImages(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  words: OcrBounds[],
): OcrBounds[] {
  const heights = words
    .map((box) => box.y1 - box.y0)
    .filter((value) => value > 2)
    .sort((a, b) => a - b);
  const textHeight = heights[Math.floor(heights.length / 2)] || 10;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const ink = (index: number) =>
    pixels[index * 4 + 3] > 200 &&
    pixels[index * 4] * 0.299 + pixels[index * 4 + 1] * 0.587 + pixels[index * 4 + 2] * 0.114 < 160;
  const components: Component[] = [];
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || !ink(start)) continue;
    let head = 0,
      tail = 1;
    queue[0] = start;
    visited[start] = 1;
    const box = { x0: start % width, y0: Math.floor(start / width), x1: 0, y1: 0, ink: 0 };
    while (head < tail) {
      const index = queue[head++],
        x = index % width,
        y = Math.floor(index / width);
      box.x0 = Math.min(box.x0, x);
      box.y0 = Math.min(box.y0, y);
      box.x1 = Math.max(box.x1, x + 1);
      box.y1 = Math.max(box.y1, y + 1);
      box.ink++;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
          const next = index + dy * width + dx;
          if (!visited[next] && ink(next)) {
            visited[next] = 1;
            queue[tail++] = next;
          }
        }
    }
    if (box.ink >= 3) components.push(box);
  }
  const regions: OcrBounds[] = [];
  for (const seed of components) {
    const w = seed.x1 - seed.x0,
      h = seed.y1 - seed.y0;
    // Rule out letters, rules, and large page/table borders.
    if (
      w < textHeight * 3 ||
      h < textHeight * 2.5 ||
      w / h > 6 ||
      h / w > 4 ||
      seed.ink < w * h * 0.18 ||
      w > width * 0.45 ||
      h > height * 0.4
    )
      continue;
    if (regions.some((region) => insideOcrImage(seed, region))) continue;
    const region = { x0: seed.x0, y0: seed.y0, x1: seed.x1, y1: seed.y1 };
    const candidates = [...words, ...components];
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const candidate of candidates) {
        if (insideOcrImage(candidate, region)) continue;
        const gapX = Math.max(0, region.x0 - candidate.x1, candidate.x0 - region.x1);
        const gapY = Math.max(0, region.y0 - candidate.y1, candidate.y0 - region.y1);
        if (gapX > textHeight * 1.8 || gapY > textHeight * 1.2) continue;
        const union = {
          x0: Math.min(region.x0, candidate.x0),
          y0: Math.min(region.y0, candidate.y0),
          x1: Math.max(region.x1, candidate.x1),
          y1: Math.max(region.y1, candidate.y1),
        };
        if (union.x1 - union.x0 > width * 0.48 || union.y1 - union.y0 > Math.max(h * 1.8, textHeight * 6))
          continue;
        Object.assign(region, union);
        expanded = true;
      }
    }
    regions.push({
      x0: Math.max(0, region.x0 - 2),
      y0: Math.max(0, region.y0 - 2),
      x1: Math.min(width, region.x1 + 2),
      y1: Math.min(height, region.y1 + 2),
    });
  }
  return regions.filter(
    (region, index) =>
      !regions.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          insideOcrImage(region, other) &&
          (otherIndex < index || !insideOcrImage(other, region)),
      ),
  );
}
