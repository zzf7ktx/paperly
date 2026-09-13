'use client';

import { ColorPicker } from './color-picker';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    'setVectorEdits' | 'activeVector' | 'activeVectorKey' | 'activeVectorEdit' | 'deleteVector'
  >;
};
export function VectorProperties({ editor }: Props) {
  const { setVectorEdits, activeVector, activeVectorKey, activeVectorEdit, deleteVector } = editor;
  return (
    (activeVector && activeVectorKey && (
      <section className="vector-properties" aria-label="Vector shape properties">
        <strong>{activeVector.kind[0].toUpperCase() + activeVector.kind.slice(1)}</strong>
        <div className="vector-layout-options">
          <label>Position</label>
          <div className="property-row">
            <input
              className="property-input"
              aria-label="Shape horizontal position"
              type="number"
              value={Math.round(activeVectorEdit.x ?? activeVector.x)}
              onChange={(event) =>
                setVectorEdits((items) => ({
                  ...items,
                  [activeVectorKey]: { ...items[activeVectorKey], x: Number(event.target.value) },
                }))
              }
            />
            <input
              className="property-input"
              aria-label="Shape vertical position"
              type="number"
              value={Math.round(activeVectorEdit.top ?? activeVector.top)}
              onChange={(event) =>
                setVectorEdits((items) => ({
                  ...items,
                  [activeVectorKey]: { ...items[activeVectorKey], top: Number(event.target.value) },
                }))
              }
            />
          </div>
          <label>Size</label>
          <div className="property-row">
            <input
              className="property-input"
              aria-label="Shape width"
              type="number"
              min="1"
              value={Math.round(activeVectorEdit.width ?? activeVector.width)}
              onChange={(event) =>
                setVectorEdits((items) => ({
                  ...items,
                  [activeVectorKey]: {
                    ...items[activeVectorKey],
                    width: Math.max(1, Number(event.target.value)),
                  },
                }))
              }
            />
            <input
              className="property-input"
              aria-label="Shape height"
              type="number"
              min="1"
              value={Math.round(activeVectorEdit.height ?? activeVector.height)}
              onChange={(event) =>
                setVectorEdits((items) => ({
                  ...items,
                  [activeVectorKey]: {
                    ...items[activeVectorKey],
                    height: Math.max(1, Number(event.target.value)),
                  },
                }))
              }
            />
          </div>
        </div>
        <div className="vector-style-options">
          <label>
            Fill
            <ColorPicker
              aria-label="Shape fill color"
              value={
                (activeVectorEdit.fill ?? activeVector.fill) === 'transparent'
                  ? '#ffffff'
                  : (activeVectorEdit.fill ?? activeVector.fill)
              }
              onChange={(color) =>
                setVectorEdits((items) => ({
                  ...items,
                  [activeVectorKey]: { ...items[activeVectorKey], fill: color },
                }))
              }
            />
          </label>
          <label>
            Stroke
            <ColorPicker
              aria-label="Shape stroke color"
              value={
                (activeVectorEdit.stroke ?? activeVector.stroke) === 'transparent'
                  ? '#000000'
                  : (activeVectorEdit.stroke ?? activeVector.stroke)
              }
              onChange={(color) =>
                setVectorEdits((items) => ({
                  ...items,
                  [activeVectorKey]: { ...items[activeVectorKey], stroke: color },
                }))
              }
            />
          </label>
          <label>
            Stroke width
            <input
              className="property-input"
              type="number"
              min="0.25"
              max="20"
              step="0.25"
              value={activeVectorEdit.strokeWidth ?? activeVector.strokeWidth}
              onChange={(event) =>
                setVectorEdits((items) => ({
                  ...items,
                  [activeVectorKey]: {
                    ...items[activeVectorKey],
                    strokeWidth: Math.max(0.25, Number(event.target.value)),
                  },
                }))
              }
            />
          </label>
        </div>
        <button className={activeVectorEdit.deleted ? 'restore-box' : 'delete-box'} onClick={deleteVector}>
          {activeVectorEdit.deleted ? 'Restore shape' : 'Delete shape'}
        </button>
      </section>
    )) ||
    null
  );
}
