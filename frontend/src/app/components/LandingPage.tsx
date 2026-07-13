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
    <div className="min-h-screen bg-surface text-text-primary font-sans overflow-x-hidden selection:bg-amber-100 selection:text-amber-900">
      {/* Sticky Navigation Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-border-subtle shadow-[0_4px_24px_rgba(0,0,0,0.03)] py-3.5'
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
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-text-secondary tracking-wide uppercase">
            <a
              href="#features"
              className="hover:text-text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#benefits"
              className="hover:text-text-primary transition-colors"
            >
              Benefits
            </a>
            <a
              href="#how-it-works"
              className="hover:text-text-primary transition-colors"
            >
              How It Works
            </a>
            <a
              href="#faq"
              className="hover:text-text-primary transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={openInstallPrompt}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-text-primary text-xs font-bold transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-text-secondary" />
              <span>Install App</span>
            </button>
            <button
              type="button"
              onMouseEnter={prefetchLogin}
              onClick={() => navigate(user ? getDashboardPath() : '/login')}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold tracking-wide transition-all shadow-xs"
            >
              {user ? 'Dashboard →' : 'Get Early Access'}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-xl text-text-primary hover:bg-surface-elevated"
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
              className="md:hidden bg-surface border-b border-border-subtle overflow-hidden shadow-xl"
            >
              <div className="flex flex-col px-6 py-5 space-y-4 text-sm font-bold text-text-primary">
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
                <div className="pt-3 border-t border-border-subtle flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openInstallPrompt();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs"
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
                    className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-xs text-center shadow-xs"
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
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-amber-50/40 via-slate-50/30 to-white">
        {/* Soft Ambient Light Gradient Background */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-amber-200/25 via-amber-100/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

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
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent-amber-soft border border-amber-200/80 text-accent-amber text-xs font-bold shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-accent-amber fill-amber-400" />
                  <span>Now Live For Students</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface border border-border-subtle text-text-primary text-xs font-bold shadow-2xs">
                  <span>🔒 Verified Campus Access</span>
                </div>
              </div>

              {/* Modern Title with Soft Gradient */}
              <h1 className="font-syne text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.08] mb-6">
                Campus life,{' '}
                <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-clip-text text-transparent">
                  sorted in one blink.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-text-secondary font-medium leading-relaxed max-w-2xl mb-8">
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs font-semibold shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Primary Call To Actions */}
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate(user ? getDashboardPath() : '/login')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-[0_8px_24px_rgba(245,158,11,0.28)] hover:shadow-[0_12px_28px_rgba(245,158,11,0.36)]"
                >
                  <span>{user ? 'Go to Dashboard' : 'Get Early Access'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-surface hover:bg-surface-elevated text-text-primary border border-border-subtle font-bold text-sm transition-all shadow-2xs"
                >
                  <span>See How It Works</span>
                  <ChevronDown className="w-4 h-4 text-text-secondary/70" />
                </a>
              </div>

              {/* Social Proof Bar */}
              <div className="mt-10 pt-8 border-t border-border-subtle flex flex-wrap items-center gap-6">
                <div>
                  <div className="font-syne text-2xl font-extrabold text-text-primary">
                    {studentCount > 0 ? `${studentCount.toLocaleString()}+` : '3,400+'}
                  </div>
                  <div className="text-xs font-medium text-text-secondary">
                    Students using Campus Blink
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <button
                    type="button"
                    onClick={() => setWaitlistOpen(true)}
                    className="text-xs font-bold text-accent-amber hover:text-accent-amber transition-colors flex items-center gap-1"
                  >
                    <span>Don&apos;t have an invite code? Join the waitlist</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-[11px] text-text-secondary/70 font-medium">
                    Instant access for verified college emails
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Light-Mode Floating App Mockup Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="lg:col-span-5 flex justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-[380px]">
                {/* Floating Soft Glow Backdrop */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-amber-200/40 via-amber-100/30 to-slate-200/40 rounded-[52px] blur-2xl pointer-events-none" />

                {/* Light Phone Shell */}
                <div className="relative z-10 bg-surface border-[6px] border-slate-200/90 rounded-[44px] shadow-[0_24px_64px_rgba(0,0,0,0.08)] overflow-hidden">
                  {/* Phone Speaker & Camera Notch */}
                  <div className="bg-surface-elevated border-b border-border-subtle px-5 pt-3 pb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-syne text-xs font-extrabold text-text-primary">
                        Campus Blink
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider">
                        Live
                      </span>
                      <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                    </div>
                  </div>

                  {/* Pristine Light Mode Dashboard Content */}
                  <div className="p-4 space-y-3.5 bg-slate-50/60 font-sans">
                    {/* User Welcome */}
                    <div className="bg-surface p-3.5 rounded-2xl border border-border-subtle shadow-2xs">
                      <div className="text-[10px] font-bold text-accent-amber uppercase tracking-wider">
                        Student Dashboard
                      </div>
                      <div className="font-syne text-sm font-extrabold text-text-primary mt-0.5">
                        Hey, Mayank! 👋
                      </div>
                      <div className="text-xs text-text-secondary">
                        Maharaja Agrasen Institute of Technology
                      </div>
                    </div>

                    {/* Quick Core Modules 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-surface p-3.5 rounded-2xl border border-border-subtle shadow-2xs flex flex-col gap-2">
                        <div className="w-8 h-8 rounded-xl bg-accent-amber-soft flex items-center justify-center text-accent-amber">
                          <Coffee className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-text-primary">
                            Canteen
                          </div>
                          <div className="text-[10px] font-semibold text-accent-green">
                            No Queue • Ready
                          </div>
                        </div>
                      </div>

                      <div className="bg-surface p-3.5 rounded-2xl border border-border-subtle shadow-2xs flex flex-col gap-2">
                        <div className="w-8 h-8 rounded-xl bg-accent-blue-soft flex items-center justify-center text-accent-blue">
                          <Store className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-text-primary">
                            Buy &amp; Sell
                          </div>
                          <div className="text-[10px] font-semibold text-text-secondary">
                            14 new books
                          </div>
                        </div>
                      </div>

                      <div className="bg-surface p-3.5 rounded-2xl border border-border-subtle shadow-2xs flex flex-col gap-2">
                        <div className="w-8 h-8 rounded-xl bg-accent-purple/15 flex items-center justify-center text-accent-purple">
                          <Printer className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-text-primary">
                            Print Shop
                          </div>
                          <div className="text-[10px] font-semibold text-text-secondary">
                            PDF Upload
                          </div>
                        </div>
                      </div>

                      <div className="bg-surface p-3.5 rounded-2xl border border-border-subtle shadow-2xs flex flex-col gap-2">
                        <div className="w-8 h-8 rounded-xl bg-accent-red/15 flex items-center justify-center text-accent-red">
                          <Users className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-text-primary">
                            Community
                          </div>
                          <div className="text-[10px] font-semibold text-text-secondary">
                            Exam schedule
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Active Order Card */}
                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100">
                          Live Canteen Order
                        </span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Token #42
                        </span>
                      </div>
                      <div className="font-syne text-xs font-extrabold mt-1">
                        Vada Pav &amp; Cold Coffee
                      </div>
                      <div className="text-[11px] text-amber-100 font-medium mt-0.5">
                        Pick up at LazyPeeps counter in 4 mins
                      </div>
                    </div>

                    {/* Bottom Dock Mockup */}
                    <div className="bg-surface border border-border-subtle rounded-2xl px-3 py-2 flex items-center justify-around">
                      <div className="flex flex-col items-center gap-0.5 text-accent-amber">
                        <Star className="w-4 h-4 fill-amber-500" />
                        <span className="text-[9px] font-bold">Home</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 text-text-secondary/70">
                        <Store className="w-4 h-4" />
                        <span className="text-[9px] font-medium">Market</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 text-text-secondary/70">
                        <Printer className="w-4 h-4" />
                        <span className="text-[9px] font-medium">Print</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 text-text-secondary/70">
                        <Users className="w-4 h-4" />
                        <span className="text-[9px] font-medium">Feed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-surface border-t border-border-subtle">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="max-w-2xl mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border-subtle text-text-secondary text-xs font-bold uppercase tracking-wider mb-3">
              <span>Core Modules</span>
            </div>
            <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
              One app. Zero campus headaches.
            </h2>
            <p className="text-base text-text-secondary font-medium mt-3">
              Designed from the ground up for college students, canteen staff, and campus shops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'LazyPeeps Canteen Express',
                headline: 'Order ahead. Eat hot. Skip the crowd.',
                desc: 'Browse live menu items, place your order before your lecture ends, pay securely, and pick up your meal at the designated counter the moment it is ready.',
                icon: Coffee,
                tags: ['Live Tracking', 'Token System', 'Zero Queue'],
                accent: 'bg-amber-50/80 text-accent-amber border-amber-100',
              },
              {
                title: 'Student Marketplace',
                headline: 'Buy & sell textbooks directly on campus.',
                desc: 'Connect with seniors and classmates to buy pre-loved books, drafters, calculators, and electronics at student prices without paying middleman commissions.',
                icon: Store,
                tags: ['Verified Peers', 'Zero Commission', 'Instant Chat'],
                accent: 'bg-blue-50/80 text-accent-blue border-accent-blue-soft',
              },
              {
                title: 'Remote Print Shop',
                headline: 'Upload PDFs & collect printed copies.',
                desc: 'Upload document files from your phone, choose color mode and binding preferences, and collect from the campus print shop without waiting around.',
                icon: Printer,
                tags: ['PDF Upload', 'Custom Specs', 'Fast Pickup'],
                accent: 'bg-purple-50/80 text-accent-purple border-purple-100',
              },
              {
                title: 'Campus Community & Notices',
                headline: 'Official updates & peer discussions.',
                desc: 'Stay informed with college notices, internship opportunities, society updates, lost & found boards, and anonymous campus discussions.',
                icon: Users,
                tags: ['Exam Notices', 'Internships', 'Societies'],
                accent: 'bg-emerald-50/80 text-accent-green border-emerald-100',
              },
            ].map((feat, index) => {
              const IconComponent = feat.icon;
              return (
                <div
                  key={index}
                  className="bg-surface rounded-3xl border border-border-subtle p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${feat.accent}`}
                      >
                        <IconComponent className="w-6 h-6 stroke-[1.75]" />
                      </div>
                      <span className="text-xs font-bold text-text-secondary/70 uppercase tracking-wider">
                        0{index + 1}
                      </span>
                    </div>

                    <div className="text-xs font-extrabold text-accent-amber uppercase tracking-wider mb-1">
                      {feat.title}
                    </div>
                    <h3 className="font-syne text-xl sm:text-2xl font-extrabold text-text-primary mb-3 leading-snug">
                      {feat.headline}
                    </h3>
                    <p className="text-sm text-text-secondary font-medium leading-relaxed mb-6">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border-subtle">
                    {feat.tags.map((tag, tIndex) => (
                      <span
                        key={tIndex}
                        className="px-3 py-1 rounded-full bg-surface border border-border-subtle text-text-secondary text-[11px] font-bold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Grid Section */}
      <section id="benefits" className="py-24 bg-slate-50/60 border-y border-border-subtle">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="max-w-2xl mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border-subtle text-text-secondary text-xs font-bold uppercase tracking-wider mb-3">
              <span>Why Campus Blink</span>
            </div>
            <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              Built for the way students actually live.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                title: 'Skip the line every time',
                desc: 'Pre-order your lunch or snacks ahead of time so your break is spent relaxing, not waiting in line.',
                icon: Clock,
              },
              {
                title: 'Save money on essentials',
                desc: 'Buy second-hand books and drafters from seniors at half the price of retail bookstores.',
                icon: ShoppingBag,
              },
              {
                title: 'Print without USB drives',
                desc: 'Upload files instantly over mobile data or campus Wi-Fi and track printing progress.',
                icon: Printer,
              },
              {
                title: 'Campus-only community',
                desc: 'Every user is verified via their college email so you interact with genuine campus classmates.',
                icon: Globe,
              },
              {
                title: 'Earn campus reputation',
                desc: 'Earn credit points for helping peers, sharing study notes, and contributing to campus discussions.',
                icon: Star,
              },
              {
                title: 'Freelance & gigs',
                desc: 'Showcase design, coding, or writing skills to earn from peer projects and faculty tasks.',
                icon: Briefcase,
              },
            ].map((item, index) => {
              const IconComp = item.icon;
              return (
                <div
                  key={index}
                  className="bg-surface rounded-3xl border border-border-subtle p-7 shadow-[0_2px_16px_rgba(0,0,0,0.03)]"
                >
                  <div className="w-11 h-11 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center text-accent-amber mb-5">
                    <IconComp className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <h3 className="font-syne text-lg font-bold text-text-primary mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Integrated Elegant Light Callout Banner */}
          <div className="bg-gradient-to-br from-amber-50 via-amber-100/40 to-white border border-accent-amber-soft rounded-3xl p-8 lg:p-10 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="max-w-xl text-center lg:text-left">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider mb-3">
                Student Guarantee
              </span>
              <h3 className="font-syne text-2xl sm:text-3xl font-extrabold text-text-primary leading-tight">
                And it is completely free for students.
              </h3>
              <p className="text-sm text-text-secondary font-medium mt-2">
                No subscription charges, no hidden platform markups on canteen orders, and no
                commission fees when you sell textbooks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="shrink-0 px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-xs"
            >
              Get Early Access →
            </button>
          </div>
        </div>
      </section>

      {/* Streamlined Horizontal How it Works Section */}
      <section id="how-it-works" className="py-24 bg-surface border-b border-border-subtle">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-surface border border-border-subtle text-text-secondary text-xs font-bold uppercase tracking-wider mb-3">
              Simple Workflow
            </span>
            <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              How Campus Blink works
            </h2>
            <p className="text-sm text-text-secondary font-medium mt-2">
              From college verification to seamless daily campus orders in four quick steps.
            </p>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Horizontal Dotted Connector Line (Desktop Only) */}
            <div className="hidden lg:block absolute top-7 left-[12%] right-[12%] h-0.5 border-t-2 border-dashed border-border-subtle pointer-events-none" />

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
                className="relative z-10 bg-surface rounded-3xl border border-border-subtle p-7 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white font-syne text-lg font-extrabold flex items-center justify-center shadow-sm mb-5">
                  {item.step}
                </div>
                <h3 className="font-syne text-lg font-bold text-text-primary mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-text-secondary font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transformed Light-Mode Stats Metric Display */}
      <section className="py-16 bg-gradient-to-b from-white via-slate-50/40 to-white border-b border-border-subtle">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-surface rounded-3xl border border-border-subtle p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
              <div className="font-syne text-4xl sm:text-5xl font-extrabold text-accent-amber mb-2">
                4
              </div>
              <div className="text-sm font-bold text-text-primary mb-1">
                Powerful Integrated Modules
              </div>
              <div className="text-xs text-text-secondary font-medium">
                Canteen, Marketplace, Print Shop &amp; Community
              </div>
            </div>

            <div className="bg-surface rounded-3xl border border-border-subtle p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
              <div className="font-syne text-4xl sm:text-5xl font-extrabold text-text-primary mb-2">
                1
              </div>
              <div className="text-sm font-bold text-text-primary mb-1">
                Unified College Platform
              </div>
              <div className="text-xs text-text-secondary font-medium">
                Connecting students, faculty &amp; shop vendors
              </div>
            </div>

            <div className="bg-surface rounded-3xl border border-border-subtle p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
              <div className="font-syne text-4xl sm:text-5xl font-extrabold text-accent-green mb-2">
                0
              </div>
              <div className="text-sm font-bold text-text-primary mb-1">
                Queue Headaches
              </div>
              <div className="text-xs text-text-secondary font-medium">
                Skip waiting lines across every campus amenity
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section with Smooth Expand & Clean Bottom Borders */}
      <section id="faq" className="py-24 bg-surface">
        <div className="max-w-[820px] mx-auto px-5 md:px-10">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-surface border border-border-subtle text-text-secondary text-xs font-bold uppercase tracking-wider mb-3">
              Questions &amp; Answers
            </span>
            <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-text-secondary font-medium mt-2">
              Everything you need to know about getting started on Campus Blink.
            </p>
          </div>

          <div className="divide-y divide-slate-100 border-t border-b border-border-subtle">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 text-left font-syne text-base sm:text-lg font-bold text-text-primary hover:text-amber-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="w-8 h-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-secondary shrink-0">
                      {isOpen ? (
                        <Minus className="w-4 h-4 text-accent-amber" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="pt-3 text-sm text-text-secondary font-medium leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Light-Mode CTA Showcase */}
      <section className="py-20 bg-slate-50/60 border-t border-border-subtle">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="bg-gradient-to-br from-amber-50/80 via-white to-slate-50 border border-amber-200/80 rounded-3xl p-10 sm:p-16 text-center shadow-[0_12px_40px_rgba(245,158,11,0.06)] relative overflow-hidden">
            <div className="max-w-2xl mx-auto relative z-10">
              <span className="inline-block px-3.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wider mb-4">
                Early Access Invite
              </span>
              <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight leading-tight mb-4">
                Stop waiting. Start blinking.
              </h2>
              <p className="text-base text-text-secondary font-medium leading-relaxed mb-8">
                Join thousands of students who are done waiting in canteen lines and overpaying for
                study essentials. Sign up instantly with your college email.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(user ? getDashboardPath() : '/login')}
                  className="px-9 py-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-[0_8px_24px_rgba(245,158,11,0.28)]"
                >
                  Get Early Access Now →
                </button>
                <Link
                  to="/contact"
                  className="px-7 py-4 rounded-full bg-surface hover:bg-surface-elevated border border-border-subtle text-text-primary font-bold text-sm transition-all shadow-2xs"
                >
                  Contact Support
                </Link>
              </div>
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setWaitlistOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl border border-border-subtle bg-surface p-7 shadow-2xl z-10"
            >
              <h3 className="font-syne text-2xl font-extrabold text-text-primary">
                Join Campus Blink Waitlist
              </h3>
              <p className="mt-2 text-xs font-medium text-text-secondary">
                Enter your details to receive early invite codes for your college campus.
              </p>

              <form onSubmit={handleWaitlistSubmit} className="mt-6 space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-text-primary uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    value={waitlistName}
                    onChange={(event) => setWaitlistName(event.target.value)}
                    placeholder="e.g. Mayank Singh"
                    required
                    className="w-full rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-amber-400 focus:bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-primary uppercase tracking-wider mb-1">
                    College Email
                  </label>
                  <input
                    value={waitlistEmail}
                    onChange={(event) => setWaitlistEmail(event.target.value)}
                    placeholder="e.g. student@mait.ac.in"
                    type="email"
                    required
                    className="w-full rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-amber-400 focus:bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-primary uppercase tracking-wider mb-1">
                    College Name
                  </label>
                  <input
                    value={waitlistCollege}
                    onChange={(event) => setWaitlistCollege(event.target.value)}
                    placeholder="e.g. MAIT Delhi"
                    className="w-full rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-amber-400 focus:bg-surface"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setWaitlistOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-bold text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={waitlistLoading}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-60 transition-colors"
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
      <footer className="bg-surface border-t border-border-subtle py-12">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-text-secondary font-medium">
          <div className="flex items-center gap-3">
            <Logo alt="Campus Blink" height={28} className="h-7 w-auto object-contain" />
            <span>© 2026 Campus Blink. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-text-primary transition-colors">
              About
            </Link>
            <Link to="/privacy" className="hover:text-text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/contact" className="hover:text-text-primary transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
