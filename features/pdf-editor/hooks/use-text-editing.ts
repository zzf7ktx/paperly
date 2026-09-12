'use client';

import { useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { browserFontFamily } from '../lib/fonts';
import { blockKey, wrapTextForWidth } from '../lib/text';
import type {
  AddedTextBox,
  Edit,
  EditorHistorySnapshot,
  SelectedElementRef,
  TextAlignment,
  TextBlock,
  TextWeight,
  UploadedFont,
} from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'setEdits'
  | 'pages'
  | 'currentPage'
  | 'setSelectedElements'
  | 'setSelected'
  | 'setSelectedForm'
  | 'setSelectedAddedId'
  | 'setSelectedImage'
  | 'blockVisuals'
  | 'canvasRef'
  | 'zoom'
  | 'setBlockVisuals'
  | 'setAddedBoxes'
  | 'snapEnabled'
  | 'snapAnchor'
  | 'snapMode'
  | 'edits'
  | 'setError'
  | 'setUploadedFonts'
  | 'setToast'
  | 'fontUploadRef'
> & {
  createHistorySnapshot: () => EditorHistorySnapshot;
  recordHistory: (snapshot?: EditorHistorySnapshot) => void;
  activeAdded: AddedTextBox | null;
  activeKey: string | null;
};

export function useTextEditing({
  createHistorySnapshot,
  setEdits,
  pages,
  recordHistory,
  currentPage,
  setSelectedElements,
  setSelected,
  setSelectedForm,
  setSelectedAddedId,
  setSelectedImage,
  blockVisuals,
  canvasRef,
  zoom,
  setBlockVisuals,
  setAddedBoxes,
  snapEnabled,
  snapAnchor,
  snapMode,
  edits,
  setError,
  setUploadedFonts,
  setToast,
  fontUploadRef,
  activeAdded,
  activeKey,
}: Context) {
  const commit = useCallback(
    (key: string, patch: Partial<Edit>) => {
      const snapshot = createHistorySnapshot();
      setEdits((previous) => {
        const originalPage = Number(key.split(':')[0]);
        const blockId = Number(key.split(':')[1]);
        const block = pages[originalPage]?.blocks.find((entry) => entry.id === blockId);
        const prior = previous[key] || { text: block?.str || '' };
        const next = { ...prior, ...patch };
        if (JSON.stringify(prior) === JSON.stringify(next)) return previous;
        recordHistory({ ...snapshot, edits: previous });
        return { ...previous, [key]: next };
      });
    },
    [createHistorySnapshot, pages, recordHistory],
  );

  const selectExistingBlock = useCallback(
    (block: TextBlock, additive = false) => {
      const item: SelectedElementRef = { page: currentPage, kind: 'text', id: String(block.id) };
      setSelectedElements((current) => {
        if (!additive) return [item];
        const exists = current.some(
          (entry) => entry.page === item.page && entry.kind === item.kind && entry.id === item.id,
        );
        return exists
          ? current.filter(
              (entry) => !(entry.page === item.page && entry.kind === item.kind && entry.id === item.id),
            )
          : [...current, item];
      });
      setSelected(block.id);
      setSelectedForm(null);
      setSelectedAddedId(null);
      setSelectedImage(null);
      const key = blockKey(currentPage, block.id);
      if (blockVisuals[key] || !canvasRef.current || !pages[currentPage]) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      try {
        const pixelScale = canvas.width / (pages[currentPage].width * zoom);
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
        const dominant = [...colors.values()].sort((a, b) => b.count - a.count)[0]?.rgb || [255, 255, 255];
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
        setBlockVisuals((visuals) => ({
          ...visuals,
          [key]: { background: toHex(dominant), color: toHex(foreground) },
        }));
      } catch {
        setBlockVisuals((visuals) => ({ ...visuals, [key]: { background: '#ffffff', color: '#111111' } }));
      }
    },
    [blockVisuals, currentPage, pages, zoom],
  );

  const measureAddedBox = useCallback(
    (box: AddedTextBox) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return { width: box.width, height: box.height };
      context.font = `${box.italic ? 'italic ' : ''}${box.bold ? `${box.ocrFontWeight ?? 700} ` : '400 '}${box.size}px ${browserFontFamily(box.font)}`;
      const lines = (box.text || ' ').split(/\r?\n/);
      const metrics = lines.map((line) => context.measureText(line || ' '));
      const measuredWidth = Math.max(...metrics.map((line) => line.width));
      const glyphHeight = Math.max(
        ...metrics.map(
          (line) =>
            (line.actualBoundingBoxAscent || box.size * 0.72) +
            (line.actualBoundingBoxDescent || box.size * 0.08),
        ),
      );
      const pageWidth = pages[box.page]?.width || box.x + 600;
      return {
        width: Math.max(4, Math.min(Math.ceil(measuredWidth + 1), pageWidth - box.x)),
        height: box.ocrSource
          ? Math.max(4, Math.ceil(lines.length * glyphHeight))
          : Math.max(box.size, Math.ceil(lines.length * box.size * 1.2)),
      };
    },
    [pages],
  );

  const editableTextValue = (element: HTMLElement) => element.innerText.replace(/\r/g, '').replace(/\n$/, '');

  const measureAddedBoxWrappedHeight = useCallback((box: AddedTextBox, text: string) => {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return box.height;
    context.font = `${box.italic ? 'italic ' : ''}${box.bold ? `${box.ocrFontWeight ?? 700} ` : '400 '}${box.size}px ${browserFontFamily(box.font)}`;
    const lines = wrapTextForWidth(
      text || ' ',
      Math.max(4, box.width - 1),
      (value) => context.measureText(value).width,
    );
    return Math.max(box.size, Math.ceil(Math.max(1, lines.length) * box.size * (box.ocrSource ? 1 : 1.2)));
  }, []);

  const updateAddedBox = useCallback(
    (id: string, patch: Partial<AddedTextBox>) => {
      setAddedBoxes((boxes) =>
        boxes.map((box) => {
          if (box.id !== id) return box;
          const next = { ...box, ...patch };
          if (!next.autoFit) return next;
          const dimensions = measureAddedBox(next);
          const preserveAnchor = snapEnabled && snapAnchor !== 'start';
          const anchorDelta = (before: number, after: number) =>
            snapAnchor === 'center' ? (before - after) / 2 : before - after;
          return {
            ...next,
            ...dimensions,
            x: preserveAnchor ? next.x + anchorDelta(next.width, dimensions.width) : next.x,
            top:
              preserveAnchor && snapMode === 'box'
                ? next.top + anchorDelta(next.height, dimensions.height)
                : next.top,
          };
        }),
      );
    },
    [measureAddedBox, snapAnchor, snapEnabled, snapMode],
  );

  const fitAddedBox = useCallback(
    (id: string) => {
      setAddedBoxes((boxes) =>
        boxes.map((box) => {
          if (box.id !== id) return box;
          const dimensions = measureAddedBox(box);
          const preserveAnchor = snapEnabled && snapAnchor !== 'start';
          const anchorDelta = (before: number, after: number) =>
            snapAnchor === 'center' ? (before - after) / 2 : before - after;
          return {
            ...box,
            ...dimensions,
            x: preserveAnchor ? box.x + anchorDelta(box.width, dimensions.width) : box.x,
            top:
              preserveAnchor && snapMode === 'box'
                ? box.top + anchorDelta(box.height, dimensions.height)
                : box.top,
          };
        }),
      );
    },
    [measureAddedBox, snapAnchor, snapEnabled, snapMode],
  );

  const fitExistingBox = (key: string, block: TextBlock, textOverride?: string) => {
    const edit = edits[key] || { text: block.str };
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    const text = textOverride ?? edit.text ?? block.str;
    const size = edit.size || block.fontSize;
    const fontWeight =
      edit.fontWeight === 700 || (edit.fontWeight === undefined && (edit.bold ?? block.bold)) ? 700 : 400;
    const family = edit.font ? browserFontFamily(edit.font) : block.cssFont;
    context.font = `${(edit.italic ?? block.italic) ? 'italic ' : ''}${fontWeight} ${size}px ${family}`;
    const lines = text.split(/\r?\n/);
    const horizontalScale = edit.font ? 1 : block.horizontalScale;
    const measuredWidth = Math.max(...lines.map((line) => context.measureText(line || ' ').width));
    const page = pages[currentPage];
    const x = edit.x ?? block.x;
    const top = edit.top ?? block.top;
    const width = Math.max(
      6,
      Math.min(
        Math.ceil(measuredWidth * horizontalScale + Math.max(2, size * 0.12)),
        (page?.width || x + measuredWidth) - x,
      ),
    );
    const height = Math.max(size, Math.ceil(lines.length * size * 1.2));
    const priorWidth = edit.width ?? block.width;
    const priorHeight = edit.height ?? block.height;
    const anchorDelta = (before: number, after: number) =>
      snapAnchor === 'center' ? (before - after) / 2 : before - after;
    commit(key, {
      text,
      width,
      height,
      ...(snapEnabled && snapAnchor !== 'start'
        ? {
            x: x + anchorDelta(priorWidth, width),
            ...(snapMode === 'box' ? { top: top + anchorDelta(priorHeight, height) } : {}),
          }
        : {}),
    });
  };

  const uploadFontFiles = async (fileList?: FileList | null) => {
    const files = Array.from(fileList || []).filter((file) => /\.(?:ttf|otf)$/i.test(file.name));
    if (!files.length) return;
    setError('');
    try {
      const results = await Promise.allSettled(
        files.map(async (file): Promise<UploadedFont> => {
          const data = new Uint8Array(await file.arrayBuffer());
          const stem = file.name
            .replace(/\.(?:ttf|otf)$/i, '')
            .replace(/[-_]+/g, ' ')
            .trim();
          const italic = /\b(?:italic|oblique)\b/i.test(stem);
          const weight = /\b(?:black|heavy)\b/i.test(stem)
            ? 900
            : /\b(?:extra\s*bold|ultra\s*bold)\b/i.test(stem)
              ? 800
              : /\b(?:bold)\b/i.test(stem)
                ? 700
                : /\b(?:semi\s*bold|demi)\b/i.test(stem)
                  ? 600
                  : /\bmedium\b/i.test(stem)
                    ? 500
                    : /\blight\b/i.test(stem)
                      ? 300
                      : /\bthin\b/i.test(stem)
                        ? 100
                        : 400;
          const name =
            stem
              .replace(
                /\b(?:thin|extra\s*light|light|medium|semi\s*bold|demi|bold|extra\s*bold|ultra\s*bold|black|heavy|italic|oblique|regular|roman|book)\b/gi,
                '',
              )
              .replace(/\s+/g, ' ')
              .trim() || stem;
          const source = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
          const face = new FontFace(name, source, {
            weight: String(weight),
            style: italic ? 'italic' : 'normal',
          });
          await face.load();
          document.fonts.add(face);
          return {
            id: `${name}:${weight}:${italic ? 'italic' : 'normal'}:${data.byteLength}`,
            name,
            fileName: file.name,
            data,
            weight,
            italic,
          };
        }),
      );
      const loaded = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
      if (!loaded.length) throw new Error('No selected font could be loaded');
      setUploadedFonts((fonts) => {
        const next = [...fonts];
        loaded.forEach((font) => {
          const existing = next.findIndex(
            (item) => item.name === font.name && item.weight === font.weight && item.italic === font.italic,
          );
          if (existing >= 0) next.splice(existing, 1);
          next.push(font);
        });
        return next;
      });
      const families = new Set(loaded.map((font) => font.name));
      const failed = results.length - loaded.length;
      setToast(
        `${loaded.length} font variant${loaded.length === 1 ? '' : 's'} from ${families.size} famil${families.size === 1 ? 'y' : 'ies'} imported${failed ? ` · ${failed} skipped` : ''}`,
      );
      window.setTimeout(() => setToast(''), 3200);
    } catch (reason) {
      console.error(reason);
      setError('Those font files could not be loaded. Try standard licensed TTF or OTF files.');
    } finally {
      if (fontUploadRef.current) fontUploadRef.current.value = '';
    }
  };

  const setSelectedTextWeight = (weight: TextWeight) => {
    if (activeAdded) {
      if (weight === 400)
        updateAddedBox(activeAdded.id, { bold: false, ocrFontWeight: undefined, ocrTextStroke: undefined });
      else if (weight === 700)
        updateAddedBox(activeAdded.id, { bold: true, ocrFontWeight: 700, ocrTextStroke: undefined });
      else
        updateAddedBox(activeAdded.id, {
          bold: true,
          ocrFontWeight: 400,
          ocrTextStroke: weight === 500 ? 0.14 : 0.28,
        });
    } else if (activeKey) commit(activeKey, { fontWeight: weight, bold: weight === 700 });
  };

  const toggleFormat = (format: 'bold' | 'italic' | 'underline' | 'strike', current: boolean) => {
    if (format === 'bold') {
      setSelectedTextWeight(current ? 400 : 700);
      return;
    }
    if (activeAdded) updateAddedBox(activeAdded.id, { [format]: !current });
    else if (activeKey) commit(activeKey, { [format]: !current });
  };

  const handleTextFormatShortcut = (
    event: ReactKeyboardEvent<HTMLElement>,
    formatting: Record<'bold' | 'italic' | 'underline' | 'strike', boolean>,
    apply: (format: 'bold' | 'italic' | 'underline' | 'strike', enabled: boolean) => void,
  ) => {
    if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const format =
      key === 'b'
        ? 'bold'
        : key === 'i'
          ? 'italic'
          : key === 'u'
            ? 'underline'
            : key === 'x' && event.shiftKey
              ? 'strike'
              : null;
    if (!format) return;
    event.preventDefault();
    event.stopPropagation();
    apply(format, !formatting[format]);
  };

  const setTextAlignment = (alignment: TextAlignment) => {
    if (activeAdded)
      updateAddedBox(
        activeAdded.id,
        activeAdded.ocrSource
          ? { alignment, autoFit: false }
          : { alignment, autoFit: false, width: Math.max(activeAdded.width, 160) },
      );
    else if (activeKey) commit(activeKey, { alignment });
  };

  return {
    commit,
    selectExistingBlock,
    measureAddedBox,
    editableTextValue,
    measureAddedBoxWrappedHeight,
    updateAddedBox,
    fitAddedBox,
    fitExistingBox,
    uploadFontFiles,
    setSelectedTextWeight,
    toggleFormat,
    handleTextFormatShortcut,
    setTextAlignment,
  };
}
