import React from 'react';
import { FileText, Save, History } from 'lucide-react';

type AdminLegalPageProps = {
  mode?: 'editor' | 'export';
  title?: string;
};

export const AdminLegalPage: React.FC<AdminLegalPageProps> = ({ mode = 'editor', title }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {(title || mode === 'export') && (
        <div className="bg-white border border-black/[0.08] rounded-lg p-4">
          <h2 className="font-syne font-bold text-xl text-[#0D0D0D]">{title || 'Legal & Policies'}</h2>
          <p className="text-xs text-[#6B6B6B] font-sans mt-1 uppercase tracking-wider">Mode: {mode}</p>
        </div>
      )}

      {mode === 'export' && (
        <div className="bg-white border border-black/[0.08] rounded-lg p-6">
          <h3 className="font-syne font-bold text-lg text-[#0D0D0D] mb-2">Data Export Console</h3>
          <p className="font-sans text-sm text-[#6B6B6B] mb-4">
            Export legal records, policy revisions, and consent logs for compliance requests.
          </p>
          <button className="px-4 py-2 rounded-lg bg-[#FFD600] text-[#0D0D0D] font-bold text-sm hover:bg-yellow-400 transition-colors">
            Generate Export Package
          </button>
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-64 bg-white border border-black/[0.08] rounded-lg p-4 shrink-0 h-fit space-y-2">
           <h3 className="font-syne font-bold text-sm text-[#6B6B6B] mb-4 uppercase tracking-wider">Documents</h3>
           <button className="w-full text-left px-4 py-2 bg-[#FFD600]/10 text-[#FFD600] rounded-lg font-sans font-bold text-sm border border-[#FFD600]/30 transition-colors">
             Terms of Service
           </button>
           <button className="w-full text-left px-4 py-2 text-[#6B6B6B] hover:bg-black/[0.03] hover:text-[#0D0D0D] rounded-lg font-sans text-sm transition-colors">
             Privacy Policy
           </button>
           <button className="w-full text-left px-4 py-2 text-[#6B6B6B] hover:bg-black/[0.03] hover:text-[#0D0D0D] rounded-lg font-sans text-sm transition-colors">
             Vendor Agreement
           </button>
           <button className="w-full text-left px-4 py-2 text-[#6B6B6B] hover:bg-black/[0.03] hover:text-[#0D0D0D] rounded-lg font-sans text-sm transition-colors">
             Community Guidelines
           </button>
        </div>

        <div className="flex-1 bg-white border border-black/[0.08] rounded-lg p-4 md:p-6 flex flex-col min-h-[500px]">
           <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 pb-4 border-b border-black/[0.08]">
             <div>
               <h2 className="font-syne font-bold text-2xl text-[#0D0D0D] mb-1">Terms of Service</h2>
               <p className="font-sans text-xs text-[#6B6B6B]">Last updated: 14 Oct 2025 by Super Admin</p>
             </div>
             <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
               <button className="flex items-center gap-2 px-4 py-2 bg-[#F7F5F0] text-[#0D0D0D] hover:bg-[#F7F5F0] rounded-lg text-sm font-sans font-bold transition-colors">
                 <History className="w-4 h-4" /> Version History
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-[#FFD600] text-[#0D0D0D] hover:bg-yellow-400 rounded-lg text-sm font-sans font-bold transition-colors">
                 <Save className="w-4 h-4" /> Save Changes
               </button>
             </div>
           </div>

           <textarea 
             className="flex-1 w-full bg-[#FAFAF8] border border-black/10 rounded-lg p-6 text-sm text-[#0D0D0D]/90 focus:border-[#FFD600] focus:outline-none resize-none font-sans leading-relaxed"
             defaultValue={"Welcome to Campus Blink.\n\nBy accessing and using this platform, you agree...\n\n1. Scope of Service\nCampus Blink is provided 'as is' without warranties..."}
           />
        </div>
      </div>

    </div>
  );
};
