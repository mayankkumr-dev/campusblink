import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, Store, Coffee, Printer, Users, User, ChevronDown, Menu, X, Download } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import toast from 'react-hot-toast';
import { getLandingSocialProof, joinWaitlist } from '../../api/invites';
import { useAuthStore } from '../../store/authStore';

// using the new provided logo files from the root logo folder
const logoWithTextTransparent = '/logo/logo_with_text_transparent.png';
const onlyLogoTransparent = '/logo/only_logo_transparent.png';
const textTransparent = '/logo/text_transparent.png';
const whiteLogoFull = '/logo/white%20transparent.png';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistCollege, setWaitlistCollege] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
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

  const tickerItems = [
    "Skip the canteen queue",
    "Buy & sell textbooks",
    "Print from your phone",
    "Find internships",
    "Post anonymously",
    "Order stationery",
    "Campus notices",
    "Student freelancing",
    "Earn Reputation",
    "Lost & found"
  ];

  const prefetchLogin = () => {
    import('./LoginRegisterPage').catch(() => {});
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

  return (
    <div className="bg-[#FAFAF8] min-h-screen text-[#0D0D0D] font-sans overflow-x-hidden relative w-full">
      
      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] w-full transition-all duration-300 ${
          scrolled
            ? 'border-b border-black/10 bg-white/85 backdrop-blur-xl shadow-[0_18px_40px_rgba(13,13,13,0.08)]'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="relative mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-5 md:px-[60px]">
          <div className="z-50 flex h-full items-center justify-start">
            <Link to={user ? '/student/home' : '/'} className="group flex cursor-pointer items-center gap-3 no-underline focus:outline-none">
              <img
                src={logoWithTextTransparent}
                alt="Campus Blink"
                loading="eager"
                className="h-[52px] w-auto shrink-0 object-contain transition-transform group-hover:scale-105 md:h-[58px]"
              />
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 font-sans text-[15px] font-semibold md:flex">
            <a href="#features" className="text-[#6B6B6B] transition-colors duration-200 hover:text-[#0D0D0D]">Features</a>
            <a href="#how" className="text-[#6B6B6B] transition-colors duration-200 hover:text-[#0D0D0D]">How it works</a>
            <button onClick={openInstallPrompt} className="flex items-center gap-2 text-[#6B6B6B] transition-colors duration-200 hover:text-[#0D0D0D]">
              <Download className="w-4 h-4" /> Install App
            </button>
            <button
              onMouseEnter={prefetchLogin}
              className="rounded-full bg-[#0D0D0D] px-7 py-3 font-sans font-semibold text-[#FFD600] transition-colors duration-200 hover:bg-[#FFD600] hover:text-[#0D0D0D]"
              onClick={() => navigate(user ? '/student/home' : '/login')}
            >
              {user ? 'Dashboard →' : 'Login'}
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-[#0D0D0D] hover:text-[#FFD600] transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        <motion.div 
           initial={{ height: 0, opacity: 0 }}
           animate={{ height: mobileMenuOpen ? 'auto' : 0, opacity: mobileMenuOpen ? 1 : 0 }}
           className="md:hidden overflow-hidden bg-white shadow-strong absolute top-full left-0 right-0 border-b border-black/10"
        >
          <div className="flex flex-col px-6 py-6 gap-6 font-sans font-medium">
             <a href="#features" className="text-[#0D0D0D] text-lg" onClick={() => setMobileMenuOpen(false)}>Features</a>
             <a href="#how" className="text-[#0D0D0D] text-lg" onClick={() => setMobileMenuOpen(false)}>How it works</a>
             <button className="flex items-center justify-center gap-2 text-[#0D0D0D] text-lg" onClick={() => { setMobileMenuOpen(false); openInstallPrompt(); }}>
               <Download className="w-5 h-5" /> Install App
             </button>
             <button
               onMouseEnter={prefetchLogin}
               className="mt-4 w-full rounded-full bg-[#0D0D0D] px-7 py-4 text-center font-sans font-semibold text-[#FFD600] transition-colors hover:bg-[#FFD600] hover:text-[#0D0D0D]"
               onClick={() => { setMobileMenuOpen(false); navigate(user ? '/student/home' : '/login'); }}
             >
               {user ? 'Dashboard →' : 'Login / Get Access'}
             </button>
          </div>
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto flex min-h-[100vh] w-full max-w-[1440px] items-center overflow-visible px-5 pb-12 pt-[112px] md:px-12 lg:h-[100vh] lg:min-h-0 lg:pb-0">
        {/* Hero Background Glows */}
        <div className="absolute bottom-[20%] left-[-10%] w-[50%] aspect-square bg-[#FFD600] opacity-[0.12] blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute top-[10%] right-[-10%] w-[30%] aspect-square bg-[#C4817A] opacity-[0.08] blur-[100px] pointer-events-none rounded-full" />
        <img src={onlyLogoTransparent} className="absolute bottom-[5%] right-0 w-[50vw] max-w-[600px] opacity-[0.03] pointer-events-none animate-mascot object-contain" alt="Campus Blink" loading="eager" width={600} height={600} style={{ objectFit: 'contain' }} />

        <div className="relative z-10 flex min-h-0 w-full flex-col items-center gap-12 overflow-visible lg:grid lg:grid-cols-[52%_48%] lg:gap-0">
          
          {/* Left Column Content */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, staggerChildren: 0.1 }}
            className="flex w-full max-w-[760px] flex-col justify-center md:pl-3 lg:mt-12"
          >
            <div className="mb-7 flex flex-wrap items-center gap-3 md:mb-9">
              <div className="inline-flex self-start rounded-full bg-[#FFD600] px-4 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[2px] text-[#0D0D0D] shadow-[0_8px_20px_rgba(255,214,0,0.22)]">
                🚀 Now Live For Students
              </div>
              <div className="inline-flex self-start rounded-full border border-black/15 bg-white px-4 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D] shadow-sm">
                🔒 Invite Only
              </div>
            </div>
            
            <h1 className="fluid-h1 mb-5 max-w-[10ch] text-[#0D0D0D] lg:mb-6">
              Campus life,
              <br />
              sorted in
              <br />
              <span className="text-[#D4A600]">one blink.</span>
            </h1>
            
            <p className="landing-kicker mb-7 max-w-[40rem] text-[#5F5A50] md:mb-8">
              Order food before class ends. Buy and sell books without getting lowballed. Print from your hostel. Campus Blink brings canteen, marketplace, printing, and campus community into one fast student-first app.
            </p>

            <div className="mb-8 flex flex-wrap gap-3 text-[12px] font-semibold text-[#0D0D0D] md:mb-10">
              <span className="rounded-full border border-black/10 bg-white/80 px-4 py-2 shadow-sm">Food without the queue</span>
              <span className="rounded-full border border-black/10 bg-white/80 px-4 py-2 shadow-sm">Resell books faster</span>
              <span className="rounded-full border border-black/10 bg-white/80 px-4 py-2 shadow-sm">Print from your phone</span>
            </div>
            
            <div className="mb-8 flex w-full flex-col gap-4 sm:flex-row lg:mb-10">
              <button
                className="rounded-full bg-[#0D0D0D] px-9 py-4 font-sans text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-[#FFD600] hover:text-[#0D0D0D] hover:shadow-[0_0_24px_rgba(255,214,0,0.4)]"
                onClick={() => navigate(user ? '/student/home' : '/login')}
              >
                {user ? 'Go to Dashboard' : 'Get Early Access'}
              </button>
              <button className="flex items-center justify-center gap-2 rounded-full border-2 border-[#0D0D0D] bg-white/80 px-8 py-[14px] font-sans text-[15px] font-semibold text-[#0D0D0D] transition-colors duration-200 hover:bg-[#0D0D0D] hover:text-white" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
                See How It Works <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex w-full max-w-[38rem] flex-col gap-4 rounded-[28px] border border-black/10 bg-white/70 p-5 shadow-[0_12px_32px_rgba(13,13,13,0.05)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-syne text-[28px] font-extrabold leading-none text-[#0D0D0D] md:text-[36px]">
                  {studentCount.toLocaleString()}
                </p>
                <p className="font-sans text-[14px] font-medium text-[#6B6B6B]">
                  students already on Campus Blink
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setWaitlistOpen(true)}
                  className="text-left text-sm font-bold text-[#0D0D0D] transition-colors hover:text-[#A16207]"
                >
                  Don&apos;t have an invite? Join the waitlist →
                </button>
                <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[#8A8578]">
                  MAIT rollout in progress
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Column Phone Mockup */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-8 flex w-full items-center justify-center lg:mt-0 lg:h-full lg:max-h-[calc(100vh-144px)] lg:justify-end lg:pr-2"
          >
            {/* The strict rules for phone sizing according to prompt */}
            <div className="pointer-events-none absolute inset-0 scale-90 rounded-[56px] bg-[#FFD600]/15 blur-[80px]" />
            <div style={{ height: 'min(85vh, 700px)', minHeight: '500px', aspectRatio: '9/19.5', width: 'auto' }} className="relative z-20 mx-auto flex w-[68vw] max-w-full shrink-0 flex-col overflow-hidden rounded-[40px] border-[6px] border-[#0D0D0D] bg-[#0A0A0A] shadow-[0_30px_60px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-4 hover:rotate-0 hover:animate-none hover:shadow-[0_45px_80px_rgba(0,0,0,0.3)] sm:w-[50vw] md:w-[40vw] lg:mx-0 lg:w-auto lg:rotate-[3deg] animate-float">
              
              {/* Dynamic island notch */}
              <div className="absolute left-1/2 top-3 z-30 h-[24px] w-[30%] -translate-x-1/2 rounded-full bg-black shadow-inner" />
              
              {/* Side Buttons Simulated via absolute divs */}
              <div className="pointer-events-none absolute top-[20%] -left-[8px] h-[30px] w-[3px] rounded-l-full bg-[#222]" />
              <div className="pointer-events-none absolute top-[28%] -left-[8px] h-[45px] w-[3px] rounded-l-full bg-[#222]" />
              <div className="pointer-events-none absolute top-[38%] -left-[8px] h-[45px] w-[3px] rounded-l-full bg-[#222]" />
              <div className="pointer-events-none absolute top-[30%] -right-[8px] h-[60px] w-[3px] rounded-r-full bg-[#222]" />

              {/* Mockup Top Bar / Header */}
              <div className="h-[60px] pt-[15px] flex items-center justify-between px-5 bg-[#141414] border-b border-[#ffffff0f] shrink-0">
                <div className="flex flex-col items-start gap-0 mt-1">
                  <img src={onlyLogoTransparent} className="h-[20px] w-auto max-w-none opacity-80 shrink-0 ml-1 drop-shadow-sm invert" alt="Campus Blink" loading="eager" />
                  <img src={textTransparent} className="h-[28px] w-auto max-w-none opacity-80 shrink-0 -mt-2 drop-shadow-sm invert" alt="Campus Blink" loading="eager" />
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1C1C1C] flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#FFD600]" />
                </div>
              </div>
              
              {/* Mockup Dashboard Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0A0A] hide-scrollbar pb-[100px]">
                {/* Greeting */}
                <div className="mb-4 text-left">
                  <h3 className="font-syne font-bold text-xl text-white">Hey, Mayank! 👋</h3>
                  <p className="text-[14px] text-[#888888] font-sans">Ready to own the campus?</p>
                </div>

                {/* Main Action Modules */}
                <div className="grid grid-cols-2 gap-3 min-h-0 shrink-0">
                  <div className="aspect-square bg-[#1C1C1C] rounded-2xl border border-[#FFD600]/20 p-4 flex flex-col justify-end group transition-colors ">
                    <Coffee className="text-[#FFD600] w-8 h-8 mb-2" />
                    <p className="font-syne text-[14px] text-white font-bold leading-tight">Canteen<br/>Express</p>
                  </div>
                  <div className="aspect-square bg-[#141414] rounded-2xl border border-[#ffffff0f] p-4 flex flex-col justify-end group transition-colors">
                    <Store className="text-white w-8 h-8 mb-2" />
                    <p className="font-syne text-[14px] text-white font-bold leading-tight">Buy &<br/>Sell</p>
                  </div>
                  <div className="aspect-square bg-[#141414] rounded-2xl border border-[#ffffff0f] p-4 flex flex-col justify-end group transition-colors">
                    <Printer className="text-white w-8 h-8 mb-2" />
                    <p className="font-syne text-[14px] text-white font-bold leading-tight">Print<br/>Shop</p>
                  </div>
                  <div className="aspect-square bg-[#141414] rounded-2xl border border-[#ffffff0f] p-4 flex flex-col justify-end group transition-colors">
                    <Users className="text-white w-8 h-8 mb-2" />
                    <p className="font-syne text-[14px] text-white font-bold leading-tight">Campus<br/>Stories</p>
                  </div>
                </div>

                {/* Live Order Widget */}
                <div className="w-full bg-[#FFD600] rounded-[20px] p-4 shrink-0 shadow-[0_0_24px_rgba(255,214,0,0.3)]">
                  <div className="flex w-full items-center justify-between text-left">
                    <div>
                      <p className="font-sans text-[10px] text-black/70 font-bold uppercase tracking-widest mb-1">Canteen Order</p>
                      <h4 className="font-syne font-bold text-black text-[16px] leading-[1.1]">Vada Pav, Cold Coffee</h4>
                      <p className="text-[12px] text-black font-medium mt-1">Ready in 5 mins</p>
                    </div>
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center animate-pulse shrink-0 ml-2">
                      <Coffee className="w-5 h-5 text-[#FFD600]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Nav Mockup */}
              <div className="absolute bottom-0 left-0 right-0 z-10 flex h-[60px] w-full items-center justify-around rounded-t-[28px] border-t border-[#ffffff1a] bg-[#0A0A0A]/95 px-2 pb-2 text-white backdrop-blur-xl">
                <div className="w-12 h-10 flex flex-col items-center justify-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-[#FFD600]/20 flex items-center justify-center ">
                     <Star className="w-4 h-4 text-[#FFD600] fill-[#FFD600]" />
                  </div>
                  <div className="w-1 h-1 rounded-full bg-[#FFD600]" />
                </div>
                <div className="w-12 h-10 flex flex-col items-center justify-center gap-1 opacity-50"><Store className="w-5 h-5" /></div>
                <div className="w-12 h-10 flex flex-col items-center justify-center gap-1 opacity-50"><Printer className="w-5 h-5" /></div>
                <div className="w-12 h-10 flex flex-col items-center justify-center gap-1 opacity-50"><Users className="w-5 h-5" /></div>
                <div className="w-12 h-10 flex flex-col items-center justify-center gap-1 opacity-50"><User className="w-5 h-5" /></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {waitlistOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setWaitlistOpen(false)} />
          <div className="relative w-full max-w-md rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_24px_60px_rgba(13,13,13,0.16)]">
            <h3 className="font-syne text-3xl font-extrabold text-[#0D0D0D]">Join Waitlist</h3>
            <p className="mt-2 text-sm text-[#6B6B6B]">No invite yet? Drop your details and we will reach out with a code.</p>

            <form onSubmit={handleWaitlistSubmit} className="mt-5 space-y-3">
              <input
                value={waitlistName}
                onChange={(event) => setWaitlistName(event.target.value)}
                placeholder="Name"
                required
                className="w-full rounded-2xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-[#FFD600]"
              />
              <input
                value={waitlistEmail}
                onChange={(event) => setWaitlistEmail(event.target.value)}
                placeholder="Email"
                type="email"
                required
                className="w-full rounded-2xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-[#FFD600]"
              />
              <input
                value={waitlistCollege}
                onChange={(event) => setWaitlistCollege(event.target.value)}
                placeholder="College"
                className="w-full rounded-2xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-[#FFD600]"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWaitlistOpen(false)}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#0D0D0D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={waitlistLoading}
                  className="rounded-full bg-[#FFD600] px-5 py-2 text-sm font-bold text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-[#FFD600] disabled:opacity-60"
                >
                  {waitlistLoading ? 'Joining...' : 'Join Waitlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Ticker */}
      <div className="w-full bg-[#0D0D0D] py-[22px] md:py-[28px] overflow-hidden flex items-center whitespace-nowrap -rotate-2 scale-[1.05] border-y-4 border-[#FFD600] shadow-strong z-30 relative group">
        <motion.div
          animate={{ x: [0, "-50%"] }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 120 }}
          className="flex items-center gap-6 md:gap-8 font-sans font-bold text-[#FFD600] text-sm md:text-lg uppercase tracking-[2px] md:tracking-widest pl-6 md:pl-8 w-max group-hover:[animation-play-state:paused] leading-none"
        >
          {Array(8).fill(tickerItems).flat().map((item, i) => (
            <div key={i} className="flex items-center gap-6 md:gap-8 contents">
              <span>{item}</span>
              <span className="text-white">✦</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Features */}
      <section id="features" className="py-24 px-5 md:px-12 bg-[#F2F0EB] relative overflow-hidden z-20 w-full" >
        <div className="max-w-[1280px] mx-auto z-10 relative">
          <div className="mb-16 max-w-[760px]">
            <h2 className="fluid-h2 mb-4 text-[#0D0D0D]">
              One app.<br/>Zero campus headaches.
            </h2>
            <p className="landing-kicker max-w-2xl text-[#5F5A50]">
              We looked at every annoying thing about college life and built a solution for each one.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
            {[
              { title: "Buy & Sell", headline: "Your senior's textbook wants a new owner.", desc: "Why buy new when your senior bought the same book last year? Buy and sell used books, notes, and electronics at student prices.", icon: Store, tags: ["Used Books", "Electronics", "Notes"] },
              { title: "LazyPeeps Canteen", headline: "Your vada pav is ready before you complain.", desc: "Pre-order from the canteen, pick a time slot, skip the entire queue. Get notified the second your food is ready. Eat hot. Study more.", icon: Coffee, tags: ["Pre-order", "Live Tracking", "UPI Pay"] },
              { title: "Print & Stationery", headline: "Upload. Print. Collect. That's it.", desc: "Upload your PDF from your phone, choose your settings, and walk in to collect — no waiting. Stationery delivered to your hostel door.", icon: Printer, tags: ["PDF Upload", "Delivery", "Binding"] },
              { title: "Community", headline: "Your college's secrets, notices, and memes.", desc: "From official exam notices to anonymous confessions nobody saw coming. Internships, discussions, lost & found, and relatable memes.", icon: Users, tags: ["Notices", "Confessions", "Memes"] }
            ].map((feat, i) => (
              <motion.div key={i} whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 40 }} viewport={{ once: true, margin: "-10%" }} transition={{ duration: 0.5, delay: i * 0.1 }} className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-black/10 border-t-[3px] border-t-[#FFD600] bg-white p-8 shadow-[0_12px_30px_rgba(13,13,13,0.04)] transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(13,13,13,0.08)] md:p-10">
                <feat.icon className="absolute top-4 right-4 w-48 h-48 text-[#0D0D0D] opacity-[0.03] group-hover:text-[#FFD600] group-hover:opacity-[0.08] transition-colors duration-500 pointer-events-none" />
                
                <h3 className="font-syne font-bold text-[#0D0D0D] text-2xl mb-2 relative z-10">{feat.title}</h3>
                <h4 className="font-syne font-semibold text-[#0D0D0D] text-xl md:text-2xl mb-4 leading-tight relative z-10">{feat.headline}</h4>
                <p className="font-sans text-[#6B6B6B] font-light leading-relaxed mb-8 relative z-10 flex-1">{feat.desc}</p>
                
                <div className="flex flex-wrap gap-2 relative z-10 mt-auto w-full">
                  {feat.tags.map((tag, j) => (
                    <span key={j} className="whitespace-nowrap rounded-full border border-[#0D0D0D] px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-[#0D0D0D]">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For Students */}
      <section className="py-24 bg-[#FAFAF8] relative overflow-hidden w-full">
        <div className="max-w-[1280px] w-full mx-auto z-10 relative px-5 md:px-12">
          <div className="mb-12 max-w-[820px]">
            <div className="mb-6 inline-block rounded-full border border-black/10 bg-transparent px-4 py-2 font-sans text-[10px] font-medium uppercase tracking-widest text-[#6B6B6B]">FOR STUDENTS</div>
            <h2 className="fluid-h2 mb-6 text-[#0D0D0D]">
              Built for the<br/>
              way students<br/>
              actually live.
            </h2>
            <p className="landing-kicker max-w-2xl text-[#5F5A50]">
              No more queues. No more overpriced books. No more 'bhaiya print kab milega?' Campus Blink gets it — because we are students too.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Buy cheap. Sell smart.", icon: "🛒", desc: "Your senior's textbook is sitting in a cupboard collecting dust. Buy it for half the price. Sell your old stuff before the semester ends. No middlemen. No commission.", tags: ["Used Books", "Electronics", "Notes", "Uniforms"] },
              { title: "Skip the queue. Always.", icon: "🍔", desc: "Pre-order your vada pav before you leave class. Pick a time slot. Walk in and collect. While everyone else is standing in line, you are already eating. That is the Campus Blink way.", tags: ["Pre-order", "Live Tracking", "UPI Pay", "No Queue"] },
              { title: "Print from your bed.", icon: "🖨️", desc: "Upload your PDF from your phone right now. Choose pages, copies, color or black and white. Walk to the shop only when it is ready. No waiting. No explaining. No drama.", tags: ["PDF Upload", "Color & B&W", "Binding", "Stationery"] },
              { title: "Your campus. Unfiltered.", icon: "🌐", desc: "Exam notices, internship openings, the hottest campus gossip, memes your professor must never see, and confessions nobody will trace back to you. All in one feed. Completely anonymous if you want.", tags: ["Notices", "Internships", "Memes", "Confessions"] },
              { title: "Use the app. Build Reputation.", icon: "⭐", desc: "Every time you sell something, post in the community, or rate your canteen order, you earn Reputation Points. Spend them on perks inside the app.", tags: ["Earn Reputation", "Sell Items", "Rate Orders", "Spend"] },
              { title: "Turn skills into money.", icon: "💼", desc: "Can you design? Code? Write? Edit videos? Post your freelance profile on Campus Blink and get hired by other students and teachers right on your own campus. Real money. Real projects. No platforms fees.", tags: ["Design", "Coding", "Content", "Video Editing"] }
            ].map((feat, i) => (
              <div key={i} className="relative flex h-full flex-col rounded-[28px] border border-black/10 border-t-[3px] border-t-[#FFD600] bg-white p-[28px] shadow-[0_12px_30px_rgba(13,13,13,0.04)] transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(13,13,13,0.08)]">
                <div className="text-[32px] mb-6">{feat.icon}</div>
                <h3 className="font-syne font-semibold text-[#0D0D0D] text-xl mb-3 relative z-10">{feat.title}</h3>
                <p className="font-sans text-[#6B6B6B] font-light text-[15px] leading-relaxed mb-6 flex-1 relative z-10">{feat.desc}</p>
                <div className="flex flex-wrap gap-2 relative z-10 mt-auto w-full">
                  {feat.tags.map((tag, j) => (
                    <span key={j} className="whitespace-nowrap rounded-full border border-[#0D0D0D] px-3 py-1 font-sans text-[12px] font-medium text-[#0D0D0D]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex w-full flex-col items-center justify-between gap-6 rounded-[32px] bg-[#FFD600] p-[32px] text-center text-[#0D0D0D] md:flex-row md:px-[48px] md:py-[32px] md:text-left">
            <h3 className="font-syne font-bold text-2xl md:text-[32px] leading-tight max-w-[340px]">And it is completely free for students.</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto text-left">
              <p className="font-sans font-medium text-[15px] md:max-w-[280px] leading-relaxed text-center sm:text-left">No subscription. No hidden charges. Just download, sign up with your college email, and start using everything instantly.</p>
              <button className="w-full shrink-0 whitespace-nowrap rounded-full bg-[#0D0D0D] px-8 py-4 font-sans font-bold text-white transition-transform hover:scale-105 sm:w-auto" onClick={() => navigate('/login')}>
                Get Early Access →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 bg-[#F2F0EB] relative overflow-hidden w-full border-t border-black/5">
        <div className="max-w-[1280px] mx-auto px-5 md:px-12 relative z-10 w-full">
          <div className="mb-16 text-center lg:text-left">
            <h2 className="fluid-h2 mb-4 text-[#0D0D0D]">How it works</h2>
            <p className="landing-kicker text-[#5F5A50]">From signup to sorted — in under two minutes.</p>
          </div>

          <div className="relative">
            {/* Desktop connecting dashed line */}
            <div className="hidden lg:block absolute top-[28px] left-[56px] right-[56px] h-0 border-t-2 border-dashed border-black/20 z-0" />
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-8 w-full">
              {[
                { step: "1", title: "Sign up", desc: "Just your name, college, email, and password. No forms. No waiting." },
                { step: "2", title: "Select college", desc: "We'll set up your personalized campus feed and marketplace instantly." },
                { step: "3", title: "Start using", desc: "Order food, list old books, upload a print job, browse internships." },
                { step: "4", title: "Invite campus", desc: "Share your referral link and earn +20 Reputation when your friend joins." }
              ].map((step, i) => (
                <motion.div key={i} whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} viewport={{ once:true }} transition={{ duration: 0.4, delay: i * 0.15 }} className="relative z-10 flex flex-row lg:flex-col items-start lg:items-center gap-6 lg:gap-8 text-left lg:text-center w-full">
                  <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full border-[4px] border-[#F2F0EB] bg-[#0D0D0D] font-syne text-2xl font-extrabold text-[#FFD600]">
                    {step.step}
                  </div>
                  <div className="w-full">
                    <h3 className="font-syne font-semibold text-[#0D0D0D] text-xl mb-2">{step.title}</h3>
                    <p className="font-sans text-[#6B6B6B] font-light text-[14px] lg:text-[15px] leading-relaxed break-words">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Decorative Mascot */}
        <img src={onlyLogoTransparent} className="absolute bottom-[20px] right-[20px] w-[120px] opacity-[0.15] pointer-events-none rotate-[15deg] hidden lg:block" alt="Campus Blink" loading="lazy" width={120} height={120} style={{ objectFit: 'contain' }} />
      </section>

      {/* Stats */}
      <section className="py-24 bg-[#0D0D0D] w-full">
        <div className="max-w-[1280px] mx-auto px-5 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10 w-full">
          {[
            { num: "4", text: "Powerful modules built for campus life" },
            { num: "1", text: "App for students, teachers & campus shops" },
            { num: "0", text: "Reasons to wait in the canteen queue again" }
          ].map((stat, i) => (
            <motion.div key={i} whileInView={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.9 }} viewport={{ once:true }} transition={{ duration: 0.4 }} className="text-center py-8 md:py-0 md:px-8 flex flex-col items-center justify-center relative w-full">
              <span className="font-syne font-extrabold fluid-stat text-[#FFD600] mb-2 relative z-10 leading-none drop-shadow-[0_0_24px_rgba(255,214,0,0.2)]">
                {stat.num}
              </span>
              <p className="font-sans text-[16px] text-[#888888] font-light max-w-[200px] break-words">{stat.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-5 md:px-12 w-full bg-[#F2F0EB]">
        <div className="max-w-[800px] mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="fluid-h2 text-[#0D0D0D] mb-4">Frequently Asked Questions</h2>
            <p className="font-sans text-[16px] md:text-[18px] text-[#6B6B6B] font-light max-w-2xl mx-auto">Got questions? We've got answers. If you can't find what you're looking for, feel free to contact us.</p>
          </div>
          
          <div className="space-y-4 w-full text-left">
            {[
              { q: 'Is Campus Blink free to use?', a: 'Yes! Core features of Campus Blink are completely free for students. Some premium print or marketplace shop services may have standard costs set by the vendors.' },
              { q: 'Can I sell my old books and items here?', a: 'Absolutely. The Marketplace feature allows students to buy and sell pre-loved books, electronics, and other essentials within the campus natively without any middleman fees.' },
              { q: 'How does canteen ordering work?', a: 'Just browse your college canteen\'s menu, add items to your cart, place an order, and pick it up when it\'s ready. No more waiting in long lines!' },
              { q: 'Can I share notes on the Community feed?', a: 'Yes, the Community module is perfect for sharing notes, starting discussions, polling your peers, or simply asking for help regarding classes.' },
              { q: 'Can I print my documents automatically?', a: 'Yes, just upload your PDFs via the Print module, configure your preferences (color, sides), and collect your printed pages straight from your campus print shop.' }
            ].map((faq, index) => (
              <details key={index} className="group rounded-xl border border-black/10 bg-white p-6 open:bg-white transition-all duration-300">
                <summary className="flex cursor-pointer items-center justify-between font-syne font-semibold text-lg text-[#0D0D0D] list-none outline-none [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 transition-transform group-open:rotate-180">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </summary>
                <div className="mt-4 font-sans text-[15px] font-light leading-relaxed text-[#6B6B6B]">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 px-5 md:px-12 w-full bg-[#FAFAF8]">
        <div className="relative mx-auto w-full max-w-[1200px] overflow-hidden rounded-[32px] border border-[#FFD600]/30 bg-[#0D0D0D] p-8 text-center md:p-16 lg:p-24">
           <div className="absolute inset-0  opacity-20 mix-blend-overlay pointer-events-none" />
           <img src={onlyLogoTransparent} className="absolute top-[50%] -translate-y-[50%] right-[-50px] w-[300px] opacity-[0.06] pointer-events-none hidden md:block invert" alt="Campus Blink" loading="lazy" width={300} height={300} style={{ objectFit: 'contain' }} />
           <div className="relative z-10 flex flex-col items-center text-center w-full">
             <div className="flex flex-col items-center justify-center mb-8 mx-auto drop-shadow-sm transition-transform hover:scale-105">
               <img src={whiteLogoFull} alt="Campus Blink" loading="lazy" className="h-[92px] md:h-[108px] w-auto object-contain shrink-0" />
             </div>
             <h2 className="fluid-h2 text-white mb-6">
               Stop waiting.<br className="sm:hidden" /> Start blinking.
             </h2>
             <p className="font-sans text-[16px] md:text-[18px] text-[#888888] font-light max-w-xl mx-auto mb-10 leading-relaxed break-words">
               Join thousands of students who are done wasting time on campus. Campus Blink is free, fast, and built just for you. No credit card. No approval needed.
             </p>
             <button className="w-full rounded-full bg-[#FFD600] px-10 py-4 text-lg font-sans font-bold text-[#0D0D0D] transition-transform hover:scale-105 hover:shadow-[0_0_24px_rgba(255,214,0,0.4)] sm:w-auto" onClick={() => navigate(user ? '/student/home' : '/login')}>
               {user ? 'Go to Dashboard' : 'Get Early Access'}
             </button>

             <div className="mt-6 flex flex-col items-center gap-3">
               <p className="font-sans text-sm text-[#CFCFCF]">Have any queries? Contact us.</p>
               <Link
                 to="/contact"
                 className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:border-[#FFD600] hover:bg-[#FFD600] hover:text-[#0D0D0D]"
               >
                 Contact Us
               </Link>
             </div>
           </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-black/10 bg-[#F2F0EB] pt-16 pb-8 px-5 md:px-12 w-full">
        <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row justify-between items-center lg:items-start gap-8 mb-12 text-center lg:text-left w-full">
          <div className="flex flex-col items-center lg:items-start w-full lg:w-auto">
            <div className="flex flex-col items-center lg:items-start justify-center mb-6 drop-shadow-sm transition-transform hover:scale-105">
               <img src={onlyLogoTransparent} alt="Campus Blink Icon" loading="lazy" className="h-[55px] w-auto object-contain shrink-0 lg:ml-2" />
               <img src={textTransparent} alt="Campus Blink" loading="lazy" className="h-[75px] w-auto object-contain -mt-4 shrink-0" />
             </div>
            <p className="font-sans text-[14px] text-[#6B6B6B] font-light leading-relaxed max-w-xs break-words">
              Made for students.<br/>
              Built with way too much chai and zero sleep. ☕
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-end gap-6 sm:gap-8 font-sans font-medium text-[15px] w-full lg:w-auto">
            <a href="#features" className="text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors whitespace-nowrap">Features</a>
            <Link to="/about" className="text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors whitespace-nowrap">About</Link>
            <Link to="/contact" className="text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors whitespace-nowrap">Contact</Link>
            <Link to="/privacy" className="text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors whitespace-nowrap">Privacy Policy</Link>
            <Link to="/terms" className="text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors whitespace-nowrap">Terms</Link>
          </div>
        </div>
        
        <div className="max-w-[1280px] mx-auto pt-8 border-t border-black/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[13px] font-sans text-[#AAAAAA] w-full text-center md:text-left">
          <p>Campus Blink — Your campus, supercharged. ⭐</p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 w-full md:w-auto">
            <p className="break-words w-full sm:w-auto">© 2026 Campus Blink. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
