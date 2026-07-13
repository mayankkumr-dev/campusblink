import React from 'react';
import { Building2, MessageCircle, Store, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

export const CampusExchangePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 md:py-12 font-sans">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-10 text-center md:text-left">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent-blue mb-3">Marketplace Hub</p>
          <h1 className="font-syne text-4xl md:text-5xl font-extrabold tracking-tight text-text-primary mb-4">Campus Exchange</h1>
          <p className="max-w-2xl text-[15px] text-text-secondary leading-relaxed mx-auto md:mx-0">
            Choose where you want to go: trading campus items, finding a roommate near your preferred location, or catching up on your messages.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            to="/student/buy-sell"
            className="group rounded-3xl bg-surface p-8 text-left transition-all duration-300 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_40px_-10px_rgba(37,99,235,0.1)] border border-border-subtle hover:-translate-y-1 relative overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue-soft rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-blue-soft text-accent-blue mb-6 shadow-sm relative z-10 border border-accent-blue-soft">
              <Store className="h-6 w-6" />
            </div>
            <h2 className="font-syne text-2xl font-bold text-text-primary mb-2 relative z-10">Buy & Sell</h2>
            <p className="text-[14px] text-text-secondary leading-relaxed mb-6 flex-grow relative z-10">List items, discover student deals, and manage your active marketplace listings.</p>
            <div className="flex items-center text-accent-blue font-bold text-sm mt-auto group-hover:gap-2 transition-all relative z-10">
              Explore <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </Link>

          <Link
            to="/student/roommate"
            className="group rounded-3xl bg-surface p-8 text-left transition-all duration-300 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_40px_-10px_rgba(16,185,129,0.1)] border border-border-subtle hover:-translate-y-1 relative overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-green/15 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-green/15 text-accent-green mb-6 shadow-sm relative z-10 border border-emerald-100">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="font-syne text-2xl font-bold text-text-primary mb-2 relative z-10">Find a Roommate</h2>
            <p className="text-[14px] text-text-secondary leading-relaxed mb-6 flex-grow relative z-10">Post that you need a flatmate and easily share your address and personal preferences.</p>
            <div className="flex items-center text-accent-green font-bold text-sm mt-auto group-hover:gap-2 transition-all relative z-10">
              Search <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </Link>

          <Link
            to="/student/campus-exchange/messages"
            className="group rounded-3xl bg-surface p-8 text-left transition-all duration-300 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_40px_-10px_rgba(245,158,11,0.1)] border border-border-subtle hover:-translate-y-1 relative overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-amber-soft rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-amber-soft text-accent-amber mb-6 shadow-sm relative z-10 border border-amber-100">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h2 className="font-syne text-2xl font-bold text-text-primary mb-2 relative z-10">Messages</h2>
            <p className="text-[14px] text-text-secondary leading-relaxed mb-6 flex-grow relative z-10">Open your buyer-seller and flatmate chats easily from one central inbox.</p>
            <div className="flex items-center text-accent-amber font-bold text-sm mt-auto group-hover:gap-2 transition-all relative z-10">
              Open Inbox <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
