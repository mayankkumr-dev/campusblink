import React, { useEffect, useState } from 'react';
import {
  Settings2, ShieldBan, Lock, Globe, Database,
  RefreshCw, Save, AlertTriangle, Key, Power, Loader2, Check, Moon, Sun
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { PLATFORM_TOGGLE_ITEMS, getPlatformAccess, updatePlatformAccess } from '../../api/featureAccess';
import { useTheme } from 'next-themes';

/* ── Toggle switch component ─────────────────────────────── */
const Toggle = ({
  checked,
  onChange,
  danger = false,
}: {
  checked: boolean;
  onChange: () => void;
  danger?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-admin-bg-surface ${
      checked
        ? danger
          ? 'bg-rose-500 focus-visible:ring-rose-400'
          : 'bg-emerald-500 focus-visible:ring-emerald-400'
        : 'bg-slate-300 dark:bg-admin-bg-surface-raised focus-visible:ring-slate-400 dark:focus-visible:ring-admin-border-strong'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

/* ── Setting row ──────────────────────────────────────────── */
const SettingRow = ({
  label,
  description,
  checked,
  onChange,
  danger = false,
  badge,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  danger?: boolean;
  badge?: string;
}) => (
  <div className={`flex items-center justify-between gap-3 md:gap-4 rounded-xl border p-3 md:p-4 transition-all ${
    danger && checked ? 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10' : 'border-slate-200 bg-slate-50 hover:bg-white dark:border-admin-border-subtle dark:bg-admin-bg-surface-raised dark:hover:bg-admin-bg-surface-hover'
  }`}>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <h4 className="font-semibold text-[12px] md:text-[13px] text-slate-900 dark:text-admin-text-primary">{label}</h4>
        {badge && (
          <span className={`rounded-full border px-1.5 py-0.5 md:px-2 md:py-0.5 text-[8px] md:text-[9px] font-bold uppercase tracking-wider ${
            danger && checked ? 'border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400' : 'border-slate-200 bg-white text-slate-500 dark:border-admin-border-subtle dark:bg-admin-bg-surface dark:text-admin-text-secondary'
          }`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[10px] md:text-xs text-slate-400 dark:text-admin-text-tertiary leading-tight">{description}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} danger={danger} />
  </div>
);

export const AdminSettingsPage: React.FC = () => {
  const adminProfile = useAuthStore((state) => state.profile);
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let isSubscribed = true;
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await getPlatformAccess();
      if (!isSubscribed) return;
      if (error) {
        toast.error(error.message || 'Failed to load settings');
      } else {
        setSettings(data || {});
      }
      setIsLoading(false);
    };
    load();
    return () => { isSubscribed = false; };
  }, []);

  const maintenanceMode = Boolean(settings.maintenance_mode);
  const newRegistrations = settings.registrations_enabled !== false;

  const handleToggle = (key: string) => {
    setSettings(current => ({ ...current, [key]: !current[key] }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!adminProfile?.id) return;
    setIsSaving(true);
    const { error } = await updatePlatformAccess(adminProfile.id, settings);
    if (error) {
      toast.error(error.message || 'Failed to save settings');
    } else {
      toast.success('Platform settings saved successfully');
      setIsDirty(false);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 transition-colors">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-admin-bg-surface-raised transition-colors">
            <Settings2 className="h-4.5 w-4.5 text-slate-600 dark:text-admin-text-primary transition-colors" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">Platform Settings</h2>
            <p className="text-xs text-slate-400 dark:text-admin-text-secondary transition-colors">Configure global platform access and feature flags</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all ${
            isDirty
              ? 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600 dark:bg-admin-accent dark:text-admin-bg-surface-elevated dark:shadow-none'
              : 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-admin-bg-surface-raised dark:border-admin-border-subtle dark:text-admin-text-tertiary dark:shadow-none cursor-not-allowed'
          } disabled:opacity-50`}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving…' : isDirty ? 'Save Changes' : 'All Saved'}
        </button>
      </div>

      {/* Maintenance mode warning banner */}
      {maintenanceMode && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-admin-accent-soft-bg p-4 shadow-sm dark:shadow-none transition-colors">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5 transition-colors" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-admin-text-primary transition-colors">Maintenance Mode is Active</h3>
            <p className="text-sm text-amber-700 dark:text-admin-text-secondary mt-0.5 transition-colors">
              Only administrators can access the platform. All student and professor sessions show a maintenance screen.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column — Settings */}
        <div className="lg:col-span-8 space-y-5">

          {/* General Information */}
          <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
              <Globe className="h-4 w-4 text-slate-500 dark:text-admin-text-secondary transition-colors" />
              <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">General Information</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary transition-colors">Platform Name</label>
                <input
                  type="text"
                  defaultValue="Campus Blink"
                  className="w-full rounded-xl border border-slate-200 dark:border-admin-border-strong bg-slate-50 dark:bg-admin-bg-surface-raised px-4 py-2.5 text-sm text-slate-900 dark:text-admin-text-primary focus:border-amber-400 dark:focus:border-admin-accent focus:bg-white dark:focus:bg-admin-bg-surface focus:ring-2 focus:ring-amber-100 dark:focus:ring-admin-accent/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary transition-colors">Support Email</label>
                <input
                  type="email"
                  defaultValue="contactus.mayank@gmail.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-admin-border-strong bg-slate-50 dark:bg-admin-bg-surface-raised px-4 py-2.5 text-sm text-slate-900 dark:text-admin-text-primary focus:border-amber-400 dark:focus:border-admin-accent focus:bg-white dark:focus:bg-admin-bg-surface focus:ring-2 focus:ring-amber-100 dark:focus:ring-admin-accent/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Appearance Panel */}
          <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
              <Sun className="h-4 w-4 text-slate-500 dark:text-admin-text-secondary dark:hidden transition-colors" />
              <Moon className="h-4 w-4 text-slate-500 dark:text-admin-text-secondary hidden dark:block transition-colors" />
              <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">Appearance</h3>
            </div>
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-[13px] text-slate-900 dark:text-admin-text-primary mb-0.5">Theme Preference</h4>
                <p className="text-xs text-slate-400 dark:text-admin-text-tertiary">Choose how Campus Blink looks on this device.</p>
              </div>
              <div className="flex p-1 bg-slate-100 dark:bg-admin-bg-surface-raised rounded-xl border border-slate-200 dark:border-admin-border-subtle self-start sm:self-auto shrink-0 w-full sm:w-auto">
                {['light', 'dark', 'system'].map((t) => {
                  const isActive = mounted && theme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg capitalize transition-colors ${
                        isActive 
                          ? 'bg-amber-500 text-white shadow-sm dark:bg-admin-accent dark:text-admin-bg-surface-elevated dark:shadow-none' 
                          : 'text-slate-500 hover:text-slate-900 dark:text-admin-text-secondary dark:hover:text-admin-text-primary'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Access & Registration */}
          <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
              <ShieldBan className="h-4 w-4 text-slate-500 dark:text-admin-text-secondary transition-colors" />
              <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">Access &amp; Registration Controls</h3>
            </div>
            <div className="p-3 md:p-5 space-y-2 md:space-y-3">
              <SettingRow
                label="New Registrations"
                description="Allow new users to sign up to the platform via the registration flow"
                checked={newRegistrations}
                onChange={() => handleToggle('registrations_enabled')}
                badge={newRegistrations ? 'Open' : 'Closed'}
              />
              <SettingRow
                label="Maintenance Mode"
                description="Locks out all non-admin users and displays a maintenance screen"
                checked={maintenanceMode}
                onChange={() => handleToggle('maintenance_mode')}
                danger
                badge={maintenanceMode ? 'ACTIVE' : 'Off'}
              />
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
              <Settings2 className="h-4 w-4 text-slate-500 dark:text-admin-text-secondary transition-colors" />
              <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">Feature Toggles</h3>
              <span className="ml-auto text-[10px] font-bold text-slate-400 dark:text-admin-text-tertiary uppercase tracking-wider transition-colors">
                Global Feature Flags
              </span>
            </div>
            <div className="p-3 md:p-5 space-y-2 md:space-y-3">
              {PLATFORM_TOGGLE_ITEMS
                .filter(item => !['registrations_enabled', 'maintenance_mode'].includes(item.key))
                .map(item => (
                  <SettingRow
                    key={item.key}
                    label={item.label}
                    description={`Enable or disable ${item.label.toLowerCase()} across the entire platform`}
                    checked={settings[item.key] !== false}
                    onChange={() => handleToggle(item.key)}
                  />
                ))
              }
            </div>
          </div>

          {/* API Keys (read-only display) */}
          <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
              <Key className="h-4 w-4 text-slate-500 dark:text-admin-text-secondary transition-colors" />
              <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">API &amp; Integrations</h3>
              <span className="ml-auto text-[10px] font-semibold text-slate-400 dark:text-admin-text-tertiary transition-colors">Managed via .env</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary transition-colors">Supabase Connection</label>
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2.5 transition-colors">
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 transition-colors" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium transition-colors">Connected · Supabase Postgres</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary transition-colors">Payment Gateway Secret</label>
                <input
                  type="password"
                  value="••••••••••••••••••••••••"
                  readOnly
                  className="w-full rounded-xl border border-slate-200 dark:border-admin-border-strong bg-slate-100 dark:bg-admin-bg-surface-raised px-4 py-2.5 text-sm text-slate-500 dark:text-admin-text-secondary outline-none cursor-not-allowed transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary flex justify-between transition-colors">
                  <span>SMTP Mail Password</span>
                  <span className="text-amber-600 dark:text-admin-accent cursor-pointer hover:underline normal-case tracking-normal text-xs font-semibold transition-colors">Test Connection</span>
                </label>
                <input
                  type="password"
                  value="••••••••••••••••"
                  readOnly
                  className="w-full rounded-xl border border-slate-200 dark:border-admin-border-strong bg-slate-100 dark:bg-admin-bg-surface-raised px-4 py-2.5 text-sm text-slate-500 dark:text-admin-text-secondary outline-none cursor-not-allowed transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Save footer */}
          {isDirty && (
            <div className="flex items-center justify-between rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-admin-accent-soft-bg px-5 py-3.5 shadow-sm dark:shadow-none transition-colors">
              <p className="text-sm text-amber-700 dark:text-admin-text-primary font-medium transition-colors">You have unsaved changes</p>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 dark:bg-admin-accent px-5 py-2 text-sm font-bold text-white dark:text-admin-bg-surface-elevated hover:bg-amber-600 disabled:opacity-60 transition-all"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Configuration
              </button>
            </div>
          )}
        </div>

        {/* Right Column — System Status */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
              <Database className="h-4 w-4 text-slate-500 dark:text-admin-text-secondary transition-colors" />
              <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">System Status</h3>
            </div>
            <div className="p-5 space-y-5">
              {[
                { label: 'Database Usage', value: 23, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                { label: 'Storage Bucket', value: 68, color: 'bg-amber-500', textColor: 'text-amber-600' },
                { label: 'Edge Functions', value: 12, color: 'bg-blue-500', textColor: 'text-blue-600' },
              ].map(({ label, value, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1 md:mb-1.5">
                    <span className="text-[11px] md:text-[12px] font-medium text-slate-500 dark:text-admin-text-secondary">{label}</span>
                    <span className={`text-[9px] md:text-[11px] font-extrabold ${textColor}`}>{value}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-admin-bg-surface-raised h-[3px] md:h-1.5 rounded-full overflow-hidden transition-colors">
                    <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-slate-100 dark:border-admin-border-subtle transition-colors">
                <div className="space-y-2 text-[12px]">
                  {[
                    { label: 'Environment', value: 'Production' },
                    { label: 'Version', value: 'v2.5.0' },
                    { label: 'Region', value: 'ap-south-1' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-400 dark:text-admin-text-tertiary">{label}</span>
                      <span className="font-semibold text-slate-700 dark:text-admin-text-primary">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-admin-border-strong bg-slate-50 dark:bg-admin-bg-surface-raised px-4 py-2 text-xs font-semibold text-slate-600 dark:text-admin-text-primary hover:bg-white dark:hover:bg-admin-bg-surface-hover transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh System Status
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-surface-raised transition-colors">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary transition-colors">Quick Actions</h3>
            </div>
            <div className="p-3 space-y-1">
              {[
                { label: 'View Audit Log', href: '/admin/audit' },
                { label: 'Data Export', href: '/admin/legal/export' },
                { label: 'Smart Alerts', href: '/admin/alerts' },
                { label: 'Contact Issues', href: '/admin/contact-issues' },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="block rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-600 dark:text-admin-text-secondary hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover hover:text-slate-900 dark:hover:text-admin-text-primary transition-colors"
                >
                  {label} →
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
