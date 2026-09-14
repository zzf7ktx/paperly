export type XfaFieldKind =
  | 'text'
  | 'multiline'
  | 'numeric'
  | 'decimal'
  | 'date'
  | 'choice'
  | 'checkbox'
  | 'radio'
  | 'button'
  | 'signature'
  | 'password'
  | 'barcode'
  | 'image';
export type XfaDrawKind = 'text' | 'image' | 'rectangle' | 'line' | 'arc';
export type XfaScriptLanguage = 'javascript' | 'formcalc';
export type XfaScriptBlock = { code: string; language: XfaScriptLanguage };
export type XfaScriptMetadata = {
  calculation?: XfaScriptBlock;
  validation?: XfaScriptBlock;
  events: Record<string, XfaScriptBlock>;
};

export type XfaDrawEdit = {
  key: string;
  sourceName: string;
  occurrence: number;
  kind: XfaDrawKind;
  page: number;
  x: number;
  top: number;
  width: number;
  height: number;
  originalX: number;
  originalTop: number;
  originalWidth: number;
  originalHeight: number;
  text?: string;
  originalText?: string;
  html?: string;
  originalHtml?: string;
  dataUrl?: string;
  font?: string;
  originalFont?: string;
  size?: number;
  originalSize?: number;
  color?: string;
  originalColor?: string;
  bold?: boolean;
  originalBold?: boolean;
  italic?: boolean;
  originalItalic?: boolean;
  underline?: boolean;
  originalUnderline?: boolean;
  strike?: boolean;
  originalStrike?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  originalAlignment?: 'left' | 'center' | 'right' | 'justify';
  deleted?: boolean;
  added?: boolean;
  nativePath?: string;
  nativeId?: string;
  parentPath?: string;
  prototype?: boolean;
  cloneSourcePath?: string;
  cloneSourceX?: number;
  cloneSourceTop?: number;
  cloneSourceWidth?: number;
  cloneSourceHeight?: number;
};

export type XfaTemplateEdit = {
  key: string;
  sourceName: string;
  occurrence: number;
  name: string;
  kind: XfaFieldKind;
  page: number;
  x: number;
  top: number;
  width: number;
  height: number;
  originalX: number;
  originalTop: number;
  originalWidth: number;
  originalHeight: number;
  label?: string;
  originalLabel?: string;
  calculation?: XfaScriptBlock;
  originalCalculation?: XfaScriptBlock;
  validation?: XfaScriptBlock;
  originalValidation?: XfaScriptBlock;
  events?: Record<string, XfaScriptBlock>;
  originalEvents?: Record<string, XfaScriptBlock>;
  deleted?: boolean;
  added?: boolean;
  value?: string | boolean;
  font?: string;
  originalFont?: string;
  size?: number;
  originalSize?: number;
  color?: string;
  originalColor?: string;
  backgroundColor?: string;
  originalBackgroundColor?: string;
  borderColor?: string;
  originalBorderColor?: string;
  borderWidth?: number;
  originalBorderWidth?: number;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  originalAlignment?: 'left' | 'center' | 'right' | 'justify';
  cloneSourceName?: string;
  cloneSourceOccurrence?: number;
  cloneSourceX?: number;
  cloneSourceTop?: number;
  cloneSourceWidth?: number;
  cloneSourceHeight?: number;
  labelPlacement?: 'left' | 'right' | 'top' | 'bottom' | 'inline';
  originalLabelPlacement?: 'left' | 'right' | 'top' | 'bottom' | 'inline';
  labelReserve?: number;
  originalLabelReserve?: number;
  nativePath?: string;
  nativeId?: string;
  parentPath?: string;
  bindRef?: string;
  uiType?: string;
  prototype?: boolean;
  repeatMin?: number;
  repeatMax?: number;
  repeatInitial?: number;
  captionFont?: string;
  originalCaptionFont?: string;
  captionSize?: number;
  originalCaptionSize?: number;
  captionColor?: string;
  originalCaptionColor?: string;
  captionBold?: boolean;
  originalCaptionBold?: boolean;
  captionItalic?: boolean;
  originalCaptionItalic?: boolean;
  captionAlignment?: 'left' | 'center' | 'right' | 'justify';
  originalCaptionAlignment?: 'left' | 'center' | 'right' | 'justify';
  paddingTop?: number;
  originalPaddingTop?: number;
  paddingRight?: number;
  originalPaddingRight?: number;
  paddingBottom?: number;
  originalPaddingBottom?: number;
  paddingLeft?: number;
  originalPaddingLeft?: number;
};

export type XfaNativeNode = {
  path: string;
  parentPath?: string;
  type: 'field' | 'draw' | 'subform' | 'area' | 'contentArea' | 'pageArea' | 'exclGroup' | 'prototype';
  name: string;
  id?: string;
  kind?: XfaFieldKind | XfaDrawKind;
  uiType?: string;
  bindRef?: string;
  layout?: string;
  presence?: string;
  prototype: boolean;
  repeatMin?: number;
  repeatMax?: number;
  repeatInitial?: number;
};

export type XfaTemplateModel = {
  nodes: XfaNativeNode[];
  fields: XfaNativeNode[];
  draws: XfaNativeNode[];
  regions: XfaNativeNode[];
  warnings: string[];
};

const unitPoints: Record<string, number> = { pt: 1, in: 72, cm: 72 / 2.54, mm: 72 / 25.4, px: 72 / 96 };

function shiftedMeasurement(source: string | null, pointDelta: number, fallbackPoints: number) {
  const match = source?.trim().match(/^(-?\d*\.?\d+)\s*(pt|in|cm|mm|px)?$/i);
  const unit = match?.[2]?.toLowerCase() || 'pt';
  const factor = unitPoints[unit] || 1;
  const original = match ? Number(match[1]) : fallbackPoints / factor;
  return `${Number((original + pointDelta / factor).toFixed(3))}${unit}`;
}

function setTextValue(document: XMLDocument, parent: Element, value: string) {
  const namespace = parent.namespaceURI;
  const valueNode = document.createElementNS(namespace, 'value');
  const textNode = document.createElementNS(namespace, 'text');
  textNode.textContent = value;
  valueNode.append(textNode);
  parent.append(valueNode);
}

