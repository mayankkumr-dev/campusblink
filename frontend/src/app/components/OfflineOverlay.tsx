import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function OfflineOverlay() {
  const isOnline = useNetworkStatus();
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    if (!isOnline && typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname.toLowerCase());
    }
  }, [isOnline]);

  if (isOnline) {
    return null;
  }

  // Guardrail for payment and checkout routes
  if (currentPath.startsWith('/payment') || currentPath.startsWith('/checkout')) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[var(--bg-background)] backdrop-blur-md transition-opacity duration-300">
      <div className="flex flex-col items-center p-8 bg-[var(--bg-surface)] rounded-2xl shadow-xl border border-[var(--border-subtle)]">
        <img 
          src="/logo2/Blue_transparent.png" 
          alt="Campus Blink Logo" 
          className="w-32 h-auto mb-6 dark:hidden" 
        />
        <img 
          src="/logo2/splash_white_transparent.png" 
          alt="Campus Blink Logo" 
          className="w-32 h-auto mb-6 hidden dark:block" 
        />
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-syne, sans-serif)' }}>
          You are offline
        </h2>
        <p className="text-[var(--text-secondary)] text-center max-w-[250px]">
          Please check your internet connection to continue using Campus Blink.
        </p>
      </div>
    </div>
  );
}
