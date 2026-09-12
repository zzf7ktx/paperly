'use client';
import { type XfaFieldKind, type XfaScriptLanguage } from '../../../lib/xfa-template';
import { PaperlySelect } from './paperly-select';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'xfaEventActivity'
    | 'setXfaEventActivity'
    | 'activeXfaField'
    | 'xfaEventActivities'
    | 'activeXfaEvent'
    | 'updateXfaField'
    | 'removeSelectedAddedXfaField'
    | 'updateXfaCalculation'
    | 'updateXfaValidation'
    | 'updateXfaEventScript'
  >;
};
export function XfaFieldProperties({ editor }: Props) {
  const {
    xfaEventActivity,
    setXfaEventActivity,
    activeXfaField,
    xfaEventActivities,
    activeXfaEvent,
    updateXfaField,
    removeSelectedAddedXfaField,
    updateXfaCalculation,
    updateXfaValidation,
    updateXfaEventScript,
  } = editor;
  return (
    (activeXfaField && (
      <section className="xfa-field-properties" aria-label="Selected XFA field properties">
        <label>Visible label</label>
        <input
          className="property-input"
          value={activeXfaField.label || ''}
          placeholder="No visible label"
          onChange={(event) => updateXfaField({ label: event.target.value })}
        />
        <label>Internal field name</label>
        <input
          className="property-input"
          value={activeXfaField.name}
          disabled={!activeXfaField.added}
          onChange={(event) => updateXfaField({ name: event.target.value.replace(/[<>]/g, '') })}
        />
        {!activeXfaField.added && (
          <small className="xfa-name-note">
            The existing internal name stays locked so data bindings and scripts do not break.
          </small>
        )}
        <label>Field type</label>
        {activeXfaField.added ? (
          <select
            className="property-select"
            value={activeXfaField.kind}
            onChange={(event) => updateXfaField({ kind: event.target.value as XfaFieldKind })}
          >
            <option value="text">Text field</option>
            <option value="multiline">Multiline text</option>
            <option value="checkbox">Checkbox</option>
            <option value="radio">Radio group</option>
          </select>
        ) : (
          <div className="property-static">
            {activeXfaField.kind === 'multiline'
              ? 'Multiline text'
              : activeXfaField.kind === 'checkbox'
                ? 'Checkbox'
                : activeXfaField.kind === 'radio'
                  ? 'Radio option'
                  : 'Text field'}
          </div>
        )}
        <label>Position</label>
        <div className="property-row">
          <input
            className="property-input"
            aria-label="XFA horizontal position"
            type="number"
            min="0"
            value={Math.round(activeXfaField.x)}
            onChange={(event) => updateXfaField({ x: Math.max(0, Number(event.target.value)) })}
          />
          <input
            className="property-input"
            aria-label="XFA vertical position"
            type="number"
            min="0"
            value={Math.round(activeXfaField.top)}
            onChange={(event) => updateXfaField({ top: Math.max(0, Number(event.target.value)) })}
          />
        </div>
        <label>Field size</label>
        <div className="property-row">
          <input
            className="property-input"
            aria-label="XFA field width"
            type="number"
            min="6"
            value={Math.round(activeXfaField.width)}
            onChange={(event) => updateXfaField({ width: Math.max(6, Number(event.target.value)) })}
          />
          <input
            className="property-input"
            aria-label="XFA field height"
            type="number"
            min="6"
            value={Math.round(activeXfaField.height)}
            onChange={(event) => updateXfaField({ height: Math.max(6, Number(event.target.value)) })}
          />
        </div>
        <div className="xfa-script-panel">
          <div className="xfa-script-title">
            <strong>Scripts &amp; calculations</strong>
            <span>Editable source</span>
          </div>
          <details open>
            <summary>
              Calculation <b>{activeXfaField.calculation?.code ? 'Present' : 'None'}</b>
            </summary>
            <PaperlySelect
              label="Calculation language"
              value={activeXfaField.calculation?.language || 'javascript'}
              className="script-language-select"
              options={[
                { value: 'javascript', label: 'JavaScript' },
                { value: 'formcalc', label: 'FormCalc' },
              ]}
              onChange={(value) => updateXfaCalculation({ language: value as XfaScriptLanguage })}
            />
            <textarea
              className="xfa-script-editor"
              aria-label="Calculation script"
              spellCheck={false}
              placeholder="Enter calculation code…"
              value={activeXfaField.calculation?.code || ''}
              onChange={(event) => updateXfaCalculation({ code: event.target.value })}
            />
          </details>
          <details>
            <summary>
              Validation <b>{activeXfaField.validation?.code ? 'Present' : 'None'}</b>
            </summary>
            <PaperlySelect
              label="Validation language"
              value={activeXfaField.validation?.language || 'javascript'}
              className="script-language-select"
              options={[
                { value: 'javascript', label: 'JavaScript' },
                { value: 'formcalc', label: 'FormCalc' },
              ]}
              onChange={(value) => updateXfaValidation({ language: value as XfaScriptLanguage })}
            />
            <textarea
              className="xfa-script-editor"
              aria-label="Validation script"
              spellCheck={false}
              placeholder="Enter validation code…"
              value={activeXfaField.validation?.code || ''}
              onChange={(event) => updateXfaValidation({ code: event.target.value })}
            />
          </details>
          <details>
            <summary>
              Event scripts{' '}
              <b>{Object.values(activeXfaField.events || {}).filter((script) => script.code).length}</b>
            </summary>
            <div className="xfa-script-selectors">
              <PaperlySelect
                label="XFA event activity"
                value={xfaEventActivity}
                className="script-language-select"
                options={xfaEventActivities.map((activity) => ({ value: activity, label: activity }))}
                onChange={setXfaEventActivity}
              />
              <PaperlySelect
                label="Event script language"
                value={activeXfaEvent?.language || 'javascript'}
                className="script-language-select"
                options={[
                  { value: 'javascript', label: 'JavaScript' },
                  { value: 'formcalc', label: 'FormCalc' },
                ]}
                onChange={(value) => updateXfaEventScript({ language: value as XfaScriptLanguage })}
              />
            </div>
            <textarea
              className="xfa-script-editor"
              aria-label={`${xfaEventActivity} event script`}
              spellCheck={false}
              placeholder={`Enter ${xfaEventActivity} event code…`}
              value={activeXfaEvent?.code || ''}
              onChange={(event) => updateXfaEventScript({ code: event.target.value })}
            />
          </details>
          <small>
            Scripts are preserved in export and can run in the isolated live preview when enabled.
          </small>
        </div>
        {activeXfaField.added ? (
          <button className="delete-box" onClick={removeSelectedAddedXfaField}>
            Remove new XFA field
          </button>
        ) : (
          <button
            className={activeXfaField.deleted ? 'restore-box' : 'delete-box'}
            onClick={() => updateXfaField({ deleted: !activeXfaField.deleted })}
          >
            {activeXfaField.deleted ? 'Restore XFA field' : 'Remove XFA field'}
          </button>
        )}
        <small className="xfa-template-note">
          Drag the purple handle to move and the corner square to resize. Labels, scripts, position, and size
          are written into the native XFA template.
        </small>
      </section>
    )) ||
    null
  );
}