function directChild(parent: Element, localName: string) {
  return Array.from(parent.children).find((child) => child.localName === localName);
}

function fieldKind(field: Element): { kind: XfaFieldKind; uiType: string } {
  const ui = directChild(field, 'ui');
  const control = ui?.firstElementChild;
  const uiType = control?.localName || 'textEdit';
  if (uiType === 'numericEdit') return { kind: 'numeric', uiType };
  if (uiType === 'decimalEdit') return { kind: 'decimal', uiType };
  if (uiType === 'dateTimeEdit') return { kind: 'date', uiType };
  if (uiType === 'choiceList') return { kind: 'choice', uiType };
  if (uiType === 'button') return { kind: 'button', uiType };
  if (uiType === 'signature') return { kind: 'signature', uiType };
  if (uiType === 'passwordEdit') return { kind: 'password', uiType };
  if (uiType === 'barcode') return { kind: 'barcode', uiType };
  if (uiType === 'imageEdit') return { kind: 'image', uiType };
  if (uiType === 'checkButton')
    return { kind: control?.getAttribute('shape') === 'round' ? 'radio' : 'checkbox', uiType };
  return { kind: control?.getAttribute('multiLine') === '1' ? 'multiline' : 'text', uiType };
}

function drawKind(draw: Element): XfaDrawKind | undefined {
  const value = directChild(draw, 'value');
  if (!value) return undefined;
  if (directChild(value, 'image')) return 'image';
  if (directChild(value, 'rectangle')) return 'rectangle';
  if (directChild(value, 'line')) return 'line';
  if (directChild(value, 'arc')) return 'arc';
  if (directChild(value, 'text') || directChild(value, 'exData')) return 'text';
  return undefined;
}

function readModelFromTemplate(xml: string): XfaTemplateModel {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('The XFA template XML could not be parsed.');
  const supported = new Set(['field', 'draw', 'subform', 'area', 'contentArea', 'pageArea', 'exclGroup']);
  const nodes: XfaNativeNode[] = [];
  const walk = (parent: Element, parentPath = '', inheritedPrototype = false) => {
    const counters = new Map<string, number>();
    for (const child of Array.from(parent.children)) {
      const prototype = inheritedPrototype || child.localName === 'proto';
      if (!supported.has(child.localName)) {
        walk(child, parentPath, prototype);
        continue;
      }
      const name = child.getAttribute('name') || '';
      const counterKey = `${child.localName}:${name}`;
      const occurrence = counters.get(counterKey) || 0;
      counters.set(counterKey, occurrence + 1);
      const segment = `${name || `#${child.localName}`}[${occurrence}]`;
      const path = parentPath ? `${parentPath}.${segment}` : segment;
      const occur = directChild(child, 'occur');
      const bind = directChild(child, 'bind');
      const repeatNumber = (attribute: string) => {
        const value = occur?.getAttribute(attribute);
        return value === '-1'
          ? -1
          : value === null || value === undefined || value === ''
            ? undefined
            : Number(value);
      };
      let type = child.localName as XfaNativeNode['type'];
      let kind: XfaNativeNode['kind'];
      let uiType: string | undefined;
      if (child.localName === 'field') {
        const descriptor = fieldKind(child);
        kind = descriptor.kind;
        uiType = descriptor.uiType;
      }
      if (child.localName === 'draw') {
        kind = drawKind(child);
        if (!kind) type = 'prototype';
      }
      nodes.push({
        path,
        parentPath: parentPath || undefined,
        type,
        name,
        id: child.getAttribute('id') || undefined,
        kind,
        uiType,
        bindRef: bind?.getAttribute('ref') || bind?.getAttribute('match') || undefined,
        layout: child.getAttribute('layout') || undefined,
        presence: child.getAttribute('presence') || 'visible',
        prototype,
        repeatMin: repeatNumber('min'),
        repeatMax: repeatNumber('max'),
        repeatInitial: repeatNumber('initial'),
      });
      walk(child, path, prototype);
    }
  };
  walk(document.documentElement);
  const warnings: string[] = [];
  if (nodes.some((node) => node.type === 'prototype'))
    warnings.push('Empty prototype/style draws were excluded from editable text.');
  if (nodes.some((node) => node.type === 'field' && !node.name))
    warnings.push('Unnamed fields use their structural SOM path.');
  const named = nodes.filter((node) => node.name);
  const duplicates = new Set(
    named
      .filter(
        (node, index) =>
          named.findIndex((other) => other.type === node.type && other.name === node.name) !== index,
      )
      .map((node) => `${node.type}:${node.name}`),
  );
  if (duplicates.size)
    warnings.push(`${duplicates.size} repeated names use structural paths instead of name-only keys.`);
  return {
    nodes,
    fields: nodes.filter((node) => node.type === 'field'),
    draws: nodes.filter((node) => node.type === 'draw'),
    regions: nodes.filter((node) =>
      ['subform', 'area', 'contentArea', 'pageArea', 'exclGroup'].includes(node.type),
    ),
    warnings,
  };
}

function nativeElementMap(document: XMLDocument) {
  const supported = new Set(['field', 'draw', 'subform', 'area', 'contentArea', 'pageArea', 'exclGroup']);
  const result = new Map<string, Element>();
  const walk = (parent: Element, parentPath = '') => {
    const counters = new Map<string, number>();
    for (const child of Array.from(parent.children)) {
      if (!supported.has(child.localName)) {
        walk(child, parentPath);
        continue;
      }
      const name = child.getAttribute('name') || '';
      const counterKey = `${child.localName}:${name}`;
      const occurrence = counters.get(counterKey) || 0;
      counters.set(counterKey, occurrence + 1);
      const path = parentPath
        ? `${parentPath}.${name || `#${child.localName}`}[${occurrence}]`
        : `${name || `#${child.localName}`}[${occurrence}]`;
      result.set(path, child);
      walk(child, path);
    }
  };
  walk(document.documentElement);
  return result;
}

