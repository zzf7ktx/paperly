'use client';

import { ColorPicker } from './color-picker';
import { BatchStyleProperties } from './batch-style-properties';
import { TextLayoutProperties } from './text-layout-properties';
import { TextStyleProperties } from './text-style-properties';
import { VectorProperties } from './vector-properties';
import { XfaDrawProperties } from './xfa-draw-properties';
import { XfaFieldProperties } from './xfa-field-properties';

import { type CSSProperties } from 'react';
import { type XfaTemplateEdit } from '../../../lib/xfa-template';
import { AcroFormSummary } from './acro-form-summary';
import { PaperlySelect } from './paperly-select';
import { alignmentOptions, fontOptions } from '../constants';
import { sampleFieldBackground } from '../lib/appearance';
import { collectFontWarnings, fontFamilyIdentity } from '../lib/fonts';
import { selectedElementKey } from '../lib/text';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'repeatDataFileRef'
    | 'xfaImageReplaceRef'
    | 'fontUploadRef'
    | 'xfaRichEditorRef'
    | 'canvasRef'
    | 'xfaLayerRef'
    | 'pdfBytes'
    | 'isXfaDocument'
    | 'xfaChanged'
    | 'setSelectedXfaDrawKey'
    | 'xfaTemplateModel'
    | 'setSelectedXfaKey'
    | 'xfaEventActivity'
    | 'setXfaEventActivity'
    | 'liveXfaScripts'
    | 'setLiveXfaScripts'
    | 'xfaRuntimeStatus'
    | 'xfaScriptMetadata'
    | 'scheduleXfaRuntimeRef'
    | 'pages'
    | 'currentPage'
    | 'zoom'
    | 'selected'
    | 'setSelected'
    | 'selectedElements'
    | 'setSelectedElements'
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
    | 'repeatDataOpen'
    | 'setRepeatDataOpen'
    | 'repeatDataText'
    | 'setRepeatDataText'
    | 'repeatColumnMap'
    | 'setRepeatColumnMap'
    | 'repeatRowGap'
    | 'setRepeatRowGap'
    | 'repeatUseTemplateFirst'
    | 'setRepeatUseTemplateFirst'
    | 'repeatTextSizing'
    | 'setRepeatTextSizing'
    | 'selectedForm'
    | 'setSelectedForm'
    | 'formBackgrounds'
    | 'setFormBackgrounds'
    | 'normalCloneMode'
    | 'setNormalCloneMode'
    | 'setAddedBoxes'
    | 'setVectorEdits'
    | 'setSelectedVectorId'
    | 'selectedImage'
    | 'setSelectedImage'
    | 'setSelectedAddedId'
    | 'tool'
    | 'setTool'
    | 'snapEnabled'
    | 'snapMode'
    | 'snapAnchor'
    | 'fontWarnings'
    | 'setFontWarnings'
    | 'uploadedFonts'
    | 'setSnapGuides'
    | 'setToast'
    | 'rightPanelCollapsed'
    | 'setRightPanelCollapsed'
    | 'setPropertyPanelMode'
    | 'activeKey'
    | 'activeBlock'
    | 'activeEdit'
    | 'activeVisual'
    | 'activeAdded'
    | 'activeAddedImage'
    | 'activeExistingImage'
    | 'activeImageKey'
    | 'activeImageEdit'
    | 'activeVector'
    | 'activeVectorKey'
    | 'activeVectorEdit'
    | 'activeXfaField'
    | 'activeXfaDraw'
    | 'activeFormKey'
    | 'activeFormEdit'
    | 'activeFormLabel'
    | 'xfaEventActivities'
    | 'activeXfaEvent'
    | 'activeBold'
    | 'activeWeight'
    | 'activeItalic'
    | 'activeUnderline'
    | 'activeStrike'
    | 'activeAlignment'
    | 'batchStyleCount'
    | 'batchTextBoxCount'
    | 'batchAutoFitEnabled'
    | 'repeatHeaders'
    | 'repeatRows'
    | 'repeatableElements'
    | 'hasTextSelection'
    | 'availablePropertyModes'
    | 'effectivePropertyPanelMode'
    | 'activeTypeface'
    | 'activeTypefaceUnsupported'
    | 'activeSourceFontImported'
    | 'availableFontOptions'
    | 'commit'
    | 'updateAddedBox'
    | 'fitAddedBox'
    | 'fitExistingBox'
    | 'uploadFontFiles'
    | 'setSelectedTextWeight'
    | 'toggleFormat'
    | 'setTextAlignment'
    | 'updateXfaField'
    | 'removeSelectedAddedXfaField'
    | 'updateXfaCalculation'
    | 'updateXfaValidation'
    | 'updateXfaEventScript'
    | 'updateFormEdit'
    | 'updateXfaDraw'
    | 'cloneSelectedElement'
    | 'cloneSelectedElements'
    | 'applyBatchStyle'
    | 'fitSelectedTextBoxes'
    | 'setSelectedTextBoxesAutoFit'
    | 'generateRepeatedRows'
    | 'rememberXfaRichSelection'
    | 'syncXfaRichEditor'
    | 'formatXfaRichText'
    | 'addXfaRichLink'
    | 'toggleExistingImageDeleted'
    | 'removeAddedImage'
    | 'deleteSelectedElements'
    | 'cloneVector'
    | 'deleteVector'
    | 'updateSelectedImageSize'
  >;
};

