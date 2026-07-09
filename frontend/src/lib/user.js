export function getFirstName(name, fallback = 'Student') {
  const normalized = (name || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return fallback;

  return normalized.split(' ')[0] || fallback;
}

export function getDisplayHandle(username, fallback = 'student') {
  const normalized = (username || '').trim().replace(/^@+/, '');
  return normalized || fallback;
}

export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
