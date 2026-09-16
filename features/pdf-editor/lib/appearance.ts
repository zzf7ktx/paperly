import type { Edit, FormBlock, FormEdit, ImageBlock, TextBlock, VectorBlock, VectorEdit } from '../types';

function originalVectorIsCleared(edit?: VectorEdit) {
  return Boolean(edit?.deleted || (edit && Object.keys(edit).some((property) => property !== 'deleted')));
}

export function vectorUnderlyingColor(
  vectors: VectorBlock[], target: VectorBlock,
  vectorEdits?: Record<string, VectorEdit>, pageIndex?: number,
) {
  const centerX = target.x + target.width / 2;
  const centerY = target.top + target.height / 2;
  const area = target.width * target.height;
  const targetIndex = vectors.findIndex((vector) => vector.id === target.id);
  return vectors
    .map((vector, index) => ({ vector, index }))
    .filter(({ vector, index }) =>
      index < targetIndex &&
      vector.id !== target.id &&
      !vector.added &&
      vector.kind === 'rectangle' &&
      vector.fill !== 'transparent' &&
      !(pageIndex !== undefined && originalVectorIsCleared(vectorEdits?.[`${pageIndex}:${vector.id}`])) &&
      vector.width * vector.height > area &&
      centerX >= vector.x &&
      centerX <= vector.x + vector.width &&
      centerY >= vector.top &&
      centerY <= vector.top + vector.height,
    )
    .sort((first, second) => second.index - first.index)[0]?.vector.fill ||
    '#ffffff';
}

export function filledRectangleAt(
  vectors: VectorBlock[], x: number, top: number,
  vectorEdits?: Record<string, VectorEdit>, pageIndex?: number,
) {
  return vectors.findLast((vector) =>
    !vector.added &&
    vector.kind === 'rectangle' &&
    vector.fill !== 'transparent' &&
    !(pageIndex !== undefined && originalVectorIsCleared(vectorEdits?.[`${pageIndex}:${vector.id}`])) &&
    x >= vector.x && x <= vector.x + vector.width &&
    top >= vector.top && top <= vector.top + vector.height,
  )?.fill;
}

