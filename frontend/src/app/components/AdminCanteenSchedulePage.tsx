import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import toast from 'react-hot-toast';
import { getCanteenById, updateCanteenShopAvailability, updateCanteenShopSchedule } from '../../api/canteen';
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

export const AdminCanteenSchedulePage: React.FC = () => {
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
      const { data, error } = await getCanteenById(shopId);
      if (!mounted) return;
      if (error || !data) {
        toast.error(error?.message || 'Failed to load canteen schedule');
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
    const loadingToast = toast.loading('Saving canteen schedule...');
    const { data, error } = await updateCanteenShopSchedule(shopId, schedule, override);
    if (error) {
      toast.error(error.message || 'Failed to save schedule', { id: loadingToast });
    } else {
      setShop(data);
      toast.success('Canteen schedule updated.', { id: loadingToast });
    }
    setIsSaving(false);
  };

  const setManualOverride = async (value: string | null) => {
    if (!shopId) return;
    setOverride(value);
    const { data, error } = await updateCanteenShopAvailability(shopId, value);
    if (error) {
      toast.error(error.message || 'Failed to update override');
      return;
    }
    setShop(data);
  };

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-500 dark:text-amber-400 transition-colors" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button onClick={() => navigate('/admin/accounts?tab=canteens')} className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100">
        <ArrowLeft className="h-4 w-4" /> Back to canteens
      </button>

      <div className="rounded-lg border border-black/[0.08] bg-white p-6">
        <h1 className="font-syne text-2xl font-bold text-slate-900">{shop?.name || 'Canteen'} schedule</h1>
        <p className="mt-1 text-sm text-slate-500">Control opening hours, realtime open status, and force overrides.</p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            { key: null, label: 'Auto from schedule' },
            { key: 'open', label: 'Force open' },
            { key: 'closed', label: 'Force closed' },
          ].map((item) => (
            <button key={String(item.key)} onClick={() => void setManualOverride(item.key)} className={`rounded-lg border px-4 py-3 text-sm font-bold ${override === item.key ? 'border-amber-400 bg-[#FEF3C7] text-[#7C5C00]' : 'border-black/10 bg-slate-50 text-slate-900'}`}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {DAYS.map(([key, label]) => (
            <div key={key} className="grid items-center gap-3 rounded-lg border border-black/10 bg-slate-50 p-4 md:grid-cols-[160px_120px_1fr_1fr]">
              <div className="font-bold text-slate-900">{label}</div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-500">
                <input type="checkbox" checked={schedule[key]?.enabled} onChange={(event) => setSchedule((current) => ({ ...current, [key]: { ...current[key], enabled: event.target.checked } }))} />
                Enabled
              </label>
              <input type="time" value={schedule[key]?.open || '09:00'} onChange={(event) => setSchedule((current) => ({ ...current, [key]: { ...current[key], open: event.target.value } }))} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" />
              <input type="time" value={schedule[key]?.close || '18:00'} onChange={(event) => setSchedule((current) => ({ ...current, [key]: { ...current[key], close: event.target.value } }))} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={saveSchedule} disabled={isSaving} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-500 hover:text-slate-900 disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Save schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};