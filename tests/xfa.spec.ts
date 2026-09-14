import { expect, test, type Page } from '@playwright/test';
import { PDFArray, PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { xfaRuntimeWorkerSource } from '../lib/xfa-runtime';
import { attachXfaToFallbackPdf, extractEmbeddedXfaFallbackPdf, readNativeXfaPackets } from '../lib/xfa-template';

type RuntimeResult = {
  updates: Record<string, string | number | boolean | null>;
  result?: unknown;
  error?: string;
};

async function openXfaPicker(page: Page) {
  await page.getByRole('button', { name: 'More new and open options' }).click();
  await page.getByRole('button', { name: 'Open XFA' }).click();
}

async function pdfWithXfa(xfa: 'array' | 'stream') {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const template =
    '<template xmlns="http://www.xfa.org/schema/xfa-template/3.3/"><subform name="Root"/></template>';
  const datasets = '<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"/>';
  const value =
    xfa === 'stream'
      ? pdf.context.register(
          pdf.context.flateStream(
            `<xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/">${template}${datasets}</xdp:xdp>`,
          ),
        )
      : (() => {
          const packets = PDFArray.withContext(pdf.context);
          for (const [name, xml] of [
            ['template', template],
            ['datasets', datasets],
          ] as const) {
            packets.push(PDFString.of(name));
            packets.push(pdf.context.register(pdf.context.flateStream(xml)));
          }
          return packets;
        })();
  pdf.catalog.set(PDFName.of('AcroForm'), pdf.context.register(pdf.context.obj({ XFA: value, Fields: [] })));
  return pdf.save({ useObjectStreams: false });
}

test('XFA XML reader exposes packet arrays and single XDP streams', async () => {
  const packets = await readNativeXfaPackets(await pdfWithXfa('array'));
  expect(packets.map((packet) => packet.name)).toEqual(['template', 'datasets']);
  expect(packets[0].xml).toContain('<subform name="Root"/>');
  const xdp = await readNativeXfaPackets(await pdfWithXfa('stream'));
  expect(xdp).toHaveLength(1);
  expect(xdp[0].name).toBe('xdp');
  expect(xdp[0].xml).toContain('<xdp:xdp');
});

test('combines editable fallback pages with native XFA data', async () => {
  const fallback = await PDFDocument.create();
  fallback.addPage([400, 500]).drawText('Edited fallback content');
  const combined = await attachXfaToFallbackPdf(await fallback.save(), await pdfWithXfa('stream'));
  const opened = await PDFDocument.load(combined);
  expect(opened.getPageCount()).toBe(1);
  expect(await readNativeXfaPackets(combined)).toHaveLength(1);
});

test('extracts the original standard pages from a hybrid XFA PDF', async () => {
  const hybrid = await pdfWithXfa('stream');
  const fallback = await extractEmbeddedXfaFallbackPdf(hybrid);
  expect(fallback).not.toBeNull();
  const opened = await PDFDocument.load(fallback!);
  expect(opened.getPageCount()).toBe(1);
  expect(await readNativeXfaPackets(fallback!)).toHaveLength(0);
});

test('opens a standalone XDP and creates a verified XFA PDF', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'More new and open options' })).toBeVisible();
  const chooserPromise = page.waitForEvent('filechooser');
  await openXfaPicker(page);
  const chooser = await chooserPromise;
  await chooser.setFiles('tests/fixtures/xfa-static-form.xdp');
  await expect(page.getByRole('dialog', { name: 'XFA XML' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  await expect(page.getByRole('region', { name: 'XFA compatibility report' })).toContainText('Good');
  await page.getByRole('checkbox', { name: 'Viewer fallback' }).check();
  await page.getByRole('checkbox', { name: 'AcroForm fields' }).check();
  const fallbackPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const fallbackPath = testInfo.outputPath('fallback-xfa.pdf');
  await (await fallbackPromise).saveAs(fallbackPath);
  const fallbackPdf = await PDFDocument.load(await import('node:fs/promises').then(({ readFile }) => readFile(fallbackPath)));
  expect(fallbackPdf.getPageCount()).toBe(1);
  expect(fallbackPdf.getForm().getFields().length).toBeGreaterThan(0);
  await page.getByRole('checkbox', { name: 'Viewer fallback' }).uncheck();
  await page.getByRole('checkbox', { name: 'AcroForm fields' }).uncheck();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  const path = testInfo.outputPath('standalone-xfa.pdf');
  await download.saveAs(path);
  const pdf = await PDFDocument.load(await import('node:fs/promises').then(({ readFile }) => readFile(path)));
  expect(pdf.catalog.get(PDFName.of('NeedsRendering'))?.toString()).toBe('true');
  const packets = await readNativeXfaPackets(new Uint8Array(await pdf.save({ useObjectStreams: false })));
  expect(packets).toHaveLength(1);
  expect(packets[0].name).toBe('xdp');
  expect(packets[0].xml).toContain('<template');
  await page.getByRole('button', { name: 'Close XFA XML viewer' }).click();
  await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles(path);
  await expect(page.locator('.status-pill')).toContainText('XFA form');
  await expect(page.locator('.document-tab.active .document-tab-icon')).toHaveText('X');
  await expect(page.getByRole('group', { name: 'XFA document view' })).toBeVisible();
  await page.getByRole('button', { name: 'Fallback', exact: true }).click();
  await expect(page.locator('.status-pill')).toContainText('Fallback PDF');
  await expect(page.getByRole('button', { name: 'Add blank page' })).toBeEnabled();
  const combinedPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export XFA + fallback' }).click();
  const combinedPath = testInfo.outputPath('xfa-with-edited-fallback.pdf');
  await (await combinedPromise).saveAs(combinedPath);
  expect(await readNativeXfaPackets(new Uint8Array(await import('node:fs/promises').then(({ readFile }) => readFile(combinedPath))))).not.toHaveLength(0);
  await page.getByRole('button', { name: 'XFA form', exact: true }).click();
  await expect(page.locator('.status-pill')).toContainText('XFA form');
  await page.getByRole('button', { name: 'XFA XML' }).click();
  const zipPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export ZIP' }).click();
  const zipDownload = await zipPromise;
  expect(zipDownload.suggestedFilename()).toMatch(/xfa-packets\.zip$/);
  const zipPath = testInfo.outputPath('xfa-packets.zip');
  await zipDownload.saveAs(zipPath);
  const zipBytes = await import('node:fs/promises').then(({ readFile }) => readFile(zipPath));
  expect(zipBytes.subarray(0, 4).toString('hex')).toBe('504b0304');
  const staticPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download static' }).click();
  expect((await staticPromise).suggestedFilename()).toMatch(/-static\.pdf$/);
  await page.getByRole('button', { name: 'Open static' }).click();
  await expect(page.locator('.status-pill')).not.toContainText('XFA form');
  await expect.poll(() => page.locator('.text-block, .pdf-form-control').count()).toBeGreaterThan(0);
  await page.getByRole('button', { name: /X standalone-xfa 1/ }).click();
  await page.getByRole('button', { name: 'XFA XML' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const nativeSource = page.getByRole('textbox', { name: 'xdp XML source' });
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await expect(nativeSource).toHaveValue(/<text>Paperly XFA compatibility form<\/text>/);
  expect(await nativeSource.inputValue()).not.toContain('<text>Paperly XFA compatibility form\n</text>');
  await nativeSource.fill((await nativeSource.inputValue()).replace('compatibility form', 'edited compatibility form'));
  await expect(page.getByRole('button', { name: 'Apply to PDF copy' })).toBeEnabled();
  page.once('dialog', (dialog) => dialog.accept());
  const backupPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Apply to PDF copy' }).click();
  expect((await backupPromise).suggestedFilename()).toMatch(/-backup\.pdf$/);
  await expect(page.locator('.status-pill')).toContainText('XFA form');
  const tabsBeforeAcrobatCopy = await page.locator('.document-tab').count();
  await page.getByRole('button', { name: 'XFA XML' }).click();
  await page.getByRole('button', { name: 'Open Acrobat copy' }).click();
  await expect(page.locator('.document-tab')).toHaveCount(tabsBeforeAcrobatCopy + 1);
  await expect(page.locator('.status-pill')).toContainText('XFA form');
});

test('reviews a dynamic repeated XDP before conversion', async ({ page }) => {
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await openXfaPicker(page);
  await (await chooserPromise).setFiles('tests/fixtures/xfa-dynamic-repeated-form.xdp');
  const review = page.getByRole('region', { name: 'Import review' });
  await expect(review).toContainText('Complete XDP');
  await expect(review).toContainText('XFA 3.3');
  await expect(review).toContainText('Create a new PDF');
  await expect(review).toContainText('Ready');
  const compatibility = page.getByRole('region', { name: 'XFA compatibility report' });
  await expect(compatibility).toContainText('Review recommended');
  await expect(compatibility).toContainText('Scripts1');
  await expect(compatibility).toContainText('Repeating sections1');
  await expect(page.getByRole('button', { name: 'Open and edit' })).toBeEnabled();
  await page.getByLabel('Storage').selectOption('packets');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const source = page.getByRole('textbox', { name: 'xdp XML source' });
  await expect(page.locator('.xfa-xml-highlight')).toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    document.querySelector('.xfa-xml-highlight')?.textContent ===
    (document.querySelector('.xfa-xml-source') as HTMLTextAreaElement | null)?.value,
  )).toBe(true);
  await source.fill('<broken>');
  await expect.poll(() => page.evaluate(() =>
    document.querySelector('.xfa-xml-highlight')?.textContent ===
    (document.querySelector('.xfa-xml-source') as HTMLTextAreaElement | null)?.value,
  )).toBe(true);
  await expect(page.getByRole('alert')).toContainText('XML parsing failed');
  await expect(page.getByRole('button', { name: 'Open and edit' })).toBeDisabled();
  await page.getByRole('dialog', { name: 'XFA XML' }).getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('alert')).not.toBeVisible();
  await page.getByRole('button', { name: 'Open and edit' }).click();
  await expect(page.getByRole('dialog', { name: 'XFA XML' })).not.toBeVisible();
  await expect(page.locator('.status-pill')).toContainText('XFA form');
});

