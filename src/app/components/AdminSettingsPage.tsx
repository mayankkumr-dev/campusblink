import React, { useEffect, useState } from 'react';
import { 
  Settings2, ShieldBan, Lock, Globe, Database, 
  RefreshCw, Save, AlertTriangle, Key, Power
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { PLATFORM_TOGGLE_ITEMS, getPlatformAccess, updatePlatformAccess } from '../../api/featureAccess';

export const AdminSettingsPage: React.FC = () => {
  const adminProfile = useAuthStore((state) => state.profile);
  const [settings, setSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await getPlatformAccess();
      if (!mounted) return;
      if (error) {
        toast.error(error.message || 'Failed to load settings');
        return;
      }
      setSettings(data || {});
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const maintenanceMode = Boolean(settings.maintenance_mode);
  const newRegistrations = settings.registrations_enabled !== false;

  const handleToggle = (key: string) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleSave = async () => {
    if (!adminProfile?.id) return;
    const loadingToast = toast.loading('Saving platform settings...');
    const { error } = await updatePlatformAccess(adminProfile.id, settings);
    if (error) {
      toast.error(error.message || 'Failed to save settings', { id: loadingToast });
      return;
    }
    toast.success('Platform settings updated.', { id: loadingToast });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Risk Alert if Maintenance Mode is ON */}
      {maintenanceMode && (
        <div className="bg-[#FFD600]/10 border border-[#FFD600]/30 rounded-lg p-4 flex items-start gap-4 animate-in slide-in-from-top-4">
           <AlertTriangle className="w-6 h-6 text-[#FFD600] shrink-0 mt-0.5" />
           <div>
             <h3 className="font-syne font-bold text-[#FFD600] mb-1">Maintenance Mode is Active</h3>
             <p className="font-sans text-sm text-[#0D0D0D]/80">Only Administrators can currently log into the platform. All student apps show a maintenance screen.</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col - Settings Form */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* General Box */}
          <div className="bg-white border border-black/[0.08] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.08]">
               <Globe className="w-5 h-5 text-[#6B6B6B]" />
               <h2 className="font-syne font-bold text-lg text-[#0D0D0D]">General Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans">Platform Name</label>
                 <input type="text" defaultValue="Campus Blink" className="w-full bg-[#FAFAF8] border border-black/10 rounded-lg p-3 text-sm text-[#0D0D0D] focus:border-[#FFD600] focus:outline-none" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans">Support Email</label>
                 <input type="email" defaultValue="contactus.mayank@gmail.com" className="w-full bg-[#FAFAF8] border border-black/10 rounded-lg p-3 text-sm text-[#0D0D0D] focus:border-[#FFD600] focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Access Control Box */}
          <div className="bg-white border border-black/[0.08] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.08]">
               <ShieldBan className="w-5 h-5 text-[#6B6B6B]" />
               <h2 className="font-syne font-bold text-lg text-[#0D0D0D]">Access & Registration Controls</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#F7F5F0] rounded-lg border border-black/[0.08]">
                <div>
                  <h4 className="font-sans font-bold text-[#0D0D0D] mb-1">New Registrations</h4>
                  <p className="font-sans text-xs text-[#6B6B6B]">Allow new users to sign up to the platform</p>
                </div>
                <button 
                  onClick={() => handleToggle('registrations_enabled')}
                  className={`relative inline-flex h-6 w-11 items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD600] focus:ring-offset-2 focus:ring-offset-[#FAFAF8] ${newRegistrations ? 'bg-[#16A34A]' : 'bg-[#333333]'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-md bg-white transition-transform ${newRegistrations ? 'translate-x-3' : '-translate-x-3'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#F7F5F0] rounded-lg border border-black/[0.08]">
                <div>
                  <h4 className="font-sans font-bold text-[#0D0D0D] mb-1 flex items-center gap-2">Maintenance Mode <Power className="w-3.5 h-3.5" /></h4>
                  <p className="font-sans text-xs text-[#6B6B6B]">Locks out non-admins and displays a friendly notice</p>
                </div>
                <button 
                  onClick={() => handleToggle('maintenance_mode')}
                  className={`relative inline-flex h-6 w-11 items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF3D57] focus:ring-offset-2 focus:ring-offset-[#FAFAF8] ${maintenanceMode ? 'bg-[#DC2626]' : 'bg-[#333333]'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-md bg-white transition-transform ${maintenanceMode ? 'translate-x-3' : '-translate-x-3'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Integration Keys Box */}
          <div className="bg-white border border-black/[0.08] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.08]">
               <Key className="w-5 h-5 text-[#6B6B6B]" />
               <h2 className="font-syne font-bold text-lg text-[#0D0D0D]">API Integrations</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans">Payment Gateway Secret</label>
                 <input type="password" value="••••••••••••••••••••••••" readOnly className="w-full bg-[#FAFAF8] border border-black/10 rounded-lg p-3 text-sm text-[#0D0D0D] focus:outline-none opacity-70" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans flex justify-between">
                    SMTP Mail Password 
                    <span className="text-[#0057FF] cursor-pointer hover:underline normal-case tracking-normal text-xs">Test Connection</span>
                 </label>
                 <input type="password" value="••••••••••••••••" readOnly className="w-full bg-[#FAFAF8] border border-black/10 rounded-lg p-3 text-sm text-[#0D0D0D] focus:outline-none opacity-70" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-black/[0.08] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.08]">
               <Settings2 className="w-5 h-5 text-[#6B6B6B]" />
               <h2 className="font-syne font-bold text-lg text-[#0D0D0D]">Feature Toggles</h2>
            </div>

            <div className="space-y-4">
              {PLATFORM_TOGGLE_ITEMS.filter((item) => !['registrations_enabled', 'maintenance_mode'].includes(item.key)).map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-[#F7F5F0] rounded-lg border border-black/[0.08]">
                  <div>
                    <h4 className="font-sans font-bold text-[#0D0D0D] mb-1">{item.label}</h4>
                    <p className="font-sans text-xs text-[#6B6B6B]">Enable or disable this feature across the whole platform.</p>
                  </div>
                  <button
                    onClick={() => handleToggle(item.key)}
                    className={`relative inline-flex h-6 w-11 items-center justify-center rounded-md transition-colors ${settings[item.key] !== false ? 'bg-[#16A34A]' : 'bg-[#333333]'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-md bg-white transition-transform ${settings[item.key] !== false ? 'translate-x-3' : '-translate-x-3'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
             <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-[#FFD600] text-[#0D0D0D] hover:bg-yellow-400 font-sans font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(255,214,0,0.2)]">
               <Save className="w-4 h-4" /> Save Configuration
             </button>
          </div>

        </div>

        {/* Right Col - System Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-black/[0.08] rounded-lg p-6">
             <div className="flex items-center gap-2 mb-6">
               <Database className="w-5 h-5 text-[#6B6B6B]" />
               <h2 className="font-syne font-bold text-lg text-[#0D0D0D]">System Status</h2>
             </div>
             
             <div className="space-y-4">
               <div>
                 <div className="flex justify-between items-center mb-1">
                   <span className="font-sans text-sm text-[#6B6B6B]">Database Usage</span>
                   <span className="font-sans text-xs font-bold text-[#16A34A]">23%</span>
                 </div>
                 <div className="w-full bg-[#F7F5F0] h-2 rounded-md overflow-hidden">
                   <div className="bg-[#16A34A] h-full" style={{ width: '23%' }} />
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-1">
                   <span className="font-sans text-sm text-[#6B6B6B]">Storage Bucket</span>
                   <span className="font-sans text-xs font-bold text-[#FFD600]">68%</span>
                 </div>
                 <div className="w-full bg-[#F7F5F0] h-2 rounded-md overflow-hidden">
                   <div className="bg-[#FFD600] h-full" style={{ width: '68%' }} />
                 </div>
               </div>
               
               <div className="pt-4 mt-4 border-t border-black/[0.08]">
                 <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#F7F5F0] text-[#0D0D0D] hover:bg-[#F7F5F0] rounded-lg text-sm font-sans font-bold transition-colors">
                   <RefreshCw className="w-4 h-4 text-[#6B6B6B]" /> Refresh Analytics
                 </button>
               </div>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
};
