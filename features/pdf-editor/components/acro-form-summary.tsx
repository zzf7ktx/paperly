'use client';

import type { FormBlock, PageInfo } from '../types';

export function AcroFormSummary({ pages }: { pages: PageInfo[] }) {
  const fields = pages.flatMap((page, pageIndex) => page.forms.map((field) => ({ ...field, pageIndex })));
  const names = fields.reduce<Record<string, number>>(
    (counts, field) => ({ ...counts, [field.name]: (counts[field.name] || 0) + 1 }),
    {},
  );
  const duplicates = Object.entries(names).filter(([, count]) => count > 1);
  const count = (kind: FormBlock['kind']) => fields.filter((field) => field.kind === kind).length;
  return (
    <details className="xfa-structure-summary acroform-structure">
      <summary>
        Form structure <b>{fields.length} widgets</b>
      </summary>
      <div className="xfa-structure-counts">
        <span>{count('text')} text</span>
        <span>{count('choice')} choices</span>
        <span>{count('checkbox')} checks</span>
        <span>{count('radio')} radios</span>
      </div>
      <small>
        Flattened artwork may exist behind widgets in PDFs created by office software. Paperly can reconstruct
        and remove it per field.
      </small>
      {duplicates.length > 0 && (
        <div className="acroform-duplicates">
          <strong>Shared names / multiple widgets</strong>
          {duplicates.slice(0, 12).map(([name, total]) => (
            <span key={name}>
              {name} · {total}
            </span>
          ))}
        </div>
      )}
    </details>
  );
}
