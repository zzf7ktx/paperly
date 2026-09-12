'use client';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'setAddedBoxes'
    | 'setSelectedAddedId'
    | 'activeKey'
    | 'activeBlock'
    | 'activeEdit'
    | 'activeAdded'
    | 'commit'
    | 'updateAddedBox'
    | 'fitAddedBox'
    | 'fitExistingBox'
  >;
};
export function TextLayoutProperties({ editor }: Props) {
  const {
    setAddedBoxes,
    setSelectedAddedId,
    activeKey,
    activeBlock,
    activeEdit,
    activeAdded,
    commit,
    updateAddedBox,
    fitAddedBox,
    fitExistingBox,
  } = editor;
  return (
    ((activeAdded || activeKey) && (
      <section className="text-layout-properties" aria-label="Text layout">
        {activeAdded && (
          <>
            <label>Text box size</label>
            <div className="property-row">
              <input
                className="property-input"
                aria-label="Text box width"
                type="number"
                min="6"
                value={Math.round(activeAdded.width)}
                onChange={(event) =>
                  updateAddedBox(activeAdded.id, {
                    width: Math.max(6, Number(event.target.value)),
                    autoFit: false,
                  })
                }
              />
              <input
                className="property-input"
                aria-label="Text box height"
                type="number"
                min={Math.round(activeAdded.size)}
                value={Math.round(activeAdded.height)}
                onChange={(event) =>
                  updateAddedBox(activeAdded.id, {
                    height: Math.max(activeAdded.size, Number(event.target.value)),
                    autoFit: false,
                  })
                }
              />
            </div>
          </>
        )}
        {activeAdded && (
          <>
            <label>Position</label>
            <div className="property-row">
              <input
                className="property-input"
                aria-label="Horizontal position"
                type="number"
                value={Math.round(activeAdded.x)}
                onChange={(event) => updateAddedBox(activeAdded.id, { x: Number(event.target.value) })}
              />
              <input
                className="property-input"
                aria-label="Vertical position"
                type="number"
                value={Math.round(activeAdded.top)}
                onChange={(event) => updateAddedBox(activeAdded.id, { top: Number(event.target.value) })}
              />
            </div>
            <label>Text box</label>
            <div className="fit-controls">
              <button onClick={() => fitAddedBox(activeAdded.id)}>Fit to text</button>
              <button
                className={activeAdded.autoFit ? 'active' : ''}
                onClick={() => updateAddedBox(activeAdded.id, { autoFit: !activeAdded.autoFit })}
              >
                Auto fit <b>{activeAdded.autoFit ? 'On' : 'Off'}</b>
              </button>
            </div>
            {activeAdded.ocrSource && (
              <div className="ocr-text-properties">
                <strong>OCR cleanup</strong>
                <span>Recognition confidence: {Math.round(activeAdded.ocrConfidence || 0)}%</span>
                <label>
                  Cover original scan
                  <input
                    type="color"
                    value={activeAdded.ocrBackground || '#ffffff'}
                    onChange={(event) =>
                      updateAddedBox(activeAdded.id, { ocrBackground: event.target.value })
                    }
                  />
                </label>
              </div>
            )}
            <button
              className="delete-box"
              onClick={() => {
                setAddedBoxes((boxes) => boxes.filter((box) => box.id !== activeAdded.id));
                setSelectedAddedId(null);
              }}
            >
              Delete text box
            </button>
          </>
        )}
        {activeKey && activeBlock && (
          <>
            <label>Position</label>
            <div className="property-row">
              <input
                className="property-input"
                aria-label="Existing text horizontal position"
                type="number"
                value={Math.round(activeEdit?.x ?? activeBlock.x)}
                onChange={(event) => commit(activeKey, { x: Number(event.target.value) })}
              />
              <input
                className="property-input"
                aria-label="Existing text vertical position"
                type="number"
                value={Math.round(activeEdit?.top ?? activeBlock.top)}
                onChange={(event) => commit(activeKey, { top: Number(event.target.value) })}
              />
            </div>
            <label>Text box size</label>
            <div className="property-row">
              <input
                className="property-input"
                aria-label="Existing text width"
                type="number"
                min="6"
                value={Math.round(activeEdit?.width ?? activeBlock.width)}
                onChange={(event) => commit(activeKey, { width: Math.max(6, Number(event.target.value)) })}
              />
              <input
                className="property-input"
                aria-label="Existing text height"
                type="number"
                min={Math.round(activeEdit?.size ?? activeBlock.fontSize)}
                value={Math.round(activeEdit?.height ?? activeBlock.height)}
                onChange={(event) =>
                  commit(activeKey, {
                    height: Math.max(activeEdit?.size ?? activeBlock.fontSize, Number(event.target.value)),
                  })
                }
              />
            </div>
          </>
        )}
        {activeKey && activeBlock && (
          <>
            <label>Text box</label>
            <div className="fit-controls">
              <button onClick={() => fitExistingBox(activeKey, activeBlock)}>Fit to text</button>
              <button
                className={activeEdit?.autoFit ? 'active' : ''}
                onClick={() => {
                  const enabled = !activeEdit?.autoFit;
                  commit(activeKey, { autoFit: enabled });
                  if (enabled) window.setTimeout(() => fitExistingBox(activeKey, activeBlock), 0);
                }}
              >
                Auto fit <b>{activeEdit?.autoFit ? 'On' : 'Off'}</b>
              </button>
            </div>
          </>
        )}
        {activeKey && (
          <button
            className={activeEdit?.deleted ? 'restore-box' : 'delete-box'}
            onClick={() => commit(activeKey, { deleted: !activeEdit?.deleted })}
          >
            {activeEdit?.deleted ? 'Restore existing text' : 'Delete existing text'}
          </button>
        )}
      </section>
    )) ||
    null
  );
}