export function pdfColorToHex(value: unknown, fallback: string) {
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())) return value.trim().toLowerCase();
  if (Array.isArray(value) && typeof value[0] === 'string' && /^#[0-9a-f]{6}$/i.test(value[0].trim()))
    return value[0].trim().toLowerCase();
  if (!value || typeof (value as ArrayLike<number>).length !== 'number') return fallback;
  const channels = Array.from(value as ArrayLike<number>)
    .slice(0, 3)
    .map((channel) => Number(channel));
  if (channels.length < 3 || channels.some((channel) => !Number.isFinite(channel))) return fallback;
  const scale = Math.max(...channels) <= 1 ? 255 : 1;
  return `#${channels
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel * scale)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export function hexChannels(value = '#000000') {
  const hex = value.replace('#', '').padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map((offset) => (Number.parseInt(hex.slice(offset, offset + 2), 16) || 0) / 255) as [
    number,
    number,
    number,
  ];
}

export function sampleFieldBackground(
  canvas: HTMLCanvasElement,
  pageWidth: number,
  zoom: number,
  field: FormBlock,
) {
  const context = canvas.getContext('2d');
  if (!context) return '#ffffff';
  const scale = canvas.width / Math.max(1, pageWidth * zoom);
  const appearance = field.backdrop || field;
  const left = appearance.x * zoom * scale;
  const top = appearance.top * zoom * scale;
  const right = (appearance.x + appearance.width) * zoom * scale;
  const bottom = (appearance.top + appearance.height) * zoom * scale;
  const guard = Math.max(4, Math.round(4 * scale));
  const pad = Math.max(14, Math.round(14 * scale));
  const x0 = Math.max(0, Math.floor(left - pad));
  const y0 = Math.max(0, Math.floor(top - pad));
  const x1 = Math.min(canvas.width, Math.ceil(right + pad));
  const y1 = Math.min(canvas.height, Math.ceil(bottom + pad));
  if (x1 <= x0 || y1 <= y0) return '#ffffff';
  try {
    const image = context.getImageData(x0, y0, x1 - x0, y1 - y0);
    const colors = new Map<string, { count: number; red: number; green: number; blue: number }>();
    const stride = image.width;
    for (let y = 0; y < image.height; y += 1)
      for (let x = 0; x < image.width; x += 1) {
        const pageX = x + x0;
        const pageY = y + y0;
        if (
          pageX >= left - guard &&
          pageX <= right + guard &&
          pageY >= top - guard &&
          pageY <= bottom + guard
        )
          continue;
        const index = (y * stride + x) * 4;
        if (image.data[index + 3] < 220) continue;
        const red = image.data[index];
        const green = image.data[index + 1];
        const blue = image.data[index + 2];
        const bucket = `${red >> 4}:${green >> 4}:${blue >> 4}`;
        const color = colors.get(bucket) || { count: 0, red: 0, green: 0, blue: 0 };
        color.count += 1;
        color.red += red;
        color.green += green;
        color.blue += blue;
        colors.set(bucket, color);
      }
    const dominant = [...colors.values()].sort(
      (leftColor, rightColor) => rightColor.count - leftColor.count,
    )[0];
    if (!dominant) return '#ffffff';
    const channels = [dominant.red, dominant.green, dominant.blue].map((sum) =>
      Math.round(sum / dominant.count),
    );
    return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return '#ffffff';
  }
}

export function sampleImageBackground(
  canvas: HTMLCanvasElement,
  pageWidth: number,
  zoom: number,
  image: ImageBlock,
) {
  return sampleFieldBackground(canvas, pageWidth, zoom, {
    ...image,
    id: image.id,
    name: image.id,
    kind: 'text',
    value: '',
  });
}

export function sampleTextBlockVisual(
  canvas: HTMLCanvasElement,
  pageWidth: number,
  zoom: number,
  block: TextBlock,
) {
  const context = canvas.getContext('2d');
  if (!context) return { background: '#ffffff', color: '#111111' };
  try {
    const pixelScale = canvas.width / Math.max(1, pageWidth * zoom);
    const x = Math.max(0, Math.floor(block.x * zoom * pixelScale));
    const y = Math.max(0, Math.floor(block.top * zoom * pixelScale));
    const width = Math.max(1, Math.min(canvas.width - x, Math.ceil(block.width * zoom * pixelScale)));
    const height = Math.max(
      1,
      Math.min(canvas.height - y, Math.ceil(block.height * 1.15 * zoom * pixelScale)),
    );
    const pixels = context.getImageData(x, y, width, height).data;
    const colors = new Map<string, { count: number; rgb: [number, number, number] }>();
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 200) continue;
      const rgb: [number, number, number] = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const bucket = `${rgb[0] >> 3}:${rgb[1] >> 3}:${rgb[2] >> 3}`;
      const current = colors.get(bucket);
      if (current) current.count += 1;
      else colors.set(bucket, { count: 1, rgb });
    }
    const dominant = [...colors.values()].sort((first, second) => second.count - first.count)[0]?.rgb || [
      255, 255, 255,
    ];
    let foreground: [number, number, number] = [17, 17, 17];
    let contrast = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const candidate: [number, number, number] = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const distance = Math.hypot(
        candidate[0] - dominant[0],
        candidate[1] - dominant[1],
        candidate[2] - dominant[2],
      );
      if (distance > contrast) {
        contrast = distance;
        foreground = candidate;
      }
    }
    const toHex = (rgb: [number, number, number]) =>
      `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
    return { background: toHex(dominant), color: toHex(foreground) };
  } catch {
    return { background: '#ffffff', color: '#111111' };
  }
}

export function needsFormCleanup(field: FormBlock, edit: FormEdit) {
  if (field.added || edit.eraseOriginal === false) return false;
  const changedGeometry =
    edit.x !== undefined || edit.top !== undefined || edit.width !== undefined || edit.height !== undefined;
  const changedAppearance = [
    'font',
    'fontSize',
    'color',
    'backgroundColor',
    'borderColor',
    'borderWidth',
    'alignment',
  ].some((property) => property in edit);
  return changedGeometry || changedAppearance || Boolean(edit.deleted);
}

export function needsTextCleanup(block: TextBlock, edit: Edit) {
  return Boolean(
    edit.deleted ||
    edit.text !== block.str ||
    edit.x !== undefined ||
    edit.top !== undefined ||
    edit.width !== undefined ||
    edit.height !== undefined ||
    edit.font !== undefined ||
    edit.size !== undefined ||
    edit.fontWeight !== undefined ||
    edit.color !== undefined ||
    edit.bold !== undefined ||
    edit.italic !== undefined ||
    edit.underline !== undefined ||
    edit.strike !== undefined ||
    edit.alignment !== undefined,
  );
}