function scriptLanguage(script: Element): XfaScriptLanguage {
  return script.getAttribute('contentType')?.toLowerCase().includes('formcalc') ? 'formcalc' : 'javascript';
}

function readScript(parent: Element, containerName: 'calculate' | 'validate') {
  const container = directChild(parent, containerName);
  const script = container && directChild(container, 'script');
  return script ? { code: script.textContent || '', language: scriptLanguage(script) } : undefined;
}

function readScriptsFromTemplate(xml: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('The XFA template XML could not be parsed.');
  const occurrences = new Map<string, number>();
  const result: Record<string, XfaScriptMetadata> = {};
  for (const field of Array.from(document.getElementsByTagNameNS('*', 'field'))) {
    const name = field.getAttribute('name') || 'UnnamedField';
    const occurrence = occurrences.get(name) || 0;
    occurrences.set(name, occurrence + 1);
    const events: Record<string, XfaScriptBlock> = {};
    for (const event of Array.from(field.children).filter((child) => child.localName === 'event')) {
      const script = directChild(event, 'script');
      if (!script) continue;
      const activity = event.getAttribute('activity') || 'event';
      events[activity] = { code: script.textContent || '', language: scriptLanguage(script) };
    }
    result[`${name}:${occurrence}`] = {
      calculation: readScript(field, 'calculate'),
      validation: readScript(field, 'validate'),
      events,
    };
  }
  return result;
}

function scriptChanged(current?: XfaScriptBlock, original?: XfaScriptBlock) {
  return (
    (current?.code || '') !== (original?.code || '') ||
    (current?.language || 'javascript') !== (original?.language || 'javascript')
  );
}

function setContainerScript(
  document: XMLDocument,
  parent: Element,
  containerName: 'calculate' | 'validate',
  block?: XfaScriptBlock,
) {
  let container = directChild(parent, containerName);
  let script = container && directChild(container, 'script');
  if (!block?.code) {
    script?.remove();
    if (container && !container.children.length && !container.attributes.length) container.remove();
    return;
  }
  const namespace = parent.namespaceURI;
  if (!container) {
    container = document.createElementNS(namespace, containerName);
    parent.append(container);
  }
  if (!script) {
    script = document.createElementNS(namespace, 'script');
    container.append(script);
  }
  script.setAttribute(
    'contentType',
    block.language === 'formcalc' ? 'application/x-formcalc' : 'application/x-javascript',
  );
  script.textContent = block.code;
}

function setEventScripts(
  document: XMLDocument,
  parent: Element,
  events: Record<string, XfaScriptBlock>,
  originalEvents: Record<string, XfaScriptBlock>,
) {
  const namespace = parent.namespaceURI;
  const activities = new Set([...Object.keys(events), ...Object.keys(originalEvents)]);
  for (const activity of activities) {
    if (!scriptChanged(events[activity], originalEvents[activity])) continue;
    let event = Array.from(parent.children).find(
      (child) => child.localName === 'event' && child.getAttribute('activity') === activity,
    );
    let script = event && directChild(event, 'script');
    const block = events[activity];
    if (!block?.code) {
      script?.remove();
      if (
        event &&
        !event.children.length &&
        Array.from(event.attributes).every((attribute) => attribute.name === 'activity')
      )
        event.remove();
      continue;
    }
    if (!event) {
      event = document.createElementNS(namespace, 'event');
      event.setAttribute('activity', activity);
      parent.append(event);
    }
    if (!script) {
      script = document.createElementNS(namespace, 'script');
      event.append(script);
    }
    script.setAttribute(
      'contentType',
      block.language === 'formcalc' ? 'application/x-formcalc' : 'application/x-javascript',
    );
    script.textContent = block.code;
  }
}

function setCaption(
  document: XMLDocument,
  parent: Element,
  label: string,
  placement: 'top' | 'right' = 'top',
) {
  const existing = directChild(parent, 'caption');
  if (!label.trim()) {
    existing?.remove();
    return;
  }
  const namespace = parent.namespaceURI;
  const caption = existing || document.createElementNS(namespace, 'caption');
  if (!existing) {
    caption.setAttribute('placement', placement);
    caption.setAttribute('reserve', placement === 'right' ? '64pt' : '12pt');
    parent.insertBefore(caption, directChild(parent, 'ui') || parent.firstChild);
  }
  let value = directChild(caption, 'value');
  if (!value) {
    value = document.createElementNS(namespace, 'value');
    caption.append(value);
  }
  value.replaceChildren();
  const text = document.createElementNS(namespace, 'text');
  value.append(text);
  text.textContent = label;
}

function applyCaptionLayout(field: Element, edit: XfaTemplateEdit) {
  const caption = directChild(field, 'caption');
  if (!caption) return;
  const forceLayout = Boolean(edit.added && !edit.cloneSourceName);
  if (forceLayout || edit.labelPlacement !== edit.originalLabelPlacement)
    caption.setAttribute('placement', edit.labelPlacement || 'top');
  if (forceLayout || edit.labelReserve !== edit.originalLabelReserve)
    caption.setAttribute('reserve', `${Math.max(0, edit.labelReserve ?? 12)}pt`);
}

