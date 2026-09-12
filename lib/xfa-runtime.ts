import type { XfaScriptLanguage } from './xfa-template';

export type XfaRuntimeResult = {
  updates: Record<string, string | number | boolean | null>;
  result?: unknown;
  error?: string;
};

const workerSource = String.raw`
const blocked = ['fetch','XMLHttpRequest','WebSocket','EventSource','WebTransport','BroadcastChannel','importScripts','indexedDB','caches'];
for (const name of blocked) {
  try { Object.defineProperty(self, name, { value: undefined, configurable: false, writable: false }); } catch {}
}

function translateFormCalc(source) {
  return source
    .replace(/\bthis\.rawValue\b/gi, '$.rawValue')
    .replace(/(^|[;\n]\s*)\$\s*=/g, '$1$.rawValue =')
    .replace(/\b(eq)\b/gi, '==')
    .replace(/\b(ne)\b/gi, '!=')
    .replace(/\b(and)\b/gi, '&&')
    .replace(/\b(or)\b/gi, '||')
    .replace(/\bnot\b/gi, '!')
    .replace(/&/g, '+');
}

function run({ code, language, fieldName, values, mode }) {
  const updates = {};
  const resolveName = path => {
    const cleaned = String(path || '').replace(/\[(\d+)\]/g, '').replace(/^\$record\./, '');
    if (Object.prototype.hasOwnProperty.call(values, cleaned)) return cleaned;
    const tail = cleaned.split('.').filter(Boolean).at(-1) || cleaned;
    return Object.keys(values).find(name => name === tail || name.endsWith('.' + tail)) || tail;
  };
  const field = name => ({
    get rawValue() { return Object.prototype.hasOwnProperty.call(updates, name) ? updates[name] : values[name] ?? null; },
    set rawValue(value) { updates[name] = value; },
    get formattedValue() { return String(this.rawValue ?? ''); },
    set formattedValue(value) { this.rawValue = value; },
    get isNull() { return this.rawValue === null || this.rawValue === ''; },
  });
  const current = field(fieldName);
  const xfa = Object.freeze({
    resolveNode(path) { return field(resolveName(path)); },
    resolveNodes(path) { return [field(resolveName(path))]; },
  });
  const helpers = {
    Sum: (...items) => items.flat().reduce((sum, value) => sum + (Number(value?.rawValue ?? value) || 0), 0),
    Avg: (...items) => { const values = items.flat().map(value => Number(value?.rawValue ?? value) || 0); return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; },
    Min: (...items) => Math.min(...items.flat().map(value => Number(value?.rawValue ?? value) || 0)),
    Max: (...items) => Math.max(...items.flat().map(value => Number(value?.rawValue ?? value) || 0)),
    Round: (value, precision = 0) => { const scale = 10 ** Number(precision); return Math.round(Number(value) * scale) / scale; },
    Abs: value => Math.abs(Number(value)),
    Floor: value => Math.floor(Number(value)),
    Ceil: value => Math.ceil(Number(value)),
  };
  const fieldNames = Object.keys(values).filter(name => /^[A-Za-z_$][\w$]*$/.test(name) && !(name in helpers) && !['xfa','event'].includes(name));
  const parameters = ['xfa', '$', 'event', ...Object.keys(helpers), ...fieldNames];
  const argumentsList = [xfa, current, { name: fieldName, value: current.rawValue }, ...Object.values(helpers), ...fieldNames.map(name => field(name))];
  let source = language === 'formcalc' ? translateFormCalc(code) : code;
  const looksLikeExpression = !/[;{}]/.test(source) && !/(^|[^=!<>])=([^=]|$)/.test(source) && !/^\s*(if|for|while|switch|return|var|let|const)\b/.test(source);
  if (looksLikeExpression) source = 'return (' + source + ')';
  const fn = new Function(...parameters, '"use strict";\n' + source);
  const result = fn.call(current, ...argumentsList);
  if (mode === 'calculate' && result !== undefined && !Object.prototype.hasOwnProperty.call(updates, fieldName)) updates[fieldName] = result;
  return { updates, result };
}

self.onmessage = event => {
  try { self.postMessage(run(event.data)); }
  catch (error) { self.postMessage({ updates: {}, error: error instanceof Error ? error.message : String(error) }); }
};
`;

export function executeXfaScript(
  input: {
    code: string;
    language: XfaScriptLanguage;
    fieldName: string;
    values: Record<string, string | number | boolean | null>;
    mode: 'calculate' | 'validate' | 'event';
  },
  timeoutMs = 300,
) {
  return new Promise<XfaRuntimeResult>((resolve) => {
    const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
    const worker = new Worker(url);
    let settled = false;
    const finish = (result: XfaRuntimeResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const timer = window.setTimeout(
      () => finish({ updates: {}, error: 'Script stopped after exceeding the live-preview time limit.' }),
      timeoutMs,
    );
    worker.onmessage = (event: MessageEvent<XfaRuntimeResult>) => finish(event.data);
    worker.onerror = () =>
      finish({ updates: {}, error: 'The script could not run in the isolated preview.' });
    worker.postMessage(input);
  });
}
