import React, { useEffect } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

export const NotFoundPage: React.FC = () => {
  const error = useRouteError();

  const is404 = !error || (isRouteErrorResponse(error) && error.status === 404);

  useEffect(() => {
    if (error && error instanceof Error) {
      const msg = error.message.toLowerCase();
      // Reload the page once if the PWA chunk is missing so the SW fetches the new version
      if (msg.includes('fetch dynamically imported module') || msg.includes('importing a module script failed')) {
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,214,0,0.16),_transparent_34%),linear-gradient(180deg,var(--bg-primary)_0%,#F4F0E6_100%)] px-6 text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center text-center">
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
      </div>
    </div>
  );
};
