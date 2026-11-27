import { useEffect, useState, type ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

export interface LabMetric {
  label: string;
  value: string;
  accentClass?: string;
}

interface LabShellProps {
  formula: string;
  canvas: ReactNode;
  metrics: LabMetric[];
  controls: ReactNode;
  boardTip: string;
  running?: boolean;
  onToggleRun?: () => void;
  onReset: () => void;
  extraHeaderAction?: ReactNode;
}

export function LabShell({
  formula,
  canvas,
  metrics,
  controls,
  boardTip,
  running,
  onToggleRun,
  onReset,
  extraHeaderAction,
}: LabShellProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 border border-slate-800 rounded-xl overflow-hidden bg-[#131C28] text-slate-100">
      {/* Left Zone: Interactive Canvas + Real-Time Metrics */}
      <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800">
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#101824]">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-mono text-sky-300 font-medium tracking-tight break-words leading-relaxed block">
              {formula}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {extraHeaderAction}
            {onToggleRun && typeof running === 'boolean' && (
              <button
                type="button"
                onClick={onToggleRun}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{running ? 'থামান' : 'চালু করুন'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium bg-[#0B1118] border border-slate-700 hover:bg-slate-800 text-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>রিসেট</span>
            </button>
          </div>
        </div>

        <div className="relative h-[300px] sm:h-[360px] w-full bg-[#090F17]">
          {canvas}
        </div>

        {/* Real-time Tabular Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-800 bg-[#101824]">
          {metrics.map((m, idx) => (
            <div
              key={m.label}
              className={`p-3.5 sm:p-4 border-slate-800 ${
                idx < 2 ? 'border-b sm:border-b-0' : ''
              } ${idx % 2 === 0 ? 'border-r' : ''} ${
                idx < 3 ? 'sm:border-r' : 'sm:border-r-0'
              }`}
            >
              <div className="text-xs text-slate-400 mb-1 truncate">{m.label}</div>
              <div
                className={`font-mono text-sm sm:text-base font-semibold tabular-nums truncate ${
                  m.accentClass ?? 'text-slate-100'
                }`}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Zone: Parameter Controls + Board Exam Tip */}
      <div className="lg:col-span-5 p-5 sm:p-8 flex flex-col justify-between bg-[#131C28]">
        <div className="space-y-5">{controls}</div>

        <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
          <span className="text-amber-300 font-semibold">বোর্ড পরীক্ষার টিপস: </span>
          {boardTip}
        </div>
      </div>
    </div>
  );
}

interface LabParamControlProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  accent?: 'amber' | 'sky';
  onChange: (next: number) => void;
  extraNote?: string;
  inputMin?: number;
  inputMax?: number;
  footer?: ReactNode;
}

export function LabParamControl({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  accent = 'amber',
  onChange,
  extraNote,
  inputMin,
  inputMax,
  footer,
}: LabParamControlProps) {
  const allowedMin = inputMin ?? min;
  const allowedMax = inputMax ?? max;
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  const commitDraft = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(allowedMax, Math.max(allowedMin, parsed));
    onChange(clamped);
    setDraft(String(clamped));
  };

  const accentText = accent === 'sky' ? 'text-sky-300' : 'text-amber-300';
  const sliderAccent = accent === 'sky' ? 'accent-[#38BDF8]' : 'accent-[#F59E0B]';
  const borderFocus = accent === 'sky' ? 'focus:border-[#38BDF8]' : 'focus:border-[#F59E0B]';

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm mb-2">
        <label htmlFor={id} className="font-medium text-slate-200 leading-snug">
          {label}
          {extraNote && (
            <span className="ml-1.5 text-[11px] font-mono text-slate-400">{extraNote}</span>
          )}
        </label>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            id={`${id}-num`}
            type="number"
            inputMode="decimal"
            min={allowedMin}
            max={allowedMax}
            step="any"
            aria-label={`${label} ম্যানুয়াল মান`}
            value={draft}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commitDraft(draft);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitDraft(draft);
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            onChange={(e) => {
              const raw = e.target.value;
              setDraft(raw);
              if (raw.trim() !== '' && raw !== '-') {
                const parsed = Number(raw);
                if (Number.isFinite(parsed) && parsed >= allowedMin && parsed <= allowedMax) {
                  onChange(parsed);
                }
              }
            }}
            className={`w-20 px-2 py-1 text-right text-xs font-mono font-semibold tabular-nums bg-[#0B1118] border border-slate-700 rounded-md ${accentText} ${borderFocus} focus:outline-none`}
          />
          {unit && (
            <span className="text-[11px] font-mono text-slate-400 min-w-[24px]">{unit}</span>
          )}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => {
          const next = Number(e.target.value);
          setDraft(String(next));
          onChange(next);
        }}
        className={`w-full ${sliderAccent} cursor-pointer`}
      />
      {footer}
    </div>
  );
}
