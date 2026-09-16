import type { ImageBlock, ImageEdit, PageInfo, VectorEdit } from '../types';

export function areaOverlapsDeletedImage(
  area: { x: number; top: number; width: number; height: number },
  page: PageInfo,
  pageIndex: number,
  imageEdits: Record<string, ImageEdit>,
) {
  return page.images.some((image) => {
    if (!imageEdits[`${pageIndex}:${image.id}`]?.deleted) return false;
    return (
      image.x < area.x + area.width &&
      image.x + image.width > area.x &&
      image.top < area.top + area.height &&
      image.top + image.height > area.top
    );
  });
}

export function imageOverlapsEditedImages(
  image: ImageBlock,
  page: PageInfo,
  pageIndex: number,
  imageEdits: Record<string, ImageEdit>,
) {
  return page.images.some((other) => {
    if (other.id === image.id || !Object.keys(imageEdits[`${pageIndex}:${other.id}`] || {}).length)
      return false;
    return (
      other.x < image.x + image.width &&
      other.x + other.width > image.x &&
      other.top < image.top + image.height &&
      other.top + other.height > image.top
    );
  });
}

export function imageOverlapsEditedVectors(
  image: ImageBlock,
  page: PageInfo,
  pageIndex: number,
  vectorEdits: Record<string, VectorEdit>,
) {
  return page.vectors.some((vector) => {
    if (vector.added || !Object.keys(vectorEdits[`${pageIndex}:${vector.id}`] || {}).length) return false;
    return (
      vector.x < image.x + image.width &&
      vector.x + vector.width > image.x &&
      vector.top < image.top + image.height &&
      vector.top + vector.height > image.top
    );
  });
}

export async function captureNativePdfImage(pdf: any, pageIndex: number, image: ImageBlock) {
  if (!pdf || !image.sourceName) return undefined;
  try {
    const page = await pdf.getPage(pageIndex + 1);
    await page.getOperatorList();
    const source = page.objs.get(image.sourceName);
    if (!source || !source.width || !source.height) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    if (source.bitmap) context.drawImage(source.bitmap, 0, 0);
    else if (source.data?.length === source.width * source.height * 4)
      context.putImageData(
        new ImageData(new Uint8ClampedArray(source.data), source.width, source.height),
        0,
        0,
      );
    else return undefined;
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}
