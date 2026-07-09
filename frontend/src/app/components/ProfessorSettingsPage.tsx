import React, { useState } from 'react';
import { LogOut, Shield, KeyRound, MessageSquare, Megaphone, ChevronDown, ChevronRight, Sun, CheckCircle2, Eye, EyeOff, Check, ArrowRight, ShieldCheck, MessageSquareHeart } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { signOut } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

export const ProfessorSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, profile, user } = useAuthStore();
  const isNoticeAdmin = Boolean(profile?.is_notice_admin) || profile?.role === 'admin';

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Feedback State
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<'bad' | 'okay' | 'great' | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const handleLogout = async () => {
    const toastId = toast.loading('Logging you out...');
    try {
      await signOut();
      setAuth(null, null);
      toast.success('Logged out successfully.', { id: toastId });
      navigate('/');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to log out.', { id: toastId });
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Passwords do not match or are empty');
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message || 'Failed to update password');
    } else {
      toast.success('Password updated successfully. Logging out from all devices...');
      await supabase.auth.signOut({ scope: 'global' }).catch(() => supabase.auth.signOut());
    }
    setPasswordLoading(false);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackCategory || !feedbackMessage || !feedbackRating) {
      toast.error('Please fill out all fields');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setFeedbackLoading(true);
    try {
      let ratingInt = 3;
      if (feedbackRating === 'bad') ratingInt = 1;
      else if (feedbackRating === 'okay') ratingInt = 2;
      
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        category: feedbackCategory,
        message: feedbackMessage,
        rating: ratingInt,
        status: 'new'
      });
      
      if (error) throw error;
      
      toast.success('Feedback sent successfully. Thanks!');
      setExpandedSection(null);
      setFeedbackCategory('');
      setFeedbackMessage('');
      setFeedbackRating(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const has8Chars = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-8 md:px-8 md:py-12 font-sans">
      <div className="mx-auto max-w-[800px]">
        <div className="mb-10 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Preferences</p>
          <h1 className="font-syne text-4xl font-extrabold text-gray-900 tracking-tight">Account Settings</h1>
          <p className="text-sm text-gray-500 font-medium mt-2">Manage your faculty account, security, and broadcast permissions.</p>
        </div>

        <div className="space-y-4">
          
          {/* Notice Admin Module */}
          {isNoticeAdmin && (
            <Link to="/professor/settings/notice-admin" className="group flex items-center justify-between p-6 sm:p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 shadow-[0_4px_20px_rgba(59,130,246,0.05)] hover:bg-blue-50 hover:shadow-[0_8px_30px_rgba(59,130,246,0.1)] transition-all duration-300">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_15px_rgba(37,99,235,0.3)] group-hover:scale-110 transition-transform">
                  <Megaphone className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <h2 className="font-syne text-xl font-bold text-blue-900">Notice Admin</h2>
                     <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">AUTHORIZED</span>
                  </div>
                  <p className="text-sm text-blue-700/80 font-medium max-w-md">Broadcast official announcements directly to the student-facing campus notice boards.</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-blue-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </Link>
          )}

          {/* Unified Settings Accordion */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] overflow-hidden">
            
            {/* Appearance Section */}
            <div className="border-b border-gray-100">
              <button 
                onClick={() => toggleSection('appearance')}
                className="w-full group flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Sun className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-gray-900 mb-0.5">Appearance</h2>
                    <p className="text-sm text-gray-500 font-medium">Theme configuration and interface controls.</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-transform flex-shrink-0 ${expandedSection === 'appearance' ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedSection === 'appearance' ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 sm:p-8 pt-0 bg-gray-50/50">
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Light Mode</h3>
                      <p className="text-xs text-gray-500 mt-1">Campus Blink is permanently optimized for professional light-mode.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2.5} /> Enforced
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="border-b border-gray-100">
              <button 
                onClick={() => toggleSection('password')}
                className="w-full group flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <KeyRound className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-gray-900 mb-0.5">Change Password</h2>
                    <p className="text-sm text-gray-500 font-medium">Update your digital key to keep your faculty account secure.</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-transform flex-shrink-0 ${expandedSection === 'password' ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedSection === 'password' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 sm:p-8 pt-0 bg-gray-50/50">
                  <form onSubmit={handlePasswordUpdate} className="bg-white rounded-[1.5rem] p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-[#FAFAFA] border border-gray-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-gray-900 transition-all placeholder:text-gray-400"
                        />
                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          {showCurrent ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-[#FAFAFA] border border-gray-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-gray-900 transition-all placeholder:text-gray-400"
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          {showNew ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-[#FAFAFA] border border-gray-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-gray-900 transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50">
                      <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-4 block">Password Requirements</span>
                      <div className="flex flex-col gap-3">
                        <div className={`flex items-center gap-3 text-[13px] font-bold transition-colors ${has8Chars ? 'text-emerald-600' : 'text-gray-500'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${has8Chars ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                            <Check className="w-3 h-3" />
                          </div>
                          8+ characters
                        </div>
                        <div className={`flex items-center gap-3 text-[13px] font-bold transition-colors ${hasNumber ? 'text-emerald-600' : 'text-gray-500'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${hasNumber ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                            <Check className="w-3 h-3" />
                          </div>
                          Contains at least 1 number
                        </div>
                        <div className={`flex items-center gap-3 text-[13px] font-bold transition-colors ${hasSpecial ? 'text-emerald-600' : 'text-gray-500'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${hasSpecial ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                            <Check className="w-3 h-3" />
                          </div>
                          Contains 1 special symbol
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={passwordLoading || !has8Chars || !hasNumber || !hasSpecial || newPassword !== confirmPassword}
                      className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:bg-blue-700 hover:-translate-y-0.5"
                    >
                      {passwordLoading ? 'Processing...' : 'Update Password'} <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Send Feedback Section */}
            <div>
              <button 
                onClick={() => toggleSection('feedback')}
                className="w-full group flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquareHeart className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-gray-900 mb-0.5">Send Feedback</h2>
                    <p className="text-sm text-gray-500 font-medium">Found a glitch or want a new feature? Tell us about it.</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-transform flex-shrink-0 ${expandedSection === 'feedback' ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedSection === 'feedback' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 sm:p-8 pt-0 bg-gray-50/50">
                  <form onSubmit={handleFeedbackSubmit} className="bg-white rounded-[1.5rem] p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 mb-2">Category</label>
                      <div className="relative">
                        <select 
                          value={feedbackCategory}
                          onChange={(e) => setFeedbackCategory(e.target.value)}
                          className="w-full bg-[#FAFAFA] border border-gray-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 text-gray-900 appearance-none cursor-pointer font-medium transition-all"
                        >
                          <option value="" disabled>Select a topic</option>
                          <option value="bug">Report a Bug</option>
                          <option value="feature">Feature Request</option>
                          <option value="improvement">General Improvement</option>
                          <option value="other">Other</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 mb-2">Message</label>
                      <textarea
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Tell us what's on your mind..."
                        className="w-full h-32 bg-[#FAFAFA] border border-gray-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 text-gray-900 resize-none font-medium placeholder:text-gray-400 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-4 text-center tracking-widest uppercase">How's your experience?</label>
                      <div className="flex justify-between gap-3 md:gap-4">
                        <button
                          type="button"
                          onClick={() => setFeedbackRating('bad')}
                          className={`flex-1 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${feedbackRating === 'bad' ? 'border-red-400 bg-red-50 shadow-sm' : 'border-gray-200 bg-[#FAFAFA] hover:border-gray-300'}`}
                        >
                          <span className="text-2xl transition-transform hover:scale-110">🙁</span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${feedbackRating === 'bad' ? 'text-red-500' : 'text-gray-500'}`}>Bad</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackRating('okay')}
                          className={`flex-1 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${feedbackRating === 'okay' ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-gray-200 bg-[#FAFAFA] hover:border-gray-300'}`}
                        >
                          <span className="text-2xl transition-transform hover:scale-110">😐</span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${feedbackRating === 'okay' ? 'text-amber-500' : 'text-gray-500'}`}>Okay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackRating('great')}
                          className={`flex-1 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${feedbackRating === 'great' ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-gray-200 bg-[#FAFAFA] hover:border-gray-300'}`}
                        >
                          <span className="text-2xl transition-transform hover:scale-110">🤩</span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${feedbackRating === 'great' ? 'text-emerald-500' : 'text-gray-500'}`}>Great</span>
                        </button>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={feedbackLoading || !feedbackCategory || !feedbackMessage || !feedbackRating}
                      className="w-full h-14 bg-amber-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:bg-amber-600 hover:-translate-y-0.5"
                    >
                      {feedbackLoading ? 'Sending...' : 'Send Feedback'} <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>

          </div>

          {/* Log Off Button */}
          <div className="pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white border border-red-100 px-6 py-4 text-sm font-bold text-red-500 transition-all hover:bg-red-50 shadow-[0_4px_20px_-5px_rgba(239,68,68,0.1)] active:scale-[0.98]"
            >
              <LogOut className="h-5 w-5" strokeWidth={2.5} /> Log off session
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};
