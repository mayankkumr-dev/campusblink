import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useSmartNetworkStatus } from '../../hooks/useSmartNetworkStatus';

export function OfflineBanner() {
  const isOnline = useSmartNetworkStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // We only show the banner if isOnline transitions to false
    if (!isOnline) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [isOnline]);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[99999] pointer-events-none flex justify-center pt-2 px-4 transition-all duration-500 ease-in-out animate-in slide-in-from-top-full">
      <div className="pointer-events-auto bg-white/90 backdrop-blur-md shadow-sm border border-b border-orange-100 rounded-full px-6 py-2 flex items-center space-x-3">
        <WifiOff className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-gray-700 tracking-tight" style={{ fontFamily: 'var(--font-inter, sans-serif)' }}>
          You are viewing offline data. Reconnecting...
        </span>
      </div>
    </div>
  );
}
