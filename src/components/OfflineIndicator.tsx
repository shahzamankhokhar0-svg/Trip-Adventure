import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-[#111114] px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg md:bottom-5">
      <WifiOff className="h-3.5 w-3.5 text-amber-400" />
      <span>Offline Mode — Viewing cached tour guide info</span>
    </div>
  );
};
