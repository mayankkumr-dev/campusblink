import React, { useState } from 'react';
import { Radio, Send, ChevronDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// ─── DESIGN.md token references ───────────────────────────────────────────────
// canvas:              #ffffff
// hairline:            #e0e0e0
// ink:                 #1d1d1f
// ink-muted-48:        #7a7a7a
// ink-muted-80:        #333333
// primary:             #0066cc  (Action Blue — every interactive element)
// canvas-parchment:    #f5f5f7
// rounded.lg:          18px     (utility cards)
// rounded.pill:        9999px   (primary CTAs)
// rounded.md:          11px     (textarea, secondary inputs)
// spacing.lg:          24px     (card padding)
// body-strong:         17px / 600 / -0.374px tracking
// caption:             14px / 400 / -0.224px tracking
// ─────────────────────────────────────────────────────────────────────────────

const PRESET_ROUTES = [
  { label: 'Official Notices', value: '/student/notices' },
  { label: 'Marketplace', value: '/student/marketplace' },
  { label: 'Community Feed', value: '/student/community' },
  { label: 'Canteen', value: '/student/canteen' },
  { label: 'Home / Dashboard', value: '/' },
  { label: 'Custom URL…', value: '__custom__' },
] as const;

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminBroadcastPushCard: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>(PRESET_ROUTES[0].value);
  const [customUrl, setCustomUrl] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isCustom = selectedRoute === '__custom__';
  const link = isCustom ? customUrl.trim() || '/' : selectedRoute;

  const isValid = title.trim().length > 0 && body.trim().length > 0;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSending) return;

    setIsSending(true);
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/admin/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim(), body: body.trim(), link }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(result.error || 'Broadcast failed. Please try again.');
        return;
      }

      toast.success('📣 Broadcast queued — all subscribed devices will receive the notification!');
      setTitle('');
      setBody('');
      setSelectedRoute(PRESET_ROUTES[0].value);
      setCustomUrl('');
    } catch (err: any) {
      console.error('[AdminBroadcastPushCard] send error:', err);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    /*
     * DESIGN.md: store-utility-card
     * background: #ffffff (canvas), border: 1px solid #e0e0e0 (hairline),
     * border-radius: 18px (rounded.lg), padding: 24px (spacing.lg)
     * NO box-shadow (DESIGN.md: "Don't add shadows to cards, buttons, or text")
     */
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '18px',
        padding: '24px',
        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#f0f7ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Radio
            style={{ width: '18px', height: '18px', color: '#0066cc' }}
            strokeWidth={1.8}
          />
        </div>
        <div>
          {/* DESIGN.md: body-strong — 17px / 600 / -0.374px tracking */}
          <h3
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: '#1d1d1f',
              letterSpacing: '-0.374px',
              lineHeight: 1.24,
              margin: 0,
            }}
          >
            Broadcast Push Notification
          </h3>
          {/* DESIGN.md: caption — 14px / 400 / -0.224px tracking */}
          <p
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#7a7a7a',
              letterSpacing: '-0.224px',
              lineHeight: 1.43,
              margin: '2px 0 0',
            }}
          >
            Send an instant push to every subscribed device campus-wide
          </p>
        </div>
      </div>

      {/* ── Divider (hairline) ────────────────────────────────────────────── */}
      <div style={{ height: '1px', backgroundColor: '#f0f0f0', marginBottom: '20px' }} />

      {/* ── Form ────────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Notification Title */}
        <div>
          <label
            htmlFor="broadcast-title"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1d1d1f',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            Notification Title
          </label>
          {/*
           * DESIGN.md: search-input
           * border-radius: 9999px (pill), height: 44px, padding: 12px 20px,
           * border: 1px solid rgba(0,0,0,0.08), background: #ffffff
           */}
          <input
            id="broadcast-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Important Campus Announcement"
            maxLength={100}
            required
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '9999px',
              border: '1px solid rgba(0,0,0,0.12)',
              backgroundColor: '#ffffff',
              color: '#1d1d1f',
              fontSize: '17px',
              fontWeight: 400,
              letterSpacing: '-0.374px',
              padding: '0 20px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#0066cc'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; }}
          />
          <p style={{ fontSize: '11px', color: '#7a7a7a', margin: '4px 0 0 12px' }}>
            {title.length}/100
          </p>
        </div>

        {/* Message Body */}
        <div>
          <label
            htmlFor="broadcast-body"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1d1d1f',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            Message Body
          </label>
          {/*
           * DESIGN.md: rounded.md = 11px for textarea
           * Same border treatment as search-input but rectangular
           */}
          <textarea
            id="broadcast-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. College fest registrations are now open! Tap to learn more."
            rows={3}
            maxLength={240}
            required
            style={{
              width: '100%',
              borderRadius: '11px',
              border: '1px solid rgba(0,0,0,0.12)',
              backgroundColor: '#ffffff',
              color: '#1d1d1f',
              fontSize: '17px',
              fontWeight: 400,
              letterSpacing: '-0.374px',
              lineHeight: 1.47,
              padding: '12px 16px',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#0066cc'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; }}
          />
          <p style={{ fontSize: '11px', color: '#7a7a7a', margin: '4px 0 0 12px' }}>
            {body.length}/240
          </p>
        </div>

        {/* Target URL */}
        <div>
          <label
            htmlFor="broadcast-url"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1d1d1f',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            Deep Link / Target URL
          </label>
          <div style={{ position: 'relative' }}>
            <select
              id="broadcast-url"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '9999px',
                border: '1px solid rgba(0,0,0,0.12)',
                backgroundColor: '#ffffff',
                color: '#1d1d1f',
                fontSize: '14px',
                fontWeight: 400,
                letterSpacing: '-0.224px',
                padding: '0 40px 0 20px',
                outline: 'none',
                appearance: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
                fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
              }}
            >
              {PRESET_ROUTES.map((route) => (
                <option key={route.value} value={route.value}>
                  {route.label}
                </option>
              ))}
            </select>
            <ChevronDown
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: '#7a7a7a',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Custom URL input — shown only when "Custom URL…" is selected */}
          {isCustom && (
            <div style={{ marginTop: '8px' }}>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="/student/custom-path"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(0,0,0,0.12)',
                  backgroundColor: '#f5f5f7',
                  color: '#1d1d1f',
                  fontSize: '14px',
                  letterSpacing: '-0.224px',
                  padding: '0 20px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0066cc'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; }}
              />
            </div>
          )}

          {/* URL preview */}
          <p style={{ fontSize: '11px', color: '#7a7a7a', margin: '4px 0 0 12px' }}>
            Tapping the notification will open: <strong style={{ color: '#333333' }}>{link || '/'}</strong>
          </p>
        </div>

        {/* ── Preview Card ─────────────────────────────────────────────────── */}
        {(title || body) && (
          <div
            style={{
              borderRadius: '11px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f5f5f7',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <img
              src="/logo2/Blue_transparent.png"
              alt="Campus Blink icon"
              style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, objectFit: 'contain' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1d1d1f',
                  letterSpacing: '-0.224px',
                  margin: 0,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {title || 'Notification Title'}
              </p>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 400,
                  color: '#7a7a7a',
                  margin: '2px 0 0',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {body || 'Message body preview…'}
              </p>
            </div>
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
          {/*
           * DESIGN.md: button-primary
           * background: #0066cc (Action Blue), color: #ffffff, border-radius: 9999px (pill)
           * padding: 11px 22px, font-size: 17px / 400
           * Active state: transform: scale(0.95)
           * NEVER has a box-shadow (DESIGN.md rule)
           */}
          <button
            id="admin-broadcast-push-send-btn"
            type="submit"
            disabled={!isValid || isSending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: !isValid || isSending ? '#b0cce8' : '#0066cc',
              color: '#ffffff',
              borderRadius: '9999px',
              padding: '11px 22px',
              fontSize: '17px',
              fontWeight: 400,
              letterSpacing: '-0.374px',
              border: 'none',
              cursor: !isValid || isSending ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease, transform 0.1s ease',
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
              flexShrink: 0,
            }}
            onMouseDown={(e) => { if (isValid && !isSending) e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {isSending ? (
              <>
                <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send style={{ width: '16px', height: '16px' }} />
                Send Broadcast
              </>
            )}
          </button>

          {/* DESIGN.md: caption — 14px / 400 / -0.224px */}
          <p
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#7a7a7a',
              letterSpacing: '-0.224px',
              lineHeight: 1.43,
              margin: 0,
            }}
          >
            Sends to all subscribed devices instantly
          </p>
        </div>

        {/* ── Disclaimer ───────────────────────────────────────────────────── */}
        {/* DESIGN.md: fine-print — 12px / 400 / -0.12px */}
        <p
          style={{
            fontSize: '12px',
            fontWeight: 400,
            color: '#7a7a7a',
            letterSpacing: '-0.12px',
            lineHeight: 1.0,
            margin: '0',
          }}
        >
          This sends to <strong style={{ color: '#333333' }}>all active users</strong> who have enabled push notifications. Use responsibly.
        </p>
      </form>
    </div>
  );
};
