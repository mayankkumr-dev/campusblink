import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import toast from 'react-hot-toast';
import { getPrintShopById, updatePrintShopAvailability, updatePrintShopSchedule } from '../../api/print';
import { createDefaultShopSchedule, normalizeShopSchedule } from '../../lib/shopStatus';

const DAYS = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
];

export const AdminPrintSchedulePage: React.FC = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [schedule, setSchedule] = useState(createDefaultShopSchedule());
  const [override, setOverride] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!shopId) return;
      const { data, error } = await getPrintShopById(shopId);
      if (!mounted) return;
      if (error || !data) {
        toast.error(error?.message || 'Failed to load print schedule');
      } else {
        setShop(data);
        setSchedule(normalizeShopSchedule(data.schedule_json));
        setOverride(data.manual_override_status || null);
      }
      setIsLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [shopId]);

  const saveSchedule = async () => {
    if (!shopId) return;
    setIsSaving(true);
    const loadingToast = toast.loading('Saving print shop schedule...');
    const { data, error } = await updatePrintShopSchedule(shopId, schedule, override);
    if (error) {
      toast.error(error.message || 'Failed to save schedule', { id: loadingToast });
    } else {
      setShop(data);
      toast.success('Print schedule updated.', { id: loadingToast });
    }
    setIsSaving(false);
  };

  const setManualOverride = async (value: string | null) => {
    if (!shopId) return;
    setOverride(value);
    const { data, error } = await updatePrintShopAvailability(shopId, value);
    if (error) {
      toast.error(error.message || 'Failed to update override');
      return;
    }
    setShop(data);
  };

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--yellow)]" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button onClick={() => navigate('/admin/accounts?tab=print')} className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-[var(--bg)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
        <ArrowLeft className="h-4 w-4" /> Back to print shops
      </button>

      <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6">
        <h1 className="font-syne text-2xl font-bold text-[var(--text-primary)]">{shop?.name || 'Print shop'} schedule</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Control opening hours, realtime open status, and force overrides.</p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            { key: null, label: 'Auto from schedule' },
            { key: 'open', label: 'Force open' },
            { key: 'closed', label: 'Force closed' },
          ].map((item) => (
            <button key={String(item.key)} onClick={() => void setManualOverride(item.key)} className={`rounded-lg border px-4 py-3 text-sm font-bold ${override === item.key ? 'border-[var(--yellow)] bg-[var(--yellow-light)] text-[#7C5C00]' : 'border-black/10 bg-[var(--bg-primary)] text-[var(--text-primary)]'}`}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {DAYS.map(([key, label]) => (
            <div key={key} className="grid items-center gap-3 rounded-lg border border-black/10 bg-[var(--bg-primary)] p-4 md:grid-cols-[160px_120px_1fr_1fr]">
              <div className="font-bold text-[var(--text-primary)]">{label}</div>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input type="checkbox" checked={schedule[key]?.enabled} onChange={(event) => setSchedule((current) => ({ ...current, [key]: { ...current[key], enabled: event.target.checked } }))} />
                Enabled
              </label>
              <input type="time" value={schedule[key]?.open || '09:00'} onChange={(event) => setSchedule((current) => ({ ...current, [key]: { ...current[key], open: event.target.value } }))} className="rounded-lg border border-black/10 bg-[var(--bg)] px-3 py-2 text-sm" />
              <input type="time" value={schedule[key]?.close || '18:00'} onChange={(event) => setSchedule((current) => ({ ...current, [key]: { ...current[key], close: event.target.value } }))} className="rounded-lg border border-black/10 bg-[var(--bg)] px-3 py-2 text-sm" />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={saveSchedule} disabled={isSaving} className="rounded-lg bg-[var(--text-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Save schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};