test('imports CSV as an editable XFA datasets tree', async ({ page }) => {
  await page.goto('/');
  const xfaChooser = page.waitForEvent('filechooser');
  await openXfaPicker(page);
  await (await xfaChooser).setFiles('tests/fixtures/xfa-static-form.xdp');
  const dataChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import data' }).click();
  await (await dataChooser).setFiles({
    name: 'customers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('CustomerName,Amount\nAda,12\nGrace,24'),
  });
  await expect(page.getByRole('button', { name: /datasets/ })).toBeVisible();
  await page.getByRole('button', { name: 'Data tree' }).click();
  const tree = page.getByRole('region', { name: 'XFA datasets values' });
  const firstValue = tree.locator('input').first();
  await expect(firstValue).toHaveValue('Ada');
  await firstValue.fill('Ada Lovelace');
  await page.getByRole('button', { name: 'XML', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'datasets XML source' })).toHaveValue(/Ada Lovelace/);
});

test('opens a dropped XDP file', async ({ page }) => {
  await page.goto('/');
  const xdp = await import('node:fs/promises').then(({ readFile }) =>
    readFile('tests/fixtures/xfa-static-form.xdp', 'utf8'),
  );
  await page.locator('main').evaluate((target, xml) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([xml], 'dropped-form.xdp', { type: 'application/xml' }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
  }, xdp);
  await expect(page.getByRole('dialog', { name: 'XFA XML' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Import review' })).toContainText('Complete XDP');
});

test('rejects unsafe XFA XML before preview', async ({ page }) => {
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await openXfaPicker(page);
  await (await chooserPromise).setFiles({
    name: 'unsafe.xdp',
    mimeType: 'application/xml',
    buffer: Buffer.from('<!DOCTYPE xdp [<!ENTITY leak SYSTEM "file:///etc/passwd">]><xdp>&leak;</xdp>'),
  });
  await expect(page.locator('.status-pill.error')).toContainText('DTD and entity declarations are not allowed');
  await expect(page.getByRole('dialog', { name: 'XFA XML' })).not.toBeVisible();
});

async function runXfaWorker(page: Page, input: Record<string, unknown>) {
  return page.evaluate(
    ({ source, payload }) =>
      new Promise<RuntimeResult>((resolve, reject) => {
        const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        const worker = new Worker(url);
        const finish = () => {
          worker.terminate();
          URL.revokeObjectURL(url);
        };
        worker.onmessage = (event) => {
          finish();
          resolve(event.data);
        };
        worker.onerror = (event) => {
          finish();
          reject(new Error(event.message));
        };
        worker.postMessage(payload);
      }),
    { source: xfaRuntimeWorkerSource, payload: input },
  );
}

test('XFA runtime resolves duplicate control names within the same repeated section', async ({ page }) => {
  await page.goto('/');
  const values = {
    '0:field:Root[0].Row[0].Amount[0]:instance:0': 10,
    '0:field:Root[0].Row[0].Amount[0]:instance:1': 20,
    '0:field:Root[0].Row[0].Amount[0]:instance:2': 30,
    '0:field:Root[0].Row[0].Total[0]:instance:0': 0,
    '0:field:Root[0].Row[0].Total[0]:instance:1': 0,
    '0:field:Root[0].Row[0].Total[0]:instance:2': 0,
  };
  const aliases = {
    Amount: [
      '0:field:Root[0].Row[0].Amount[0]:instance:0',
      '0:field:Root[0].Row[0].Amount[0]:instance:1',
      '0:field:Root[0].Row[0].Amount[0]:instance:2',
    ],
    Total: [
      '0:field:Root[0].Row[0].Total[0]:instance:0',
      '0:field:Root[0].Row[0].Total[0]:instance:1',
      '0:field:Root[0].Row[0].Total[0]:instance:2',
    ],
  };
  const repeated = await runXfaWorker(page, {
    code: '$.rawValue + 5',
    language: 'javascript',
    fieldName: 'Amount',
    fieldKey: aliases.Amount[1],
    aliases,
    values,
    mode: 'calculate',
  });
  expect(repeated.error).toBeUndefined();
  expect(repeated.updates).toEqual({ [aliases.Amount[1]]: 25 });
  for (const [index, expected] of [10, 20, 30].entries()) {
    const sectionTotal = await runXfaWorker(page, {
      code: 'xfa.resolveNode("Amount").rawValue',
      language: 'javascript',
      fieldName: 'Total',
      fieldKey: aliases.Total[index],
      aliases,
      values,
      mode: 'calculate',
    });
    expect(sectionTotal.error).toBeUndefined();
    expect(sectionTotal.updates).toEqual({ [aliases.Total[index]]: expected });
  }
  const indexed = await runXfaWorker(page, {
    code: 'xfa.resolveNode("Amount[2]").rawValue',
    language: 'javascript',
    fieldName: 'Total',
    fieldKey: aliases.Total[0],
    aliases,
    values,
    mode: 'calculate',
  });
  expect(indexed.updates).toEqual({ [aliases.Total[0]]: 30 });
  const allInstances = await runXfaWorker(page, {
    code: 'xfa.resolveNodes("Amount").length',
    language: 'javascript',
    fieldName: 'Total',
    fieldKey: aliases.Total[0],
    aliases,
    values,
    mode: 'calculate',
  });
  expect(allInstances.updates).toEqual({ [aliases.Total[0]]: 3 });
});

test('XFA runtime worker can be terminated when a script exceeds its budget', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async (source) => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const worker = new Worker(url);
    const outcome = await Promise.race([
      new Promise<'unexpected'>((resolve) => {
        worker.onmessage = () => resolve('unexpected');
        worker.postMessage({
          code: 'while (true) {}',
          language: 'javascript',
          fieldName: 'A',
          fieldKey: 'A',
          aliases: { A: ['A'] },
          values: { A: 1 },
          mode: 'event',
        });
      }),
      new Promise<'timeout'>((resolve) => window.setTimeout(() => resolve('timeout'), 350)),
    ]);
    worker.terminate();
    URL.revokeObjectURL(url);
    return outcome;
  }, xfaRuntimeWorkerSource);
  expect(result).toBe('timeout');
});
