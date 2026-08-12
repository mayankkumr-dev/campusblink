import React from 'react';
import { Building2, MessageCircle, Store } from 'lucide-react';
import { Link } from 'react-router';

const SF = 'SF Pro Text, system-ui, -apple-system, sans-serif';
const SF_DISPLAY = 'SF Pro Display, system-ui, -apple-system, sans-serif';

export const CampusExchangePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101113] text-[#1d1d1f] dark:text-[#F4F5F7] font-sans">
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-24 sm:px-6">
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div
            className="text-xs font-semibold uppercase tracking-[0.6px] text-[#0066cc] dark:text-[#60A5FA] mb-2.5"
          >
            Campus Blink
          </div>
          <h1
            className="font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[32px] sm:text-[48px] font-semibold tracking-[-0.28px] text-[#1d1d1f] dark:text-[#F4F5F7] m-0"
          >
            Campus Exchange
          </h1>
          <p
            className="text-[17px] leading-[1.47] tracking-[-0.374px] text-gray-500 dark:text-[#9BA1AC] mt-3 max-w-[480px]"
          >
            Trade campus items, find a roommate, and stay connected through your marketplace messages.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Buy & Sell */}
          <Link
            to="/student/buy-sell"
            id="campus-exchange-buy-sell-card"
            className="group flex flex-col gap-3 p-7 sm:p-8 rounded-[18px] bg-white dark:bg-[#171A21] border border-gray-200 dark:border-[#262A33] no-underline transition-transform active:scale-[0.98] hover:-translate-y-0.5"
            aria-label="Go to Buy and Sell marketplace"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40"
            >
              <Store className="h-6 w-6 text-[#0066cc] dark:text-[#60A5FA]" />
            </div>
            <div>
              <h2 className="font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-2xl font-semibold text-[#1d1d1f] dark:text-[#F4F5F7] m-0 tracking-[-0.374px]">
                Buy &amp; Sell
              </h2>
              <p className="text-[17px] leading-[1.47] text-gray-500 dark:text-[#9BA1AC] mt-1.5 tracking-[-0.374px]">
                List items, discover student deals, and manage your active marketplace listings.
              </p>
            </div>
            <div
              className="mt-auto inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc] dark:text-[#60A5FA]"
            >
              Explore →
            </div>
          </Link>

          {/* Find a Roommate */}
          <Link
            to="/student/roommate"
            id="campus-exchange-roommate-card"
            className="group flex flex-col gap-3 p-7 sm:p-8 rounded-[18px] bg-white dark:bg-[#171A21] border border-gray-200 dark:border-[#262A33] no-underline transition-transform active:scale-[0.98] hover:-translate-y-0.5"
            aria-label="Go to Find a Roommate"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40"
            >
              <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-2xl font-semibold text-[#1d1d1f] dark:text-[#F4F5F7] m-0 tracking-[-0.374px]">
                Find a Roommate
              </h2>
              <p className="text-[17px] leading-[1.47] text-gray-500 dark:text-[#9BA1AC] mt-1.5 tracking-[-0.374px]">
                Post that you need a flatmate and easily share your location and personal preferences.
              </p>
            </div>
            <div
              className="mt-auto inline-flex items-center gap-1 text-[15px] font-medium text-emerald-600 dark:text-emerald-400"
            >
              Search →
            </div>
          </Link>

          {/* Messages */}
          <Link
            to="/student/campus-exchange/messages"
            id="campus-exchange-messages-card"
            className="group flex items-center gap-5 p-7 rounded-[18px] bg-white dark:bg-[#171A21] border border-gray-200 dark:border-[#262A33] no-underline transition-transform active:scale-[0.98] hover:-translate-y-0.5 sm:col-span-2"
            aria-label="Go to Marketplace Messages"
          >
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"
            >
              <MessageCircle className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            </div>
            <div className="min-w-0">
              <h2 className="font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[21px] font-semibold text-[#1d1d1f] dark:text-[#F4F5F7] m-0 tracking-[-0.374px]">
                Marketplace Messages
              </h2>
              <p className="text-[15px] leading-[1.47] text-gray-500 dark:text-[#9BA1AC] mt-1 tracking-[-0.374px]">
                Chat with buyers and sellers, send offers, and close deals on campus.
              </p>
            </div>
            <div
              className="ml-auto flex-shrink-0 text-[15px] font-medium text-[#1d1d1f] dark:text-[#F4F5F7]"
            >
              Open →
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
