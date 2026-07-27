import React from 'react';
import { GraduationCap, Link2, MapPin, Plus, Trash2, X } from 'lucide-react';
import { MAX_PROFILE_SOCIAL_LINKS, SOCIAL_PLATFORM_OPTIONS } from './ProfileSocialLinks';

const ONLY_COLLEGE = 'Maharaja Agrasen Institute of Technology (MAIT)';

export type MediaEditorKind = 'avatar' | 'cover';

export type MediaEditorState = {
  kind: MediaEditorKind;
  file: File;
  previewUrl: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export async function createAdjustedImageFile(
  file: File,
  zoom: number,
  offsetX: number,
  offsetY: number,
  outputWidth: number,
  outputHeight: number,
  outputName: string
) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    const scale = Math.max(outputWidth / image.width, outputHeight / image.height) * zoom;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const maxOffsetX = Math.max(0, (drawWidth - outputWidth) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - outputHeight) / 2);
    const dx = (outputWidth - drawWidth) / 2 + (offsetX / 100) * maxOffsetX;
    const dy = (outputHeight - drawHeight) / 2 + (offsetY / 100) * maxOffsetY;

    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type || 'image/jpeg', 0.92)
    );
    if (!blob) return file;
    return new File([blob], outputName, { type: blob.type || file.type || 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function MediaEditorModal({
  state,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: {
  state: MediaEditorState;
  isSaving: boolean;
  onChange: (updates: Partial<MediaEditorState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const isAvatar = state.kind === 'avatar';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-[24px] bg-[var(--bg)] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-surface px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--yellow-dark)]">
              Adjust {state.kind}
            </p>
            <h3 className="mt-1 text-2xl font-extrabold text-[var(--text-primary)]">
              Preview before saving
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div
            className={`overflow-hidden border border-black/10 bg-[var(--bg-secondary)] ${
              isAvatar ? 'mx-auto h-[280px] w-[280px] rounded-full' : 'aspect-[3/1] w-full rounded-[18px]'
            }`}
          >
            <img
              src={state.previewUrl}
              alt="Media preview"
              className="h-full w-full object-cover"
              style={{
                transform: `translate(${state.offsetX * 0.35}%, ${state.offsetY * 0.35}%) scale(${state.zoom})`,
                transformOrigin: 'center center',
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Zoom
              </span>
              <input
                type="range"
                min="1"
                max="2.8"
                step="0.05"
                value={state.zoom}
                onChange={(event) => onChange({ zoom: Number(event.target.value) })}
                className="w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Move Left / Right
              </span>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={state.offsetX}
                onChange={(event) => onChange({ offsetX: Number(event.target.value) })}
                className="w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Move Up / Down
              </span>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={state.offsetY}
                onChange={(event) => onChange({ offsetY: Number(event.target.value) })}
                className="w-full"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Use this image'}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ProfileEditFormData {
  name: string;
  username: string;
  college: string;
  bio: string;
  location: string;
  website: string;
}

export interface ProfileEditModalProps {
  isOpen: boolean;
  isSaving: boolean;
  formData: ProfileEditFormData;
  onFormDataChange: (formData: ProfileEditFormData) => void;
  socialLinks: Array<{ platform: string; url: string }>;
  onSocialLinksChange: (links: Array<{ platform: string; url: string }>) => void;
  onClose: () => void;
  onSave: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  isSaving,
  formData,
  onFormDataChange,
  socialLinks,
  onSocialLinksChange,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 font-sans">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-white/95 px-6 py-4.5 backdrop-blur-md">
          <h2 className="font-syne text-xl font-extrabold text-text-primary">Edit Profile</h2>
          <button
            onClick={() => !isSaving && onClose()}
            className="rounded-xl p-2 text-text-secondary/70 transition-colors hover:bg-surface-elevated hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Sections with Breathable Padding */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Basic Info Section */}
          <section className="space-y-4">
            <div className="border-b border-border-subtle pb-2">
              <h3 className="font-syne text-sm font-bold text-text-primary">Basic Info</h3>
              <p className="text-xs text-text-secondary">
                Update your primary identity displayed across Campus Blink.
              </p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Full Name
              </span>
              <input
                value={formData.name}
                onChange={(event) =>
                  onFormDataChange({ ...formData, name: event.target.value })
                }
                className="w-full rounded-2xl border border-border-subtle bg-slate-50/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-placeholder outline-none transition-all focus:border-accent-blue focus:bg-surface focus:ring-2 focus:ring-accent-blue/20 shadow-2xs"
                placeholder="Your Full Name"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Username
              </span>
              <div className="flex items-center rounded-2xl border border-border-subtle bg-slate-50/60 px-4 py-3 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 shadow-2xs">
                <span className="mr-1.5 font-semibold text-text-secondary/70 text-sm">@</span>
                <input
                  value={formData.username}
                  onChange={(event) =>
                    onFormDataChange({
                      ...formData,
                      username: event.target.value.replace(/^@+/, '').replace(/\s+/g, ''),
                    })
                  }
                  className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-placeholder"
                  placeholder="username"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Bio
              </span>
              <textarea
                value={formData.bio}
                onChange={(event) =>
                  onFormDataChange({ ...formData, bio: event.target.value })
                }
                rows={3}
                maxLength={160}
                className="w-full resize-none rounded-2xl border border-border-subtle bg-slate-50/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-placeholder outline-none transition-all focus:border-accent-blue focus:bg-surface focus:ring-2 focus:ring-accent-blue/20 shadow-2xs"
                placeholder="Tell campus about yourself..."
              />
              <span className="mt-1.5 block text-right text-xs font-medium text-text-secondary/70">
                {formData.bio.length} / 160
              </span>
            </label>
          </section>

          {/* Personal Section */}
          <section className="space-y-4">
            <div className="border-b border-border-subtle pb-2">
              <h3 className="font-syne text-sm font-bold text-text-primary">Personal & College</h3>
              <p className="text-xs text-text-secondary">
                Your campus affiliation and location details.
              </p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Location
              </span>
              <div className="flex items-center rounded-2xl border border-border-subtle bg-slate-50/60 px-4 py-3 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 shadow-2xs">
                <MapPin className="mr-2.5 h-4 w-4 text-text-secondary/70 shrink-0" />
                <input
                  value={formData.location}
                  onChange={(event) =>
                    onFormDataChange({ ...formData, location: event.target.value })
                  }
                  className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-placeholder"
                  placeholder="e.g. Rohini, Delhi"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Website
              </span>
              <div className="flex items-center rounded-2xl border border-border-subtle bg-slate-50/60 px-4 py-3 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 shadow-2xs">
                <Link2 className="mr-2.5 h-4 w-4 text-text-secondary/70 shrink-0" />
                <input
                  value={formData.website}
                  onChange={(event) =>
                    onFormDataChange({ ...formData, website: event.target.value })
                  }
                  className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-placeholder"
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                College
              </span>
              <div className="flex items-center rounded-2xl border border-border-subtle bg-slate-50/60 px-4 py-3 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 shadow-2xs">
                <GraduationCap className="mr-2.5 h-4 w-4 text-text-secondary/70 shrink-0" />
                <select
                  value={formData.college}
                  onChange={(event) =>
                    onFormDataChange({ ...formData, college: event.target.value })
                  }
                  className="w-full bg-transparent text-sm font-medium text-text-primary outline-none"
                >
                  <option value={ONLY_COLLEGE}>{ONLY_COLLEGE}</option>
                </select>
              </div>
            </label>
          </section>

          {/* Dynamic Social Links Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <div>
                <h3 className="font-syne text-sm font-bold text-text-primary">Social Links</h3>
                <p className="text-xs text-text-secondary">
                  Add up to {MAX_PROFILE_SOCIAL_LINKS} external profiles.
                </p>
              </div>
              {socialLinks.length < MAX_PROFILE_SOCIAL_LINKS ? (
                <button
                  type="button"
                  onClick={() =>
                    onSocialLinksChange([...socialLinks, { platform: 'instagram', url: '' }])
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3.5 py-1.5 text-xs font-semibold text-text-primary shadow-2xs transition-colors hover:bg-surface-elevated"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.2} /> Add link
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              {socialLinks.length ? (
                socialLinks.map((item, index) => (
                  <div
                    key={`${item.platform}-${index}`}
                    className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto] items-center"
                  >
                    <select
                      value={item.platform}
                      onChange={(event) =>
                        onSocialLinksChange(
                          socialLinks.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, platform: event.target.value }
                              : entry
                          )
                        )
                      }
                      className="rounded-2xl border border-border-subtle bg-slate-50/60 px-3.5 py-3 text-xs font-semibold text-text-primary outline-none transition-colors focus:border-accent-blue focus:bg-surface"
                    >
                      {SOCIAL_PLATFORM_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.url}
                      onChange={(event) =>
                        onSocialLinksChange(
                          socialLinks.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, url: event.target.value }
                              : entry
                          )
                        )
                      }
                      placeholder="Paste URL or handle..."
                      className="rounded-2xl border border-border-subtle bg-slate-50/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-placeholder outline-none transition-all focus:border-accent-blue focus:bg-surface"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onSocialLinksChange(
                          socialLinks.filter((_, entryIndex) => entryIndex !== index)
                        )
                      }
                      className="inline-flex items-center justify-center rounded-2xl border border-border-subtle bg-surface p-3 text-text-secondary/70 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-border-subtle bg-background p-4 text-center">
                  <p className="text-xs text-text-secondary">No extra social links added yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-border-subtle bg-white/95 px-6 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            className="rounded-xl border border-border-subtle bg-surface px-5 py-2.5 text-sm font-semibold text-text-primary shadow-2xs transition-colors hover:bg-surface-elevated"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
