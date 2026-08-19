'use client';

/**
 * Toolbar — the floating bottom pill.
 *
 * Pen / Highlight / Eraser / Star stamp / Dice / Spinner / Timer, a divider,
 * then Mic / Camera. Visual only: per the build contract, dice / spinner /
 * timer wiring is explicitly deferred, and pen/highlight/eraser will be handed
 * to the Agora Fastboard SDK once the whiteboard room lands.
 *
 * Visual source of truth: mockups/draft-a-midnight-studio.html (.toolpill).
 */

import { useState } from 'react';

export type ToolId =
  | 'pen'
  | 'highlight'
  | 'eraser'
  | 'star'
  | 'dice'
  | 'spinner'
  | 'timer'
  | 'mic'
  | 'camera';

export interface ToolbarProps {
  /** Controlled active tool. Omit to let the pill manage its own state. */
  activeTool?: ToolId;
  /** Uncontrolled initial tool. */
  defaultTool?: ToolId;
  onToolSelect?: (tool: ToolId) => void;
  /** Hide tools the parent surface must not have (annotation/reward tools). */
  visibleTools?: ToolId[];
  /** Toggled-off state for the two device buttons. */
  micMuted?: boolean;
  cameraOff?: boolean;
}

const DRAW_TOOLS: ToolId[] = ['pen', 'highlight', 'eraser', 'star', 'dice', 'spinner', 'timer'];
const DEVICE_TOOLS: ToolId[] = ['mic', 'camera'];

const LABELS: Record<ToolId, string> = {
  pen: 'Pen',
  highlight: 'Highlight',
  eraser: 'Eraser',
  star: 'Star',
  dice: 'Dice',
  spinner: 'Spinner',
  timer: 'Timer',
  mic: 'Mic',
  camera: 'Camera',
};

/** Icons kept inline + geometric, matching the mockup's 1.7px stroke set. */
function ToolIcon({ tool }: { tool: ToolId }) {
  const common = {
    className: 'h-5 w-5 flex-none',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (tool) {
    case 'pen':
      return (
        <svg {...common}>
          <path d="M4.5 19.5l3.9-.9L19.6 7.3a1.7 1.7 0 0 0 0-2.4l-.9-.9a1.7 1.7 0 0 0-2.4 0L5.4 15.6z" />
          <path d="M14.9 5.7l3.4 3.4" />
        </svg>
      );
    case 'highlight':
      return (
        <svg {...common}>
          <path d="M6.6 15.1L14 7.7l3.2 3.2-7.4 7.4H6.6z" />
          <path d="M13 6.6l1.6-1.6a1.5 1.5 0 0 1 2.1 0l2.3 2.3a1.5 1.5 0 0 1 0 2.1L17.4 11" />
          <path d="M4 21h16" />
        </svg>
      );
    case 'eraser':
      return (
        <svg {...common}>
          <path d="M15.6 5.4l3 3a1.6 1.6 0 0 1 0 2.3l-6.3 6.3H8.9l-3.5-3.5a1.6 1.6 0 0 1 0-2.3l6.3-6.3a1.6 1.6 0 0 1 2.3 0z" />
          <path d="M12.2 20h7.3" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common}>
          <path d="M12 3.7l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.6-5 2.6 1-5.6-4.1-4 5.6-.8z" />
        </svg>
      );
    case 'dice':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="4.5" />
          <circle cx="9" cy="9" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="15" cy="15" r="1.25" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'spinner':
      return (
        <svg {...common}>
          <circle cx="12" cy="13.4" r="7.2" />
          <path d="M12 13.4l4.6-3.6" />
          <path d="M12 6.2v-3" />
          <path d="M9.9 3.2h4.2l-2.1 2.6z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'timer':
      return (
        <svg {...common}>
          <circle cx="12" cy="13.6" r="7.3" />
          <path d="M12 9.8v3.8l2.4 1.5" />
          <path d="M9.6 2.6h4.8" />
          <path d="M12 2.6v3.7" />
        </svg>
      );
    case 'mic':
      return (
        <svg {...common}>
          <rect x="9.2" y="2.8" width="5.6" height="10.6" rx="2.8" />
          <path d="M5.6 11.9a6.4 6.4 0 0 0 12.8 0" />
          <path d="M12 18.3V21.2" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...common}>
          <rect x="2.8" y="6.2" width="12.4" height="11.6" rx="3.2" />
          <path d="M15.2 11.1l5.9-3.3v8.4l-5.9-3.3z" />
        </svg>
      );
  }
}

export default function Toolbar({
  activeTool,
  defaultTool = 'pen',
  onToolSelect,
  visibleTools,
  micMuted = false,
  cameraOff = false,
}: ToolbarProps) {
  const [internal, setInternal] = useState<ToolId>(defaultTool);
  const current = activeTool ?? internal;

  const isVisible = (t: ToolId) => !visibleTools || visibleTools.includes(t);
  const draw = DRAW_TOOLS.filter(isVisible);
  const devices = DEVICE_TOOLS.filter(isVisible);

  function select(tool: ToolId) {
    // TODO: hand annotation tools (pen/highlight/eraser) to the Fastboard SDK
    // instance once `lib/montree/agora/whiteboard.ts` + the whiteboard-token
    // route are wired. `star` should call StarJar's award mutation.
    // Dice / spinner / timer are DEFERRED by the build contract — visual only.
    if (activeTool === undefined) setInternal(tool);
    onToolSelect?.(tool);
  }

  function renderButton(tool: ToolId) {
    const active = current === tool;
    const off = (tool === 'mic' && micMuted) || (tool === 'camera' && cameraOff);
    return (
      <button
        key={tool}
        type="button"
        aria-pressed={active}
        onClick={() => select(tool)}
        className={[
          'flex w-[78px] flex-col items-center gap-[6px] rounded-[var(--dpl-r-sm)] px-1 pb-[9px] pt-[10px]',
          active ? 'bg-[var(--dpl-accent)] text-[var(--dpl-accent-ink)]' : 'text-[var(--dpl-ink2)]',
          off ? 'text-[var(--dpl-danger)]' : '',
        ].join(' ')}
        style={active ? { boxShadow: 'var(--dpl-tool-on-shadow)' } : undefined}
      >
        <ToolIcon tool={tool} />
        <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.07em]">{LABELS[tool]}</span>
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-[2px] rounded-full border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[9px] py-[7px]"
      style={{ boxShadow: 'var(--dpl-pill-shadow)', fontFamily: 'var(--dpl-font-body)' }}
      role="toolbar"
      aria-label="Classroom tools"
    >
      {draw.map(renderButton)}
      {draw.length > 0 && devices.length > 0 ? (
        <span className="mx-2 h-[38px] w-px bg-[var(--dpl-line)]" aria-hidden="true" />
      ) : null}
      {devices.map(renderButton)}
    </div>
  );
}
