import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Zap } from 'lucide-react';

export const AboutPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white font-sans p-6 md:p-12 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--yellow)]/10 rounded-full blur-[100px]" />
      <div className="max-w-3xl mx-auto relative z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary/70 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[var(--yellow)] rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-[var(--text)]" />
          </div>
          <h1 className="font-syne font-extrabold text-4xl md:text-6xl">About Us</h1>
        </div>
        <div className="prose prose-invert prose-lg">
          <p className="text-xl text-text-placeholder leading-relaxed font-syne font-medium">
            Campus Blink was built by students, for students. We got tired of waiting in canteen queues, paying MRP for used books, and navigating scattered WhatsApp groups for important notices.
          </p>
          <p className="text-text-secondary/70 mt-6">
            Our mission is to bring the entirely of your campus life into one unified, blazing-fast app. From ordering a food to finding your next internship—it all happens here.
          </p>
          <div className="mt-12 p-8 bg-[#F8F9FF] border border-[#ffffff1a] rounded-[2rem]">
            <h3 className="font-syne font-bold text-2xl mb-4 text-[var(--yellow)]">Made with way too much chai ☕</h3>
            <p className="text-text-secondary/70 text-sm">We're operating out of hostel rooms and local cafes. Zero sleep, 100% passion.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
