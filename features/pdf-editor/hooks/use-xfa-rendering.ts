'use client';

import { useCallback, useEffect } from 'react';
import { executeXfaScript } from '../../../lib/xfa-runtime';
import { type XfaDrawEdit, type XfaFieldKind, type XfaTemplateEdit } from '../../../lib/xfa-template';
import { browserFontFamily } from '../lib/fonts';
import { applyLiveXfaCaptionLayout, matchRenderedXfaNode, sanitizeXfaRichHtml } from '../lib/xfa-dom';
import type { TextAlignment } from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'liveXfaScripts'
  | 'xfaRuntimeBusyRef'
  | 'xfaRuntimePendingRef'
  | 'xfaLayerRef'
  | 'xfaRuntimeRevisionRef'
  | 'setXfaRuntimeStatus'
  | 'xfaFields'
  | 'xfaStructureEdits'
  | 'xfaLiveValuesRef'
  | 'currentPage'
  | 'xfaApplyingValuesRef'
  | 'setXfaStructureEdits'
  | 'scheduleXfaRuntimeRef'
  | 'xfaRuntimeTimerRef'
  | 'isXfaDocument'
  | 'pdfRef'
  | 'pages'
  | 'setXfaChanged'
  | 'zoom'
  | 'xfaTemplateModel'
  | 'xfaScriptMetadata'
  | 'setSelectedXfaKey'
  | 'setSelectedXfaDrawKey'
  | 'setSelected'
  | 'setSelectedForm'
  | 'setSelectedAddedId'
  | 'setSelectedImage'
  | 'xfaDrawEdits'
  | 'setXfaFields'
  | 'setXfaDraws'
  | 'setError'
> & {};