function applyCaptionAndInsets(document: XMLDocument, field: Element, edit: XfaTemplateEdit) {
  const namespace = field.namespaceURI;
  const caption = directChild(field, 'caption');
  const force = Boolean(edit.added && !edit.cloneSourceName);
  if (
    caption &&
    (force ||
      edit.captionFont !== edit.originalCaptionFont ||
      edit.captionSize !== edit.originalCaptionSize ||
      edit.captionColor !== edit.originalCaptionColor ||
      edit.captionBold !== edit.originalCaptionBold ||
      edit.captionItalic !== edit.originalCaptionItalic)
  ) {
    let font = directChild(caption, 'font');
    if (!font) {
      font = document.createElementNS(namespace, 'font');
      caption.append(font);
    }
    if (edit.captionFont)
      font.setAttribute(
        'typeface',
        edit.captionFont === 'Times Roman' ? 'Times New Roman' : edit.captionFont,
      );
    if (edit.captionSize) font.setAttribute('size', `${edit.captionSize}pt`);
    font.setAttribute('weight', edit.captionBold ? 'bold' : 'normal');
    font.setAttribute('posture', edit.captionItalic ? 'italic' : 'normal');
    if (edit.captionColor) setNodeColor(document, font, edit.captionColor);
  }
  if (caption && (force || edit.captionAlignment !== edit.originalCaptionAlignment)) {
    let para = directChild(caption, 'para');
    if (!para) {
      para = document.createElementNS(namespace, 'para');
      caption.append(para);
    }
    para.setAttribute('hAlign', edit.captionAlignment || 'left');
  }
  const insetsChanged =
    force ||
    edit.paddingTop !== edit.originalPaddingTop ||
    edit.paddingRight !== edit.originalPaddingRight ||
    edit.paddingBottom !== edit.originalPaddingBottom ||
    edit.paddingLeft !== edit.originalPaddingLeft;
  if (insetsChanged) {
    let margin = directChild(field, 'margin');
    if (!margin) {
      margin = document.createElementNS(namespace, 'margin');
      field.append(margin);
    }
    margin.setAttribute('topInset', `${Math.max(0, edit.paddingTop ?? 0)}pt`);
    margin.setAttribute('rightInset', `${Math.max(0, edit.paddingRight ?? 0)}pt`);
    margin.setAttribute('bottomInset', `${Math.max(0, edit.paddingBottom ?? 0)}pt`);
    margin.setAttribute('leftInset', `${Math.max(0, edit.paddingLeft ?? 0)}pt`);
  }
}

function cssColorValue(value = '#000000') {
  const cssRgb = value.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  const hex = value.replace('#', '').padEnd(6, '0').slice(0, 6);
  return cssRgb
    ? `${cssRgb[1]},${cssRgb[2]},${cssRgb[3]}`
    : [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) || 0).join(',');
}

function setNodeColor(document: XMLDocument, parent: Element, value: string) {
  const namespace = parent.namespaceURI;
  let fill = directChild(parent, 'fill');
  if (!fill) {
    fill = document.createElementNS(namespace, 'fill');
    parent.append(fill);
  }
  let color = directChild(fill, 'color');
  if (!color) {
    color = document.createElementNS(namespace, 'color');
    fill.append(color);
  }
  color.setAttribute('value', cssColorValue(value));
}

function applyFieldAppearance(document: XMLDocument, field: Element, edit: XfaTemplateEdit) {
  const namespace = field.namespaceURI;
  const forceAppearance = Boolean(edit.added && !edit.cloneSourceName);
  const fontChanged =
    forceAppearance ||
    edit.font !== edit.originalFont ||
    edit.size !== edit.originalSize ||
    edit.color !== edit.originalColor;
  if (fontChanged) {
    let font = directChild(field, 'font');
    if (!font) {
      font = document.createElementNS(namespace, 'font');
      field.append(font);
    }
    if (edit.font) font.setAttribute('typeface', edit.font === 'Times Roman' ? 'Times New Roman' : edit.font);
    if (edit.size) font.setAttribute('size', `${edit.size}pt`);
    if (edit.color) setNodeColor(document, font, edit.color);
  }
  if (forceAppearance || edit.backgroundColor !== edit.originalBackgroundColor)
    setNodeColor(document, field, edit.backgroundColor || '#ffffff');
  if (
    forceAppearance ||
    edit.borderColor !== edit.originalBorderColor ||
    edit.borderWidth !== edit.originalBorderWidth
  ) {
    let border = directChild(field, 'border');
    if (!border) {
      border = document.createElementNS(namespace, 'border');
      field.append(border);
    }
    let edge = directChild(border, 'edge');
    if (!edge) {
      edge = document.createElementNS(namespace, 'edge');
      border.append(edge);
    }
    edge.setAttribute('thickness', `${Math.max(0, edit.borderWidth ?? 1)}pt`);
    setNodeColor(document, edge, edit.borderColor || '#666666');
  }
  if (forceAppearance || edit.alignment !== edit.originalAlignment) {
    let para = directChild(field, 'para');
    if (!para) {
      para = document.createElementNS(namespace, 'para');
      field.append(para);
    }
    para.setAttribute('hAlign', edit.alignment || 'left');
  }
}

function appendCheckField(
  document: XMLDocument,
  parent: Element,
  name: string,
  x: number,
  y: number,
  size: number,
  checked: boolean,
  radio = false,
  label = '',
) {
  const namespace = parent.namespaceURI;
  const field = document.createElementNS(namespace, 'field');
  field.setAttribute('name', name);
  field.setAttribute('x', `${x}pt`);
  field.setAttribute('y', `${y}pt`);
  field.setAttribute('w', `${size}pt`);
  field.setAttribute('h', `${size}pt`);
  field.setAttribute('id', `paperly-${crypto.randomUUID()}`);
  const ui = document.createElementNS(namespace, 'ui');
  const check = document.createElementNS(namespace, 'checkButton');
  check.setAttribute('shape', radio ? 'round' : 'square');
  check.setAttribute('size', `${size}pt`);
  ui.append(check);
  field.append(ui);
  setCaption(document, field, label, 'right');
  const items = document.createElementNS(namespace, 'items');
  const on = document.createElementNS(namespace, 'text');
  on.textContent = 'Yes';
  const off = document.createElementNS(namespace, 'text');
  off.textContent = 'Off';
  items.append(on, off);
  field.append(items);
  setTextValue(document, field, checked ? 'Yes' : 'Off');
  parent.append(field);
  return field;
}

