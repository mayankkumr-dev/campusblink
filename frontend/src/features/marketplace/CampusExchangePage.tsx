import React from 'react';
import { Building2, MessageCircle, Store } from 'lucide-react';
import { Link } from 'react-router';

const SF = 'SF Pro Text, system-ui, -apple-system, sans-serif';
const SF_DISPLAY = 'SF Pro Display, system-ui, -apple-system, sans-serif';

export const CampusExchangePage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: SF }}>
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-24 sm:px-6">
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0066cc', marginBottom: 10 }}
          >
            Campus Blink
          </div>
          <h1
            style={{ fontFamily: SF_DISPLAY, fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 600, letterSpacing: '-0.28px', color: '#1d1d1f', margin: 0 }}
          >
            Campus Exchange
          </h1>
          <p
            style={{ fontSize: 17, lineHeight: 1.47, letterSpacing: '-0.374px', color: '#7a7a7a', marginTop: 12, maxWidth: 480 }}
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
            className="group transition-transform active:scale-[0.98] hover:-translate-y-0.5"
            style={{
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: 18,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              textDecoration: 'none',
            }}
            aria-label="Go to Buy and Sell marketplace"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: '#f0f6ff' }}
            >
              <Store className="h-6 w-6" style={{ color: '#0066cc' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: SF_DISPLAY, fontSize: 24, fontWeight: 600, color: '#1d1d1f', margin: 0, letterSpacing: '-0.374px' }}>
                Buy &amp; Sell
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.47, color: '#7a7a7a', marginTop: 6, letterSpacing: '-0.374px' }}>
                List items, discover student deals, and manage your active marketplace listings.
              </p>
            </div>
            <div
              className="mt-auto inline-flex items-center gap-1 text-[15px] font-medium"
              style={{ color: '#0066cc' }}
            >
              Explore →
            </div>
          </Link>

          {/* Find a Roommate */}
          <Link
            to="/student/roommate"
            id="campus-exchange-roommate-card"
            className="group transition-transform active:scale-[0.98] hover:-translate-y-0.5"
            style={{
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: 18,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              textDecoration: 'none',
            }}
            aria-label="Go to Find a Roommate"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(16,185,129,0.10)' }}
            >
              <Building2 className="h-6 w-6" style={{ color: '#059669' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: SF_DISPLAY, fontSize: 24, fontWeight: 600, color: '#1d1d1f', margin: 0, letterSpacing: '-0.374px' }}>
                Find a Roommate
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.47, color: '#7a7a7a', marginTop: 6, letterSpacing: '-0.374px' }}>
                Post that you need a flatmate and easily share your location and personal preferences.
              </p>
            </div>
            <div
              className="mt-auto inline-flex items-center gap-1 text-[15px] font-medium"
              style={{ color: '#059669' }}
            >
              Search →
            </div>
          </Link>

          {/* Messages */}
          <Link
            to="/student/campus-exchange/messages"
            id="campus-exchange-messages-card"
            className="group transition-transform active:scale-[0.98] hover:-translate-y-0.5 sm:col-span-2"
            style={{
              background: '#f5f5f7',
              border: '1px solid #e0e0e0',
              borderRadius: 18,
              padding: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              textDecoration: 'none',
            }}
            aria-label="Go to Marketplace Messages"
          >
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(29,29,31,0.08)' }}
            >
              <MessageCircle className="h-5 w-5" style={{ color: '#1d1d1f' }} />
            </div>
            <div className="min-w-0">
              <h2 style={{ fontFamily: SF_DISPLAY, fontSize: 21, fontWeight: 600, color: '#1d1d1f', margin: 0, letterSpacing: '-0.374px' }}>
                Marketplace Messages
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.47, color: '#7a7a7a', marginTop: 4, letterSpacing: '-0.374px' }}>
                Chat with buyers and sellers, send offers, and close deals on campus.
              </p>
            </div>
            <div
              className="ml-auto flex-shrink-0 text-[15px] font-medium"
              style={{ color: '#1d1d1f' }}
            >
              Open →
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
