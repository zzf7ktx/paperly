'use client';
import { PaperlySelect } from './paperly-select';
import { alignmentOptions } from '../constants';
import { closestStandardFont } from '../lib/fonts';
import type { TextWeight } from '../types';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'fontUploadRef'
    | 'pdfBytes'
    | 'pages'
    | 'currentPage'
    | 'activeKey'
    | 'activeBlock'
    | 'activeEdit'
    | 'activeVisual'
    | 'activeAdded'
    | 'activeBold'
    | 'activeWeight'
    | 'activeItalic'
    | 'activeUnderline'
    | 'activeStrike'
    | 'activeAlignment'
    | 'hasTextSelection'
    | 'activeTypeface'
    | 'activeTypefaceUnsupported'
    | 'activeSourceFontImported'
    | 'availableFontOptions'
    | 'commit'
    | 'updateAddedBox'
    | 'setSelectedTextWeight'
    | 'toggleFormat'
    | 'setTextAlignment'
  >;
};
export function TextStyleProperties({ editor }: Props) {
  const {
    fontUploadRef,
    pdfBytes,
    pages,
    currentPage,
    activeKey,
    activeBlock,
    activeEdit,
    activeVisual,
    activeAdded,
    activeBold,
    activeWeight,
    activeItalic,
    activeUnderline,
    activeStrike,
    activeAlignment,
    hasTextSelection,
    activeTypeface,
    activeTypefaceUnsupported,
    activeSourceFontImported,
    availableFontOptions,
    commit,
    updateAddedBox,
    setSelectedTextWeight,
    toggleFormat,
    setTextAlignment,
  } = editor;
  return (
    (hasTextSelection && (
      <section className="text-style-properties" aria-label="Text style">
        <label>Typeface</label>
        <PaperlySelect
          label="Typeface"
          disabled={!activeKey && !activeAdded}
          value={activeTypeface}
          className="property-select-menu"
          options={availableFontOptions.map((font) => ({
            value: font,
            label:
              font === activeTypeface && activeTypefaceUnsupported
                ? `${font} (unsupported — import font)`
                : font,
          }))}
          onChange={(value) =>
            activeAdded
              ? updateAddedBox(activeAdded.id, { font: value, reuseSourceFont: false })
              : activeKey && commit(activeKey, { font: value })
          }
        />
        <button className="font-upload-button" onClick={() => fontUploadRef.current?.click()}>
          Import font family files
        </button>
        {activeAdded?.sourceFontName && (
          <div className="source-font-reuse">
            <div>
              <strong>Source PDF font</strong>
              <span>{activeAdded.sourceFontName}</span>
              <small>
                {activeAdded.sourceFontData
                  ? 'Embedded font data detected'
                  : activeSourceFontImported
                    ? 'Matching imported font available'
                    : 'Will use the closest export fallback'}
              </small>
            </div>
            <button
              className={activeAdded.reuseSourceFont ? 'active' : ''}
              onClick={() =>
                updateAddedBox(
                  activeAdded.id,
                  activeAdded.reuseSourceFont
                    ? {
                        reuseSourceFont: false,
                        font: closestStandardFont(activeAdded.sourceFontName),
                      }
                    : { reuseSourceFont: true, font: activeAdded.sourceFontName },
                )
              }
            >
              Reuse <b>{activeAdded.reuseSourceFont ? 'On' : 'Off'}</b>
            </button>
          </div>
        )}
        <div className="property-row">
          <div>
            <label>Size</label>
            <input
              className="property-input"
              type="number"
              min="6"
              max="120"
              disabled={!activeKey && !activeAdded}
              value={Math.round(activeAdded?.size || activeEdit?.size || activeBlock?.fontSize || 14)}
              onChange={(event) =>
                activeAdded
                  ? updateAddedBox(activeAdded.id, { size: Number(event.target.value) })
                  : activeKey && commit(activeKey, { size: Number(event.target.value) })
              }
            />
          </div>
          <div>
            <label>Page</label>
            <div className="property-static">
              {pdfBytes ? `${currentPage + 1} / ${pages.length}` : '1 / 2'}
            </div>
          </div>
        </div>
        <label>Weight</label>
        <PaperlySelect
          label="Weight"
          value={String(activeWeight)}
          className="property-select-menu"
          options={[
            { value: '400', label: 'Regular · 400' },
            { value: '500', label: 'Medium · 500' },
            { value: '600', label: 'Semibold · 600' },
            { value: '700', label: 'Bold · 700' },
          ]}
          onChange={(value) => setSelectedTextWeight(Number(value) as TextWeight)}
        />
        <label>Style</label>
        <div className="segmented">
          <button
            className={activeBold ? 'active' : ''}
            disabled={!activeKey && !activeAdded}
            onClick={() => toggleFormat('bold', activeBold)}
          >
            <b>B</b>
          </button>
          <button
            className={activeItalic ? 'active' : ''}
            disabled={!activeKey && !activeAdded}
            onClick={() => toggleFormat('italic', activeItalic)}
          >
            <i>I</i>
          </button>
          <button
            className={activeUnderline ? 'active' : ''}
            disabled={!activeKey && !activeAdded}
            onClick={() => toggleFormat('underline', activeUnderline)}
          >
            <u>U</u>
          </button>
          <button
            className={activeStrike ? 'active' : ''}
            disabled={!activeKey && !activeAdded}
            onClick={() => toggleFormat('strike', activeStrike)}
          >
            <s>S</s>
          </button>
        </div>
        <label>Alignment</label>
        <div className="segmented alignment-controls">
          {alignmentOptions.map((option) => (
            <button
              key={option.value}
              className={activeAlignment === option.value ? 'active' : ''}
              disabled={!activeKey && !activeAdded}
              aria-label={option.label}
              title={option.label}
              onClick={() => setTextAlignment(option.value)}
            >
              <span className={`alignment-glyph ${option.value}`}>
                <i />
                <i />
                <i />
              </span>
            </button>
          ))}
        </div>
        <label>Color</label>
        <div className="color-row">
          <input
            type="color"
            disabled={!activeKey && !activeAdded}
            value={activeAdded?.color || activeEdit?.color || activeVisual?.color || '#16302b'}
            onChange={(event) =>
              activeAdded
                ? updateAddedBox(activeAdded.id, { color: event.target.value })
                : activeKey && commit(activeKey, { color: event.target.value })
            }
          />
          <code>{activeAdded?.color || activeEdit?.color || activeVisual?.color || '#16302b'}</code>
        </div>
      </section>
    )) ||
    null
  );
}
