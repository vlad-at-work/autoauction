'use client';

import { useDebugMode } from '@/contexts/DebugModeContext';

export function DebugBanner() {
  const { debugMode } = useDebugMode();

  if (!debugMode.enabled) return null;

  return (
    <div className="bg-yellow-400 text-yellow-900 fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium">
      🐛 Debug Mode Active
      {debugMode.useMockData && debugMode.mockUserId && ` - Mock User: ${debugMode.mockUserId}`}
    </div>
  );
}