function appendAddedField(document: XMLDocument, target: Element, edit: XfaTemplateEdit) {
  const namespace = target.namespaceURI;
  if (edit.kind === 'radio') {
    const group = document.createElementNS(namespace, 'exclGroup');
    group.setAttribute('name', edit.name);
    group.setAttribute('x', `${edit.x}pt`);
    group.setAttribute('y', `${edit.top}pt`);
    group.setAttribute('w', `${edit.width}pt`);
    group.setAttribute('h', `${edit.height}pt`);
    group.setAttribute('id', `paperly-${crypto.randomUUID()}`);
    setCaption(document, group, edit.label || '', 'top');
    appendCheckField(document, group, 'Yes', 0, 0, Math.min(16, edit.height), edit.value === 'Yes', true);
    appendCheckField(
      document,
      group,
      'No',
      Math.min(42, edit.width / 2),
      0,
      Math.min(16, edit.height),
      edit.value === 'No',
      true,
    );
    if (edit.calculation?.code) setContainerScript(document, group, 'calculate', edit.calculation);
    if (edit.validation?.code) setContainerScript(document, group, 'validate', edit.validation);
    if (edit.events) setEventScripts(document, group, edit.events, {});
    applyFieldAppearance(document, group, edit);
    applyCaptionLayout(group, edit);
    applyCaptionAndInsets(document, group, edit);
    target.append(group);
    return;
  }
  if (edit.kind === 'checkbox') {
    const field = appendCheckField(
      document,
      target,
      edit.name,
      edit.x,
      edit.top,
      Math.min(16, edit.height),
      Boolean(edit.value),
      false,
      edit.label || '',
    );
    field.setAttribute('w', `${edit.width}pt`);
    field.setAttribute('h', `${edit.height}pt`);
    if (edit.calculation?.code) setContainerScript(document, field, 'calculate', edit.calculation);
    if (edit.validation?.code) setContainerScript(document, field, 'validate', edit.validation);
    if (edit.events) setEventScripts(document, field, edit.events, {});
    applyFieldAppearance(document, field, edit);
    applyCaptionLayout(field, edit);
    applyCaptionAndInsets(document, field, edit);
    return;
  }
  const field = document.createElementNS(namespace, 'field');
  field.setAttribute('name', edit.name);
  field.setAttribute('x', `${edit.x}pt`);
  field.setAttribute('y', `${edit.top}pt`);
  field.setAttribute('w', `${edit.width}pt`);
  field.setAttribute('h', `${edit.height}pt`);
  field.setAttribute('id', `paperly-${crypto.randomUUID()}`);
  setCaption(document, field, edit.label || '', 'top');
  const ui = document.createElementNS(namespace, 'ui');
  const uiName =
    edit.kind === 'numeric'
      ? 'numericEdit'
      : edit.kind === 'decimal'
        ? 'decimalEdit'
        : edit.kind === 'date'
          ? 'dateTimeEdit'
          : edit.kind === 'choice'
            ? 'choiceList'
            : edit.kind === 'button'
              ? 'button'
              : edit.kind === 'signature'
                ? 'signature'
                : edit.kind === 'password'
                  ? 'passwordEdit'
                  : edit.kind === 'barcode'
                    ? 'barcode'
                    : edit.kind === 'image'
                      ? 'imageEdit'
                      : 'textEdit';
  const control = document.createElementNS(namespace, uiName);
  if (edit.kind === 'multiline') control.setAttribute('multiLine', '1');
  ui.append(control);
  field.append(ui);
  if (edit.kind !== 'button' && edit.kind !== 'signature' && edit.kind !== 'image')
    setTextValue(document, field, String(edit.value || ''));
  if (edit.calculation?.code) setContainerScript(document, field, 'calculate', edit.calculation);
  if (edit.validation?.code) setContainerScript(document, field, 'validate', edit.validation);
  if (edit.events) setEventScripts(document, field, edit.events, {});
  applyFieldAppearance(document, field, edit);
  applyCaptionLayout(field, edit);
  applyCaptionAndInsets(document, field, edit);
  target.append(field);
}

function setDrawText(document: XMLDocument, draw: Element, text: string) {
  const namespace = draw.namespaceURI;
  let value = directChild(draw, 'value');
  if (!value) {
    value = document.createElementNS(namespace, 'value');
    draw.append(value);
  }
  value.replaceChildren();
  const textNode = document.createElementNS(namespace, 'text');
  textNode.textContent = text;
  value.append(textNode);
}

function setDrawRichText(document: XMLDocument, draw: Element, html: string) {
  const namespace = draw.namespaceURI;
  let value = directChild(draw, 'value');
  if (!value) {
    value = document.createElementNS(namespace, 'value');
    draw.append(value);
  }
  value.replaceChildren();
  const exData = document.createElementNS(namespace, 'exData');
  exData.setAttribute('contentType', 'text/html');
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const body = document.createElementNS('http://www.w3.org/1999/xhtml', 'body');
  for (const child of Array.from(parsed.body.childNodes)) body.append(document.importNode(child, true));
  exData.append(body);
  value.append(exData);
}

function setDrawImage(document: XMLDocument, draw: Element, dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/i);
  if (!match) throw new Error('XFA images must be PNG or JPEG data.');
  const namespace = draw.namespaceURI;
  let value = directChild(draw, 'value');
  if (!value) {
    value = document.createElementNS(namespace, 'value');
    draw.append(value);
  }
  value.replaceChildren();
  const image = document.createElementNS(namespace, 'image');
  image.setAttribute('aspect', 'fit');
  image.setAttribute('contentType', match[1].toLowerCase());
  image.setAttribute('transferEncoding', 'base64');
  image.textContent = match[2];
  value.append(image);
}

