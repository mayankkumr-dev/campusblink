import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
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
      // Map string rating to integer
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
    <div className="min-h-full bg-[var(--bg-primary)] px-4 py-8 md:px-6 md:py-12 flex justify-center">
      <div className="w-full max-w-lg flex flex-col items-center">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--yellow-dark)] mb-2">GIVE US A HOLLER</p>
        <h1 className="font-syne font-extrabold text-4xl sm:text-5xl text-[var(--text-primary)] mb-2 text-center tracking-tight">
          Hear you loud<br/><span className="text-[#847B4E] italic">& clear.</span>
        </h1>
        <p className="font-sans text-sm text-[var(--text-secondary)] mb-10 text-center max-w-sm leading-relaxed mx-auto">
          Found a glitch? Want a new feature? Tell us about your experience so we can keep making Campus Blink better.
        </p>

        <form onSubmit={handleSubmit} className="w-full bg-[var(--bg)] rounded-3xl p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">Category</label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border-none rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[var(--yellow)]/50 text-[var(--text-primary)] appearance-none cursor-pointer font-medium"
                >
                  <option value="" disabled>Select a topic</option>
                  <option value="bug">Report a Bug</option>
                  <option value="feature">Feature Request</option>
                  <option value="improvement">General Improvement</option>
                  <option value="other">Other</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                className="w-full h-32 bg-[var(--bg-secondary)] border-none rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[var(--yellow)]/50 text-[var(--text-primary)] resize-none font-medium placeholder:text-[#A3A099]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-3 text-center tracking-wider">HOW'S YOUR EXPERIENCE?</label>
              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setRating('bad')}
                  className={`flex-1 py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors ${rating === 'bad' ? 'bg-[var(--yellow)] text-[var(--text-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[#EAE8E3]'}`}
                >
                  <span className="text-2xl">🙁</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Bad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRating('okay')}
                  className={`flex-1 py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors ${rating === 'okay' ? 'bg-[var(--yellow)] text-[var(--text-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[#EAE8E3]'}`}
                >
                  <span className="text-2xl">😐</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Okay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRating('great')}
                  className={`flex-1 py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors ${rating === 'great' ? 'bg-[var(--yellow)] text-[var(--text-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[#EAE8E3]'}`}
                >
                  <span className="text-2xl">🤩</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Great</span>
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading || !category || !message || !rating}
              className="w-full h-[52px] mt-2 bg-[var(--yellow)] text-[var(--text-primary)] rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F5CB00]"
            >
              {loading ? 'Sending...' : 'Send Feedback'} <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-center pt-2">
               <span className="text-[9px] font-bold text-[#A3A099] uppercase tracking-widest leading-relaxed">
                 YOUR FEEDBACK GOES DIRECTLY TO THE CAMPUS BLINK DEV TEAM.
               </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};