export function useXfaRendering({
  liveXfaScripts,
  xfaRuntimeBusyRef,
  xfaRuntimePendingRef,
  xfaLayerRef,
  xfaRuntimeRevisionRef,
  setXfaRuntimeStatus,
  xfaFields,
  xfaStructureEdits,
  xfaLiveValuesRef,
  currentPage,
  xfaApplyingValuesRef,
  setXfaStructureEdits,
  scheduleXfaRuntimeRef,
  xfaRuntimeTimerRef,
  isXfaDocument,
  pdfRef,
  pages,
  setXfaChanged,
  zoom,
  xfaTemplateModel,
  xfaScriptMetadata,
  setSelectedXfaKey,
  setSelectedXfaDrawKey,
  setSelected,
  setSelectedForm,
  setSelectedAddedId,
  setSelectedImage,
  xfaDrawEdits,
  setXfaFields,
  setXfaDraws,
  setError,
}: Context) {
  const runLiveXfaScripts = useCallback(
    async (triggerKey?: string, activity = 'change') => {
      if (!liveXfaScripts) return;
      if (xfaRuntimeBusyRef.current) {
        xfaRuntimePendingRef.current = { triggerKey, activity };
        return;
      }
      const container = xfaLayerRef.current;
      if (!container) return;
      const revision = xfaRuntimeRevisionRef.current;
      xfaRuntimeBusyRef.current = true;
      setXfaRuntimeStatus('Running in isolated preview…');
      const errors: string[] = [];
      try {
        const descriptors = { ...xfaFields, ...xfaStructureEdits };
        const wrappers = Array.from(container.querySelectorAll<HTMLElement>('.xfaField'));
        const values = { ...xfaLiveValuesRef.current };
        const updatedNames = new Set<string>();
        wrappers.forEach((wrapper) => {
          const control = wrapper.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            'input, textarea, select',
          );
          const name = wrapper.getAttribute('xfaName');
          if (!control || !name) return;
          if (control instanceof HTMLInputElement && control.type === 'checkbox')
            values[name] = control.checked;
          else if (control instanceof HTMLInputElement && control.type === 'radio') {
            if (control.checked) values[name] = control.value;
          } else values[name] = control.value;
        });
        const mergeUpdates = (updates: Record<string, string | number | boolean | null>) => {
          for (const [name, value] of Object.entries(updates)) {
            values[name] = value;
            updatedNames.add(name);
          }
        };
        const pageFields = Object.values(descriptors).filter(
          (field) => field.page === currentPage && !field.deleted,
        );
        pageFields.forEach((field) => {
          if (field.added && !Object.prototype.hasOwnProperty.call(values, field.name))
            values[field.name] = field.value ?? null;
        });
        const trigger = triggerKey ? descriptors[triggerKey] : undefined;
        const eventScript = trigger?.events?.[activity];
        if (trigger && eventScript?.code) {
          const result = await executeXfaScript({
            code: eventScript.code,
            language: eventScript.language,
            fieldName: trigger.name,
            values,
            mode: 'event',
          });
          mergeUpdates(result.updates);
          if (result.error) errors.push(`${trigger.name} ${activity}: ${result.error}`);
        }
        if (!trigger && activity === 'initialize') {
          for (const field of pageFields) {
            for (const initialActivity of ['initialize', 'ready']) {
              const script = field.events?.[initialActivity];
              if (!script?.code) continue;
              const result = await executeXfaScript({
                code: script.code,
                language: script.language,
                fieldName: field.name,
                values,
                mode: 'event',
              });
              mergeUpdates(result.updates);
              if (result.error) errors.push(`${field.name} ${initialActivity}: ${result.error}`);
            }
          }
        }
        for (let pass = 0; pass < 2; pass += 1) {
          for (const field of pageFields) {
            if (!field.calculation?.code) continue;
            const result = await executeXfaScript({
              code: field.calculation.code,
              language: field.calculation.language,
              fieldName: field.name,
              values,
              mode: 'calculate',
            });
            mergeUpdates(result.updates);
            if (result.error && pass === 0) errors.push(`${field.name} calculation: ${result.error}`);
          }
        }
        if (revision !== xfaRuntimeRevisionRef.current) return;
        xfaApplyingValuesRef.current = true;
        wrappers.forEach((wrapper) => {
          const control = wrapper.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            'input, textarea, select',
          );
          const name = wrapper.getAttribute('xfaName');
          if (!control || !name || !updatedNames.has(name)) return;
          const value = values[name];
          let changed = false;
          if (control instanceof HTMLInputElement && control.type === 'checkbox') {
            const checked = Boolean(value);
            changed = control.checked !== checked;
            control.checked = checked;
          } else if (control instanceof HTMLInputElement && control.type === 'radio') {
            const checked = String(value) === control.value;
            changed = control.checked !== checked;
            control.checked = checked;
          } else {
            const text = String(value ?? '');
            changed = control.value !== text;
            control.value = text;
          }
          if (changed) control.dispatchEvent(new Event('input', { bubbles: true }));
        });
        xfaApplyingValuesRef.current = false;
        setXfaStructureEdits((edits) => {
          let changed = false;
          const next = { ...edits };
          pageFields
            .filter((field) => field.added && Object.prototype.hasOwnProperty.call(values, field.name))
            .forEach((field) => {
              const value = values[field.name];
              if (next[field.key]?.value === value) return;
              next[field.key] = {
                ...field,
                value: typeof value === 'number' ? String(value) : (value ?? ''),
              };
              changed = true;
            });
          return changed ? next : edits;
        });
        for (const field of pageFields) {
          if (!field.validation?.code) continue;
          const result = await executeXfaScript({
            code: field.validation.code,
            language: field.validation.language,
            fieldName: field.name,
            values,
            mode: 'validate',
          });
          mergeUpdates(result.updates);
          const wrapper = wrappers.find((node) => node.dataset.paperlyXfaKey === field.key);
          const invalid = Boolean(result.error) || result.result === false || result.result === 0;
          wrapper?.classList.toggle('paperly-xfa-invalid', invalid);
          if (result.error) errors.push(`${field.name} validation: ${result.error}`);
        }
        xfaLiveValuesRef.current = values;
        setXfaRuntimeStatus(errors[0] || 'Live calculations applied');
      } finally {
        xfaApplyingValuesRef.current = false;
        xfaRuntimeBusyRef.current = false;
        const pending = xfaRuntimePendingRef.current;
        xfaRuntimePendingRef.current = null;
        if (pending && liveXfaScripts)
          window.setTimeout(() => scheduleXfaRuntimeRef.current(pending.triggerKey, pending.activity), 0);
      }
    },
    [currentPage, liveXfaScripts, xfaFields, xfaStructureEdits],
  );

  const scheduleLiveXfaScripts = useCallback(
    (triggerKey?: string, activity = 'change') => {
      if (!liveXfaScripts) return;
      xfaRuntimeRevisionRef.current += 1;
      if (xfaRuntimeTimerRef.current !== null) window.clearTimeout(xfaRuntimeTimerRef.current);
      xfaRuntimeTimerRef.current = window.setTimeout(() => {
        xfaRuntimeTimerRef.current = null;
        void runLiveXfaScripts(triggerKey, activity);
      }, 90);
    },
    [liveXfaScripts, runLiveXfaScripts],
  );
  useEffect(() => {
    scheduleXfaRuntimeRef.current = scheduleLiveXfaScripts;
  }, [scheduleXfaRuntimeRef, scheduleLiveXfaScripts]);

  useEffect(() => {
    if (!liveXfaScripts) {
      xfaRuntimeRevisionRef.current += 1;
      xfaRuntimePendingRef.current = null;
      setXfaRuntimeStatus('Live scripts are off');
      return;
    }
    scheduleLiveXfaScripts(undefined, 'recalculate');
    return () => {
      if (xfaRuntimeTimerRef.current !== null) window.clearTimeout(xfaRuntimeTimerRef.current);
    };
  }, [currentPage, liveXfaScripts, scheduleLiveXfaScripts]);

  useEffect(() => {
    const container = xfaLayerRef.current;
    if (!container) return;
    container.replaceChildren();
    container.removeAttribute('style');
    if (!isXfaDocument || !pdfRef.current || !pages[currentPage]) return;
    let cancelled = false;
    const handleRuntimeEvent =
      (activity: string, marksChanged = false) =>
      (event: Event) => {
        if (marksChanged) setXfaChanged(true);
        if (xfaApplyingValuesRef.current) return;
        const wrapper = (event.target as HTMLElement | null)?.closest<HTMLElement>('.xfaField');
        scheduleXfaRuntimeRef.current(wrapper?.dataset.paperlyXfaKey, activity);
      };
    const handleInput = handleRuntimeEvent('change', true);
    const handleChange = handleRuntimeEvent('change', true);
    const handleClick = handleRuntimeEvent('click');
    const handleFocusIn = handleRuntimeEvent('enter');
    const handleFocusOut = handleRuntimeEvent('exit');
    container.addEventListener('input', handleInput);
    container.addEventListener('change', handleChange);
    container.addEventListener('click', handleClick);
    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      const page = await pdfRef.current.getPage(currentPage + 1);
      const xfaHtml = await page.getXfa();
      if (cancelled || !xfaHtml) return;
      const viewport = page.getViewport({ scale: zoom }).clone({ dontFlip: true });
      container.replaceChildren();
      pdfjs.XfaLayer.render({
        viewport,
        div: container,
        xfaHtml,
        annotationStorage: pdfRef.current.annotationStorage,
        linkService: {
          addLinkAttributes(link: HTMLAnchorElement, url: string, newWindow = false) {
            let href = '#';
            try {
              const parsed = new URL(url, window.location.href);
              if (['http:', 'https:', 'mailto:', 'tel:', 'ftp:'].includes(parsed.protocol))
                href = parsed.href;
            } catch {
              /* leave unsafe or malformed links disabled */
            }
            link.href = href;
            link.target = newWindow ? '_blank' : '_self';
            link.rel = 'noopener noreferrer nofollow';
          },
        } as any,
        intent: 'display',
      });
      if (cancelled) return;
      const pageRect = container.parentElement?.getBoundingClientRect();
      if (!pageRect) return;
      const discovered: Record<string, XfaTemplateEdit> = {};
      const discoveredDraws: Record<string, XfaDrawEdit> = {};
      const occurrences = new Map<string, number>();
      const fieldPathOccurrences = new Map<string, number>();
      container.querySelectorAll<HTMLElement>('.xfaField').forEach((wrapper, fieldDomIndex) => {
        const control = wrapper.querySelector<HTMLElement>('input, textarea, select, button');
        if (!control) return;
        const renderedName = wrapper.getAttribute('xfaName') || '';
        const fallbackName = control.getAttribute('aria-label') || `UnnamedField_${fieldDomIndex + 1}`;
        const renderedFields = xfaTemplateModel.fields.filter((node) => !node.prototype);
        const identityName =
          renderedName || (renderedFields.some((node) => node.name === fallbackName) ? fallbackName : '');
        const candidateOccurrence = occurrences.get(identityName || fallbackName) || 0;
        const nativeField = matchRenderedXfaNode(
          renderedFields,
          identityName,
          wrapper,
          container,
          candidateOccurrence,
          renderedFields[fieldDomIndex],
        );
        const name = nativeField?.name || renderedName || fallbackName;
        const occurrenceKey = identityName || fallbackName;
        const occurrence = occurrences.get(occurrenceKey) || 0;
        occurrences.set(occurrenceKey, occurrence + 1);
        const pathOccurrence = nativeField?.path
          ? fieldPathOccurrences.get(nativeField.path) || 0
          : occurrence;
        if (nativeField?.path) fieldPathOccurrences.set(nativeField.path, pathOccurrence + 1);
        const key = nativeField?.path
          ? `${currentPage}:field:${nativeField.path}:instance:${pathOccurrence}`
          : `${currentPage}:${name}:${occurrence}`;
        const rect = wrapper.getBoundingClientRect();
        const captionElement = wrapper.querySelector<HTMLElement>('.xfaCaption, .xfaCaptionForCheckButton');
        const label = captionElement?.textContent?.trim() || '';
        const fallbackKind: XfaFieldKind = control.classList.contains('xfaCheckbox')
          ? 'checkbox'
          : control.classList.contains('xfaRadio')
            ? 'radio'
            : control instanceof HTMLSelectElement
              ? 'choice'
              : control instanceof HTMLButtonElement
                ? 'button'
                : control instanceof HTMLTextAreaElement
                  ? 'multiline'
                  : control instanceof HTMLInputElement && control.type === 'number'
                    ? 'numeric'
                    : 'text';
        const kind = (nativeField?.kind as XfaFieldKind) || fallbackKind;
        const templateOccurrence = nativeField
          ? renderedFields.filter((node) => node.name === nativeField.name).indexOf(nativeField)
          : occurrence;
        const scripts = xfaScriptMetadata[`${name}:${Math.max(0, templateOccurrence)}`] ||
          xfaScriptMetadata[`${name}:${occurrence}`] || { events: {} };
        const controlStyle = window.getComputedStyle(control);
        const fieldFont = controlStyle.fontFamily.split(',')[0].replace(/["']/g, '').trim() || 'Helvetica';
        const fieldSize = Math.max(6, Math.min(72, Number.parseFloat(controlStyle.fontSize) || 11));
        const fieldColor = controlStyle.color || '#111111';
        const fieldBackground =
          controlStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#ffffff' : controlStyle.backgroundColor;
        const fieldBorder = controlStyle.borderColor || '#666666';
        const fieldBorderWidth = Number.parseFloat(controlStyle.borderWidth) || 1;
        const fieldAlignment = (
          controlStyle.textAlign === 'center' ||
          controlStyle.textAlign === 'right' ||
          controlStyle.textAlign === 'justify'
            ? controlStyle.textAlign
            : 'left'
        ) as TextAlignment;
        const captionStyle = captionElement ? window.getComputedStyle(captionElement) : controlStyle;
        const captionFont = captionStyle.fontFamily.split(',')[0].replace(/["']/g, '').trim() || fieldFont;
        const captionSize = Math.max(6, Math.min(72, Number.parseFloat(captionStyle.fontSize) || fieldSize));
        const captionColor = captionStyle.color || fieldColor;
        const captionBold = Number(captionStyle.fontWeight) >= 600;
        const captionItalic = captionStyle.fontStyle === 'italic';
        const captionAlignment = (
          captionStyle.textAlign === 'center' ||
          captionStyle.textAlign === 'right' ||
          captionStyle.textAlign === 'justify'
            ? captionStyle.textAlign
            : 'left'
        ) as TextAlignment;
        const paddingTop = Number.parseFloat(controlStyle.paddingTop) || 0;
        const paddingRight = Number.parseFloat(controlStyle.paddingRight) || 0;
        const paddingBottom = Number.parseFloat(controlStyle.paddingBottom) || 0;
        const paddingLeft = Number.parseFloat(controlStyle.paddingLeft) || 0;
        const controlRect = control.getBoundingClientRect();
        const captionRect = captionElement?.getBoundingClientRect();
        const labelPlacement: XfaTemplateEdit['labelPlacement'] = !captionRect
          ? 'top'
          : captionRect.right <= controlRect.left + 2
            ? 'left'
            : captionRect.left >= controlRect.right - 2
              ? 'right'
              : captionRect.bottom <= controlRect.top + 2
                ? 'top'
                : captionRect.top >= controlRect.bottom - 2
                  ? 'bottom'
                  : 'inline';
        const labelReserve = captionRect
          ? (labelPlacement === 'left' || labelPlacement === 'right' || labelPlacement === 'inline'
              ? captionRect.width
              : captionRect.height) / zoom
          : 12;
        const original: XfaTemplateEdit = {
          key,
          sourceName: nativeField?.name ?? renderedName,
          occurrence,
          name,
          kind,
          page: currentPage,
          x: (rect.left - pageRect.left) / zoom,
          top: (rect.top - pageRect.top) / zoom,
          width: rect.width / zoom,
          height: rect.height / zoom,
          originalX: (rect.left - pageRect.left) / zoom,
          originalTop: (rect.top - pageRect.top) / zoom,
          originalWidth: rect.width / zoom,
          originalHeight: rect.height / zoom,
          label,
          originalLabel: label,
          calculation: scripts.calculation ? { ...scripts.calculation } : undefined,
          originalCalculation: scripts.calculation ? { ...scripts.calculation } : undefined,
          validation: scripts.validation ? { ...scripts.validation } : undefined,
          originalValidation: scripts.validation ? { ...scripts.validation } : undefined,
          events: { ...scripts.events },
          originalEvents: { ...scripts.events },
          font: fieldFont,
          originalFont: fieldFont,
          size: fieldSize,
          originalSize: fieldSize,
          color: fieldColor,
          originalColor: fieldColor,
          backgroundColor: fieldBackground,
          originalBackgroundColor: fieldBackground,
          borderColor: fieldBorder,
          originalBorderColor: fieldBorder,
          borderWidth: fieldBorderWidth,
          originalBorderWidth: fieldBorderWidth,
          alignment: fieldAlignment,
          originalAlignment: fieldAlignment,
          labelPlacement,
          originalLabelPlacement: labelPlacement,
          labelReserve,
          originalLabelReserve: labelReserve,
          captionFont,
          originalCaptionFont: captionFont,
          captionSize,
          originalCaptionSize: captionSize,
          captionColor,
          originalCaptionColor: captionColor,
          captionBold,
          originalCaptionBold: captionBold,
          captionItalic,
          originalCaptionItalic: captionItalic,
          captionAlignment,
          originalCaptionAlignment: captionAlignment,
          paddingTop,
          originalPaddingTop: paddingTop,
          paddingRight,
          originalPaddingRight: paddingRight,
          paddingBottom,
          originalPaddingBottom: paddingBottom,
          paddingLeft,
          originalPaddingLeft: paddingLeft,
          nativePath: nativeField?.path,
          nativeId: nativeField?.id,
          parentPath: nativeField?.parentPath,
          bindRef: nativeField?.bindRef,
          uiType: nativeField?.uiType,
          prototype: nativeField?.prototype,
          repeatMin: nativeField?.repeatMin,
          repeatMax: nativeField?.repeatMax,
          repeatInitial: nativeField?.repeatInitial,
        };
        discovered[key] = original;
        wrapper.dataset.paperlyXfaKey = key;
        if (nativeField?.path) wrapper.dataset.paperlyXfaNativePath = nativeField.path;
        const edit = xfaStructureEdits[key];
        if (edit?.deleted) wrapper.style.display = 'none';
        else if (edit) {
          const geometryChanged =
            edit.x !== edit.originalX ||
            edit.top !== edit.originalTop ||
            edit.width !== edit.originalWidth ||
            edit.height !== edit.originalHeight;
          if (geometryChanged && wrapper.parentElement !== container) {
            const placeholder = wrapper.cloneNode(true) as HTMLElement;
            placeholder.classList.remove('xfaField');
            placeholder.classList.add('paperly-xfa-layout-placeholder');
            placeholder.removeAttribute('data-paperly-xfa-key');
            placeholder.setAttribute('aria-hidden', 'true');
            placeholder.style.visibility = 'hidden';
            placeholder.style.pointerEvents = 'none';
            wrapper.parentElement?.insertBefore(placeholder, wrapper);
            container.append(wrapper);
          }
          if (geometryChanged) {
            wrapper.style.position = 'absolute';
            wrapper.style.left = `${edit.x}px`;
            wrapper.style.top = `${edit.top}px`;
            wrapper.style.right = 'auto';
            wrapper.style.bottom = 'auto';
            wrapper.style.margin = '0';
            wrapper.style.translate = 'none';
            wrapper.style.transform = 'none';
            wrapper.style.zIndex = '3';
          } else wrapper.style.translate = 'none';
          wrapper.style.boxSizing = 'border-box';
          wrapper.style.width = `${edit.width}px`;
          wrapper.style.height = `${edit.height}px`;
          const caption = wrapper.querySelector<HTMLElement>('.xfaCaption, .xfaCaptionForCheckButton');
          if (caption && edit.label !== undefined) caption.textContent = edit.label;
          control.style.boxSizing = 'border-box';
          control.style.maxWidth = '100%';
          control.style.maxHeight = '100%';
          if (edit.font !== edit.originalFont)
            control.style.fontFamily = browserFontFamily(edit.font || 'Helvetica');
          if (edit.size !== edit.originalSize) control.style.fontSize = `${edit.size || 11}px`;
          if (edit.color !== edit.originalColor) control.style.color = edit.color || '#111111';
          if (edit.backgroundColor !== edit.originalBackgroundColor)
            control.style.backgroundColor = edit.backgroundColor || '#ffffff';
          if (edit.borderColor !== edit.originalBorderColor)
            control.style.borderColor = edit.borderColor || '#666666';
          if (edit.borderWidth !== edit.originalBorderWidth)
            control.style.borderWidth = `${edit.borderWidth ?? 1}px`;
          if (edit.alignment !== edit.originalAlignment) control.style.textAlign = edit.alignment || 'left';
          if (caption) {
            if (edit.captionFont !== edit.originalCaptionFont)
              caption.style.fontFamily = browserFontFamily(edit.captionFont || 'Helvetica');
            if (edit.captionSize !== edit.originalCaptionSize)
              caption.style.fontSize = `${edit.captionSize || 9}px`;
            if (edit.captionColor !== edit.originalCaptionColor)
              caption.style.color = edit.captionColor || '#111111';
            if (edit.captionBold !== edit.originalCaptionBold)
              caption.style.fontWeight = edit.captionBold ? '700' : '400';
            if (edit.captionItalic !== edit.originalCaptionItalic)
              caption.style.fontStyle = edit.captionItalic ? 'italic' : 'normal';
            if (edit.captionAlignment !== edit.originalCaptionAlignment)
              caption.style.textAlign = edit.captionAlignment || 'left';
          }
          if (
            edit.paddingTop !== edit.originalPaddingTop ||
            edit.paddingRight !== edit.originalPaddingRight ||
            edit.paddingBottom !== edit.originalPaddingBottom ||
            edit.paddingLeft !== edit.originalPaddingLeft
          )
            control.style.padding = `${edit.paddingTop ?? 0}px ${edit.paddingRight ?? 0}px ${edit.paddingBottom ?? 0}px ${edit.paddingLeft ?? 0}px`;
          if (
            edit.labelPlacement !== edit.originalLabelPlacement ||
            edit.labelReserve !== edit.originalLabelReserve
          )
            applyLiveXfaCaptionLayout(wrapper, caption, edit.labelPlacement, edit.labelReserve, 1);
        }
        wrapper.addEventListener('pointerdown', () => {
          setSelectedXfaKey(key);
          setSelectedXfaDrawKey(null);
          setSelected(null);
          setSelectedForm(null);
          setSelectedAddedId(null);
          setSelectedImage(null);
        });
      });
      Object.values(xfaStructureEdits)
        .filter(
          (field) => field.page === currentPage && field.added && !field.deleted && field.cloneSourceName,
        )
        .forEach((field) => {
          const sources = Array.from(container.querySelectorAll<HTMLElement>('.xfaField')).filter(
            (wrapper) =>
              (wrapper.getAttribute('xfaName') ||
                wrapper.querySelector('input, textarea, select, button')?.getAttribute('aria-label')) ===
              field.cloneSourceName,
          );
          const source = sources[Math.min(field.cloneSourceOccurrence || 0, Math.max(0, sources.length - 1))];
          if (!source) return;
          const clone = source.cloneNode(true) as HTMLElement;
          clone.dataset.paperlyXfaKey = field.key;
          clone.setAttribute('xfaName', field.name);
          clone.style.position = 'absolute';
          clone.style.left = `${field.x}px`;
          clone.style.top = `${field.top}px`;
          clone.style.translate = 'none';
          clone.style.boxSizing = 'border-box';
          clone.style.width = `${field.width}px`;
          clone.style.height = `${field.height}px`;
          const caption = clone.querySelector<HTMLElement>('.xfaCaption, .xfaCaptionForCheckButton');
          if (caption) caption.textContent = field.label || '';
          const control = clone.querySelector<HTMLElement>('input, textarea, select, button');
          if (control) {
            control.setAttribute('aria-label', field.label || field.name);
            if (control instanceof HTMLInputElement) {
              if (control.type === 'checkbox' || control.type === 'radio')
                control.checked = Boolean(field.value);
              else control.value = String(field.value ?? control.value ?? '');
            } else if (control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)
              control.value = String(field.value ?? control.value ?? '');
            control.style.boxSizing = 'border-box';
            control.style.maxWidth = '100%';
            control.style.maxHeight = '100%';
            control.style.fontFamily = browserFontFamily(field.font || 'Helvetica');
            control.style.fontSize = `${field.size || 11}px`;
            control.style.color = field.color || '#111111';
            control.style.backgroundColor = field.backgroundColor || '#ffffff';
            control.style.borderColor = field.borderColor || '#666666';
            control.style.borderWidth = `${field.borderWidth ?? 1}px`;
            control.style.textAlign = field.alignment || 'left';
            control.style.padding = `${field.paddingTop ?? 0}px ${field.paddingRight ?? 0}px ${field.paddingBottom ?? 0}px ${field.paddingLeft ?? 0}px`;
            const syncCloneValue = () => {
              const value =
                control instanceof HTMLInputElement &&
                (control.type === 'checkbox' || control.type === 'radio')
                  ? control.checked
                  : (control as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
              setXfaStructureEdits((items) => ({ ...items, [field.key]: { ...items[field.key], value } }));
              setXfaChanged(true);
            };
            control.addEventListener('input', syncCloneValue);
            control.addEventListener('change', syncCloneValue);
          }
          if (caption) {
            caption.style.fontFamily = browserFontFamily(field.captionFont || 'Helvetica');
            caption.style.fontSize = `${field.captionSize || 9}px`;
            caption.style.color = field.captionColor || '#111111';
            caption.style.fontWeight = field.captionBold ? '700' : '400';
            caption.style.fontStyle = field.captionItalic ? 'italic' : 'normal';
            caption.style.textAlign = field.captionAlignment || 'left';
          }
          const captionLayoutChanged =
            field.labelPlacement !== field.originalLabelPlacement ||
            field.labelReserve !== field.originalLabelReserve;
          if (captionLayoutChanged)
            applyLiveXfaCaptionLayout(clone, caption, field.labelPlacement, field.labelReserve, 1);
          clone.addEventListener('pointerdown', () => {
            setSelectedXfaKey(field.key);
            setSelectedXfaDrawKey(null);
            setSelected(null);
            setSelectedForm(null);
            setSelectedAddedId(null);
            setSelectedImage(null);
          });
          container.append(clone);
        });
      const drawOccurrences = new Map<string, number>();
      const drawPathOccurrences = new Map<string, number>();
      container.querySelectorAll<HTMLElement>('.xfaDraw').forEach((wrapper, drawDomIndex) => {
        const image = wrapper.querySelector<HTMLImageElement>('.xfaImage');
        const sourceName = wrapper.getAttribute('xfaName') || '';
        const occurrenceKey = sourceName || `#draw-${drawDomIndex}`;
        const occurrence = drawOccurrences.get(occurrenceKey) || 0;
        drawOccurrences.set(occurrenceKey, occurrence + 1);
        const renderedDraws = xfaTemplateModel.draws.filter((node) => !node.prototype);
        const nativeDraw = matchRenderedXfaNode(
          renderedDraws,
          sourceName,
          wrapper,
          container,
          occurrence,
          renderedDraws[drawDomIndex],
        );
        const kind: XfaDrawEdit['kind'] =
          (nativeDraw?.kind as XfaDrawEdit['kind']) ||
          (image ? 'image' : wrapper.textContent?.trim() ? 'text' : 'rectangle');
        if (
          nativeDraw?.type === 'prototype' ||
          (!nativeDraw && !image && !wrapper.textContent?.trim() && !wrapper.querySelector('svg'))
        )
          return;
        const pathOccurrence = nativeDraw?.path ? drawPathOccurrences.get(nativeDraw.path) || 0 : occurrence;
        if (nativeDraw?.path) drawPathOccurrences.set(nativeDraw.path, pathOccurrence + 1);
        const key = nativeDraw?.path
          ? `${currentPage}:draw:${nativeDraw.path}:instance:${pathOccurrence}`
          : `${currentPage}:draw:${kind}:${sourceName || 'unnamed'}:${occurrence}`;
        const rect = wrapper.getBoundingClientRect();
        const style = window.getComputedStyle(wrapper);
        const rich = image ? null : wrapper.querySelector<HTMLElement>('.xfaRich');
        const html = rich?.innerHTML;
        const text = image ? undefined : wrapper.textContent || '';
        const font = style.fontFamily.split(',')[0].replace(/["']/g, '').trim() || 'Helvetica';
        const size = Number.parseFloat(style.fontSize) || 11;
        const color = style.color;
        const bold = Number(style.fontWeight) >= 600;
        const italic = style.fontStyle === 'italic';
        const underline = style.textDecorationLine.includes('underline');
        const strike = style.textDecorationLine.includes('line-through');
        const alignment = (
          style.textAlign === 'center' || style.textAlign === 'right' || style.textAlign === 'justify'
            ? style.textAlign
            : 'left'
        ) as TextAlignment;
        const original: XfaDrawEdit = {
          key,
          sourceName,
          occurrence,
          kind,
          page: currentPage,
          x: (rect.left - pageRect.left) / zoom,
          top: (rect.top - pageRect.top) / zoom,
          width: rect.width / zoom,
          height: rect.height / zoom,
          originalX: (rect.left - pageRect.left) / zoom,
          originalTop: (rect.top - pageRect.top) / zoom,
          originalWidth: rect.width / zoom,
          originalHeight: rect.height / zoom,
          text,
          originalText: text,
          html,
          originalHtml: html,
          font,
          originalFont: font,
          size,
          originalSize: size,
          color,
          originalColor: color,
          bold,
          originalBold: bold,
          italic,
          originalItalic: italic,
          underline,
          originalUnderline: underline,
          strike,
          originalStrike: strike,
          alignment,
          originalAlignment: alignment,
          nativePath: nativeDraw?.path,
          nativeId: nativeDraw?.id,
          parentPath: nativeDraw?.parentPath,
          prototype: nativeDraw?.prototype,
        };
        discoveredDraws[key] = original;
        wrapper.dataset.paperlyXfaDrawKey = key;
        if (nativeDraw?.path) wrapper.dataset.paperlyXfaNativePath = nativeDraw.path;
        const edit = xfaDrawEdits[key];
        if (edit?.deleted) wrapper.style.display = 'none';
        else if (edit) {
          const geometryChanged =
            edit.x !== edit.originalX ||
            edit.top !== edit.originalTop ||
            edit.width !== edit.originalWidth ||
            edit.height !== edit.originalHeight;
          if (geometryChanged && wrapper.parentElement !== container) {
            const placeholder = wrapper.cloneNode(true) as HTMLElement;
            placeholder.classList.remove('xfaDraw');
            placeholder.classList.add('paperly-xfa-layout-placeholder');
            placeholder.removeAttribute('data-paperly-xfa-draw-key');
            placeholder.setAttribute('aria-hidden', 'true');
            placeholder.style.visibility = 'hidden';
            placeholder.style.pointerEvents = 'none';
            wrapper.parentElement?.insertBefore(placeholder, wrapper);
            container.append(wrapper);
          }
          if (geometryChanged) {
            wrapper.style.position = 'absolute';
            wrapper.style.left = `${edit.x}px`;
            wrapper.style.top = `${edit.top}px`;
            wrapper.style.right = 'auto';
            wrapper.style.bottom = 'auto';
            wrapper.style.margin = '0';
            wrapper.style.translate = 'none';
            wrapper.style.transform = 'none';
            wrapper.style.zIndex = '2';
          } else wrapper.style.translate = 'none';
          wrapper.style.width = `${edit.width}px`;
          wrapper.style.height = `${edit.height}px`;
          if (edit.kind === 'text' && edit.html !== undefined && edit.html !== original.html && rich)
            rich.innerHTML = sanitizeXfaRichHtml(edit.html);
          else if (edit.kind === 'text' && edit.text !== undefined && edit.text !== original.text) {
            const target = rich || wrapper;
            target.textContent = edit.text;
          }
          const appearanceChanged =
            edit.font !== edit.originalFont ||
            edit.size !== edit.originalSize ||
            edit.color !== edit.originalColor ||
            edit.bold !== edit.originalBold ||
            edit.italic !== edit.originalItalic ||
            edit.underline !== edit.originalUnderline ||
            edit.strike !== edit.originalStrike ||
            edit.alignment !== edit.originalAlignment;
          if (edit.kind === 'text' && (!rich || appearanceChanged)) {
            wrapper.style.fontFamily = browserFontFamily(edit.font || 'Helvetica');
            wrapper.style.fontSize = `${edit.size || 11}px`;
            wrapper.style.color = edit.color || '#111111';
            wrapper.style.fontWeight = edit.bold ? '700' : '400';
            wrapper.style.fontStyle = edit.italic ? 'italic' : 'normal';
            wrapper.style.textDecoration =
              `${edit.underline ? 'underline ' : ''}${edit.strike ? 'line-through' : ''}`.trim() || 'none';
            wrapper.style.textAlign = edit.alignment || 'left';
          }
          if (edit.kind === 'image' && edit.dataUrl && image) image.src = edit.dataUrl;
        }
        wrapper.addEventListener('pointerdown', (event) => {
          event.stopPropagation();
          setSelectedXfaDrawKey(key);
          setSelectedXfaKey(null);
          setSelected(null);
          setSelectedForm(null);
          setSelectedAddedId(null);
          setSelectedImage(null);
        });
      });
      Object.values(xfaDrawEdits)
        .filter((draw) => draw.page === currentPage && draw.added && !draw.deleted && draw.cloneSourcePath)
        .forEach((draw) => {
          const source = container.querySelector<HTMLElement>(
            `[data-paperly-xfa-native-path="${CSS.escape(draw.cloneSourcePath || '')}"]`,
          );
          if (!source) return;
          const clone = source.cloneNode(true) as HTMLElement;
          clone.dataset.paperlyXfaDrawKey = draw.key;
          clone.setAttribute('xfaName', draw.sourceName);
          clone.style.position = 'absolute';
          clone.style.left = `${draw.x}px`;
          clone.style.top = `${draw.top}px`;
          clone.style.translate = 'none';
          clone.style.width = `${draw.width}px`;
          clone.style.height = `${draw.height}px`;
          clone.style.boxSizing = 'border-box';
          if (draw.kind === 'text') {
            clone.style.fontFamily = browserFontFamily(draw.font || 'Helvetica');
            clone.style.fontSize = `${draw.size || 11}px`;
            clone.style.color = draw.color || '#111111';
            clone.style.fontWeight = draw.bold ? '700' : '400';
            clone.style.fontStyle = draw.italic ? 'italic' : 'normal';
            clone.style.textAlign = draw.alignment || 'left';
          }
          const image = clone.querySelector<HTMLImageElement>('img');
          if (image && draw.dataUrl) image.src = draw.dataUrl;
          clone.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
            setSelectedXfaDrawKey(draw.key);
            setSelectedXfaKey(null);
            setSelected(null);
            setSelectedForm(null);
            setSelectedAddedId(null);
            setSelectedImage(null);
          });
          container.append(clone);
        });
      setXfaFields(discovered);
      setXfaDraws(discoveredDraws);
    })().catch((reason) => {
      console.error(reason);
      if (!cancelled) setError('This XFA page could not be rendered.');
    });
    return () => {
      cancelled = true;
      container.removeEventListener('input', handleInput);
      container.removeEventListener('change', handleChange);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, [
    currentPage,
    isXfaDocument,
    pages,
    xfaDrawEdits,
    xfaScriptMetadata,
    xfaStructureEdits,
    xfaTemplateModel,
    zoom,
  ]);

  return {};
}
