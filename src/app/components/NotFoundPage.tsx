import React from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

export const NotFoundPage: React.FC = () => {
  const error = useRouteError();

  const is404 = !error || (isRouteErrorResponse(error) && error.status === 404);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,214,0,0.16),_transparent_34%),linear-gradient(180deg,#FAFAF8_0%,#F4F0E6_100%)] px-6 text-[#0D0D0D]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#CA8A04]">Page Not Found</p>
        <h1 className="mt-5 font-syne text-[96px] font-black leading-none tracking-[-0.06em] text-[#0D0D0D] md:text-[144px]">404</h1>
        <h2 className="mt-4 font-syne text-3xl font-bold text-[#0D0D0D] md:text-5xl">
          {is404 ? 'This route does not exist.' : 'This page failed to load.'}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[#6B6B6B] md:text-base">
          {is404 ? 'The page you requested was moved, removed, or never existed.' : 'An unexpected application error occurred while loading this route.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="inline-flex h-11 items-center justify-center rounded-md bg-[#0D0D0D] px-7 text-sm font-bold text-white transition-colors hover:bg-[#FFD600] hover:text-[#0D0D0D]">Go Home</Link>
          <Link to="/student/home" className="inline-flex h-11 items-center justify-center rounded-md border border-black/10 bg-white px-7 text-sm font-bold text-[#0D0D0D] transition-colors hover:bg-[#FFF8D4]">Open Dashboard</Link>
        </div>
      </div>
    </div>
  );
};
