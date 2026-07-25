import React, { useState, useRef, useEffect, useCallback } from 'react';

const TWEAKS_STYLE = `
  .twk-panel {
    position: fixed;
    right: 16px;
    bottom: 80px;
    z-index: 2147483646;
    width: 280px;
    max-height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;
    background: rgba(250, 249, 247, 0.9);
    color: #29261b;
    backdrop-filter: blur(24px) saturate(160%);
    border: 0.5px solid rgba(255, 255, 255, 0.6);
    border-radius: 14px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 0 12px 40px rgba(0,0,0,0.18);
    font: 11.5px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif;
    overflow: hidden;
  }
  .twk-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    cursor: move;
    user-select: none;
    border-bottom: 0.5px solid rgba(0,0,0,0.08);
  }
  .twk-hd b {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .twk-x {
    appearance: none;
    border: 0;
    background: transparent;
    color: rgba(41, 38, 27, 0.55);
    width: 22px;
    height: 22px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .twk-x:hover {
    background: rgba(0,0,0,0.06);
    color: #29261b;
  }
  .twk-body {
    padding: 10px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }
  .twk-sect {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(41,38,27,0.45);
    margin-top: 8px;
  }
  .twk-sect:first-child {
    margin-top: 0;
  }
  .twk-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .twk-lbl {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    color: rgba(41, 38, 27, 0.72);
    font-weight: 600;
  }
  .twk-hint {
    font-size: 10.5px;
    color: rgba(41, 38, 27, 0.45);
    margin-top: -2px;
  }
  .twk-seg {
    position: relative;
    display: flex;
    padding: 2px;
    border-radius: 8px;
    background: rgba(0,0,0,0.06);
    user-select: none;
  }
  .twk-seg button {
    appearance: none;
    position: relative;
    z-index: 1;
    flex: 1;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 500;
    min-height: 22px;
    border-radius: 6px;
    cursor: pointer;
    padding: 4px 6px;
    line-height: 1.2;
    text-align: center;
  }
  .twk-seg button.is-active {
    background: rgba(255,255,255,0.9);
    box-shadow: 0 1px 2px rgba(0,0,0,0.12);
  }
`;

interface TweaksPanelProps {
  title?: string;
  children: React.ReactNode;
}

export function TweaksPanel({ title = 'Tweaks', children }: TweaksPanelProps) {
  const [open, setOpen] = useState(true);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  useEffect(() => {
    if (!open) return;
    clampToViewport();
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, [open, clampToViewport]);

  const onDragStart = (e: React.MouseEvent) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;

    const move = (ev: MouseEvent) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };

    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: TWEAKS_STYLE }} />
      <div ref={dragRef} className="twk-panel" style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks" onMouseDown={e => e.stopPropagation()} onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="twk-body">{children}</div>
      </div>
    </>
  );
}

interface TweakSectionProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function TweakSection({ label, hint, children }: TweakSectionProps) {
  return (
    <div className="twk-row">
      <div className="twk-sect">{label}</div>
      {hint && <div className="twk-hint">{hint}</div>}
      {children}
    </div>
  );
}

interface TweakRadioProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}

export function TweakRadio({ value, onChange, options }: TweakRadioProps) {
  return (
    <div className="twk-seg">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? 'is-active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
