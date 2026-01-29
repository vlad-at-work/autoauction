'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useDebugMode } from '@/contexts/DebugModeContext';

export function DebugBanner() {
  const { debugMode } = useDebugMode();
  const [mounted] = useState(() => typeof window !== 'undefined');

  if (!mounted || !debugMode.enabled) return null;

  return (
    <div className="bg-yellow-400 text-yellow-900 fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium">
      <span>
        🚧 Отладка 🚧
        {debugMode.useMockData &&
          debugMode.mockUserId &&
          ` - Тестовый пользователь: ${debugMode.mockUserId}`}
      </span>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="bg-white text-yellow-900 hover:bg-yellow-50 border-yellow-900"
      >
        <Link href="/app/debug">Изменить</Link>
      </Button>
    </div>
  );
}
