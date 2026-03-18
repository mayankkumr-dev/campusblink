import React from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router';

export function AccessDenied({ feature = 'this feature' }: { feature?: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-[28px] border border-black/10 bg-white p-8 text-center shadow-[0_16px_40px_rgba(13,13,13,0.08)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F4F0] text-[#6B6B6B]">
          <Lock className="h-10 w-10" />
        </div>
        <h2 className="font-syne text-3xl font-extrabold text-[#0D0D0D]">Access Restricted</h2>
        <p className="mt-3 text-sm leading-6 text-[#6B6B6B]">You do not have access to {feature} right now.</p>
        <p className="mt-1 text-sm leading-6 text-[#6B6B6B]">Contact an admin if you think this is a mistake.</p>
        <button
          type="button"
          onClick={() => navigate('/student/home')}
          className="mt-6 rounded-md bg-[#0D0D0D] px-5 py-3 text-sm font-bold text-white hover:bg-[#FFD600] hover:text-[#0D0D0D]"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
