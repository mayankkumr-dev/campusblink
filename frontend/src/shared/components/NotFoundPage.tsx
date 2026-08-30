import React, { useEffect, useState } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { RefreshCw } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const error = useRouteError();
  const [isUpdating, setIsUpdating] = useState(false);

  const is404 = !error || (isRouteErrorResponse(error) && error.status === 404);
  const isChunkError = Boolean(
    error &&
    error instanceof Error &&
    (error.message.toLowerCase().includes('fetch dynamically imported module') ||
     error.message.toLowerCase().includes('importing a module script failed'))
  );

  const triggerAppUpdate = async () => {
    setIsUpdating(true);
    
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg?.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          // Forcefully unregister to break the loop of serving old assets
          await reg.unregister();
        }
      } catch (e) {
        console.error('SW unregister error', e);
      }
    }

    // Clear all CacheStorage to wipe old precache and runtime caches
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      } catch (e) {
        console.error('Cache delete error', e);
      }
    }

    // Small delay to ensure promises settle, then hard reload with cache buster
    setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('t', Date.now().toString());
      window.location.href = url.toString();
    }, 150);
  };

  useEffect(() => {
    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('cb_chunk_reload_guard');
      if (!hasReloaded) {
        sessionStorage.setItem('cb_chunk_reload_guard', 'true');
        triggerAppUpdate();
      }
    }
  }, [isChunkError]);

  const handleManualUpdate = () => {
    sessionStorage.removeItem('cb_chunk_reload_guard');
    triggerAppUpdate();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,214,0,0.16),_transparent_34%),linear-gradient(180deg,var(--bg-primary)_0%,#F4F0E6_100%)] px-6 text-[var(--text-primary)] flex items-center justify-center">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center py-12">
        {isChunkError ? (
          <>
            <div className="w-16 h-16 rounded-full bg-indigo-500/15 text-indigo-600 flex items-center justify-center mb-5 shadow-sm animate-pulse">
              <RefreshCw size={32} className={isUpdating ? 'animate-spin' : ''} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-600">Update Available</p>
            <h1 className="mt-3 font-syne text-4xl sm:text-5xl font-black leading-tight tracking-tight text-slate-900">
              New Campus Blink Version
            </h1>
            <p className="mt-4 max-w-lg text-sm sm:text-base leading-7 text-slate-600">
              We just released a fresh update while you were browsing! Tap below to refresh and load the latest app version.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleManualUpdate}
                disabled={isUpdating}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 text-sm sm:text-base font-extrabold text-white shadow-lg transition-all hover:bg-indigo-600 active:scale-95 cursor-pointer disabled:opacity-75"
              >
                <RefreshCw size={18} className={isUpdating ? 'animate-spin' : ''} />
                <span>{isUpdating ? 'Updating App...' : 'Refresh Application'}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--yellow-dark)]">Page Not Found</p>
            <h1 className="mt-5 font-syne text-[96px] font-black leading-none tracking-[-0.06em] text-[var(--text-primary)] md:text-[144px]">404</h1>
            <h2 className="mt-4 font-syne text-3xl font-bold text-[var(--text-primary)] md:text-5xl">
              {is404 ? 'This route does not exist.' : 'This page failed to load.'}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)] md:text-base">
              {is404 ? 'The page you requested was moved, removed, or never existed.' : 'An unexpected application error occurred while loading this route.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/" className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--text-primary)] px-7 text-sm font-bold text-white transition-colors hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]">Go Home</Link>
              <Link to="/student/home" className="inline-flex h-11 items-center justify-center rounded-md border border-black/10 bg-[var(--bg)] px-7 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--yellow-light)]">Open Dashboard</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
