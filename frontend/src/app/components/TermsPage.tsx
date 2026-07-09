import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, FileText } from 'lucide-react';

export const TermsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white font-sans p-6 md:p-12 relative overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary/70 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-[#FFFFFF] border border-[#ffffff1a] rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="font-syne font-extrabold text-4xl md:text-5xl">Terms of Service</h1>
        </div>
        <div className="space-y-8 text-text-secondary/70 leading-relaxed font-sans">
          <section className="bg-[#F8F9FF] p-8 rounded-[2rem] border border-[#ffffff0f]">
             <h3 className="text-white font-syne font-bold text-2xl mb-3">1. Be Cool</h3>
             <p>Don't use Campus Blink to bully, harass, or scam your fellow students. If you sell someone a textbook, make sure half the pages aren't missing. Just be a decent human being.</p>
          </section>
          <section className="bg-[#F8F9FF] p-8 rounded-[2rem] border border-[#ffffff0f]">
             <h3 className="text-white font-syne font-bold text-2xl mb-3">2. Market Guidelines</h3>
             <p>Transactions made on the platform are between you and the other party. We just connect you. If someone flakes on a deal, we can't arrest them, but we will ban their account if reported enough.</p>
          </section>
          <section className="bg-[#F8F9FF] p-8 rounded-[2rem] border border-[#ffffff0f]">
             <h3 className="text-white font-syne font-bold text-2xl mb-3">3. Account Ban</h3>
             <p>We reserve the right to ban accounts that violate these core simple rules. Keep the campus vibe positive.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
