const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function createDefaultShopSchedule() {
  return {
    mon: { enabled: true, open: '09:00', close: '18:00' },
    tue: { enabled: true, open: '09:00', close: '18:00' },
    wed: { enabled: true, open: '09:00', close: '18:00' },
    thu: { enabled: true, open: '09:00', close: '18:00' },
    fri: { enabled: true, open: '09:00', close: '18:00' },
    sat: { enabled: true, open: '10:00', close: '16:00' },
    sun: { enabled: false, open: '10:00', close: '16:00' },
  };
}

export function normalizeShopSchedule(value) {
  const base = createDefaultShopSchedule();
  if (!value || typeof value !== 'object') return base;

  return DAYS.reduce((accumulator, day) => {
    const incoming = value?.[day] || {};
    accumulator[day] = {
      enabled: typeof incoming.enabled === 'boolean' ? incoming.enabled : base[day].enabled,
      open: typeof incoming.open === 'string' ? incoming.open : base[day].open,
      close: typeof incoming.close === 'string' ? incoming.close : base[day].close,
    };
    return accumulator;
  }, {});
}

export function computeShopOpenNow(shop, now = new Date()) {
  if (!shop?.is_active) {
    return { isOpenNow: false, reason: 'This shop is currently unavailable' };
  }

  if (shop?.manual_override_status === 'open') {
    return { isOpenNow: true, reason: 'Opened manually' };
  }

  if (shop?.manual_override_status === 'closed') {
    return { isOpenNow: false, reason: 'Closed manually' };
  }

  const schedule = normalizeShopSchedule(shop?.schedule_json);
  const dayKey = DAYS[now.getDay()];
  const day = schedule[dayKey];

  if (!day?.enabled) {
    return { isOpenNow: false, reason: 'Closed today' };
  }

  const current = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = String(day.open || '09:00').split(':').map(Number);
  const [closeHour, closeMinute] = String(day.close || '18:00').split(':').map(Number);
  const openMinutes = (openHour || 0) * 60 + (openMinute || 0);
  const closeMinutes = (closeHour || 0) * 60 + (closeMinute || 0);

  const isOpenNow = current >= openMinutes && current < closeMinutes;
  return {
    isOpenNow,
    reason: isOpenNow ? `Open until ${day.close}` : `Opens at ${day.open}`,
  };
}

export function decorateShopStatus(shop) {
  const derived = computeShopOpenNow(shop);
  return {
    ...shop,
    is_open_now: typeof shop?.is_open_now === 'boolean' ? shop.is_open_now : derived.isOpenNow,
    shop_status_reason: derived.reason,
    schedule_json: normalizeShopSchedule(shop?.schedule_json),
  };
}