function applyDrawAppearance(document: XMLDocument, draw: Element, edit: XfaDrawEdit) {
  const namespace = draw.namespaceURI;
  if (edit.kind !== 'text') return;
  const fontChanged =
    edit.added ||
    edit.font !== edit.originalFont ||
    edit.size !== edit.originalSize ||
    edit.color !== edit.originalColor ||
    edit.bold !== edit.originalBold ||
    edit.italic !== edit.originalItalic ||
    edit.underline !== edit.originalUnderline ||
    edit.strike !== edit.originalStrike;
  const alignmentChanged = edit.added || edit.alignment !== edit.originalAlignment;
  if (!fontChanged && !alignmentChanged) return;
  let font = directChild(draw, 'font');
  if (fontChanged) {
    if (!font) {
      font = document.createElementNS(namespace, 'font');
      draw.append(font);
    }
    if (edit.font) font.setAttribute('typeface', edit.font === 'Times Roman' ? 'Times New Roman' : edit.font);
    if (edit.size) font.setAttribute('size', `${edit.size}pt`);
    font.setAttribute('weight', edit.bold ? 'bold' : 'normal');
    font.setAttribute('posture', edit.italic ? 'italic' : 'normal');
    font.setAttribute('underline', edit.underline ? '1' : '0');
    font.setAttribute('lineThrough', edit.strike ? '1' : '0');
  }
  if (fontChanged && edit.color && font) {
    const cssRgb = edit.color.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
    const hex = edit.color.replace('#', '').padEnd(6, '0').slice(0, 6);
    const rgb = cssRgb
      ? `${cssRgb[1]},${cssRgb[2]},${cssRgb[3]}`
      : [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) || 0).join(',');
    let fill = directChild(font, 'fill');
    if (!fill) {
      fill = document.createElementNS(namespace, 'fill');
      font.append(fill);
    }
    let color = directChild(fill, 'color');
    if (!color) {
      color = document.createElementNS(namespace, 'color');
      fill.append(color);
    }
    color.setAttribute('value', rgb);
  }
  if (alignmentChanged) {
    let para = directChild(draw, 'para');
    if (!para) {
      para = document.createElementNS(namespace, 'para');
      draw.append(para);
    }
    para.setAttribute('hAlign', edit.alignment || 'left');
  }
}

function appendAddedDraw(document: XMLDocument, target: Element, edit: XfaDrawEdit) {
  const namespace = target.namespaceURI;
  const draw = document.createElementNS(namespace, 'draw');
  draw.setAttribute('name', edit.sourceName || `Paperly_${edit.kind}_${crypto.randomUUID()}`);
  draw.setAttribute('x', `${edit.x}pt`);
  draw.setAttribute('y', `${edit.top}pt`);
  draw.setAttribute('w', `${edit.width}pt`);
  draw.setAttribute('h', `${edit.height}pt`);
  draw.setAttribute('id', `paperly-${crypto.randomUUID()}`);
  if (edit.kind === 'image' && edit.dataUrl) setDrawImage(document, draw, edit.dataUrl);
  else if (edit.html !== undefined) setDrawRichText(document, draw, edit.html);
  else setDrawText(document, draw, edit.text || '');
  applyDrawAppearance(document, draw, edit);
  target.append(draw);
}

function appendClonedField(document: XMLDocument, target: Element, source: Element, edit: XfaTemplateEdit) {
  const clone = source.cloneNode(true) as Element;
  clone.setAttribute('name', edit.name);
  clone.setAttribute(
    'x',
    shiftedMeasurement(
      source.getAttribute('x'),
      edit.x - (edit.cloneSourceX ?? edit.x),
      edit.cloneSourceX ?? edit.x,
    ),
  );
  clone.setAttribute(
    'y',
    shiftedMeasurement(
      source.getAttribute('y'),
      edit.top - (edit.cloneSourceTop ?? edit.top),
      edit.cloneSourceTop ?? edit.top,
    ),
  );
  clone.setAttribute(
    'w',
    shiftedMeasurement(
      source.getAttribute('w'),
      edit.width - (edit.cloneSourceWidth ?? edit.width),
      edit.cloneSourceWidth ?? edit.width,
    ),
  );
  clone.setAttribute(
    'h',
    shiftedMeasurement(
      source.getAttribute('h'),
      edit.height - (edit.cloneSourceHeight ?? edit.height),
      edit.cloneSourceHeight ?? edit.height,
    ),
  );
  [clone, ...Array.from(clone.querySelectorAll('[id]'))].forEach((node) =>
    node.setAttribute('id', `paperly-${crypto.randomUUID()}`),
  );
  const bind = directChild(clone, 'bind');
  if (bind) {
    bind.setAttribute('match', 'none');
    bind.removeAttribute('ref');
  }
  if (edit.kind !== 'button' && edit.kind !== 'signature' && edit.kind !== 'image') {
    directChild(clone, 'value')?.remove();
    const clonedValue =
      edit.kind === 'checkbox' || edit.kind === 'radio'
        ? edit.value
          ? 'Yes'
          : 'Off'
        : String(edit.value ?? '');
    setTextValue(document, clone, clonedValue);
  }
  if (edit.label !== undefined && edit.label !== edit.originalLabel)
    setCaption(
      document,
      clone,
      edit.label,
      edit.kind === 'checkbox' || edit.kind === 'radio' ? 'right' : 'top',
    );
  if (scriptChanged(edit.calculation, edit.originalCalculation))
    setContainerScript(document, clone, 'calculate', edit.calculation);
  if (scriptChanged(edit.validation, edit.originalValidation))
    setContainerScript(document, clone, 'validate', edit.validation);
  setEventScripts(document, clone, edit.events || {}, edit.originalEvents || {});
  applyFieldAppearance(document, clone, edit);
  applyCaptionLayout(clone, edit);
  applyCaptionAndInsets(document, clone, edit);
  target.append(clone);
}

function appendClonedDraw(target: Element, source: Element, edit: XfaDrawEdit) {
  const clone = source.cloneNode(true) as Element;
  clone.setAttribute('name', edit.sourceName);
  clone.setAttribute(
    'x',
    shiftedMeasurement(
      source.getAttribute('x'),
      edit.x - (edit.cloneSourceX ?? edit.x),
      edit.cloneSourceX ?? edit.x,
    ),
  );
  clone.setAttribute(
    'y',
    shiftedMeasurement(
      source.getAttribute('y'),
      edit.top - (edit.cloneSourceTop ?? edit.top),
      edit.cloneSourceTop ?? edit.top,
    ),
  );
  clone.setAttribute(
    'w',
    shiftedMeasurement(
      source.getAttribute('w'),
      edit.width - (edit.cloneSourceWidth ?? edit.width),
      edit.cloneSourceWidth ?? edit.width,
    ),
  );
  clone.setAttribute(
    'h',
    shiftedMeasurement(
      source.getAttribute('h'),
      edit.height - (edit.cloneSourceHeight ?? edit.height),
      edit.cloneSourceHeight ?? edit.height,
    ),
  );
  [clone, ...Array.from(clone.querySelectorAll('[id]'))].forEach((node) =>
    node.setAttribute('id', `paperly-${crypto.randomUUID()}`),
  );
  target.append(clone);
}

