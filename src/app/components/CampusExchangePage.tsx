import React from 'react';
import { Building2, MessageCircle, Store } from 'lucide-react';
import { Link } from 'react-router';

export const CampusExchangePage: React.FC = () => {
  return (
    <div className="min-h-full bg-[#FAFAF8] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-[980px]">
        <div className="rounded-[20px] border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(13,13,13,0.06)] md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9B9B9B]">Marketplace Hub</p>
          <h1 className="mt-2 font-syne text-4xl font-extrabold tracking-tight text-[#0D0D0D]">Campus Excahnge</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6B6B6B]">Choose where you want to go: trading campus items or finding a roommate near your preferred location.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link
              to="/student/buy-sell"
              className="group rounded-[16px] border border-black/10 bg-[#FFFDF4] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(13,13,13,0.08)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#FFD600]/20 text-[#0D0D0D]">
                <Store className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-syne text-2xl font-bold text-[#0D0D0D]">Buy & Sell</h2>
              <p className="mt-1 text-sm text-[#6B6B6B]">List items, discover student deals, and manage your listings.</p>
            </Link>

            <Link
              to="/student/roommate"
              className="group rounded-[16px] border border-black/10 bg-[#FFFDF4] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(13,13,13,0.08)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#FFD600]/20 text-[#0D0D0D]">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-syne text-2xl font-bold text-[#0D0D0D]">Find Your roommate</h2>
              <p className="mt-1 text-sm text-[#6B6B6B]">Post that you need a flatmate and include your address/preferences.</p>
            </Link>

            <Link
              to="/student/campus-exchange/messages"
              className="group rounded-[16px] border border-black/10 bg-[#FFFDF4] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(13,13,13,0.08)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#FFD600]/20 text-[#0D0D0D]">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-syne text-2xl font-bold text-[#0D0D0D]">Messages</h2>
              <p className="mt-1 text-sm text-[#6B6B6B]">Open buyer-seller and flatmate chats from one place.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
