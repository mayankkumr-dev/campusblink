import React, { useState } from 'react';
import { ArrowRight, ChevronDown, MessageSquareHeart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export const StudentFeedbackPage: React.FC = () => {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<'bad' | 'okay' | 'great' | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !message || !rating) {
      toast.error('Please fill out all fields');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setLoading(true);
    
    try {
      let ratingInt = 3;
      if (rating === 'bad') ratingInt = 1;
      else if (rating === 'okay') ratingInt = 2;
      
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        category: category,
        message: message,
        rating: ratingInt,
        status: 'new'
      });
      
      if (error) throw error;
      
      toast.success('Feedback sent successfully. Thanks!');
      navigate('/student/settings');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 md:py-16 flex justify-center font-sans">
      <div className="w-full max-w-[520px] flex flex-col items-center">
        
        <div className="w-16 h-16 rounded-3xl bg-accent-amber-soft text-accent-amber flex items-center justify-center mb-6 shadow-sm border border-amber-100">
           <MessageSquareHeart className="w-8 h-8" />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-amber mb-3">GIVE US A HOLLER</p>
        <h1 className="font-syne font-extrabold text-3xl md:text-5xl text-text-primary mb-3 text-center tracking-tight">
          Hear you loud<br/><span className="text-accent-amber">& clear.</span>
        </h1>
        <p className="text-sm md:text-[15px] text-text-secondary mb-12 text-center max-w-sm leading-relaxed mx-auto">
          Found a glitch? Want a new feature? Tell us about your experience so we can keep making Campus Blink better.
        </p>

        <form onSubmit={handleSubmit} className="w-full bg-surface rounded-[2rem] p-6 sm:p-10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-border-subtle">
          <div className="space-y-6">
            <div>
              <label className="block text-[13px] font-bold text-text-primary mb-2">Category</label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-background border border-border-subtle rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50/50 text-text-primary appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="" disabled>Select a topic</option>
                  <option value="bug">Report a Bug</option>
                  <option value="feature">Feature Request</option>
                  <option value="improvement">General Improvement</option>
                  <option value="other">Other</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary/70">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-text-primary mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                className="w-full h-32 bg-background border border-border-subtle rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50/50 text-text-primary resize-none font-medium placeholder:text-slate-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-secondary/70 mb-4 text-center tracking-widest uppercase">How's your experience?</label>
              <div className="flex justify-between gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={() => setRating('bad')}
                  className={`flex-1 py-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 ${rating === 'bad' ? 'border-rose-400 bg-accent-red/15 shadow-sm' : 'border-border-subtle bg-surface hover:border-slate-300 hover:bg-surface-elevated'}`}
                >
                  <span className="text-3xl filter drop-shadow-sm transition-transform hover:scale-110">🙁</span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${rating === 'bad' ? 'text-accent-red' : 'text-text-secondary'}`}>Bad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRating('okay')}
                  className={`flex-1 py-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 ${rating === 'okay' ? 'border-amber-400 bg-accent-amber-soft shadow-sm' : 'border-border-subtle bg-surface hover:border-slate-300 hover:bg-surface-elevated'}`}
                >
                  <span className="text-3xl filter drop-shadow-sm transition-transform hover:scale-110">😐</span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${rating === 'okay' ? 'text-accent-amber' : 'text-text-secondary'}`}>Okay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRating('great')}
                  className={`flex-1 py-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 ${rating === 'great' ? 'border-emerald-400 bg-accent-green/15 shadow-sm' : 'border-border-subtle bg-surface hover:border-slate-300 hover:bg-surface-elevated'}`}
                >
                  <span className="text-3xl filter drop-shadow-sm transition-transform hover:scale-110">🤩</span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${rating === 'great' ? 'text-accent-green' : 'text-text-secondary'}`}>Great</span>
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading || !category || !message || !rating}
                className="w-full h-14 bg-amber-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_-5px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:bg-amber-600 hover:-translate-y-0.5"
              >
                {loading ? 'Sending...' : 'Send Feedback'} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-center pt-2">
               <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-widest leading-relaxed block max-w-xs mx-auto">
                 YOUR FEEDBACK GOES DIRECTLY TO THE CAMPUS BLINK DEV TEAM.
               </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};