function patchTemplateXml(xml: string, edits: XfaTemplateEdit[], drawEdits: XfaDrawEdit[]) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('The XFA template XML could not be parsed.');
  const nativeElements = nativeElementMap(document);
  const fields = Array.from(document.getElementsByTagNameNS('*', 'field'));
  const used = new Set<Element>();
  for (const edit of edits.filter((entry) => !entry.added)) {
    const matches = fields.filter(
      (field) => field.getAttribute('name') === edit.sourceName && !used.has(field),
    );
    const pathField = edit.nativePath ? nativeElements.get(edit.nativePath) : undefined;
    const idField = edit.nativeId
      ? fields.find((field) => field.getAttribute('id') === edit.nativeId)
      : undefined;
    const field =
      pathField?.localName === 'field'
        ? pathField
        : idField || matches[Math.min(edit.occurrence, Math.max(0, matches.length - 1))];
    if (!field) continue;
    used.add(field);
    if (edit.deleted) {
      field.remove();
      continue;
    }
    field.setAttribute(
      'x',
      shiftedMeasurement(field.getAttribute('x'), edit.x - edit.originalX, edit.originalX),
    );
    field.setAttribute(
      'y',
      shiftedMeasurement(field.getAttribute('y'), edit.top - edit.originalTop, edit.originalTop),
    );
    field.setAttribute(
      'w',
      shiftedMeasurement(field.getAttribute('w'), edit.width - edit.originalWidth, edit.originalWidth),
    );
    field.setAttribute(
      'h',
      shiftedMeasurement(field.getAttribute('h'), edit.height - edit.originalHeight, edit.originalHeight),
    );
    if (edit.label !== undefined && edit.label !== edit.originalLabel)
      setCaption(
        document,
        field,
        edit.label,
        edit.kind === 'checkbox' || edit.kind === 'radio' ? 'right' : 'top',
      );
    if (scriptChanged(edit.calculation, edit.originalCalculation))
      setContainerScript(document, field, 'calculate', edit.calculation);
    if (scriptChanged(edit.validation, edit.originalValidation))
      setContainerScript(document, field, 'validate', edit.validation);
    setEventScripts(document, field, edit.events || {}, edit.originalEvents || {});
    applyFieldAppearance(document, field, edit);
    applyCaptionLayout(field, edit);
    applyCaptionAndInsets(document, field, edit);
  }
  const draws = Array.from(document.getElementsByTagNameNS('*', 'draw'));
  const usedDraws = new Set<Element>();
  for (const edit of drawEdits.filter((entry) => !entry.added)) {
    const matches = draws.filter((draw) => {
      if (usedDraws.has(draw) || (draw.getAttribute('name') || '') !== edit.sourceName) return false;
      const kind = drawKind(draw);
      return kind === edit.kind;
    });
    const pathDraw = edit.nativePath ? nativeElements.get(edit.nativePath) : undefined;
    const draw =
      pathDraw?.localName === 'draw'
        ? pathDraw
        : matches[Math.min(edit.occurrence, Math.max(0, matches.length - 1))];
    if (!draw) continue;
    usedDraws.add(draw);
    if (edit.deleted) {
      draw.remove();
      continue;
    }
    draw.setAttribute(
      'x',
      shiftedMeasurement(draw.getAttribute('x'), edit.x - edit.originalX, edit.originalX),
    );
    draw.setAttribute(
      'y',
      shiftedMeasurement(draw.getAttribute('y'), edit.top - edit.originalTop, edit.originalTop),
    );
    draw.setAttribute(
      'w',
      shiftedMeasurement(draw.getAttribute('w'), edit.width - edit.originalWidth, edit.originalWidth),
    );
    draw.setAttribute(
      'h',
      shiftedMeasurement(draw.getAttribute('h'), edit.height - edit.originalHeight, edit.originalHeight),
    );
    if (edit.kind === 'text' && edit.html !== undefined && edit.html !== edit.originalHtml)
      setDrawRichText(document, draw, edit.html);
    else if (edit.kind === 'text' && edit.text !== undefined && edit.text !== edit.originalText)
      setDrawText(document, draw, edit.text);
    if (edit.kind === 'image' && edit.dataUrl) setDrawImage(document, draw, edit.dataUrl);
    applyDrawAppearance(document, draw, edit);
  }
  const additions = edits.filter((entry) => entry.added && !entry.deleted);
  const drawAdditions = drawEdits.filter((entry) => entry.added && !entry.deleted);
  if (additions.length || drawAdditions.length) {
    const subforms = Array.from(document.getElementsByTagNameNS('*', 'subform'));
    const positioned = subforms.filter(
      (node) => !node.getAttribute('layout') || node.getAttribute('layout') === 'position',
    );
    if (!positioned.length && !subforms.length) throw new Error('No editable XFA subform was found.');
    const pageAreas = Array.from(document.getElementsByTagNameNS('*', 'pageArea'));
    const targetFor = (edit: { page: number; parentPath?: string }) => {
      const explicit = edit.parentPath ? nativeElements.get(edit.parentPath) : undefined;
      if (explicit && ['subform', 'area', 'contentArea', 'pageArea'].includes(explicit.localName))
        return explicit;
      const pageArea = pageAreas[Math.min(edit.page, Math.max(0, pageAreas.length - 1))];
      if (pageArea) {
        const pageSubform = positioned.find((node) => pageArea.contains(node));
        if (pageSubform) return pageSubform;
      }
      return (
        positioned[Math.min(edit.page, positioned.length - 1)] ||
        subforms[Math.min(edit.page, subforms.length - 1)]
      );
    };
    for (const edit of additions) {
      const target = targetFor(edit);
      const sourceMatches = edit.cloneSourceName
        ? fields.filter((field) => field.getAttribute('name') === edit.cloneSourceName)
        : [];
      const source =
        sourceMatches[Math.min(edit.cloneSourceOccurrence || 0, Math.max(0, sourceMatches.length - 1))];
      if (source) appendClonedField(document, source.parentElement || target, source, edit);
      else appendAddedField(document, target, edit);
    }
    for (const edit of drawAdditions) {
      const target = targetFor(edit);
      const source = edit.cloneSourcePath ? nativeElements.get(edit.cloneSourcePath) : undefined;
      if (source?.localName === 'draw') appendClonedDraw(source.parentElement || target, source, edit);
      else appendAddedDraw(document, target, edit);
    }
  }
  return new XMLSerializer().serializeToString(document);
}

