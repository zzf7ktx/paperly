'use client';

import { ColorControl } from './color-control';
import { PaperlySelect } from './paperly-select';
import { alignmentOptions, fontOptions } from '../constants';
import { sanitizeXfaRichHtml } from '../lib/xfa-dom';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'xfaImageReplaceRef'
    | 'xfaRichEditorRef'
    | 'selected'
    | 'activeXfaDraw'
    | 'updateXfaDraw'
    | 'rememberXfaRichSelection'
    | 'syncXfaRichEditor'
    | 'formatXfaRichText'
    | 'addXfaRichLink'
  >;
};
export function XfaDrawProperties({ editor }: Props) {
  const {
    xfaImageReplaceRef,
    xfaRichEditorRef,
    selected,
    activeXfaDraw,
    updateXfaDraw,
    rememberXfaRichSelection,
    syncXfaRichEditor,
    formatXfaRichText,
    addXfaRichLink,
  } = editor;
  return (
    (activeXfaDraw && (
      <section className="xfa-draw-properties" aria-label={`Selected XFA ${activeXfaDraw.kind} properties`}>
        {activeXfaDraw.kind === 'text' && activeXfaDraw.html !== undefined ? (
          <>
            <label>Rich text content</label>
            <div className="xfa-rich-toolbar" aria-label="Rich text formatting controls">
              <button
                title="Bold"
                aria-label="Bold selected text"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => formatXfaRichText('bold')}
              >
                <b>B</b>
              </button>
              <button
                title="Italic"
                aria-label="Italicize selected text"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => formatXfaRichText('italic')}
              >
                <i>I</i>
              </button>
              <button
                title="Underline"
                aria-label="Underline selected text"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => formatXfaRichText('underline')}
              >
                <u>U</u>
              </button>
              <button
                title="Strikethrough"
                aria-label="Strike selected text"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => formatXfaRichText('strikeThrough')}
              >
                <s>S</s>
              </button>
              <PaperlySelect
                label="Font for selected text"
                value=""
                className="rich-text-select"
                onOpen={rememberXfaRichSelection}
                options={[
                  { value: '', label: 'Font' },
                  ...fontOptions.map((font) => ({ value: font, label: font })),
                ]}
                onChange={(value) => {
                  if (value) formatXfaRichText('fontName', value);
                }}
              />
              <PaperlySelect
                label="Size for selected text"
                value=""
                className="rich-text-select"
                onOpen={rememberXfaRichSelection}
                options={[
                  { value: '', label: 'Size' },
                  { value: '1', label: '8 pt' },
                  { value: '2', label: '10 pt' },
                  { value: '3', label: '12 pt' },
                  { value: '4', label: '14 pt' },
                  { value: '5', label: '18 pt' },
                  { value: '6', label: '24 pt' },
                  { value: '7', label: '36 pt' },
                ]}
                onChange={(value) => {
                  if (value) formatXfaRichText('fontSize', value);
                }}
              />
              <button
                title="Add or change link"
                aria-label="Add link to selected text"
                onMouseDown={(event) => {
                  event.preventDefault();
                  rememberXfaRichSelection();
                }}
                onClick={addXfaRichLink}
              >
                Link
              </button>
              <button
                title="Remove link"
                aria-label="Remove link from selected text"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => formatXfaRichText('unlink')}
              >
                Unlink
              </button>
            </div>
            <div
              key={activeXfaDraw.key}
              ref={xfaRichEditorRef}
              className="xfa-rich-editor"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              dangerouslySetInnerHTML={{ __html: sanitizeXfaRichHtml(activeXfaDraw.html) }}
              onMouseUp={rememberXfaRichSelection}
              onKeyUp={rememberXfaRichSelection}
              onInput={(event) => {
                const preview = Array.from(
                  document.querySelectorAll<HTMLElement>('[data-paperly-xfa-draw-key]'),
                )
                  .find((node) => node.dataset.paperlyXfaDrawKey === activeXfaDraw.key)
                  ?.querySelector<HTMLElement>('.xfaRich');
                if (preview) preview.innerHTML = sanitizeXfaRichHtml(event.currentTarget.innerHTML);
              }}
              onBlur={syncXfaRichEditor}
            />
            <div className="xfa-rich-align">
              {alignmentOptions.map((option) => (
                <button
                  key={option.value}
                  aria-label={`${option.label} selected paragraph`}
                  title={option.label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    formatXfaRichText(
                      option.value === 'left'
                        ? 'justifyLeft'
                        : option.value === 'center'
                          ? 'justifyCenter'
                          : option.value === 'right'
                            ? 'justifyRight'
                            : 'justifyFull',
                    )
                  }
                >
                  <span className={`alignment-glyph ${option.value}`}>
                    <i />
                    <i />
                    <i />
                  </span>
                </button>
              ))}
            </div>
            <small className="xfa-rich-note">
              Formatting and clickable links are preserved. Select part of the text before applying a format.
            </small>
          </>
        ) : activeXfaDraw.kind === 'text' ? (
          <>
            <label>Text content</label>
            <textarea
              className="xfa-draw-text-editor"
              value={activeXfaDraw.text || ''}
              onChange={(event) => updateXfaDraw({ text: event.target.value })}
            />
            <label>Typeface</label>
            <PaperlySelect
              label="Typeface"
              value={activeXfaDraw.font || 'Helvetica'}
              className="property-select-menu"
              options={fontOptions.map((font) => ({ value: font, label: font }))}
              onChange={(value) => updateXfaDraw({ font: value })}
            />
            <div className="property-row">
              <div>
                <label>Size</label>
                <input
                  className="property-input"
                  type="number"
                  min="6"
                  max="120"
                  value={Math.round(activeXfaDraw.size || 11)}
                  onChange={(event) => updateXfaDraw({ size: Math.max(6, Number(event.target.value)) })}
                />
              </div>
              <div>
                <label>Color</label>
                <ColorControl
                  aria-label="XFA text color"
                  value={activeXfaDraw.color?.startsWith('#') ? activeXfaDraw.color : '#111111'}
                  onChange={(color) => updateXfaDraw({ color: color })}
                />
              </div>
            </div>
            <label>Style</label>
            <div className="segmented">
              <button
                className={activeXfaDraw.bold ? 'active' : ''}
                onClick={() => updateXfaDraw({ bold: !activeXfaDraw.bold })}
              >
                <b>B</b>
              </button>
              <button
                className={activeXfaDraw.italic ? 'active' : ''}
                onClick={() => updateXfaDraw({ italic: !activeXfaDraw.italic })}
              >
                <i>I</i>
              </button>
              <button
                className={activeXfaDraw.underline ? 'active' : ''}
                onClick={() => updateXfaDraw({ underline: !activeXfaDraw.underline })}
              >
                <u>U</u>
              </button>
              <button
                className={activeXfaDraw.strike ? 'active' : ''}
                onClick={() => updateXfaDraw({ strike: !activeXfaDraw.strike })}
              >
                <s>S</s>
              </button>
            </div>
            <label>Alignment</label>
            <div className="segmented alignment-controls">
              {alignmentOptions.map((option) => (
                <button
                  key={option.value}
                  className={activeXfaDraw.alignment === option.value ? 'active' : ''}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => updateXfaDraw({ alignment: option.value })}
                >
                  <span className={`alignment-glyph ${option.value}`}>
                    <i />
                    <i />
                    <i />
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : activeXfaDraw.kind === 'image' ? (
          <button className="replace-xfa-image" onClick={() => xfaImageReplaceRef.current?.click()}>
            Replace XFA image
          </button>
        ) : (
          <div className="xfa-shape-info">
            <b>{activeXfaDraw.kind}</b>
            <span>
              This native shape can be moved, resized, cloned, or removed without being treated as text.
            </span>
          </div>
        )}
        <label>Position</label>
        <div className="property-row">
          <input
            className="property-input"
            aria-label="XFA content horizontal position"
            type="number"
            min="0"
            value={Math.round(activeXfaDraw.x)}
            onChange={(event) => updateXfaDraw({ x: Math.max(0, Number(event.target.value)) })}
          />
          <input
            className="property-input"
            aria-label="XFA content vertical position"
            type="number"
            min="0"
            value={Math.round(activeXfaDraw.top)}
            onChange={(event) => updateXfaDraw({ top: Math.max(0, Number(event.target.value)) })}
          />
        </div>
        <label>Size</label>
        <div className="property-row">
          <input
            className="property-input"
            aria-label="XFA content width"
            type="number"
            min="6"
            value={Math.round(activeXfaDraw.width)}
            onChange={(event) => updateXfaDraw({ width: Math.max(6, Number(event.target.value)) })}
          />
          <input
            className="property-input"
            aria-label="XFA content height"
            type="number"
            min="6"
            value={Math.round(activeXfaDraw.height)}
            onChange={(event) => updateXfaDraw({ height: Math.max(6, Number(event.target.value)) })}
          />
        </div>
        <button
          className={activeXfaDraw.deleted ? 'restore-box' : 'delete-box'}
          onClick={() => updateXfaDraw({ deleted: !activeXfaDraw.deleted })}
        >
          {activeXfaDraw.deleted ? `Restore XFA ${activeXfaDraw.kind}` : `Remove XFA ${activeXfaDraw.kind}`}
        </button>
        <small className="xfa-template-note">
          Drag the purple handle to move and the corner square to resize. Changes are written into the native
          XFA template.
        </small>
      </section>
    )) ||
    null
  );
}
