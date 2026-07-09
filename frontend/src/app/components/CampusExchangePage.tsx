import React from 'react';
import { Building2, MessageCircle, Store } from 'lucide-react';
import { Link } from 'react-router';

export const CampusExchangePage: React.FC = () => {
  return (
    <div className="min-h-full bg-[var(--bg-primary)] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-[980px]">
        <div className="rounded-[20px] border border-black/10 bg-[var(--bg)] p-6 shadow-[0_10px_30px_rgba(13,13,13,0.06)] md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Marketplace Hub</p>
          <h1 className="mt-2 font-syne text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">Campus Excahnge</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Choose where you want to go: trading campus items or finding a roommate near your preferred location.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link
              to="/student/buy-sell"
              className="group rounded-[16px] border border-black/10 bg-[#FFFDF4] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(13,13,13,0.08)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--yellow)]/20 text-[var(--text-primary)]">
                <Store className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-syne text-2xl font-bold text-[var(--text-primary)]">Buy & Sell</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">List items, discover student deals, and manage your listings.</p>
            </Link>

            <Link
              to="/student/roommate"
              className="group rounded-[16px] border border-black/10 bg-[#FFFDF4] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(13,13,13,0.08)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--yellow)]/20 text-[var(--text-primary)]">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-syne text-2xl font-bold text-[var(--text-primary)]">Find Your roommate</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Post that you need a flatmate and include your address/preferences.</p>
            </Link>

            <Link
              to="/student/campus-exchange/messages"
              className="group rounded-[16px] border border-black/10 bg-[#FFFDF4] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(13,13,13,0.08)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--yellow)]/20 text-[var(--text-primary)]">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-syne text-2xl font-bold text-[var(--text-primary)]">Messages</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Open buyer-seller and flatmate chats from one place.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
