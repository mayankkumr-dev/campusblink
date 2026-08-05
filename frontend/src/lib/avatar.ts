type AvatarOptions = {
  name?: string | null;
  email?: string | null;
  seed?: string | null;
};

const PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: '#FDE68A', fg: '#1F2937' },
  { bg: '#FCA5A5', fg: '#111827' },
  { bg: '#86EFAC', fg: '#111827' },
  { bg: '#93C5FD', fg: '#111827' },
  { bg: '#F9A8D4', fg: '#111827' },
  { bg: '#A7F3D0', fg: '#111827' },
  { bg: '#FCD34D', fg: '#111827' },
  { bg: '#C4B5FD', fg: '#111827' },
  { bg: '#FDBA74', fg: '#111827' },
  { bg: '#99F6E4', fg: '#111827' },
  { bg: '#67E8F9', fg: '#111827' },
  { bg: '#DDD6FE', fg: '#111827' },
];

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getAvatarInitials(name?: string | null, email?: string | null) {
  const safeName = (name || '').trim().replace(/\s+/g, ' ');
  if (safeName) {
    const parts = safeName.split(' ').filter(Boolean);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  const local = (email || '').split('@')[0].trim();
  return local ? local.charAt(0).toUpperCase() : 'U';
}

export function getAvatarColors(seed?: string | null) {
  const normalizedSeed = (seed || '').trim().toLowerCase() || 'default-user';
  const idx = hashString(normalizedSeed) % PALETTE.length;
  return PALETTE[idx];
}

export function getAvatarDataUrl(options: AvatarOptions = {}) {
  // Use a generic neutral placeholder instead of colourful initials
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' style='background: #f8fafc;'><path d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}