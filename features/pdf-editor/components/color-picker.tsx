'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import './color-picker.css';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  title?: string;
};

const swatches = [
  '#16302b',
  '#286d5b',
  '#438c76',
  '#83b5a0',
  '#dceee8',
  '#ff765f',
  '#ffffff',
  '#ecebe5',
  '#aab3ac',
  '#66756d',
  '#303a34',
  '#111111',
];
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const validHex = (value: string) => /^#?[0-9a-f]{6}$/i.test(value);
const normalize = (value: string) =>
  validHex(value) ? `#${value.replace('#', '').toLowerCase()}` : '#000000';
const rgb = (value: string) =>
  [1, 3, 5].map((offset) => parseInt(normalize(value).slice(offset, offset + 2), 16));
const hex = (channels: number[]) =>
  `#${channels
    .map((channel) =>
      Math.round(clamp(channel, 0, 255))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

function toHsv(value: string) {
  const [r, g, b] = rgb(value).map((channel) => channel / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  const h = !delta
    ? 0
    : max === r
      ? ((g - b) / delta + 6) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return { h: h * 60, s: max ? delta / max : 0, v: max };
}

function fromHsv(h: number, s: number, v: number) {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return hex([channel(5), channel(3), channel(1)]);
}

function ColorPanel({
  value,
  onChange,
  close,
}: {
  value: string;
  onChange: (value: string) => void;
  close: () => void;
}) {
  const normalized = normalize(value);
  const spectrumHelpId = useId();
  const current = toHsv(normalized);
  const [lastHue, setLastHue] = useState(current.h);
  const [draft, setDraft] = useState(normalized.slice(1).toUpperCase());
  const hue = current.s && current.v ? current.h : lastHue;
  const channels = rgb(normalized);
  const choose = (next: string, nextHue = toHsv(next).h) => {
    setLastHue(nextHue);
    setDraft(next.slice(1).toUpperCase());
    onChange(next);
  };
  const commitHex = () => {
    if (validHex(draft)) choose(normalize(draft));
    else setDraft(normalized.slice(1).toUpperCase());
  };
  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    choose(
      fromHsv(
        hue,
        clamp((event.clientX - rect.left) / rect.width),
        1 - clamp((event.clientY - rect.top) / rect.height),
      ),
      hue,
    );
  };
  return (
    <>
      <div className="paperly-color-heading">
        <span>Color</span>
        <button type="button" onClick={close} aria-label="Close color picker">
          ×
        </button>
      </div>
      <div
        className="paperly-color-spectrum"
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(current.s * 100)}
        aria-valuetext={`${Math.round(current.s * 100)}% saturation, ${Math.round(current.v * 100)}% brightness`}
        aria-describedby={spectrumHelpId}
        style={{ '--picker-hue': `hsl(${hue} 100% 50%)` } as CSSProperties}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event);
        }}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? 0.1 : 0.01;
          choose(
            fromHsv(
              hue,
              clamp(current.s + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0)),
              clamp(current.v + (event.key === 'ArrowDown' ? -step : event.key === 'ArrowUp' ? step : 0)),
            ),
            hue,
          );
        }}
      >
        <span
          className="paperly-color-cursor"
          style={{ left: `${current.s * 100}%`, top: `${(1 - current.v) * 100}%`, background: normalized }}
        />
      </div>
      <span id={spectrumHelpId} className="paperly-color-help">
        Left and right change saturation. Up and down change brightness.
      </span>
      <div className="paperly-color-hue-row">
        <span className="paperly-color-preview" style={{ background: normalized }} />
        <input
          className="paperly-color-hue"
          type="range"
          aria-label="Hue"
          min="0"
          max="359"
          value={Math.round(hue)}
          onChange={(event) => {
            const nextHue = Number(event.target.value);
            choose(fromHsv(nextHue, current.s, current.v), nextHue);
          }}
        />
      </div>
      <div className="paperly-color-swatches" aria-label="Paperly palette">
        {swatches.map((color) => (
          <button
            type="button"
            key={color}
            aria-label={`Use ${color}`}
            aria-pressed={color === normalized}
            title={color.toUpperCase()}
            style={{ background: color }}
            onClick={() => choose(color)}
          >
            {color === normalized && (
              <span style={{ color: toHsv(color).v > 0.72 ? '#16302b' : '#ffffff' }}>✓</span>
            )}
          </button>
        ))}
      </div>
      <div className="paperly-color-values">
        <label className="paperly-color-hex">
          HEX
          <span>
            <b>#</b>
            <input
              aria-label="Hex color"
              value={draft}
              maxLength={7}
              spellCheck={false}
              onChange={(event) => {
                const next = event.target.value;
                setDraft(next);
                // Apply complete values immediately, including when the user
                // dismisses the popover before the input receives a blur event.
                if (validHex(next)) {
                  const color = normalize(next);
                  setLastHue(toHsv(color).h);
                  onChange(color);
                }
              }}
              onBlur={commitHex}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitHex();
                }
              }}
            />
          </span>
        </label>
        {channels.map((channel, index) => (
          <label key={index}>
            {['R', 'G', 'B'][index]}
            <input
              aria-label={['Red', 'Green', 'Blue'][index]}
              type="number"
              min="0"
              max="255"
              value={channel}
              onChange={(event) => {
                if (!event.target.value) return;
                const next = [...channels];
                next[index] = clamp(Number(event.target.value), 0, 255);
                choose(hex(next));
              }}
            />
          </label>
        ))}
      </div>
    </>
  );
}

export function ColorPicker({
  value,
  onChange,
  disabled,
  className = '',
  'aria-label': label = 'Choose color',
  title,
}: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    dark: boolean;
  } | null>(null);
  const close = () => {
    setPosition(null);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!position) return;
    panel.current?.focus();
    const dismiss = (event: globalThis.PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node))
        setPosition(null);
    };
    const reposition = () => setPosition(null);
    document.addEventListener('pointerdown', dismiss, true);
    window.addEventListener('resize', reposition);
    // Closing on scroll keeps the floating panel attached to its visible control.
    const scroll = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) reposition();
    };
    document.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('scroll', scroll, true);
    };
  }, [position]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`paperly-color-trigger ${className}`}
        disabled={disabled}
        aria-label={label}
        title={title || `${label}: ${value.toUpperCase()}`}
        aria-haspopup="dialog"
        aria-expanded={Boolean(position)}
        aria-controls={position ? id : undefined}
        onClick={() => {
          if (position) {
            close();
            return;
          }
          const rect = trigger.current!.getBoundingClientRect();
          setPosition({
            left: Math.max(8, Math.min(rect.right - 256, window.innerWidth - 264)),
            ...(rect.bottom + 312 <= window.innerHeight
              ? { top: rect.bottom + 8 }
              : { bottom: Math.max(8, window.innerHeight - rect.top + 8) }),
            dark: Boolean(trigger.current?.closest('.dark-mode')),
          });
        }}
      >
        <span style={{ background: normalize(value) }} />
        <svg className="paperly-color-chevron" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="m3 4.5 3 3 3-3" />
        </svg>
      </button>
      {position &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="dialog"
            aria-label="Color picker"
            tabIndex={-1}
            className={`paperly-color-popover ${position.dark ? 'paperly-color-dark' : ''}`}
            style={{ left: position.left, top: position.top, bottom: position.bottom }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => {
              if (
                event.relatedTarget &&
                !event.currentTarget.contains(event.relatedTarget) &&
                event.relatedTarget !== trigger.current
              )
                setPosition(null);
            }}
            onKeyDown={(event) => {
              // Editor shortcuts must not delete/format the selection while the
              // user is interacting with the picker (including its 2-D slider).
              event.stopPropagation();
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
              }
            }}
          >
            <ColorPanel value={value} onChange={onChange} close={close} />
          </div>,
          document.body,
        )}
    </>
  );
}
