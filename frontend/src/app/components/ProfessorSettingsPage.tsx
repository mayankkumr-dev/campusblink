import React, { useState } from 'react';
import { LogOut, Shield, KeyRound, MessageSquare, Megaphone, ChevronDown, ChevronRight, Sun, Moon, CheckCircle2, Eye, EyeOff, Check, ArrowRight, ShieldCheck, MessageSquareHeart, Monitor } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import toast from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { supabase } from '../../lib/supabase';
import { signOut } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

export const ProfessorSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, profile, user } = useAuthStore();
  const { theme, setTheme } = useTheme();
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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-prof-bg-base px-4 py-8 md:px-8 md:py-12 font-sans transition-colors duration-200">
      <div className="mx-auto max-w-[800px]">
        <div className="mb-10 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-prof-text-secondary mb-3">Preferences</p>
          <h1 className="font-syne text-4xl font-extrabold text-gray-900 dark:text-prof-text-primary tracking-tight">Account Settings</h1>
          <p className="text-sm text-gray-500 dark:text-prof-text-secondary font-medium mt-2">Manage your faculty account, security, and broadcast permissions.</p>
        </div>

        <div className="space-y-4">
          
          {/* Notice Admin Module */}
          {isNoticeAdmin && (
            <Link to="/professor/settings/notice-admin" className="group flex items-center justify-between p-6 sm:p-8 bg-blue-50/50 dark:bg-prof-accent-blue-soft-bg rounded-[2rem] border border-blue-100 dark:border-prof-accent-blue/30 shadow-[0_4px_20px_rgba(59,130,246,0.05)] dark:shadow-none hover:bg-blue-50 dark:hover:bg-prof-accent-blue/20 transition-all duration-300">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 dark:bg-prof-accent-blue text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_15px_rgba(37,99,235,0.3)] dark:shadow-none group-hover:scale-110 transition-transform">
                  <Megaphone className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <h2 className="font-syne text-xl font-bold text-blue-900 dark:text-prof-text-primary">Notice Admin</h2>
                     <span className="bg-blue-100 dark:bg-prof-bg-surface text-blue-700 dark:text-prof-accent-blue text-[10px] font-bold px-2 py-0.5 rounded-full">AUTHORIZED</span>
                  </div>
                  <p className="text-sm text-blue-700/80 dark:text-prof-text-secondary font-medium max-w-md">Broadcast official announcements directly to the student-facing campus notice boards.</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-blue-300 dark:text-prof-accent-blue/50 group-hover:text-blue-600 dark:group-hover:text-prof-accent-blue transition-colors flex-shrink-0" />
            </Link>
          )}

          {/* Unified Settings Accordion */}
          <div className="bg-white dark:bg-prof-bg-surface rounded-[2rem] border border-gray-100 dark:border-prof-border-subtle shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
            
            {/* Appearance Section */}
            <div className="border-b border-gray-100 dark:border-prof-border-subtle">
              <button 
                onClick={() => toggleSection('appearance')}
                className="w-full group flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 dark:hover:bg-prof-bg-surface-hover transition-colors text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-prof-accent-amber/15 text-amber-500 dark:text-prof-accent-amber border border-amber-100 dark:border-prof-accent-amber/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    {theme === 'dark' ? <Moon className="w-5 h-5" strokeWidth={1.5} /> : <Sun className="w-5 h-5" strokeWidth={1.5} />}
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-gray-900 dark:text-prof-text-primary mb-0.5">Appearance</h2>
                    <p className="text-sm text-gray-500 dark:text-prof-text-secondary font-medium">Theme configuration and interface controls.</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-300 dark:text-prof-text-tertiary group-hover:text-gray-500 dark:group-hover:text-prof-text-primary transition-transform flex-shrink-0 ${expandedSection === 'appearance' ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedSection === 'appearance' ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 sm:p-8 pt-0 bg-gray-50/50 dark:bg-transparent">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-prof-bg-surface-raised border border-gray-200 dark:border-prof-border-subtle rounded-2xl p-5 shadow-sm dark:shadow-none">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-prof-text-primary">Theme Options</h3>
                      <p className="text-xs text-gray-500 dark:text-prof-text-secondary mt-1">Select your preferred interface mode.</p>
                    </div>
                    <div className="flex p-1 bg-[#FAFAFA] dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong rounded-xl w-full md:w-auto self-start md:self-auto shrink-0">
                      {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-lg capitalize transition-colors ${
                            theme === t.id ? 'bg-blue-600 dark:bg-prof-accent-blue text-white shadow-sm' : 'text-gray-500 dark:text-prof-text-secondary hover:text-gray-900 dark:hover:text-prof-text-primary'
                          }`}
                        >
                          <t.icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="border-b border-gray-100 dark:border-prof-border-subtle">
              <button 
                onClick={() => toggleSection('password')}
                className="w-full group flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 dark:hover:bg-prof-bg-surface-hover transition-colors text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-prof-accent-blue-soft-bg text-blue-500 dark:text-prof-accent-blue border border-blue-100 dark:border-prof-accent-blue/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <KeyRound className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-gray-900 dark:text-prof-text-primary mb-0.5">Change Password</h2>
                    <p className="text-sm text-gray-500 dark:text-prof-text-secondary font-medium">Update your digital key to keep your faculty account secure.</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-300 dark:text-prof-text-tertiary group-hover:text-gray-500 dark:group-hover:text-prof-text-primary transition-transform flex-shrink-0 ${expandedSection === 'password' ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedSection === 'password' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 sm:p-8 pt-0 bg-gray-50/50 dark:bg-transparent">
                  <form onSubmit={handlePasswordUpdate} className="bg-white dark:bg-prof-bg-surface-raised rounded-[1.5rem] p-6 sm:p-8 border border-gray-200 dark:border-prof-border-subtle shadow-sm dark:shadow-none space-y-6">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 dark:text-prof-text-primary mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-[#FAFAFA] dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 dark:focus:border-prof-accent-blue focus:ring-4 focus:ring-blue-50 dark:focus:ring-prof-accent-blue/10 text-gray-900 dark:text-prof-text-primary transition-all placeholder:text-gray-400 dark:placeholder:text-prof-text-tertiary"
                        />
                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-prof-text-secondary hover:text-gray-600 dark:hover:text-prof-text-primary transition-colors">
                          {showCurrent ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 dark:text-prof-text-primary mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-[#FAFAFA] dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 dark:focus:border-prof-accent-blue focus:ring-4 focus:ring-blue-50 dark:focus:ring-prof-accent-blue/10 text-gray-900 dark:text-prof-text-primary transition-all placeholder:text-gray-400 dark:placeholder:text-prof-text-tertiary"
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-prof-text-secondary hover:text-gray-600 dark:hover:text-prof-text-primary transition-colors">
                          {showNew ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 dark:text-prof-text-primary mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-[#FAFAFA] dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 dark:focus:border-prof-accent-blue focus:ring-4 focus:ring-blue-50 dark:focus:ring-prof-accent-blue/10 text-gray-900 dark:text-prof-text-primary transition-all placeholder:text-gray-400 dark:placeholder:text-prof-text-tertiary"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50/50 dark:bg-prof-accent-blue-soft-bg rounded-2xl p-5 border border-blue-100/50 dark:border-prof-accent-blue/20">
                      <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-prof-text-tertiary tracking-wider mb-4 block">Password Requirements</span>
                      <div className="flex flex-col gap-3">
                        <div className={`flex items-center gap-3 text-[13px] font-bold transition-colors ${has8Chars ? 'text-emerald-600 dark:text-prof-accent-green' : 'text-gray-500 dark:text-prof-text-secondary'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${has8Chars ? 'bg-emerald-100 dark:bg-prof-accent-green-soft-bg text-emerald-600 dark:text-prof-accent-green' : 'bg-gray-200 dark:bg-prof-bg-surface text-gray-400 dark:text-prof-text-tertiary'}`}>
                            <Check className="w-3 h-3" />
                          </div>
                          8+ characters
                        </div>
                        <div className={`flex items-center gap-3 text-[13px] font-bold transition-colors ${hasNumber ? 'text-emerald-600 dark:text-prof-accent-green' : 'text-gray-500 dark:text-prof-text-secondary'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${hasNumber ? 'bg-emerald-100 dark:bg-prof-accent-green-soft-bg text-emerald-600 dark:text-prof-accent-green' : 'bg-gray-200 dark:bg-prof-bg-surface text-gray-400 dark:text-prof-text-tertiary'}`}>
                            <Check className="w-3 h-3" />
                          </div>
                          Contains at least 1 number
                        </div>
                        <div className={`flex items-center gap-3 text-[13px] font-bold transition-colors ${hasSpecial ? 'text-emerald-600 dark:text-prof-accent-green' : 'text-gray-500 dark:text-prof-text-secondary'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${hasSpecial ? 'bg-emerald-100 dark:bg-prof-accent-green-soft-bg text-emerald-600 dark:text-prof-accent-green' : 'bg-gray-200 dark:bg-prof-bg-surface text-gray-400 dark:text-prof-text-tertiary'}`}>
                            <Check className="w-3 h-3" />
                          </div>
                          Contains 1 special symbol
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={passwordLoading || !has8Chars || !hasNumber || !hasSpecial || newPassword !== confirmPassword}
                      className="w-full h-14 bg-blue-600 dark:bg-prof-accent-blue text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md dark:shadow-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:bg-blue-700 dark:hover:bg-blue-500 hover:-translate-y-0.5"
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
                className="w-full group flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 dark:hover:bg-prof-bg-surface-hover transition-colors text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-prof-accent-orange/15 text-amber-500 dark:text-prof-accent-orange border border-amber-100 dark:border-prof-accent-orange/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquareHeart className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-gray-900 dark:text-prof-text-primary mb-0.5">Send Feedback</h2>
                    <p className="text-sm text-gray-500 dark:text-prof-text-secondary font-medium">Found a glitch or want a new feature? Tell us about it.</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-300 dark:text-prof-text-tertiary group-hover:text-gray-500 dark:group-hover:text-prof-text-primary transition-transform flex-shrink-0 ${expandedSection === 'feedback' ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedSection === 'feedback' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 sm:p-8 pt-0 bg-gray-50/50 dark:bg-transparent">
                  <form onSubmit={handleFeedbackSubmit} className="bg-white dark:bg-prof-bg-surface-raised rounded-[1.5rem] p-6 sm:p-8 border border-gray-200 dark:border-prof-border-subtle shadow-sm dark:shadow-none space-y-6">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 dark:text-prof-text-primary mb-2">Category</label>
                      <div className="relative">
                        <select 
                          value={feedbackCategory}
                          onChange={(e) => setFeedbackCategory(e.target.value)}
                          className="w-full bg-[#FAFAFA] dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 dark:focus:border-prof-accent-orange focus:ring-4 focus:ring-amber-50 dark:focus:ring-prof-accent-orange/10 text-gray-900 dark:text-prof-text-primary appearance-none cursor-pointer font-medium transition-all"
                        >
                          <option value="" disabled>Select a topic</option>
                          <option value="bug">Report a Bug</option>
                          <option value="feature">Feature Request</option>
                          <option value="improvement">General Improvement</option>
                          <option value="other">Other</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-prof-text-tertiary">
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-gray-900 dark:text-prof-text-primary mb-2">Message</label>
                      <textarea
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Tell us what's on your mind..."
                        className="w-full h-32 bg-[#FAFAFA] dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 dark:focus:border-prof-accent-orange focus:ring-4 focus:ring-amber-50 dark:focus:ring-prof-accent-orange/10 text-gray-900 dark:text-prof-text-primary resize-none font-medium placeholder:text-gray-400 dark:placeholder:text-prof-text-tertiary transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-prof-text-tertiary mb-4 text-center tracking-widest uppercase">How's your experience?</label>
                      <div className="flex justify-between gap-3 md:gap-4">
                        <button
                          type="button"
                          onClick={() => setFeedbackRating('bad')}
                          className={`flex-1 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${feedbackRating === 'bad' ? 'border-red-400 dark:border-prof-accent-red bg-red-50 dark:bg-prof-accent-red/10 shadow-sm dark:shadow-none' : 'border-gray-200 dark:border-prof-border-subtle bg-[#FAFAFA] dark:bg-prof-bg-surface hover:border-gray-300 dark:hover:border-prof-border-strong'}`}
                        >
                          <span className="text-2xl transition-transform hover:scale-110">🙁</span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${feedbackRating === 'bad' ? 'text-red-500 dark:text-prof-accent-red' : 'text-gray-500 dark:text-prof-text-secondary'}`}>Bad</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackRating('okay')}
                          className={`flex-1 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${feedbackRating === 'okay' ? 'border-amber-400 dark:border-prof-accent-orange bg-amber-50 dark:bg-prof-accent-orange/10 shadow-sm dark:shadow-none' : 'border-gray-200 dark:border-prof-border-subtle bg-[#FAFAFA] dark:bg-prof-bg-surface hover:border-gray-300 dark:hover:border-prof-border-strong'}`}
                        >
                          <span className="text-2xl transition-transform hover:scale-110">😐</span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${feedbackRating === 'okay' ? 'text-amber-500 dark:text-prof-accent-orange' : 'text-gray-500 dark:text-prof-text-secondary'}`}>Okay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackRating('great')}
                          className={`flex-1 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${feedbackRating === 'great' ? 'border-emerald-400 dark:border-prof-accent-green bg-emerald-50 dark:bg-prof-accent-green-soft-bg shadow-sm dark:shadow-none' : 'border-gray-200 dark:border-prof-border-subtle bg-[#FAFAFA] dark:bg-prof-bg-surface hover:border-gray-300 dark:hover:border-prof-border-strong'}`}
                        >
                          <span className="text-2xl transition-transform hover:scale-110">🤩</span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${feedbackRating === 'great' ? 'text-emerald-500 dark:text-prof-accent-green' : 'text-gray-500 dark:text-prof-text-secondary'}`}>Great</span>
                        </button>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={feedbackLoading || !feedbackCategory || !feedbackMessage || !feedbackRating}
                      className="w-full h-14 bg-amber-500 dark:bg-prof-accent-orange text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md dark:shadow-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:bg-amber-600 dark:hover:bg-[#d97706] hover:-translate-y-0.5"
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
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-transparent border border-red-100 dark:border-prof-border-strong px-6 py-4 text-sm font-bold text-red-500 dark:text-prof-accent-red transition-all hover:bg-red-50 dark:hover:bg-prof-accent-red/10 shadow-[0_4px_20px_-5px_rgba(239,68,68,0.1)] dark:shadow-none active:scale-[0.98]"
            >
              <LogOut className="h-5 w-5" strokeWidth={2.5} /> Log off session
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};
