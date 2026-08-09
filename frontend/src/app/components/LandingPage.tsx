import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  Store,
  Coffee,
  Printer,
  Users,
  ChevronDown,
  Menu,
  X,
  Download,
  ShoppingBag,
  Clock,
  Globe,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import toast from 'react-hot-toast';
import { getLandingSocialProof, joinWaitlist } from '../../api/invites';
import { useAuthStore } from '../../store/authStore';
import { Logo } from './ui/Logo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const getDashboardPath = () => {
    if (!user || !profile) return '/login';
    const role = profile.role || 'student';
    if (role === 'admin') return '/admin';
    if (role === 'professor') {
      const status = String(profile.professor_status || 'pending').toLowerCase();
      if (status === 'pending') return '/professor/pending';
      if (status === 'rejected') return '/professor/rejected';
      return '/professor/home';
    }
    if (role === 'canteen_owner') return '/canteen-dashboard';
    if (role === 'print_shop') return '/print-dashboard';
    return '/student/home';
  };

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistCollege, setWaitlistCollege] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadSocialProof = async () => {
      const { data } = await getLandingSocialProof();
      if (isMounted && data) {
        setStudentCount(Number(data.totalStudents || 0));
      }
    };

    loadSocialProof();
    return () => {
      isMounted = false;
    };
  }, []);

  const prefetchLogin = () => {
    import('../../features/auth/LoginPage').catch(() => {});
  };

  const openInstallPrompt = () => {
    window.dispatchEvent(new CustomEvent('cb-open-install'));
  };

  const handleWaitlistSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setWaitlistLoading(true);

    const { error } = await joinWaitlist({
      name: waitlistName,
      email: waitlistEmail,
      college: waitlistCollege,
    });

    if (error) {
      toast.error(String(error));
      setWaitlistLoading(false);
      return;
    }

    toast.success('You are on the waitlist. We will send you an invite soon.');
    setWaitlistLoading(false);
    setWaitlistOpen(false);
    setWaitlistName('');
    setWaitlistEmail('');
    setWaitlistCollege('');
  };

  const faqs = [
    {
      q: 'Is Campus Blink free to use?',
      a: 'Yes! Core features of Campus Blink are completely free for students. There are no subscriptions, mandatory platform fees, or paywalls for student essentials.',
    },
    {
      q: 'Can I sell my old books and items here?',
      a: 'Absolutely. The Buy & Sell Marketplace allows students to buy and resell pre-loved books, electronics, drafters, and hostel essentials directly on campus with zero commission.',
    },
    {
      q: 'How does canteen ordering work?',
      a: 'Browse your college canteen menu right from the app, order ahead of time, pay seamlessly, and get live status updates. Pick up your hot food instantly without standing in the queue.',
    },
    {
      q: 'Can I print my documents directly from my phone?',
      a: 'Yes. Simply upload your PDF, choose your print settings (color or B/W, single or double-sided, binding options), and collect from the campus print shop when ready.',
    },
    {
      q: 'Is my college community feed private to our campus?',
      a: 'Yes, your campus feed connects you with verified peers at your college for exam notices, internships, lost & found, discussions, and campus events.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden selection:bg-amber-100 selection:text-amber-900">
      {/* Sticky Navigation Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] py-3.5'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 flex items-center justify-between">
          <Link
            to={user ? '/student/home' : '/'}
            className="flex items-center gap-2.5 focus:outline-none group"
          >
            <Logo
              alt="Campus Blink"
              loading="eager"
              height={34}
              className="h-8 md:h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500 tracking-wide uppercase">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#benefits" className="hover:text-slate-900 transition-colors">
              Benefits
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={openInstallPrompt}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold transition-all shadow-[0_4px_14px_rgba(0,0,0,0.03)]"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Install App</span>
            </button>
            <button
              type="button"
              onMouseEnter={prefetchLogin}
              onClick={() => navigate(user ? getDashboardPath() : '/login')}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold tracking-wide transition-all shadow-[0_4px_14px_rgba(245,158,11,0.25)]"
            >
              {user ? 'Dashboard →' : 'Get Early Access'}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-xl text-slate-900 hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-200 overflow-hidden shadow-xl"
            >
              <div className="flex flex-col px-6 py-5 space-y-4 text-sm font-bold text-slate-900">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-amber-600 transition-colors"
                >
                  Features
                </a>
                <a
                  href="#benefits"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-amber-600 transition-colors"
                >
                  Benefits
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-amber-600 transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-amber-600 transition-colors"
                >
                  FAQ
                </a>
                <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openInstallPrompt();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={prefetchLogin}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(user ? getDashboardPath() : '/login');
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-xs text-center shadow-md"
                  >
                    {user ? 'Go to Dashboard →' : 'Get Early Access'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-amber-50/60 via-slate-50/50 to-white">
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-amber-200/30 via-orange-100/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Hero Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 flex flex-col items-start text-left"
            >
              {/* Pill Badges */}
              <div className="flex flex-wrap items-center gap-2.5 mb-6">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-200/80 text-amber-700 text-xs font-bold shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>Now Live For Students</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                  <span>🔒 Verified Campus Access</span>
                </div>
              </div>

              {/* Massive Punchy Typography */}
              <h1 className="font-syne text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.05] mb-6">
                Campus life,<br className="hidden sm:block"/>
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                  sorted in one blink.
                </span>
              </h1>

              <p className="text-base sm:text-xl text-slate-600 font-medium leading-relaxed max-w-2xl mb-8">
                Order canteen food ahead of class. Buy and sell textbooks at student prices.
                Send documents to the print shop from your phone. Everything your campus needs in
                one fast, clean application.
              </p>

              {/* Feature Highlights Pills */}
              <div className="flex flex-wrap gap-2.5 mb-9">
                {[
                  'Zero canteen queues',
                  'Textbook marketplace',
                  'Instant print orders',
                  'Verified students only',
                ].map((item, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Primary Call To Actions */}
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate(user ? getDashboardPath() : '/login')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all animate-pulse shadow-[0_8px_30px_rgba(245,158,11,0.35)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.45)]"
                >
                  <span>{user ? 'Go to Dashboard' : 'Get Early Access'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-bold text-sm transition-all shadow-[0_4px_14px_rgba(0,0,0,0.04)]"
                >
                  <span>See How It Works</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </a>
              </div>

              {/* Social Proof Bar */}
              <div className="mt-10 pt-8 border-t border-slate-200 flex flex-wrap items-center gap-6">
                <div>
                  <div className="font-syne text-2xl font-extrabold text-slate-900">
                    {studentCount > 0 ? `${studentCount.toLocaleString()}+` : '3,400+'}
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    Students using Campus Blink
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <button
                    type="button"
                    onClick={() => setWaitlistOpen(true)}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
                  >
                    <span>Don&apos;t have an invite code? Join the waitlist</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-[11px] text-slate-400 font-medium mt-1">
                    Instant access for verified college emails
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Dynamic Isometric 3D Phone Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.90, rotateY: 0, rotateX: 0 }}
              animate={{ opacity: 1, scale: 1, rotateY: -15, rotateX: 10 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
              className="lg:col-span-5 flex justify-center lg:justify-end perspective-[1200px]"
            >
              <div className="relative w-full max-w-[380px] transform-gpu transition-transform duration-700 hover:rotate-y-[-5deg] hover:rotate-x-[5deg] hover:scale-[1.02]">
                {/* Floating Soft Glow Backdrop */}
                <div className="absolute -inset-10 bg-gradient-to-tr from-amber-400/20 via-orange-300/20 to-rose-200/20 rounded-full blur-3xl pointer-events-none" />

                {/* Light Phone Shell */}
                <div className="relative z-10 bg-white border-[8px] border-slate-100 rounded-[48px] shadow-[0_30px_80px_rgba(0,0,0,0.12),_0_15px_30px_rgba(0,0,0,0.06),_inset_0_4px_12px_rgba(255,255,255,0.8)] overflow-hidden">
                  {/* Phone Speaker & Camera Notch */}
                  <div className="bg-white border-b border-slate-100 px-6 pt-4 pb-3 flex items-center justify-between shadow-sm z-20 relative">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                      <span className="font-syne text-xs font-extrabold text-slate-900 tracking-wide">
                        Campus Blink
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Live
                      </span>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    </div>
                  </div>

                  {/* Pristine Light Mode Dashboard Content */}
                  <div className="p-5 space-y-4 bg-slate-50 min-h-[580px] font-sans">
                    {/* User Welcome */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/50 rounded-bl-full -mr-4 -mt-4" />
                      <div className="relative z-10">
                        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                          Student Dashboard
                        </div>
                        <div className="font-syne text-base font-extrabold text-slate-900 mt-1">
                          Hey, Mayank! 👋
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          Maharaja Agrasen Institute of Technology
                        </div>
                      </div>
                    </div>

                    {/* Quick Core Modules 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-2.5 hover:border-amber-200 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">
                            Canteen
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-500">
                            No Queue • Ready
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-2.5 hover:border-blue-200 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">
                            Buy &amp; Sell
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            14 new books
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-2.5 hover:border-purple-200 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                          <Printer className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">
                            Print Shop
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            PDF Upload
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-2.5 hover:border-rose-200 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">
                            Community
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            Exam schedule
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Active Order Card */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-2xl shadow-[0_8px_20px_rgba(245,158,11,0.25)] relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/20 rounded-full blur-xl" />
                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100">
                          Live Canteen Order
                        </span>
                        <span className="bg-white/20 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm">
                          Token #42
                        </span>
                      </div>
                      <div className="font-syne text-sm font-extrabold mt-2 relative z-10">
                        Vada Pav &amp; Cold Coffee
                      </div>
                      <div className="text-xs text-amber-100 font-medium mt-1 relative z-10">
                        Pick up at LazyPeeps in 4 mins
                      </div>
                      {/* Progress bar mock */}
                      <div className="mt-3 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white w-3/4 rounded-full" />
                      </div>
                    </div>

                    {/* Bottom Dock Mockup */}
                    <div className="absolute bottom-6 left-5 right-5 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-around shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                      <div className="flex flex-col items-center gap-1 text-amber-600">
                        <Star className="w-5 h-5 fill-amber-500" />
                        <span className="text-[10px] font-bold">Home</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <Store className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Market</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <Printer className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Print</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <Users className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Feed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Features: Bento Box Layout */}
      <section id="features" className="py-28 bg-slate-50 border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <span>Core Modules</span>
            </div>
            <h2 className="font-syne text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              One app. Zero campus headaches.
            </h2>
            <p className="text-lg text-slate-600 font-medium mt-4">
              Designed from the ground up for college students, canteen staff, and campus shops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6">
            {/* Canteen Feature (Spans 2 columns) */}
            <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -mr-20 -mt-20 transition-transform group-hover:scale-110" />
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start h-full">
                <div className="flex-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-600 mb-6">
                    <Coffee className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="text-xs font-extrabold text-amber-600 uppercase tracking-wider mb-2">
                    LazyPeeps Canteen Express
                  </div>
                  <h3 className="font-syne text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4 leading-tight">
                    Order ahead. Eat hot.<br/> Skip the crowd.
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed mb-8">
                    Browse live menu items, place your order before your lecture ends, pay securely, and pick up your meal at the designated counter the moment it is ready.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {['Live Tracking', 'Token System', 'Zero Queue'].map((tag, tIndex) => (
                      <span key={tIndex} className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Embedded UI Mockup */}
                <div className="hidden md:block w-[240px] shrink-0 mt-auto bg-slate-50 rounded-t-2xl border-x border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] transform translate-y-8 group-hover:translate-y-4 transition-transform duration-500">
                   <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-900">Your Cart</span>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">2 items</span>
                   </div>
                   <div className="space-y-2">
                     <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl">🍔</div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Aloo Tikki Burger</div>
                          <div className="text-[10px] text-slate-500">₹45 x 1</div>
                        </div>
                     </div>
                     <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl">☕</div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Cold Coffee</div>
                          <div className="text-[10px] text-slate-500">₹50 x 1</div>
                        </div>
                     </div>
                     <div className="pt-2 flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-500">Total</span>
                       <span className="text-sm font-extrabold text-slate-900">₹95</span>
                     </div>
                     <div className="w-full bg-amber-500 text-white text-[10px] font-bold text-center py-2 rounded-xl mt-2">
                       Pay & Order
                     </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Marketplace Feature (Single Column) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600 mb-6">
                  <Store className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="text-xs font-extrabold text-blue-600 uppercase tracking-wider mb-2">
                  Student Marketplace
                </div>
                <h3 className="font-syne text-xl sm:text-2xl font-extrabold text-slate-900 mb-3 leading-snug">
                  Buy & sell directly on campus.
                </h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">
                  Connect with seniors and classmates to buy pre-loved books and drafters at student prices with zero commission.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
                {['Verified Peers', '0% Comm.'].map((tag, tIndex) => (
                  <span key={tIndex} className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Print Shop Feature (Single Column) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-100 text-purple-600 mb-6">
                  <Printer className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="text-xs font-extrabold text-purple-600 uppercase tracking-wider mb-2">
                  Remote Print Shop
                </div>
                <h3 className="font-syne text-xl sm:text-2xl font-extrabold text-slate-900 mb-3 leading-snug">
                  Upload PDFs & collect printed copies.
                </h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">
                  Upload files from your phone, choose color and binding preferences, and collect from the shop instantly.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
                {['PDF Upload', 'Fast Pickup'].map((tag, tIndex) => (
                  <span key={tIndex} className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Community Feature (Spans 2 columns) */}
            <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all relative overflow-hidden group">
               <div className="absolute right-0 bottom-0 w-80 h-80 bg-emerald-50 rounded-tl-full -mr-20 -mb-20 transition-transform group-hover:scale-110" />
               <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center h-full">
                <div className="flex-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-600 mb-6">
                    <Users className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mb-2">
                    Campus Community & Notices
                  </div>
                  <h3 className="font-syne text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4 leading-tight">
                    Official updates & peer discussions.
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed mb-6">
                    Stay informed with college notices, internship opportunities, lost & found boards, and anonymous campus discussions.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {['Exam Notices', 'Internships', 'Discussions'].map((tag, tIndex) => (
                      <span key={tIndex} className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Embedded UI Mockup */}
                <div className="hidden md:block w-[280px] shrink-0 bg-slate-50 rounded-2xl border border-slate-200 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transform group-hover:scale-105 transition-transform duration-500">
                   <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">MA</div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Admin Notice</div>
                        <div className="text-[10px] text-slate-500">2 hours ago</div>
                      </div>
                   </div>
                   <div className="text-xs font-bold text-slate-800 mb-1">Mid-Term Datesheet Released</div>
                   <div className="text-[10px] text-slate-500 leading-relaxed mb-3 line-clamp-2">
                     The official datesheet for the upcoming mid-term examinations for B.Tech CSE has been attached...
                   </div>
                   <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-100 text-red-500 rounded flex items-center justify-center text-[10px] font-bold">PDF</div>
                      <div className="text-[10px] font-bold text-slate-700">cse_datesheet_v2.pdf</div>
                   </div>
                </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid Section (Zig-Zag Layout) */}
      <section id="benefits" className="py-28 bg-white border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <span>Why Campus Blink</span>
            </div>
            <h2 className="font-syne text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Built for the way students actually live.
            </h2>
          </div>

          <div className="space-y-24">
            {/* Row 1: Text Left, UI Right */}
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
               <div className="flex-1 lg:max-w-xl">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-600 mb-6 shadow-sm">
                    <Clock className="w-7 h-7 stroke-[2]" />
                  </div>
                  <h3 className="font-syne text-3xl font-extrabold text-slate-900 mb-4">
                    Skip the line every time
                  </h3>
                  <p className="text-lg text-slate-600 font-medium leading-relaxed mb-6">
                    Pre-order your lunch or snacks ahead of time so your break is spent relaxing, not waiting in line behind fifty other students.
                  </p>
                  <ul className="space-y-3">
                    {['Live order status tracking', 'Secure in-app payments', 'Instant pick-up notifications'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
               </div>
               <div className="flex-1 w-full relative">
                 <div className="absolute inset-0 bg-gradient-to-tr from-amber-100 to-orange-50 rounded-[40px] transform rotate-3" />
                 <div className="relative bg-white border border-slate-200 rounded-[40px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)] aspect-[4/3] flex items-center justify-center overflow-hidden group">
                    {/* Abstract UI representation */}
                    <div className="w-full max-w-sm space-y-4 relative z-10">
                       <div className="h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center px-4 gap-4 transition-all duration-300 group-hover:-translate-y-2">
                         <div className="w-10 h-10 bg-amber-200 rounded-xl" />
                         <div className="space-y-2 flex-1">
                           <div className="h-3 bg-slate-200 rounded w-1/2" />
                           <div className="h-2 bg-slate-100 rounded w-1/3" />
                         </div>
                       </div>
                       <div className="h-16 bg-white rounded-2xl border border-amber-200 shadow-md flex items-center px-4 gap-4 transform scale-105 z-10 transition-all duration-300">
                         <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white"><Clock className="w-5 h-5"/></div>
                         <div className="space-y-2 flex-1">
                           <div className="h-3 bg-slate-800 rounded w-2/3" />
                           <div className="h-2 bg-amber-500 rounded w-1/2" />
                         </div>
                       </div>
                       <div className="h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center px-4 gap-4 opacity-60 transition-all duration-300 group-hover:translate-y-2">
                         <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                         <div className="space-y-2 flex-1">
                           <div className="h-3 bg-slate-200 rounded w-3/4" />
                           <div className="h-2 bg-slate-100 rounded w-1/4" />
                         </div>
                       </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* Row 2: Full Width Inline Alert Banner */}
            <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-1 shadow-[0_12px_40px_rgba(245,158,11,0.2)]">
               <div className="bg-white rounded-[22px] px-8 py-10 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-8 h-full">
                  <div className="max-w-2xl text-center lg:text-left">
                    <span className="inline-block px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4">
                      Student Guarantee
                    </span>
                    <h3 className="font-syne text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
                      Completely free for students.
                    </h3>
                    <p className="text-base text-slate-600 font-medium">
                      No subscription charges, no hidden platform markups on canteen orders, and no commission fees when you sell textbooks to your juniors.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="shrink-0 px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center gap-2"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
               </div>
            </div>

            {/* Row 3: UI Left, Text Right */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20">
               <div className="flex-1 lg:max-w-xl">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600 mb-6 shadow-sm">
                    <Globe className="w-7 h-7 stroke-[2]" />
                  </div>
                  <h3 className="font-syne text-3xl font-extrabold text-slate-900 mb-4">
                    Campus-only community
                  </h3>
                  <p className="text-lg text-slate-600 font-medium leading-relaxed mb-6">
                    Every user is verified via their college email so you interact with genuine campus classmates. No outsiders, just your peers.
                  </p>
                  <ul className="space-y-3">
                    {['Verified student identities', 'Exclusive college notices', 'Safe peer-to-peer trading'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
               </div>
               <div className="flex-1 w-full relative">
                 <div className="absolute inset-0 bg-gradient-to-bl from-blue-100 to-indigo-50 rounded-[40px] transform -rotate-3" />
                 <div className="relative bg-white border border-slate-200 rounded-[40px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)] aspect-[4/3] flex items-center justify-center overflow-hidden group">
                    {/* Abstract Profile Network Mockup */}
                    <div className="relative w-full h-full transition-transform duration-500 group-hover:scale-105">
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500 rounded-full border-4 border-white shadow-xl z-20 flex items-center justify-center text-white font-syne text-2xl font-bold">
                         CB
                       </div>
                       {/* Connecting lines */}
                       <svg className="absolute inset-0 w-full h-full z-0 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                         <line x1="50" y1="50" x2="20" y2="20" stroke="currentColor" strokeWidth="1" className="text-blue-500" />
                         <line x1="50" y1="50" x2="80" y2="25" stroke="currentColor" strokeWidth="1" className="text-blue-500" />
                         <line x1="50" y1="50" x2="25" y2="80" stroke="currentColor" strokeWidth="1" className="text-blue-500" />
                         <line x1="50" y1="50" x2="75" y2="75" stroke="currentColor" strokeWidth="1" className="text-blue-500" />
                       </svg>
                       {/* Surrounding Nodes */}
                       <div className="absolute top-[15%] left-[15%] w-12 h-12 bg-white rounded-full border border-slate-200 shadow-md z-10 flex items-center justify-center font-bold text-slate-600 text-xs">P1</div>
                       <div className="absolute top-[20%] right-[15%] w-14 h-14 bg-white rounded-full border border-slate-200 shadow-md z-10 flex items-center justify-center font-bold text-slate-600 text-sm">P2</div>
                       <div className="absolute bottom-[20%] left-[20%] w-10 h-10 bg-white rounded-full border border-slate-200 shadow-md z-10 flex items-center justify-center font-bold text-slate-600 text-xs">P3</div>
                       <div className="absolute bottom-[15%] right-[20%] w-16 h-16 bg-white rounded-full border border-slate-200 shadow-md z-10 flex items-center justify-center font-bold text-slate-600 text-base">P4</div>
                    </div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* Combined How it Works & Stats Section */}
      <section id="how-it-works" className="pt-28 bg-slate-50 border-t border-slate-200 relative z-10">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              Simple Workflow
            </span>
            <h2 className="font-syne text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              How Campus Blink works
            </h2>
            <p className="text-lg text-slate-600 font-medium mt-4">
              From college verification to seamless daily campus orders in four quick steps.
            </p>
          </div>

          {/* Horizontal Connected Timeline */}
          <div className="relative mb-32">
            {/* SVG Dashed Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-0 border-t-[3px] border-dashed border-amber-200 pointer-events-none z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 relative z-10">
              {[
                {
                  step: '01',
                  title: 'Create Account',
                  desc: 'Sign up using your verified student email and choose your college campus.',
                },
                {
                  step: '02',
                  title: 'Explore Shops',
                  desc: 'View live canteen items, book listings, print shops, and campus notices.',
                },
                {
                  step: '03',
                  title: 'Order Seamlessly',
                  desc: 'Place instant orders ahead of time and get notified when ready for pickup.',
                },
                {
                  step: '04',
                  title: 'Earn Credits',
                  desc: 'Collect reputation points for every completed interaction and referral.',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center text-center group"
                >
                  <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.06)] text-amber-500 font-syne text-2xl font-extrabold flex items-center justify-center mb-6 relative group-hover:-translate-y-2 transition-transform duration-300">
                    {/* Glowing indicator behind */}
                    <div className="absolute inset-0 bg-amber-400 rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
                    <span className="relative z-10">{item.step}</span>
                  </div>
                  <h3 className="font-syne text-xl font-bold text-slate-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-[250px]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Glassmorphic Stats Container Overlapping Next Section */}
          <div className="relative z-20 -mb-24">
             <div className="bg-white/70 backdrop-blur-2xl border border-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.08)] grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200">
                <div className="p-4">
                  <div className="font-syne text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 mb-3">
                    4
                  </div>
                  <div className="text-base font-bold text-slate-900 mb-2">
                    Integrated Modules
                  </div>
                  <div className="text-sm text-slate-500 font-medium max-w-[200px] mx-auto">
                    Canteen, Market, Print &amp; Community
                  </div>
                </div>
                <div className="p-4 pt-8 md:pt-4">
                  <div className="font-syne text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900 mb-3">
                    1
                  </div>
                  <div className="text-base font-bold text-slate-900 mb-2">
                    Unified Platform
                  </div>
                  <div className="text-sm text-slate-500 font-medium max-w-[200px] mx-auto">
                    Connecting students, faculty & vendors
                  </div>
                </div>
                <div className="p-4 pt-8 md:pt-4">
                  <div className="font-syne text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 mb-3">
                    0
                  </div>
                  <div className="text-base font-bold text-slate-900 mb-2">
                    Queue Headaches
                  </div>
                  <div className="text-sm text-slate-500 font-medium max-w-[200px] mx-auto">
                    Skip waiting lines across campus
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="pt-48 pb-28 bg-white relative z-0">
        <div className="max-w-[820px] mx-auto px-5 md:px-10">
          <div className="text-center mb-16">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              Questions &amp; Answers
            </span>
            <h2 className="font-syne text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-colors hover:border-slate-300">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 text-left p-6 sm:p-8 outline-none"
                  >
                    <span className="font-syne text-lg sm:text-xl font-bold text-slate-900">{faq.q}</span>
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen ? 'bg-amber-100 text-amber-600 rotate-180' : 'bg-slate-50 text-slate-400 rotate-0 border border-slate-200'}`}>
                      {isOpen ? <Minus className="w-6 h-6 stroke-[2.5]" /> : <Plus className="w-6 h-6 stroke-[2.5]" />}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 sm:px-8 pb-8 text-base text-slate-600 font-medium leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Massive Edge-to-Edge Bottom CTA */}
      <section className="relative overflow-hidden py-32 border-t border-slate-200">
        {/* Soft Warm Radial Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-100/60 via-slate-50 to-white -z-10" />
        
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 text-center relative z-10">
          <div className="max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold uppercase tracking-widest mb-6 shadow-md">
              Early Access Invite
            </span>
            <h2 className="font-syne text-5xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.05] mb-6">
              Stop waiting.<br /> Start blinking.
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed mb-12">
              Join thousands of students who are done waiting in canteen lines and overpaying for
              study essentials. Sign up instantly with your college email.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate(user ? getDashboardPath() : '/login')}
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-amber-500 hover:bg-amber-600 hover:-translate-y-1 text-white font-bold text-base transition-all shadow-[0_12px_40px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2"
              >
                <span>Get Early Access Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                to="/contact"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white hover:bg-slate-50 hover:-translate-y-1 border border-slate-200 text-slate-900 font-bold text-base transition-all shadow-[0_4px_14px_rgba(0,0,0,0.04)] text-center flex items-center justify-center"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Modal */}
      <AnimatePresence>
        {waitlistOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setWaitlistOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl z-10"
            >
              <h3 className="font-syne text-3xl font-extrabold text-slate-900 leading-tight">
                Join Campus Blink
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Enter your details to receive early invite codes for your college campus.
              </p>

              <form onSubmit={handleWaitlistSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                    Full Name
                  </label>
                  <input
                    value={waitlistName}
                    onChange={(event) => setWaitlistName(event.target.value)}
                    placeholder="e.g. Mayank Singh"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                    College Email
                  </label>
                  <input
                    value={waitlistEmail}
                    onChange={(event) => setWaitlistEmail(event.target.value)}
                    placeholder="e.g. student@mait.ac.in"
                    type="email"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                    College Name
                  </label>
                  <input
                    value={waitlistCollege}
                    onChange={(event) => setWaitlistCollege(event.target.value)}
                    placeholder="e.g. MAIT Delhi"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setWaitlistOpen(false)}
                    className="px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={waitlistLoading}
                    className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold disabled:opacity-60 transition-colors shadow-md"
                  >
                    {waitlistLoading ? 'Submitting...' : 'Join Waitlist'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <Logo alt="Campus Blink" height={28} className="h-7 w-auto object-contain grayscale opacity-70" />
            <span>© 2026 Campus Blink. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-slate-900 transition-colors">
              About
            </Link>
            <Link to="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <Link to="/contact" className="hover:text-slate-900 transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
