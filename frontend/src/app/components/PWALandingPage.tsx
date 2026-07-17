import React from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Logo } from './ui/Logo';

export const PWALandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-dvh bg-[var(--bg-primary)] dark:bg-[#0a0a0a] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[var(--yellow)]/20 dark:bg-amber-500/15 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-blue-500/20 dark:bg-blue-500/15 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] bg-purple-500/20 dark:bg-purple-500/15 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center max-w-sm w-full"
        >
          {/* App Logo */}
          <div className="mb-10 p-6 bg-white/50 dark:bg-black/30 backdrop-blur-2xl rounded-[32px] border border-black/5 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-none">
            <Logo className="h-16 w-auto drop-shadow-md" alt="Campus Blink Logo" />
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-12 space-y-3">
            <h1 className="font-syne text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
              Welcome to Campus
            </h1>
            <p className="text-[var(--text-secondary)] font-medium text-[15px] leading-relaxed">
              Your entire campus life, perfectly organized in one powerful app.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-4">
            <Link
              to="/login"
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[var(--text-primary)] px-6 py-4 text-[15px] font-bold text-[var(--bg)] shadow-lg transition-all hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 active:scale-[0.98]"
            >
              <span className="relative z-10">Sign In</span>
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer minimal */}
      <div className="pb-8 pt-4 text-center relative z-10 flex flex-col items-center opacity-60">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--text-secondary)]">
          Campus Blink
        </p>
      </div>
    </div>
  );
};
