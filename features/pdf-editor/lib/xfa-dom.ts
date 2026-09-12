import { type XfaNativeNode, type XfaTemplateEdit } from '../../../lib/xfa-template';

export function applyLiveXfaCaptionLayout(
  wrapper: HTMLElement,
  caption: HTMLElement | null,
  placement: XfaTemplateEdit['labelPlacement'],
  reserve: number | undefined,
  zoom: number,
) {
  if (!caption || !placement) return;
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection =
    placement === 'bottom'
      ? 'column-reverse'
      : placement === 'left'
        ? 'row'
        : placement === 'right' || placement === 'inline'
          ? 'row-reverse'
          : 'column';
  caption.style.flex = `0 0 ${Math.max(0, reserve ?? 12) * zoom}px`;
  caption.style.boxSizing = 'border-box';
  if (placement === 'left' || placement === 'right' || placement === 'inline') {
    caption.style.width = `${Math.max(0, reserve ?? 64) * zoom}px`;
    caption.style.height = 'auto';
  } else {
    caption.style.height = `${Math.max(0, reserve ?? 12) * zoom}px`;
    caption.style.width = 'auto';
  }
}

export function matchRenderedXfaNode(
  nodes: XfaNativeNode[],
  renderedName: string,
  wrapper: HTMLElement,
  boundary: HTMLElement,
  occurrence: number,
  fallback?: XfaNativeNode,
) {
  const exact = renderedName
    ? nodes.filter((node) => node.name === renderedName)
    : nodes.filter((node) => !node.name);
  if (!exact.length) return fallback;
  const ancestors: string[] = [];
  for (let parent = wrapper.parentElement; parent && parent !== boundary; parent = parent.parentElement) {
    const name = parent.getAttribute('xfaName');
    if (name) ancestors.push(name);
  }
  const scored = exact
    .map((node, candidateIndex) => {
      const path = node.parentPath || node.path;
      const score = ancestors.reduce(
        (total, name, depth) => total + (path.includes(`${name}[`) ? Math.max(1, 32 - depth) : 0),
        0,
      );
      return { node, candidateIndex, score };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        Math.abs(left.candidateIndex - occurrence) - Math.abs(right.candidateIndex - occurrence),
    );
  return scored[0]?.node || fallback;
}

export function sanitizeXfaRichHtml(html: string) {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content
    .querySelectorAll('script,style,iframe,object,embed,form,input,textarea,select,button')
    .forEach((node) => node.remove());
  const fontSizes: Record<string, string> = {
    '1': '8pt',
    '2': '10pt',
    '3': '12pt',
    '4': '14pt',
    '5': '18pt',
    '6': '24pt',
    '7': '36pt',
  };
  template.content.querySelectorAll('font').forEach((font) => {
    const span = document.createElement('span');
    span.innerHTML = font.innerHTML;
    if (font.getAttribute('face')) span.style.fontFamily = font.getAttribute('face') || '';
    if (font.getAttribute('size')) span.style.fontSize = fontSizes[font.getAttribute('size') || ''] || '';
    if (font.getAttribute('color')) span.style.color = font.getAttribute('color') || '';
    font.replaceWith(span);
  });
  template.content.querySelectorAll<HTMLElement>('*').forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.name) || attribute.name === 'srcdoc') node.removeAttribute(attribute.name);
    }
    if (/url\s*\(|expression\s*\(/i.test(node.getAttribute('style') || '')) node.removeAttribute('style');
    if (node instanceof HTMLAnchorElement) {
      const href = node.getAttribute('href') || '';
      if (!/^(https?:|mailto:|tel:|#)/i.test(href)) node.removeAttribute('href');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return template.innerHTML;
}
