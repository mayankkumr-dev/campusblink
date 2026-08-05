import React from 'react';
import { Building2, Layout, Printer, Settings, UtensilsCrossed } from 'lucide-react';
import { NavLink } from 'react-router';

export const MorePage: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center gap-3 mb-8">
        <Layout className="h-6 w-6 text-[var(--yellow-dark)]" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] select-text">More Tools</h1>
      </div>

      <div className="grid gap-3 md:gap-4">
        {/* Canteen Option */}
        <NavLink
          to="/student/canteen"
          className="flex items-center gap-4 rounded-2xl border border-black/10 bg-[var(--bg)] px-4 py-4 text-left transition-all hover:border-black/20 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--yellow-light)] text-[var(--yellow-dark)] shrink-0">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[var(--text-primary)] select-text">Canteen</h3>
            <p className="text-sm text-[var(--text-secondary)] select-text">Order food from campus canteen</p>
          </div>
          <div className="text-[var(--yellow-dark)] text-xl">→</div>
        </NavLink>

        {/* Print Option */}
        <NavLink
          to="/student/print"
          className="flex items-center gap-4 rounded-2xl border border-black/10 bg-[var(--bg)] px-4 py-4 text-left transition-all hover:border-black/20 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--yellow-light)] text-[var(--yellow-dark)] shrink-0">
            <Printer className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[var(--text-primary)] select-text">Print</h3>
            <p className="text-sm text-[var(--text-secondary)] select-text">Submit files for printing</p>
          </div>
          <div className="text-[var(--yellow-dark)] text-xl">→</div>
        </NavLink>

        {/* Societies Option */}
        <NavLink
          to="/student/societies"
          className="flex items-center gap-4 rounded-2xl border border-black/10 bg-[var(--bg)] px-4 py-4 text-left transition-all hover:border-black/20 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--yellow-light)] text-[var(--yellow-dark)] shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[var(--text-primary)] select-text">Societies</h3>
            <p className="text-sm text-[var(--text-secondary)] select-text">Discover campus clubs and communities</p>
          </div>
          <div className="text-[var(--yellow-dark)] text-xl">→</div>
        </NavLink>

        {/* Notices Option */}
        <NavLink
          to="/student/notices"
          className="flex items-center gap-4 rounded-2xl border border-black/10 bg-[var(--bg)] px-4 py-4 text-left transition-all hover:border-black/20 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--yellow-light)] text-[var(--yellow-dark)] shrink-0">
            <Layout className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[var(--text-primary)] select-text">Notices</h3>
            <p className="text-sm text-[var(--text-secondary)] select-text">View campus and faculty notices</p>
          </div>
          <div className="text-[var(--yellow-dark)] text-xl">→</div>
        </NavLink>



        {/* Settings Option */}
        <NavLink
          to="/student/settings"
          className="flex items-center gap-4 rounded-2xl border border-black/10 bg-[var(--bg)] px-4 py-4 text-left transition-all hover:border-black/20 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--yellow-light)] text-[var(--yellow-dark)] shrink-0">
            <Settings className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[var(--text-primary)] select-text">Settings</h3>
            <p className="text-sm text-[var(--text-secondary)] select-text">Manage your account preferences</p>
          </div>
          <div className="text-[var(--yellow-dark)] text-xl">→</div>
        </NavLink>
      </div>
    </div>
  );
};
