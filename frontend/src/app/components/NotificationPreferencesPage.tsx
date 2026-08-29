import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Mail, MessageSquare, Newspaper, ShieldCheck, ShoppingBag, Star, UserPlus, UtensilsCrossed, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getNotificationPreferences, getPushUnavailableReason, isPushSubscribed, saveNotificationPreferences, sendTestPush, subscribeToPush, unsubscribeFromPush } from '../../lib/pushNotifications';

const preferenceItems = [
  { key: 'order_ready', icon: UtensilsCrossed, label: 'Order Ready', desc: 'When your canteen or print order is ready for pickup' },
  { key: 'new_order', icon: ShoppingBag, label: 'New Orders', desc: 'When a student places an order' },
  { key: 'post_liked', icon: Star, label: 'Post Likes', desc: 'When someone likes your post' },
  { key: 'post_commented', icon: MessageSquare, label: 'Comments and Replies', desc: 'When someone comments on your post or replies' },
  { key: 'new_follower', icon: UserPlus, label: 'New Followers', desc: 'When someone follows you' },
  { key: 'announcement', icon: Newspaper, label: 'Announcements', desc: 'Platform and admin announcements' },
  { key: 'marketplace_message', icon: Mail, label: 'Marketplace Messages', desc: 'When someone messages about your listing' },
  { key: 'reputation_earned', icon: ShieldCheck, label: 'Reputation Updates', desc: 'When you earn reputation points' },
  { key: 'professor_approved', icon: Bell, label: 'Professor Approval', desc: 'Faculty signup approval updates' },
] as const;

const defaultPrefs = {
  order_ready: true,
  new_order: true,
  post_liked: true,
  post_commented: true,
  new_follower: true,
  announcement: true,
  marketplace_message: true,
  reputation_earned: true,
  professor_approved: true,
};

export const NotificationPreferencesPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [settings, setSettings] = useState(defaultPrefs);

  const masterEnabled = useMemo(() => Object.values(settings).some(Boolean), [settings]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!profile?.id) return;

      try {
        const [prefData, pushState] = await Promise.all([
          getNotificationPreferences(profile.id).catch(() => null),
          isPushSubscribed().catch(() => false),
        ]);

        if (!mounted) return;

        if (prefData) {
          setSettings({
            order_ready: prefData.order_ready ?? true,
            new_order: prefData.new_order ?? true,
            post_liked: prefData.post_liked ?? true,
            post_commented: prefData.post_commented ?? true,
            new_follower: prefData.new_follower ?? true,
            announcement: prefData.announcement ?? true,
            marketplace_message: prefData.marketplace_message ?? true,
            reputation_earned: prefData.reputation_earned ?? true,
            professor_approved: prefData.professor_approved ?? true,
          });
        }

        setSubscribed(Boolean(pushState));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [profile?.id]);

  const toggleAll = (enabled: boolean) => {
    setSettings({
      order_ready: enabled,
      new_order: enabled,
      post_liked: enabled,
      post_commented: enabled,
      new_follower: enabled,
      announcement: enabled,
      marketplace_message: enabled,
      reputation_earned: enabled,
      professor_approved: enabled,
    });
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      await saveNotificationPreferences(profile.id, settings);
      toast.success('Saved ✓');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    try {
      const result = await sendTestPush();
      // The backend now returns tokenCount + device info
      if (result?.tokenCount > 0) {
        toast.success(`Test sent to ${result.tokenCount} device${result.tokenCount > 1 ? 's' : ''}! Background the app now to see it.`);
      } else {
        toast.success('Test notification sent');
      }
    } catch (error: any) {
      const msg = error?.message || 'Failed to send test notification';
      if (msg.includes('No push subscriptions')) {
        toast.error('No device token registered. Please tap "Enable Notifications" first.');
      } else {
        toast.error(msg);
      }
    }
  };

  const handleMasterPush = async () => {
    if (!profile?.id) return;

    if (masterEnabled) {
      toggleAll(false);
      await unsubscribeFromPush(profile.id).catch(() => null);
      setSubscribed(false);
      return;
    }

    const unavailableReason = await getPushUnavailableReason();
    if (unavailableReason) {
      toast.error(unavailableReason);
      return;
    }

    const ok = await subscribeToPush(profile.id);
    if (!ok) {
      if (Notification.permission === 'denied') {
        toast.error('Notifications are blocked. Please allow them in browser settings.');
      } else {
        toast.error('Unable to enable notifications right now.');
      }
      return;
    }
    toggleAll(true);
    setSubscribed(true);
  };

  if (loading) {
    return <div className="p-6 text-sm text-[var(--text-secondary)]">Loading notification preferences...</div>;
  }

  return (
    <div className="min-h-full bg-[var(--bg-primary)] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-black/10 bg-[var(--bg)] shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="border-b border-black/10 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Settings</p>
          <h1 className="mt-2 font-syne text-3xl font-extrabold text-[var(--text-primary)]">Notification Preferences</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Control which push and in-app alerts you receive across Campus Blink.</p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="flex flex-col gap-3 rounded-[24px] border border-black/10 bg-[var(--bg-primary)] p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Push Notifications</h2>
              <p className="mt-1 text-sm leading-6 text-[#64748B]">Enable or disable notifications for this device.</p>
            </div>
            <button
              type="button"
              onClick={handleMasterPush}
              className={`rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${subscribed ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[#EDEAE3]'}`}
            >
              {subscribed ? 'Disable Notifications' : 'Enable Notifications'}
            </button>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-[var(--bg-primary)] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Notification Types</h2>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">Toggle individual notification categories.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => toggleAll(true)} className="rounded-md border border-black/10 bg-[var(--bg)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[#F5F5F7]">Enable all</button>
                <button type="button" onClick={() => toggleAll(false)} className="rounded-md border border-black/10 bg-[var(--bg)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[#F5F5F7]">Disable all</button>
              </div>
            </div>

            <div className="grid gap-3">
              {preferenceItems.map((item) => {
                const Icon = item.icon;
                return (
                  <label key={item.key} className="flex items-start justify-between gap-4 rounded-2xl border border-black/10 bg-[var(--bg)] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF9C3] text-[var(--yellow-dark)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{item.label}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{item.desc}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings[item.key])}
                      onChange={(event) => setSettings((current) => ({ ...current, [item.key]: event.target.checked }))}
                      className="mt-1 h-5 w-5 rounded border-black/20 text-[var(--text-primary)] focus:ring-[var(--yellow)]"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[24px] border border-black/10 bg-[var(--bg-primary)] p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Test notification</h2>
              <p className="mt-1 text-sm leading-6 text-[#64748B]">Send a test push to this device.</p>
            </div>
            <button type="button" onClick={handleTestPush} className="rounded-md bg-[var(--text-primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-black/85">Send test notification</button>
          </div>

          <div className="flex justify-end border-t border-black/10 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-[var(--text-primary)] px-5 py-3 text-sm font-bold text-white hover:bg-black/85 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