export function PropertiesPanel({ editor }: Props) {
  const {
    repeatDataFileRef,
    fontUploadRef,
    canvasRef,
    xfaLayerRef,
    pdfBytes,
    isXfaDocument,
    xfaChanged,
    setSelectedXfaDrawKey,
    xfaTemplateModel,
    setSelectedXfaKey,
    liveXfaScripts,
    setLiveXfaScripts,
    xfaRuntimeStatus,
    xfaScriptMetadata,
    scheduleXfaRuntimeRef,
    pages,
    currentPage,
    zoom,
    selected,
    setSelected,
    selectedElements,
    setSelectedElements,
    repeatDataOpen,
    setRepeatDataOpen,
    repeatDataText,
    setRepeatDataText,
    repeatColumnMap,
    setRepeatColumnMap,
    repeatRowGap,
    setRepeatRowGap,
    repeatUseTemplateFirst,
    setRepeatUseTemplateFirst,
    repeatTextSizing,
    setRepeatTextSizing,
    selectedForm,
    setSelectedForm,
    formBackgrounds,
    setFormBackgrounds,
    normalCloneMode,
    setNormalCloneMode,
    setSelectedVectorId,
    selectedImage,
    setSelectedImage,
    setSelectedAddedId,
    tool,
    setTool,
    snapEnabled,
    snapMode,
    snapAnchor,
    fontWarnings,
    setFontWarnings,
    uploadedFonts,
    setSnapGuides,
    setToast,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    setPropertyPanelMode,
    activeKey,
    activeBlock,
    activeAdded,
    activeAddedImage,
    activeExistingImage,
    activeImageKey,
    activeImageEdit,
    activeVector,
    activeXfaField,
    activeXfaDraw,
    activeFormKey,
    activeFormEdit,
    activeFormLabel,
    batchTextBoxCount,
    batchAutoFitEnabled,
    repeatHeaders,
    repeatRows,
    repeatableElements,
    availablePropertyModes,
    effectivePropertyPanelMode,
    uploadFontFiles,
    updateXfaField,
    updateFormEdit,
    cloneSelectedElement,
    cloneSelectedElements,
    fitSelectedTextBoxes,
    setSelectedTextBoxesAutoFit,
    generateRepeatedRows,
    toggleExistingImageDeleted,
    removeAddedImage,
    deleteSelectedElements,
    cloneVector,
    updateSelectedImageSize,
  } = editor;
  return (
    <aside
      className={`properties property-mode-${effectivePropertyPanelMode} ${selectedElements.length > 1 ? 'has-multi-selection' : ''} ${rightPanelCollapsed ? 'is-collapsed' : ''}`}
      aria-label="Properties panel"
    >
      <div className="property-head">
        <strong>
          {rightPanelCollapsed
            ? 'Edit'
            : activeXfaField
              ? 'XFA field'
              : activeXfaDraw
                ? `XFA ${activeXfaDraw.kind}`
                : selectedForm
                  ? 'Form field'
                  : selectedImage
                    ? selectedImage.kind === 'added'
                      ? 'New image'
                      : 'PDF image'
                    : activeAdded
                      ? 'New text box'
                      : activeBlock
                        ? 'Text'
                        : pdfBytes
                          ? 'Document'
                          : 'Properties'}
        </strong>
        <div className="property-head-actions">
          {!rightPanelCollapsed && (
            <button
              onClick={() => {
                setSelectedElements([]);
                setSelected(null);
                setSelectedForm(null);
                setSelectedAddedId(null);
                setSelectedImage(null);
                setSelectedVectorId(null);
                setSelectedXfaKey(null);
                setSelectedXfaDrawKey(null);
                setSnapGuides({});
                setTool('select');
              }}
              aria-label="Clear selection"
              title="Clear selection"
            >
              ×
            </button>
          )}
          <button
            className="panel-collapse-button"
            data-direction={rightPanelCollapsed ? 'left' : 'right'}
            onClick={() => setRightPanelCollapsed((collapsed) => !collapsed)}
            aria-label={rightPanelCollapsed ? 'Expand properties panel' : 'Collapse properties panel'}
            title={rightPanelCollapsed ? 'Expand properties panel' : 'Collapse properties panel'}
          >
            {rightPanelCollapsed ? '‹' : '›'}
          </button>
        </div>
      </div>
      {!rightPanelCollapsed && (
        <>
          {selectedElements.length > 1 && (
            <div className="multi-selection-card">
              <strong>{selectedElements.length} elements selected</strong>
              <small>
                Drag the active element’s move handle to move the group. Use Layout and Style below for shared
                changes.
              </small>
              <div className="multi-selection-actions">
                <button onClick={cloneSelectedElements}>Clone selected</button>
                <button className="delete-box" onClick={deleteSelectedElements}>
                  Delete selected
                </button>
              </div>
            </div>
          )}
          {selectedElements.length <= 1 &&
            (activeXfaField ||
              activeXfaDraw ||
              selectedForm ||
              selectedImage ||
              activeAdded ||
              activeBlock ||
              activeVector) && (
              <div className={`element-actions ${availablePropertyModes.length <= 1 ? 'without-tabs' : ''}`}>
                <button onClick={activeVector ? cloneVector : cloneSelectedElement}>⧉ Clone element</button>
              </div>
            )}
          {availablePropertyModes.length > 1 && (
            <nav
              className="property-tabs"
              aria-label="Property categories"
              style={{ gridTemplateColumns: `repeat(${availablePropertyModes.length}, minmax(0, 1fr))` }}
            >
              {availablePropertyModes.map((mode) => (
                <button
                  key={mode}
                  className={effectivePropertyPanelMode === mode ? 'active' : ''}
                  onClick={() => setPropertyPanelMode(mode)}
                >
                  {mode === 'advanced' ? 'More' : mode[0].toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </nav>
          )}
          <div className="property-content">
            {selectedElements.length > 1 && repeatDataOpen && repeatableElements.length > 0 && (
              <section className="batch-layout-editor repeat-sizing-editor">
                <strong>Repeated text sizing</strong>
                <label>
                  Generated text boxes
                  <PaperlySelect
                    label="Generated text box sizing"
                    value={repeatTextSizing}
                    className="property-select-menu"
                    options={[
                      { value: 'fixed', label: 'Keep template width and height' },
                      { value: 'wrap-height', label: 'Keep width · wrap and grow height' },
                      { value: 'fit-width', label: 'Keep one line · fit width to text' },
                    ]}
                    onChange={(value) => setRepeatTextSizing(value as typeof repeatTextSizing)}
                  />
                </label>
                <small>
                  Row spacing automatically grows to fit the tallest generated cell. Existing PDF text used as
                  the first row keeps its original geometry.
                </small>
              </section>
            )}
            {selectedElements.length > 1 && (
              <section className="batch-layout-editor">
                <strong>Group layout</strong>
                <span>{selectedElements.length} elements move together and keep their relative spacing.</span>
                {batchTextBoxCount > 0 && (
                  <>
                    <label>Selected text boxes</label>
                    <div className="fit-controls">
                      <button onClick={fitSelectedTextBoxes}>Fit to text ({batchTextBoxCount})</button>
                      <button
                        className={batchAutoFitEnabled ? 'active' : ''}
                        onClick={() => setSelectedTextBoxesAutoFit(!batchAutoFitEnabled)}
                      >
                        Auto fit <b>{batchAutoFitEnabled ? 'On' : 'Off'}</b>
                      </button>
                    </div>
                    <small>
                      Fit and Auto fit apply only to added text boxes. Existing PDF text, forms, and images
                      keep their current size.
                    </small>
                  </>
                )}
                {repeatableElements.length > 0 && (
                  <div className="data-repeater">
                    <button
                      className={`data-repeater-toggle ${repeatDataOpen ? 'active' : ''}`}
                      onClick={() => setRepeatDataOpen((open) => !open)}
                    >
                      <span>Repeat with data</span>
                      <b>{repeatDataOpen ? 'Close' : 'Open'}</b>
                    </button>
                    {repeatDataOpen && (
                      <div className="data-repeater-body">
                        <label>
                          Paste CSV, TSV, or spreadsheet rows
                          <textarea
                            value={repeatDataText}
                            placeholder={
                              '#\tDescription\tDebit ($)\tCredit ($)\tBalance ($)\n1\tOpening Balance\t—\t—\t10,000.00'
                            }
                            onChange={(event) => {
                              setRepeatDataText(event.target.value);
                              setRepeatColumnMap({});
                            }}
                          />
                        </label>
                        <input
                          ref={repeatDataFileRef}
                          type="file"
                          accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
                          hidden
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setRepeatDataText(await file.text());
                            setRepeatColumnMap({});
                            event.target.value = '';
                          }}
                        />
                        <button className="load-data-file" onClick={() => repeatDataFileRef.current?.click()}>
                          Load saved CSV or TSV
                        </button>
                        {repeatHeaders.length > 0 && (
                          <>
                            <div className="data-summary">
                              <b>{repeatRows.length}</b> data row{repeatRows.length === 1 ? '' : 's'} ·{' '}
                              <b>{repeatHeaders.length}</b> columns
                            </div>
                            <strong>Map columns</strong>
                            <div className="data-mapping-list">
                              {repeatableElements.map((entry, index) => (
                                <label key={selectedElementKey(entry.item)}>
                                  <span title={entry.label}>
                                    {entry.label || `${entry.item.kind} ${index + 1}`}
                                  </span>
                                  <select
                                    value={
                                      repeatColumnMap[selectedElementKey(entry.item)] ??
                                      Math.min(index, repeatHeaders.length - 1)
                                    }
                                    onChange={(event) =>
                                      setRepeatColumnMap((mapping) => ({
                                        ...mapping,
                                        [selectedElementKey(entry.item)]: Number(event.target.value),
                                      }))
                                    }
                                  >
                                    {repeatHeaders.map((header, columnIndex) => (
                                      <option key={`${header}:${columnIndex}`} value={columnIndex}>
                                        {header || `Column ${columnIndex + 1}`}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ))}
                            </div>
                            <div className="data-repeat-options">
                              <label>
                                Row gap
                                <input
                                  type="number"
                                  min="0"
                                  max="200"
                                  value={repeatRowGap}
                                  onChange={(event) =>
                                    setRepeatRowGap(Math.max(0, Number(event.target.value)))
                                  }
                                />
                              </label>
                              <button
                                className={repeatUseTemplateFirst ? 'active' : ''}
                                onClick={() => setRepeatUseTemplateFirst((enabled) => !enabled)}
                              >
                                Use template for first row <b>{repeatUseTemplateFirst ? 'On' : 'Off'}</b>
                              </button>
                            </div>
                            {repeatRows.length > 0 && (
                              <div className="data-preview">
                                <strong>Preview</strong>
                                {repeatRows.slice(0, 3).map((row, rowIndex) => (
                                  <div key={rowIndex}>
                                    {row.slice(0, 4).map((cell, cellIndex) => (
                                      <span key={cellIndex} title={cell}>
                                        {cell || '—'}
                                      </span>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              className="generate-data-rows"
                              disabled={!repeatRows.length}
                              onClick={generateRepeatedRows}
                            >
                              Generate {repeatRows.length} row{repeatRows.length === 1 ? '' : 's'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
            <BatchStyleProperties editor={editor} />
            {pdfBytes && !isXfaDocument && <AcroFormSummary pages={pages} />}
            {isXfaDocument && (
              <details className="xfa-structure-summary">
                <summary>
                  <span>Document structure</span>
                  <b>{xfaTemplateModel.regions.length} regions</b>
                </summary>
                <div className="xfa-structure-counts">
                  <span>
                    <b>{xfaTemplateModel.fields.length}</b>
                    <small>Fields</small>
                  </span>
                  <span>
                    <b>{xfaTemplateModel.draws.filter((node) => node.kind === 'text').length}</b>
                    <small>Texts</small>
                  </span>
                  <span>
                    <b>
                      {
                        xfaTemplateModel.draws.filter((node) =>
                          ['rectangle', 'line', 'arc'].includes(String(node.kind)),
                        ).length
                      }
                    </b>
                    <small>Shapes</small>
                  </span>
                  <span>
                    <b>{xfaTemplateModel.draws.filter((node) => node.kind === 'image').length}</b>
                    <small>Images</small>
                  </span>
                </div>
                {xfaTemplateModel.warnings.length > 0 && (
                  <div className="xfa-structure-warnings">
                    {xfaTemplateModel.warnings.map((warning) => (
                      <p key={warning}>
                        <span aria-hidden="true">!</span>
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
                <div className="xfa-region-heading">
                  <strong>Regions</strong>
                  <span>
                    {xfaTemplateModel.regions.filter((region) => !region.prototype).length} detected
                  </span>
                </div>
                <div className="xfa-region-list">
                  {xfaTemplateModel.regions
                    .filter((region) => !region.prototype)
                    .slice(0, 40)
                    .map((region) => {
                      const depth = Math.max(0, region.path.split('.').length - 1);
                      return (
                        <div
                          key={region.path}
                          className="xfa-region-row"
                          title={region.path}
                          style={{ '--region-depth': Math.min(5, depth) } as CSSProperties}
                        >
                          <i aria-hidden="true" />
                          <span className="xfa-region-copy">
                            <b>{region.name || 'Unnamed region'}</b>
                            <small>
                              <em>{region.type}</em>
                              {region.layout && <em>{region.layout}</em>}
                              {region.repeatMax !== undefined && (
                                <em>
                                  Repeat {region.repeatMin ?? 0}–
                                  {region.repeatMax === -1 ? '∞' : region.repeatMax}
                                </em>
                              )}
                            </small>
                          </span>
                        </div>
                      );
                    })}
                </div>
              </details>
            )}
            {activeXfaField && (
              <section className="xfa-native-info">
                <div className="xfa-native-heading">
                  <strong>Native XFA identity</strong>
                  <button
                    onClick={async () => {
                      const path = activeXfaField.nativePath || activeXfaField.name;
                      try {
                        await navigator.clipboard.writeText(path);
                        setToast('XFA path copied');
                        window.setTimeout(() => setToast(''), 1800);
                      } catch {
                        window.prompt('Copy the native XFA path:', path);
                      }
                    }}
                    title="Copy the complete native XFA path"
                  >
                    Copy path
                  </button>
                </div>
                <code title={activeXfaField.nativePath || activeXfaField.name}>
                  {(activeXfaField.nativePath || activeXfaField.name).replace(/([.\]])/g, '$1\u200b')}
                </code>
                <div className="xfa-native-tags">
                  <span>{activeXfaField.uiType || activeXfaField.kind}</span>
                  {activeXfaField.bindRef && (
                    <span title={activeXfaField.bindRef}>Bind: {activeXfaField.bindRef}</span>
                  )}
                  <span title={activeXfaField.bindRef || activeXfaField.name}>Data node: {activeXfaField.bindRef || activeXfaField.name}</span>
                  {activeXfaField.prototype && <span>Prototype instance</span>}
                  {activeXfaField.repeatMax !== undefined && (
                    <span>
                      Repeats: {activeXfaField.repeatMin ?? 0}–
                      {activeXfaField.repeatMax === -1 ? '∞' : activeXfaField.repeatMax}
                    </span>
                  )}
                </div>
              </section>
            )}
            {activeXfaField && (
              <section className="caption-layout-editor" aria-label="XFA caption and inset style">
                <strong>Label style &amp; field spacing</strong>
                <label>Label typeface</label>
                <select
                  className="property-select"
                  value={activeXfaField.captionFont || 'Helvetica'}
                  onChange={(event) => updateXfaField({ captionFont: event.target.value })}
                >
                  {fontOptions.map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
                <div className="property-row">
                  <div>
                    <label>Label size</label>
                    <input
                      className="property-input"
                      type="number"
                      min="6"
                      max="72"
                      value={Math.round(activeXfaField.captionSize || 9)}
                      onChange={(event) =>
                        updateXfaField({ captionSize: Math.max(6, Number(event.target.value)) })
                      }
                    />
                  </div>
                  <div>
                    <label>Label color</label>
                    <ColorPicker
                      className="property-color"
                      value={
                        activeXfaField.captionColor?.startsWith('#') ? activeXfaField.captionColor : '#111111'
                      }
                      onChange={(color) => updateXfaField({ captionColor: color })}
                    />
                  </div>
                </div>
                <div className="segmented alignment-controls">
                  <button
                    className={activeXfaField.captionBold ? 'active' : ''}
                    onClick={() => updateXfaField({ captionBold: !activeXfaField.captionBold })}
                  >
                    <b>B</b>
                  </button>
                  <button
                    className={activeXfaField.captionItalic ? 'active' : ''}
                    onClick={() => updateXfaField({ captionItalic: !activeXfaField.captionItalic })}
                  >
                    <i>I</i>
                  </button>
                  {alignmentOptions.slice(0, 3).map((option) => (
                    <button
                      key={option.value}
                      className={activeXfaField.captionAlignment === option.value ? 'active' : ''}
                      aria-label={`Label ${option.label}`}
                      onClick={() => updateXfaField({ captionAlignment: option.value })}
                    >
                      <span className={`alignment-glyph ${option.value}`}>
                        <i />
                        <i />
                        <i />
                      </span>
                    </button>
                  ))}
                </div>
                <label>Field inner spacing (top, right, bottom, left)</label>
                <div className="xfa-inset-grid">
                  {(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const).map((side) => (
                    <input
                      key={side}
                      className="property-input"
                      aria-label={side}
                      type="number"
                      min="0"
                      max="40"
                      step="0.5"
                      value={activeXfaField[side] ?? 0}
                      onChange={(event) =>
                        updateXfaField({ [side]: Math.max(0, Number(event.target.value)) })
                      }
                    />
                  ))}
                </div>
              </section>
            )}
            {activeXfaField && (
              <section className="caption-layout-editor" aria-label="XFA label layout">
                <strong>Label &amp; field layout</strong>
                <label>Label position</label>
                <PaperlySelect
                  label="Label position"
                  value={activeXfaField.labelPlacement || 'top'}
                  className="property-select-menu"
                  options={[
                    { value: 'left', label: 'Left of field' },
                    { value: 'right', label: 'Right of field' },
                    { value: 'top', label: 'Above field' },
                    { value: 'bottom', label: 'Below field' },
                    { value: 'inline', label: 'Inline' },
                  ]}
                  onChange={(value) =>
                    updateXfaField({ labelPlacement: value as XfaTemplateEdit['labelPlacement'] })
                  }
                />
                <label>Label space</label>
                <div className="caption-reserve-row">
                  <input
                    className="property-input"
                    type="range"
                    min="0"
                    max={Math.max(160, Math.round(activeXfaField.width))}
                    value={Math.round(activeXfaField.labelReserve ?? 12)}
                    onChange={(event) => updateXfaField({ labelReserve: Number(event.target.value) })}
                  />
                  <input
                    className="property-input"
                    type="number"
                    min="0"
                    max="500"
                    value={Math.round(activeXfaField.labelReserve ?? 12)}
                    onChange={(event) =>
                      updateXfaField({ labelReserve: Math.max(0, Number(event.target.value)) })
                    }
                  />
                </div>
                <small>
                  Label space controls the reserved distance between the caption and editable control without
                  resizing the outer field.
                </small>
              </section>
            )}
            {activeXfaField && (
              <section className="form-style-editor" aria-label="XFA form field style">
                <strong>Field style</strong>
                <label>Typeface</label>
                <select
                  className="property-select"
                  value={activeXfaField.font || 'Helvetica'}
                  onChange={(event) => updateXfaField({ font: event.target.value })}
                >
                  {fontOptions.map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
                <div className="property-row">
                  <div>
                    <label>Text size</label>
                    <input
                      className="property-input"
                      type="number"
                      min="6"
                      max="72"
                      value={Math.round(activeXfaField.size || 11)}
                      onChange={(event) => updateXfaField({ size: Math.max(6, Number(event.target.value)) })}
                    />
                  </div>
                  <div>
                    <label>Border width</label>
                    <input
                      className="property-input"
                      type="number"
                      min="0"
                      max="12"
                      step="0.5"
                      value={activeXfaField.borderWidth ?? 1}
                      onChange={(event) =>
                        updateXfaField({ borderWidth: Math.max(0, Number(event.target.value)) })
                      }
                    />
                  </div>
                </div>
                <div className="form-color-grid">
                  <label>
                    Text
                    <ColorPicker
                      value={activeXfaField.color?.startsWith('#') ? activeXfaField.color : '#111111'}
                      onChange={(color) => updateXfaField({ color: color })}
                    />
                  </label>
                  <label>
                    Fill
                    <ColorPicker
                      value={
                        activeXfaField.backgroundColor?.startsWith('#')
                          ? activeXfaField.backgroundColor
                          : '#ffffff'
                      }
                      onChange={(color) => updateXfaField({ backgroundColor: color })}
                    />
                  </label>
                  <label>
                    Border
                    <ColorPicker
                      value={
                        activeXfaField.borderColor?.startsWith('#') ? activeXfaField.borderColor : '#666666'
                      }
                      onChange={(color) => updateXfaField({ borderColor: color })}
                    />
                  </label>
                </div>
                <label>Text alignment</label>
                <div className="segmented alignment-controls">
                  {alignmentOptions.slice(0, 3).map((option) => (
                    <button
                      key={option.value}
                      className={activeXfaField.alignment === option.value ? 'active' : ''}
                      aria-label={option.label}
                      onClick={() => updateXfaField({ alignment: option.value })}
                    >
                      <span className={`alignment-glyph ${option.value}`}>
                        <i />
                        <i />
                        <i />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {selectedForm && (
              <section className="form-style-editor" aria-label="Normal form field style">
                <strong>Field style</strong>
                <label>Typeface</label>
                <select
                  className="property-select"
                  value={activeFormEdit?.font || selectedForm.font || 'Helvetica'}
                  onChange={(event) => updateFormEdit({ font: event.target.value })}
                >
                  {fontOptions.map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
                <div className="property-row">
                  <div>
                    <label>Text size</label>
                    <input
                      className="property-input"
                      type="number"
                      min="6"
                      max="72"
                      value={Math.round(activeFormEdit?.fontSize ?? selectedForm.fontSize ?? 11)}
                      onChange={(event) =>
                        updateFormEdit({ fontSize: Math.max(6, Number(event.target.value)) })
                      }
                    />
                  </div>
                  <div>
                    <label>Border width</label>
                    <input
                      className="property-input"
                      type="number"
                      min="0"
                      max="12"
                      step="0.5"
                      value={activeFormEdit?.borderWidth ?? selectedForm.borderWidth ?? 1}
                      onChange={(event) =>
                        updateFormEdit({ borderWidth: Math.max(0, Number(event.target.value)) })
                      }
                    />
                  </div>
                </div>
                <div className="form-color-grid">
                  <label>
                    Text
                    <ColorPicker
                      value={activeFormEdit?.color || selectedForm.color || '#111111'}
                      onChange={(color) => updateFormEdit({ color: color })}
                    />
                  </label>
                  <label>
                    Fill
                    <ColorPicker
                      value={activeFormEdit?.backgroundColor || selectedForm.backgroundColor || '#ffffff'}
                      onChange={(color) => updateFormEdit({ backgroundColor: color })}
                    />
                  </label>
                  <label>
                    Border
                    <ColorPicker
                      value={activeFormEdit?.borderColor || selectedForm.borderColor || '#949b98'}
                      onChange={(color) => updateFormEdit({ borderColor: color })}
                    />
                  </label>
                </div>
                <label>Text alignment</label>
                <div className="segmented alignment-controls">
                  {alignmentOptions.slice(0, 3).map((option) => (
                    <button
                      key={option.value}
                      className={
                        (activeFormEdit?.alignment || selectedForm.alignment) === option.value ? 'active' : ''
                      }
                      aria-label={option.label}
                      onClick={() => updateFormEdit({ alignment: option.value })}
                    >
                      <span className={`alignment-glyph ${option.value}`}>
                        <i />
                        <i />
                        <i />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {isXfaDocument && (
              <section className="xfa-info" aria-label="XFA form status">
                <div className="xfa-live-row">
                  <strong>XFA form</strong>
                  <button
                    className={liveXfaScripts ? 'active' : ''}
                    onClick={() => {
                      if (!liveXfaScripts && !window.confirm('Enable embedded XFA scripts for this document? Scripts run locally in an isolated, time-limited worker.')) return;
                      setLiveXfaScripts((enabled) => !enabled);
                      if (liveXfaScripts)
                        xfaLayerRef.current
                          ?.querySelectorAll('.paperly-xfa-invalid')
                          .forEach((node) => node.classList.remove('paperly-xfa-invalid'));
                    }}
                  >
                    {liveXfaScripts ? 'Live scripts on' : 'Enable live scripts'}
                  </button>
                </div>
                <span>{xfaChanged ? 'Form values changed' : 'Interactive fields are active'}</span>
                <small>
                  {xfaRuntimeStatus}. Common JavaScript and FormCalc run in an isolated, network-blocked
                  worker with a time limit.
                </small>
                {Object.keys(xfaScriptMetadata).length > 0 && (
                  <details className="xfa-embedded-scripts">
                    <summary>
                      <span><b>Embedded scripts</b><small>Inspect before enabling</small></span>
                      <em>{Object.values(xfaScriptMetadata).reduce((count, metadata) => count + (metadata.calculation ? 1 : 0) + (metadata.validation ? 1 : 0) + Object.keys(metadata.events).length, 0)}</em>
                    </summary>
                    <div className="xfa-script-list">
                      {Object.entries(xfaScriptMetadata).map(([field, metadata]) => {
                        const scripts = [
                          ...(metadata.calculation ? [{ activity: 'Calculate', script: metadata.calculation }] : []),
                          ...(metadata.validation ? [{ activity: 'Validate', script: metadata.validation }] : []),
                          ...Object.entries(metadata.events).map(([activity, script]) => ({ activity, script })),
                        ];
                        return (
                          <article key={field} className="xfa-script-card">
                            <header><strong title={field}>{field.replace(/:(\d+)$/, ' · instance $1')}</strong><span>{scripts.length}</span></header>
                            {scripts.map(({ activity, script }, index) => (
                              <section key={`${activity}-${index}`}>
                                <div><b>{activity}</b><em>{script.language === 'formcalc' ? 'FormCalc' : 'JavaScript'}</em></div>
                                <pre>{script.code}</pre>
                              </section>
                            ))}
                          </article>
                        );
                      })}
                    </div>
                  </details>
                )}
                {liveXfaScripts && <button className="xfa-recalculate" onClick={() => scheduleXfaRuntimeRef.current(undefined, 'recalculate')}>Recalculate fields</button>}
              </section>
            )}
            <XfaDrawProperties editor={editor} />
            <XfaFieldProperties editor={editor} />
            <input
              ref={fontUploadRef}
              type="file"
              accept=".ttf,.otf,font/ttf,font/otf"
              multiple
              hidden
              onChange={(event) => void uploadFontFiles(event.target.files)}
            />
            {fontWarnings.length > 0 && (
              <section className="font-warning" aria-label="PDF font compatibility warning">
                <div className="font-warning-title">
                  <span>!</span>
                  <strong>Font compatibility</strong>
                </div>
                <p>
                  Installed fonts can be displayed in the live editor, but PDF export needs the actual
                  licensed TTF or OTF files. Import all family variants together; nothing is uploaded.
                </p>
                <ul>
                  {fontWarnings.slice(0, 4).map((warning) => {
                    const imported = uploadedFonts.filter(
                      (font) => fontFamilyIdentity(font.name) === fontFamilyIdentity(warning.name),
                    );
                    const variants = imported
                      .map((font) => `${font.weight}${font.italic ? ' italic' : ''}`)
                      .sort()
                      .join(', ');
                    return (
                      <li key={warning.name}>
                        <b>{warning.name}</b>
                        <small className="font-warning-status">
                          <span>Computer: {warning.installed ? 'Installed' : 'Not detected'}</span>
                          <span>
                            Paperly:{' '}
                            {imported.length
                              ? `${imported.length} variant${imported.length === 1 ? '' : 's'} loaded (${variants})`
                              : 'Font files not imported'}
                          </span>
                          <span>
                            Export:{' '}
                            {imported.length ? 'Font will be embedded' : `Fallback ${warning.fallback}`}
                          </span>
                        </small>
                      </li>
                    );
                  })}
                </ul>
                {fontWarnings.length > 4 && (
                  <small className="more-fonts">+{fontWarnings.length - 4} more unsupported fonts</small>
                )}
                <div className="font-warning-actions">
                  <button className="primary" onClick={() => fontUploadRef.current?.click()}>
                    Import font family
                  </button>
                  <a
                    href="https://www.myfonts.com/pages/whatthefont?step=crop"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Opens the external WhatTheFont image-identification service"
                  >
                    Identify from image ↗
                  </a>
                  <button onClick={() => setFontWarnings(collectFontWarnings(pages))}>Check again</button>
                </div>
                <small className="font-warning-external-note">
                  External tool: take or crop a screenshot of one clear text line, then drag the image there.
                  Paperly does not send the PDF or screenshot.
                </small>
              </section>
            )}
            {selectedForm && (
              <section className="form-field-info" aria-label="Selected form field details">
                <strong>{selectedForm.name}</strong>
                <span>
                  {selectedForm.kind === 'text'
                    ? selectedForm.multiline
                      ? 'Multiline text field'
                      : 'Single-line text field'
                    : selectedForm.kind === 'checkbox'
                      ? 'Checkbox'
                      : selectedForm.kind === 'choice'
                        ? 'Dropdown / choice field'
                        : 'Radio option'}
                </span>
                {selectedForm.kind === 'radio' && (
                  <small>Export value: {selectedForm.option || '(empty)'}</small>
                )}
                {selectedForm.required && <small>Required</small>}
                {selectedForm.readOnly && <small>Read only</small>}
              </section>
            )}
            {selectedForm && (
              <section className="form-access-editor">
                <strong>Accessibility &amp; export</strong>
                <label>Tooltip / accessible description</label>
                <input
                  className="property-input"
                  value={selectedForm.tooltip || ''}
                  placeholder={selectedForm.name}
                  onChange={(event) => updateFormEdit({ tooltip: event.target.value })}
                />
                <button
                  className={selectedForm.noExport ? 'active' : ''}
                  onClick={() => updateFormEdit({ noExport: !selectedForm.noExport })}
                >
                  {selectedForm.noExport ? 'Excluded from data export' : 'Include in data export'}
                </button>
              </section>
            )}
            {selectedForm && !selectedForm.added && (
              <section className="form-cleanup-editor" aria-label="Original form appearance cleanup">
                <div>
                  <strong>Original appearance</strong>
                  <button
                    className={activeFormEdit?.eraseOriginal !== false ? 'active' : ''}
                    onClick={() => updateFormEdit({ eraseOriginal: activeFormEdit?.eraseOriginal === false })}
                  >
                    {activeFormEdit?.eraseOriginal !== false ? 'Remove behind field' : 'Keep original'}
                  </button>
                </div>
                <label>Reconstructed background</label>
                <div className="form-cleanup-row">
                  <ColorPicker
                    value={
                      activeFormEdit?.eraseColor ||
                      (activeFormKey ? formBackgrounds[activeFormKey] : '') ||
                      '#ffffff'
                    }
                    onChange={(color) => {
                      const eraseColor = color;
                      updateFormEdit({ eraseColor, eraseOriginal: true });
                      if (activeFormKey)
                        setFormBackgrounds((items) => ({ ...items, [activeFormKey]: eraseColor }));
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!canvasRef.current || !pages[currentPage] || !activeFormKey) return;
                      const eraseColor = sampleFieldBackground(
                        canvasRef.current,
                        pages[currentPage].width,
                        zoom,
                        selectedForm,
                      );
                      setFormBackgrounds((items) => ({ ...items, [activeFormKey]: eraseColor }));
                      updateFormEdit({ eraseColor, eraseOriginal: true });
                    }}
                  >
                    Detect again
                  </button>
                </div>
                <small>
                  Paperly covers flattened artwork at the old position in both preview and export. Choose the
                  page background color if automatic detection is imperfect.
                </small>
              </section>
            )}
            {selectedForm && (
              <section className="form-behavior-editor" aria-label="Normal form behavior">
                <strong>Field behavior</strong>
                <label>Clone creates</label>
                <select
                  className="property-select"
                  value={normalCloneMode}
                  onChange={(event) => setNormalCloneMode(event.target.value as 'independent' | 'shared')}
                >
                  <option value="independent">Independent field and value</option>
                  <option value="shared">Shared widget and value</option>
                </select>
                <div className="form-flag-grid">
                  <button
                    className={selectedForm.required ? 'active' : ''}
                    onClick={() => updateFormEdit({ required: !selectedForm.required })}
                  >
                    Required
                  </button>
                  <button
                    className={selectedForm.readOnly ? 'active' : ''}
                    onClick={() => updateFormEdit({ readOnly: !selectedForm.readOnly })}
                  >
                    Read only
                  </button>
                  {selectedForm.kind === 'text' && (
                    <button
                      className={selectedForm.multiline ? 'active' : ''}
                      onClick={() => updateFormEdit({ multiline: !selectedForm.multiline })}
                    >
                      Multiline
                    </button>
                  )}
                </div>
                {selectedForm.kind === 'text' && (
                  <>
                    <label>Maximum characters (0 = unlimited)</label>
                    <input
                      className="property-input"
                      type="number"
                      min="0"
                      value={selectedForm.maxLength || 0}
                      onChange={(event) =>
                        updateFormEdit({ maxLength: Math.max(0, Number(event.target.value)) })
                      }
                    />
                  </>
                )}
                {selectedForm.kind === 'choice' && (
                  <>
                    <label>Choice options, one per line</label>
                    <textarea
                      className="property-input form-options-editor"
                      value={(selectedForm.options || [])
                        .map((option) =>
                          option.label === option.value ? option.value : `${option.label} | ${option.value}`,
                        )
                        .join('\n')}
                      onChange={(event) =>
                        updateFormEdit({
                          options: event.target.value
                            .split(/\r?\n/)
                            .filter(Boolean)
                            .map((line) => {
                              const [label, value] = line.split('|').map((part) => part.trim());
                              return { label, value: value || label };
                            }),
                        })
                      }
                    />
                  </>
                )}
                <small>
                  Independent clones receive a new field name. Shared widgets keep the original name and
                  synchronize their value.
                </small>
              </section>
            )}
            {selectedForm && (
              <section className="form-edit-properties" aria-label="Form field layout">
                <label>Internal field name</label>
                <div className="property-static">{selectedForm.name}</div>
                <small className="form-name-note">
                  The internal name remains locked to protect calculations and data bindings.
                </small>
                {activeFormLabel && (
                  <div className="form-linked-label">
                    <div>
                      <label>Detected page label</label>
                      <strong title={activeFormLabel.str}>{activeFormLabel.str}</strong>
                    </div>
                    <button
                      className={activeFormEdit?.moveLabel !== false ? 'active' : ''}
                      onClick={() => updateFormEdit({ moveLabel: activeFormEdit?.moveLabel === false })}
                    >
                      <span>Move label with field</span>
                      <b>{activeFormEdit?.moveLabel !== false ? 'On' : 'Off'}</b>
                    </button>
                  </div>
                )}
                <label>Position</label>
                <div className="property-row">
                  <input
                    className="property-input"
                    aria-label="Form horizontal position"
                    type="number"
                    min="0"
                    value={Math.round(activeFormEdit?.x ?? selectedForm.x)}
                    onChange={(event) => updateFormEdit({ x: Math.max(0, Number(event.target.value)) })}
                  />
                  <input
                    className="property-input"
                    aria-label="Form vertical position"
                    type="number"
                    min="0"
                    value={Math.round(activeFormEdit?.top ?? selectedForm.top)}
                    onChange={(event) => updateFormEdit({ top: Math.max(0, Number(event.target.value)) })}
                  />
                </div>
                <label>Field size</label>
                <div className="property-row">
                  <input
                    className="property-input"
                    aria-label="Form field width"
                    type="number"
                    min="6"
                    value={Math.round(activeFormEdit?.width ?? selectedForm.width)}
                    onChange={(event) => updateFormEdit({ width: Math.max(6, Number(event.target.value)) })}
                  />
                  <input
                    className="property-input"
                    aria-label="Form field height"
                    type="number"
                    min="6"
                    value={Math.round(activeFormEdit?.height ?? selectedForm.height)}
                    onChange={(event) => updateFormEdit({ height: Math.max(6, Number(event.target.value)) })}
                  />
                </div>
                <button
                  className={activeFormEdit?.deleted ? 'restore-box' : 'delete-box'}
                  onClick={() => updateFormEdit({ deleted: !activeFormEdit?.deleted })}
                >
                  {activeFormEdit?.deleted ? 'Restore form field' : 'Remove form field'}
                </button>
              </section>
            )}
            {selectedImage && (activeAddedImage || activeExistingImage) && (
              <section className="image-layout-properties">
                <strong>Image size</strong>
                <div className="property-row">
                  <input
                    className="property-input"
                    aria-label="Image width"
                    type="number"
                    min="12"
                    value={Math.round(
                      activeAddedImage?.width ?? activeImageEdit?.width ?? activeExistingImage?.width ?? 12,
                    )}
                    onChange={(event) =>
                      updateSelectedImageSize({ width: Math.max(12, Number(event.target.value)) })
                    }
                  />
                  <input
                    className="property-input"
                    aria-label="Image height"
                    type="number"
                    min="12"
                    value={Math.round(
                      activeAddedImage?.height ??
                        activeImageEdit?.height ??
                        activeExistingImage?.height ??
                        12,
                    )}
                    onChange={(event) =>
                      updateSelectedImageSize({ height: Math.max(12, Number(event.target.value)) })
                    }
                  />
                </div>
                {activeExistingImage && activeImageKey && (
                  <button
                    className={activeImageEdit?.deleted ? 'restore-box' : 'delete-box'}
                    onClick={() => toggleExistingImageDeleted(activeImageKey)}
                  >
                    {activeImageEdit?.deleted ? 'Restore existing image' : 'Delete existing image'}
                  </button>
                )}
                {activeAddedImage && (
                  <button className="delete-box" onClick={() => removeAddedImage(activeAddedImage.id)}>
                    Delete image
                  </button>
                )}
              </section>
            )}
            <VectorProperties editor={editor} />
            <TextStyleProperties editor={editor} />
            <TextLayoutProperties editor={editor} />
          </div>
          <p className="selection-help">
            {activeXfaDraw
              ? `Edit this native XFA ${activeXfaDraw.kind}, or drag the purple handles to move and resize it. ${snapEnabled ? `Snapping by ${snapMode} is active.` : 'Snapping is off.'}`
              : activeXfaField
                ? `Change this native XFA field or drag its purple handles. ${snapEnabled ? `${snapAnchor === 'start' ? 'Starts' : snapAnchor === 'center' ? 'Centers' : 'Ends'} snap by ${snapMode}.` : 'Snapping is off.'}`
                : selectedForm
                  ? 'Edit the value directly, drag the green handle to move, or use the corner square to resize this form control.'
                  : selectedImage
                    ? 'Drag the green left handle to move. Drag the bottom-right square to resize proportionally, or enter an exact width and height above.'
                    : activeAdded
                      ? `Drag the dotted handle to move. ${snapEnabled ? `${snapAnchor === 'start' ? 'Starts' : snapAnchor === 'center' ? 'Centers' : 'Ends'} snap by ${snapMode}.` : 'Snapping is off.'}`
                      : activeKey
                        ? `Edit directly, drag the green handle to move, or use the corner square to resize. New lines grow the existing text box. ${snapEnabled ? 'Snapping is active.' : 'Snapping is off.'}`
                        : pdfBytes
                          ? 'Add text or an image, or select detected page content.'
                          : 'Open a PDF to make its text editable.'}
          </p>
          <div className="privacy-note">
            <span>✦</span>
            <div>
              <strong>Your document stays private</strong>
              <p>Edits happen in this browser. Nothing is uploaded.</p>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
