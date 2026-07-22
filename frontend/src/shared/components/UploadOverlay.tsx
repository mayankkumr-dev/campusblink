/**
 * UploadOverlay.tsx — Premium light-mode upload progress overlay
 *
 * Renders as an absolute-positioned layer over an image thumbnail during upload.
 * Design: pure white bg, ultra-soft drop-shadow, brand-colored animated progress bar.
 * Light mode ONLY — no dark mode variants.
 */

import React from 'react';
import { CheckCircle2, WifiOff, RefreshCw } from 'lucide-react';

interface UploadOverlayProps {
  /** 0–100 upload progress percent */
  progress: number;
  /** Whether upload has completed successfully */
  done?: boolean;
  /** Whether upload errored (network failure etc.) */
  error?: boolean;
  /** Called when user clicks retry on error */
  onRetry?: () => void;
  /** Optional label shown under the progress bar */
  label?: string;
}

/**
 * UploadOverlay — place inside a `relative` container to overlay a photo thumbnail.
 *
 * @example
 * <div className="relative aspect-square rounded-2xl overflow-hidden">
 *   <img src={preview} className="w-full h-full object-cover" />
 *   <UploadOverlay progress={uploadPercent} done={isDone} />
 * </div>
 */
export const UploadOverlay: React.FC<UploadOverlayProps> = ({
  progress,
  done = false,
  error = false,
  onRetry,
  label,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: error
          ? 'rgba(254,242,242,0.92)'
          : 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderRadius: 'inherit',
        gap: '10px',
        padding: '12px',
      }}
    >
      {done ? (
        // ── Success State ────────────────────────────────────────────────────
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16,185,129,0.15)',
            }}
          >
            <CheckCircle2 size={18} color="#10b981" strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', letterSpacing: '0.04em' }}>
            Uploaded
          </span>
        </div>
      ) : error ? (
        // ── Error State ──────────────────────────────────────────────────────
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#fff1f2',
              border: '1.5px solid #fecdd3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WifiOff size={16} color="#e11d48" strokeWidth={2} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#be123c', textAlign: 'center', lineHeight: 1.3 }}>
            Upload paused
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                background: '#e11d48',
                border: 'none',
                borderRadius: 8,
                padding: '4px 10px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(225,29,72,0.25)',
              }}
            >
              <RefreshCw size={10} strokeWidth={2.5} />
              Retry
            </button>
          )}
        </div>
      ) : (
        // ── In-Progress State ────────────────────────────────────────────────
        <div
          style={{
            width: '100%',
            maxWidth: 120,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Percentage label */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            {clampedProgress}%
          </span>

          {/* Progress track */}
          <div
            style={{
              width: '100%',
              height: 5,
              borderRadius: 9999,
              background: 'rgba(0,0,0,0.07)',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${clampedProgress}%`,
                borderRadius: 9999,
                background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 8px rgba(99,102,241,0.4)',
              }}
            />
          </div>

          {/* Optional label */}
          {label && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: '#6b7280',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── File-level Upload Progress Bar ───────────────────────────────────────────
// Used for document/PDF attachments in Notice admin panels

interface FileProgressBarProps {
  /** 0–100 */
  progress: number;
  done?: boolean;
  error?: boolean;
}

export const FileProgressBar: React.FC<FileProgressBarProps> = ({ progress, done, error }) => {
  if (done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <div
          style={{
            height: 3,
            flex: 1,
            borderRadius: 9999,
            background: '#d1fae5',
          }}
        >
          <div style={{ height: '100%', width: '100%', borderRadius: 9999, background: '#10b981' }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
          ✓ Done
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#e11d48' }}>
          ⚠ Upload paused — check connection
        </span>
      </div>
    );
  }

  if (progress <= 0) return null;

  return (
    <div
      style={{
        height: 3,
        borderRadius: 9999,
        background: 'rgba(0,0,0,0.06)',
        overflow: 'hidden',
        marginTop: 4,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.min(100, progress)}%`,
          borderRadius: 9999,
          background: 'linear-gradient(90deg, #f59e0b, #f97316)',
          transition: 'width 0.2s ease',
        }}
      />
    </div>
  );
};

export default UploadOverlay;