export async function readNativeXfaTemplateScripts(bytes: Uint8Array) {
  const {
    PDFArray,
    PDFDict,
    PDFDocument,
    PDFHexString,
    PDFName,
    PDFRawStream,
    PDFString,
    decodePDFRawStream,
  } = await import('pdf-lib');
  const pdfDocument = await PDFDocument.load(bytes);
  const acroFormRaw = pdfDocument.catalog.get(PDFName.of('AcroForm'));
  const acroForm = pdfDocument.context.lookupMaybe(acroFormRaw, PDFDict);
  if (!acroForm) return {} as Record<string, XfaScriptMetadata>;
  const xfaRaw = acroForm.get(PDFName.of('XFA'));
  const xfa = pdfDocument.context.lookup(xfaRaw);
  const decode = (stream: import('pdf-lib').PDFRawStream) =>
    new TextDecoder().decode(decodePDFRawStream(stream).decode());
  if (xfa instanceof PDFArray) {
    for (let index = 0; index + 1 < xfa.size(); index += 2) {
      const packetName = xfa.lookupMaybe(index, PDFString, PDFHexString)?.decodeText();
      if (packetName !== 'template') continue;
      const stream = pdfDocument.context.lookup(xfa.get(index + 1));
      if (stream instanceof PDFRawStream) return readScriptsFromTemplate(decode(stream));
    }
  } else if (xfa instanceof PDFRawStream) {
    return readScriptsFromTemplate(decode(xfa));
  }
  return {} as Record<string, XfaScriptMetadata>;
}

export async function readNativeXfaTemplateModel(bytes: Uint8Array) {
  const {
    PDFArray,
    PDFDict,
    PDFDocument,
    PDFHexString,
    PDFName,
    PDFRawStream,
    PDFString,
    decodePDFRawStream,
  } = await import('pdf-lib');
  const pdfDocument = await PDFDocument.load(bytes);
  const acroForm = pdfDocument.context.lookupMaybe(pdfDocument.catalog.get(PDFName.of('AcroForm')), PDFDict);
  if (!acroForm)
    return {
      nodes: [],
      fields: [],
      draws: [],
      regions: [],
      warnings: ['No XFA template was found.'],
    } as XfaTemplateModel;
  const xfa = pdfDocument.context.lookup(acroForm.get(PDFName.of('XFA')));
  const decode = (stream: import('pdf-lib').PDFRawStream) =>
    new TextDecoder().decode(decodePDFRawStream(stream).decode());
  if (xfa instanceof PDFArray) {
    for (let index = 0; index + 1 < xfa.size(); index += 2) {
      if (xfa.lookupMaybe(index, PDFString, PDFHexString)?.decodeText() !== 'template') continue;
      const stream = pdfDocument.context.lookup(xfa.get(index + 1));
      if (stream instanceof PDFRawStream) return readModelFromTemplate(decode(stream));
    }
  } else if (xfa instanceof PDFRawStream) return readModelFromTemplate(decode(xfa));
  return {
    nodes: [],
    fields: [],
    draws: [],
    regions: [],
    warnings: ['The XFA template packet could not be decoded.'],
  } as XfaTemplateModel;
}

export async function applyNativeXfaTemplateEdits(
  bytes: Uint8Array,
  edits: XfaTemplateEdit[],
  drawEdits: XfaDrawEdit[] = [],
) {
  if (!edits.length && !drawEdits.length) return bytes;
  const {
    PDFArray,
    PDFDict,
    PDFDocument,
    PDFHexString,
    PDFName,
    PDFRawStream,
    PDFRef,
    PDFString,
    decodePDFRawStream,
  } = await import('pdf-lib');
  const pdfDocument = await PDFDocument.load(bytes);
  const acroFormRaw = pdfDocument.catalog.get(PDFName.of('AcroForm'));
  const acroForm = pdfDocument.context.lookupMaybe(acroFormRaw, PDFDict);
  if (!acroForm) throw new Error('The PDF does not contain an XFA AcroForm dictionary.');
  const xfaRaw = acroForm.get(PDFName.of('XFA'));
  const xfa = pdfDocument.context.lookup(xfaRaw);
  const decode = (stream: import('pdf-lib').PDFRawStream) =>
    new TextDecoder().decode(decodePDFRawStream(stream).decode());
  const replace = (
    raw: unknown,
    patched: string,
    setDirect: (stream: import('pdf-lib').PDFRawStream) => void,
  ) => {
    const stream = pdfDocument.context.flateStream(patched);
    if (raw instanceof PDFRef) pdfDocument.context.assign(raw, stream);
    else setDirect(stream);
  };
  let changed = false;
  if (xfa instanceof PDFArray) {
    for (let index = 0; index + 1 < xfa.size(); index += 2) {
      const packetName = xfa.lookupMaybe(index, PDFString, PDFHexString)?.decodeText();
      if (packetName !== 'template') continue;
      const rawStream = xfa.get(index + 1);
      const stream = pdfDocument.context.lookup(rawStream);
      if (!(stream instanceof PDFRawStream)) continue;
      const patched = patchTemplateXml(decode(stream), edits, drawEdits);
      replace(rawStream, patched, (replacement) => xfa.set(index + 1, replacement));
      changed = true;
      break;
    }
  } else if (xfa instanceof PDFRawStream) {
    const patched = patchTemplateXml(decode(xfa), edits, drawEdits);
    replace(xfaRaw, patched, (replacement) => acroForm.set(PDFName.of('XFA'), replacement));
    changed = true;
  }
  if (!changed) throw new Error('Paperly could not locate the XFA template packet.');
  return pdfDocument.save({ useObjectStreams: false });
}
