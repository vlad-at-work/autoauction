'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal, Pause, Play, RotateCcw, Search, Copy } from 'lucide-react';

interface LogResponse {
  lines: string[];
  total: number;
  filter: string | null;
  error?: string;
}

export default function LoggerPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current && !isPaused) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // Polling every 2 seconds
  useEffect(() => {
    fetchLogs(); // Initial load

    intervalRef.current = setInterval(() => {
      if (!isPaused) {
        fetchLogs();
      }
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [filter, isPaused, fetchLogs]);

  const copyAllLogs = () => {
    const text = logs.join('\n');
    navigator.clipboard.writeText(text);
  };

  const clearFilter = () => {
    setFilter('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Логгер</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyAllLogs}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            title="Copy all logs"
          >
            <Copy className="h-4 w-4" />
            Копировать
          </button>
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

      {/* Filter */}
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
            onClick={clearFilter}
            className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            Очистить
          </button>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isLoading ? 'Загрузка...' : `Показано ${logs.length} строк`}
          {filter && ` (фильтр: "${filter}")`}
        </span>
        {isPaused && (
          <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">
            Пауза — автообновление остановлено
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {/* Log Display */}
      <div
        ref={logContainerRef}
        className="h-[600px] overflow-auto rounded-md border bg-black p-4 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="text-center text-gray-500">
            {isLoading ? 'Загрузка логов...' : 'Нет записей'}
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((line, index) => {
              // Try to parse JSON log for better formatting
              let displayLine = line;
              try {
                const parsed = JSON.parse(line);
                displayLine = JSON.stringify(parsed, null, 2);
              } catch {
                // Not JSON, show as-is
              }

              return (
                <div
                  key={index}
                  className="whitespace-pre-wrap break-all text-green-400 hover:bg-white/5"
                >
                  {displayLine}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Copy individual line hint */}
      <p className="text-sm text-muted-foreground">
        Совет: Двойной клик по строке выделит её для копирования
      </p>
    </div>
  );
}
