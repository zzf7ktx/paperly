'use client';

import { useState, useSyncExternalStore, type ComponentProps, type CSSProperties } from 'react';
import { ColorPicker } from './color-picker';

const storageKey = 'paperly-custom-colors';
const changeEvent = 'paperly-custom-colors-change';
let fallback = '[]';
const serverSnapshot = () => '[]';
function snapshot() {
  try {
    return localStorage.getItem(storageKey) || '[]';
  } catch {
    return fallback;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(changeEvent, listener);
  };
}
function readColors(raw: string): string[] {
  try {
    const values: unknown = JSON.parse(raw);
    return Array.isArray(values)
      ? [
          ...new Set(
            values
              .filter((color): color is string => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
              .map((color) => color.toLowerCase()),
          ),
        ].slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

export function ColorControl(props: ComponentProps<typeof ColorPicker>) {
  const saved = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const colors = readColors(saved);
  const [message, setMessage] = useState('');
  const current = props.value.toLowerCase();
  const save = () => {
    const next = [current, ...colors.filter((color) => color !== current)].slice(0, 5);
    fallback = JSON.stringify(next);
    try {
      localStorage.setItem(storageKey, fallback);
    } catch {
      /* In-memory colors still work. */
    }
    window.dispatchEvent(new Event(changeEvent));
    setMessage(`Saved ${current.toUpperCase()} to custom palette`);
  };
  return (
    <div className="paperly-color-control">
      <div className="paperly-custom-palette" role="group" aria-label="Custom color palette">
        {Array.from({ length: 5 }, (_, index) =>
          colors[index] ? (
            <button
              type="button"
              key={colors[index]}
              className="paperly-custom-swatch"
              style={{ '--custom-swatch-color': colors[index] } as CSSProperties}
              ref={(element) => element?.style.setProperty('background-color', colors[index], 'important')}
              disabled={props.disabled}
              aria-label={`Use custom color ${colors[index]}`}
              aria-pressed={current === colors[index]}
              title={colors[index].toUpperCase()}
              onClick={() => props.onChange(colors[index])}
            />
          ) : (
            <span key={`empty-${index}`} className="paperly-custom-empty" aria-hidden="true" />
          ),
        )}
        <button
          type="button"
          className="paperly-custom-add"
          aria-label="Save current color to palette"
          title="Save current color to palette"
          disabled={props.disabled || !/^#[0-9a-f]{6}$/i.test(current) || colors.includes(current)}
          onClick={save}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>
      </div>
      <span className="paperly-color-help" role="status">
        {message}
      </span>
      <div className="color-row">
        <ColorPicker {...props} />
        <code>{props.value}</code>
      </div>
    </div>
  );
}
