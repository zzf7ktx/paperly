import { expect, test, type Page } from '@playwright/test';
import { xfaRuntimeWorkerSource } from '../lib/xfa-runtime';

type RuntimeResult = {
  updates: Record<string, string | number | boolean | null>;
  result?: unknown;
  error?: string;
};

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
