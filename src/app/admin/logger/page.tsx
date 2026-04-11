'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Pause,
  Play,
  RotateCcw,
  Search,
  Terminal,
} from 'lucide-react';

interface LogResponse {
  lines: string[];
  total: number;
  filter: string | null;
  error?: string;
}

// ── level helpers ────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<number, string> = {
  10: 'text-gray-500',
  20: 'text-blue-400',
  30: 'text-green-400',
  40: 'text-yellow-300',
  50: 'text-red-400',
};

const LEVEL_LABEL: Record<number, string> = {
  10: 'TRC',
  20: 'DBG',
  30: 'INF',
  40: 'WRN',
  50: 'ERR',
};

function levelBucket(n: number): number {
  for (const l of [50, 40, 30, 20, 10]) {
    if (n >= l) return l;
  }
  return 30;
}

// ── formatting helpers ───────────────────────────────────────────────────────

function formatTime(epochMs: number): string {
  return new Date(epochMs).toTimeString().slice(0, 8);
}

function displayValue(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '[]';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Fields pulled into summary in this order
const SUMMARY_FIELDS = [
  'method',
  'url',
  'status',
  'ms',
  'ip',
  'route',
  'platform',
  'updateType',
  'botType',
  'userId',
  'firstName',
];
// Fields omitted from summary (metadata or too long)
const META_FIELDS = new Set(['level', 'time', 'pid', 'hostname', 'msg', 'ua']);

function buildSummary(parsed: Record<string, unknown>): string {
  const parts: string[] = [];
  const shown = new Set<string>();

  for (const f of SUMMARY_FIELDS) {
    const v = parsed[f];
    if (v != null && v !== '') {
      parts.push(f === 'ms' ? `${v}ms` : displayValue(v));
      shown.add(f);
    }
  }

  if (parsed.msg) parts.push(String(parsed.msg));

  for (const [k, v] of Object.entries(parsed)) {
    if (!META_FIELDS.has(k) && !shown.has(k) && k !== 'msg') {
      parts.push(`${k}=${displayValue(v)}`);
    }
  }

  return parts.join('  ·  ');
}

// ── LogRow ───────────────────────────────────────────────────────────────────

function LogRow({
  raw,
  selected,
  onToggleSelect,
  anySelected,
}: {
  raw: string;
  selected: boolean;
  onToggleSelect: () => void;
  anySelected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const copyEntry = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(raw);
  };

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // plain text
  }

  const checkboxCls = `h-3 w-3 shrink-0 cursor-pointer accent-green-500 ${
    anySelected ? '' : 'opacity-0 group-hover:opacity-100'
  }`;

  if (!parsed) {
    return (
      <div
        className={`group flex items-center gap-2 px-2 py-0.5 font-mono text-xs text-gray-400 hover:bg-white/5 ${
          selected ? 'bg-white/10' : ''
        }`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className={checkboxCls}
        />
        <span className="flex-1 truncate">{raw}</span>
        <button
          onClick={copyEntry}
          className="shrink-0 text-gray-500 opacity-0 hover:text-gray-200 group-hover:opacity-100"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const lvl = levelBucket((parsed.level as number) || 30);
  const color = LEVEL_COLOR[lvl] ?? 'text-green-400';
  const label = LEVEL_LABEL[lvl] ?? 'INF';
  const time = parsed.time ? formatTime(parsed.time as number) : '';
  const summary = buildSummary(parsed);

  return (
    <div
      className={`group cursor-pointer font-mono text-xs ${
        selected ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      {/* ── collapsed single line ── */}
      <div className="flex items-center gap-2 px-2 py-0.5" onClick={() => setExpanded((e) => !e)}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className={checkboxCls}
        />
        <span className="w-16 shrink-0 text-gray-500">{time}</span>
        <span className={`w-7 shrink-0 font-bold ${color}`}>{label}</span>
        <span className={`flex-1 truncate ${color}`}>{summary}</span>
        <button
          onClick={copyEntry}
          className="shrink-0 text-gray-500 opacity-0 hover:text-gray-200 group-hover:opacity-100"
          title="Copy JSON"
        >
          <Copy className="h-3 w-3" />
        </button>
        {expanded ? (
          <ChevronDown className={`h-3 w-3 shrink-0 ${color}`} />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-gray-600 opacity-0 group-hover:opacity-100" />
        )}
      </div>

      {/* ── expanded: all fields, no JSON syntax ── */}
      {expanded && (
        <div className="ml-[4.75rem] grid grid-cols-[auto_1fr] gap-x-4 gap-y-px pb-1.5 pr-2">
          {Object.entries(parsed).map(([k, v]) => (
            <Fragment key={k}>
              <span className="select-none py-px text-gray-500">{k}</span>
              <span className="break-all py-px text-gray-200">{displayValue(v)}</span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function LoggerPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const logContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const url = filter
        ? `/api/admin/logs?filter=${encodeURIComponent(filter)}`
        : '/api/admin/logs';
      const res = await fetch(url);
      const data: LogResponse = await res.json();
      if (res.ok) {
        setLogs(data.lines);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch logs');
      }
    } catch {
      setError('Network error fetching logs');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Clear selection when log lines refresh
  useEffect(() => {
    setSelected(new Set());
  }, [logs]);

  // Auto-scroll to bottom when not paused
  useEffect(() => {
    if (logContainerRef.current && !isPaused) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // Polling every 2 seconds
  useEffect(() => {
    fetchLogs();
    intervalRef.current = setInterval(() => {
      if (!isPaused) fetchLogs();
    }, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [filter, isPaused, fetchLogs]);

  const toggleSelect = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const copySelected = () => {
    const entries = Array.from(selected)
      .sort((a, b) => a - b)
      .map((i) => {
        try {
          return JSON.parse(logs[i]);
        } catch {
          return logs[i];
        }
      });
    const payload = entries.length === 1 ? entries[0] : entries;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setSelected(new Set());
  };

  const copyAllLogs = () => {
    const entries = logs.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return line;
      }
    });
    navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 sm:h-[calc(100vh-2rem)]">
      {/* ── toolbar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Логгер</h1>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <button
              onClick={copySelected}
              className="flex items-center gap-2 rounded-md border bg-accent px-3 py-2 text-sm hover:bg-accent"
            >
              <Copy className="h-4 w-4" />
              Копировать ({selected.size})
            </button>
          ) : (
            <button
              onClick={copyAllLogs}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
              title="Copy all as JSON array"
            >
              <Copy className="h-4 w-4" />
              Копировать все
            </button>
          )}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              isPaused ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'hover:bg-accent'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                Продолжить
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                Пауза
              </>
            )}
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" />
            Обновить
          </button>
        </div>
      </div>

      {/* ── filter ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Фильтр (например: telegram, error, webhook)..."
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            Очистить
          </button>
        )}
      </div>

      {/* ── status bar ── */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isLoading ? 'Загрузка...' : `${logs.length} строк`}
          {filter && ` · фильтр: "${filter}"`}
          {selected.size > 0 && ` · выбрано ${selected.size}`}
        </span>
        {isPaused && (
          <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">Пауза</span>
        )}
      </div>

      {/* ── error ── */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {/* ── log container ── */}
      <div
        ref={logContainerRef}
        className="min-h-0 flex-1 overflow-auto rounded-md border bg-black py-1"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            {isLoading ? 'Загрузка логов...' : 'Нет записей'}
          </div>
        ) : (
          logs.map((line, index) => (
            <LogRow
              key={index}
              raw={line}
              selected={selected.has(index)}
              onToggleSelect={() => toggleSelect(index)}
              anySelected={selected.size > 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
