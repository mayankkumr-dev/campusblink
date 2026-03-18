import React from 'react';
import { Facebook, Globe, Instagram, Link2, Linkedin } from 'lucide-react';

export const MAX_PROFILE_SOCIAL_LINKS = 5;

export const SOCIAL_PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'x', label: 'X' },
  { value: 'website', label: 'Website' },
];

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </svg>
  );
}

function RedditIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="13" r="6" />
      <circle cx="9.5" cy="12" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="0.8" fill="currentColor" stroke="none" />
      <path d="M9 15c.7.6 1.7 1 3 1s2.3-.4 3-1" />
      <path d="M13.5 7.5l1-3 3 .8" />
      <circle cx="18" cy="5" r="1" />
      <path d="M7 10.5 5.5 10" />
      <path d="M17 10.5 18.5 10" />
    </svg>
  );
}

export function normalizeSocialUrl(platform: string, value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;

  const cleaned = raw.replace(/^@/, '').replace(/^\/+/, '');
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${cleaned}`;
    case 'facebook':
      return `https://facebook.com/${cleaned}`;
    case 'linkedin':
      return cleaned.startsWith('in/') || cleaned.startsWith('company/') ? `https://linkedin.com/${cleaned}` : `https://linkedin.com/in/${cleaned}`;
    case 'reddit':
      return cleaned.startsWith('u/') || cleaned.startsWith('r/') ? `https://reddit.com/${cleaned}` : `https://reddit.com/u/${cleaned}`;
    case 'x':
      return `https://x.com/${cleaned}`;
    default:
      return `https://${cleaned}`;
  }
}

export function getSocialDisplayValue(value: string) {
  return String(value || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function mergeSocialLinks(website: string | null | undefined, links: Array<{ platform: string; url: string }>) {
  const merged = [...(Array.isArray(links) ? links : [])];
  const normalizedWebsite = String(website || '').trim();

  if (normalizedWebsite) {
    const websiteUrl = normalizeSocialUrl('website', normalizedWebsite);
    if (!merged.some((item) => String(item?.url || '').trim().toLowerCase() === websiteUrl.toLowerCase())) {
      merged.unshift({ platform: 'website', url: websiteUrl });
    }
  }

  return merged.slice(0, MAX_PROFILE_SOCIAL_LINKS);
}

export function getSocialIcon(platform: string) {
  switch (platform) {
    case 'instagram':
      return Instagram;
    case 'facebook':
      return Facebook;
    case 'linkedin':
      return Linkedin;
    case 'reddit':
      return RedditIcon;
    case 'x':
      return XIcon;
    case 'website':
      return Globe;
    default:
      return Link2;
  }
}

export function sanitizeEditableSocialLinks(links: Array<{ platform?: string; url?: string }>) {
  return (Array.isArray(links) ? links : [])
    .map((item) => ({
      platform: String(item?.platform || 'website').trim().toLowerCase(),
      url: String(item?.url || '').trim(),
    }))
    .filter((item) => item.url)
    .slice(0, MAX_PROFILE_SOCIAL_LINKS);
}

export function SocialLinksStrip({ links, className = '' }: { links: Array<{ platform: string; url: string }>; className?: string }) {
  if (!links.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {links.map((item, index) => {
        const Icon = getSocialIcon(item.platform);
        return (
          <a
            key={`${item.platform}-${item.url}-${index}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={getSocialDisplayValue(item.url)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-[#0D0D0D] transition-colors hover:border-[#FFD600] hover:bg-[#FFF8D4]"
          >
            <Icon className="h-4.5 w-4.5" />
          </a>
        );
      })}
    </div>
  );
}