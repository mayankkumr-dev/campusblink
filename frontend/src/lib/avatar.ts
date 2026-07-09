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
  const initials = getAvatarInitials(options.name, options.email);
  const seed = options.seed || options.email || options.name || initials;
  const { bg, fg } = getAvatarColors(seed);

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='${bg}'/><text x='50%' y='50%' dy='.35em' text-anchor='middle' fill='${fg}' font-family='Arial, sans-serif' font-size='24' font-weight='700'>${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}