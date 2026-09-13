'use client';

import { ColorPicker } from './color-picker';
import { PaperlySelect } from './paperly-select';
import { fontOptions } from '../constants';
import type { TextAlignment } from '../types';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'selected'
    | 'selectedElements'
    | 'batchFont'
    | 'setBatchFont'
    | 'batchSize'
    | 'setBatchSize'
    | 'batchColor'
    | 'setBatchColor'
    | 'batchBold'
    | 'setBatchBold'
    | 'batchItalic'
    | 'setBatchItalic'
    | 'batchAlignment'
    | 'setBatchAlignment'
    | 'batchStyleCount'
    | 'applyBatchStyle'
  >;
};
export function BatchStyleProperties({ editor }: Props) {
  const {
    selected,
    selectedElements,
    batchFont,
    setBatchFont,
    batchSize,
    setBatchSize,
    batchColor,
    setBatchColor,
    batchBold,
    setBatchBold,
    batchItalic,
    setBatchItalic,
    batchAlignment,
    setBatchAlignment,
    batchStyleCount,
    applyBatchStyle,
  } = editor;
  return (
    (selectedElements.length > 1 && batchStyleCount > 0 && (
      <section className="batch-style-editor">
        <strong>Shared style</strong>
        <small>
          Applies to {batchStyleCount} compatible text and form element
          {batchStyleCount === 1 ? '' : 's'}; images are unchanged.
        </small>
        <div className="batch-style-controls">
          <label>
            Typeface
            <PaperlySelect
              label="Shared typeface"
              value={batchFont}
              className="property-select-menu"
              options={fontOptions.map((font) => ({ value: font, label: font }))}
              onChange={(value) => {
                setBatchFont(value);
                applyBatchStyle({ font: value });
              }}
            />
          </label>
          <div className="batch-style-row">
            <label>
              Size
              <input
                type="number"
                min="6"
                max="72"
                value={batchSize}
                onChange={(event) => {
                  const size = Math.max(6, Number(event.target.value));
                  setBatchSize(size);
                  applyBatchStyle({ size });
                }}
              />
            </label>
            <label>
              Color
              <ColorPicker
                aria-label="Selection text color"
                value={batchColor}
                onChange={(color) => {
                  setBatchColor(color);
                  applyBatchStyle({ color: color });
                }}
              />
            </label>
          </div>
          <div className="batch-style-buttons">
            <button
              className={batchBold ? 'active' : ''}
              onClick={() => {
                const value = !batchBold;
                setBatchBold(value);
                applyBatchStyle({ bold: value });
              }}
              title="Bold selected text"
            >
              <b>B</b>
            </button>
            <button
              className={batchItalic ? 'active' : ''}
              onClick={() => {
                const value = !batchItalic;
                setBatchItalic(value);
                applyBatchStyle({ italic: value });
              }}
              title="Italic selected text"
            >
              <i>I</i>
            </button>
            {(['left', 'center', 'right'] as TextAlignment[]).map((alignment) => (
              <button
                key={alignment}
                className={batchAlignment === alignment ? 'active' : ''}
                onClick={() => {
                  setBatchAlignment(alignment);
                  applyBatchStyle({ alignment });
                }}
                title={`Align ${alignment}`}
              >
                <span className={`alignment-glyph ${alignment}`}>
                  <i />
                  <i />
                  <i />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    )) ||
    null
  );
}
