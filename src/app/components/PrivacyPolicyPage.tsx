import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Shield } from 'lucide-react';

export const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-6 md:p-12 relative overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-[#1C1C1C] border border-[#ffffff1a] rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-400" />
          </div>
          <h1 className="font-syne font-extrabold text-4xl md:text-5xl">Privacy Policy</h1>
        </div>
        <div className="space-y-8 text-gray-400 leading-relaxed font-sans">
          <section className="bg-[#141414] p-6 rounded-[2rem] border border-[#ffffff0a]">
             <h3 className="text-white font-syne font-bold text-xl mb-3 flex items-center gap-2"><span className="text-[#FFD600]">1.</span> We respect your data</h3>
             <p className="text-sm">We don't sell your data to sketchy third parties. Whatever happens on Campus Blink stays strictly within your campus network boundaries.</p>
          </section>
          <section className="bg-[#141414] p-6 rounded-[2rem] border border-[#ffffff0a]">
             <h3 className="text-white font-syne font-bold text-xl mb-3 flex items-center gap-2"><span className="text-[#FFD600]">2.</span> What we collect</h3>
             <p className="text-sm">We only collect what's necessary: your college email (to verify you actually go there), your basic profile info, and your order history so the canteen doesn't lose your order.</p>
          </section>
          <section className="bg-[#141414] p-6 rounded-[2rem] border border-[#ffffff0a]">
             <h3 className="text-white font-syne font-bold text-xl mb-3 flex items-center gap-2"><span className="text-[#FFD600]">3.</span> Anonymity</h3>
             <p className="text-sm">When you post anonymously in the community section, it's actually anonymous. We don't link your identity to your confessions.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
