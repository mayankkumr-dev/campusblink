import React from 'react';
import { AlertTriangle, Mail } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

export const AccountRestrictedPage: React.FC = () => {
  const [params] = useSearchParams();
  const status = (params.get('status') || 'restricted').toLowerCase();
  const reason = params.get('reason') || '';
  const email = params.get('email') || '';

  const isBanned = status === 'banned';
  const heading = isBanned ? 'Account Banned' : 'Account Restricted';
  const message = isBanned
    ? 'Your account has been banned by the admin team. You cannot log in at this time.'
    : 'Your account has been restricted by the admin team. You can access the website, but you cannot log in until your restriction is removed.';
  const contactSearch = new URLSearchParams({
    category: 'account',
    issue: 'restriction',
    status,
  });
  if (reason) contactSearch.set('reason', reason);
  if (email) contactSearch.set('email', email);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-xl rounded-lg border border-black/10 bg-[var(--bg)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[#FEE2E2] text-[#DC2626]">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-center font-syne text-3xl font-extrabold text-[var(--text-primary)]">{heading}</h1>
        <p className="mt-4 text-center text-sm leading-7 text-[#3A3A3A]">{message}</p>

        {reason ? (
          <div className="mt-5 rounded-lg border border-[#FEE2E2] bg-[#FFF5F5] p-4 text-sm text-[#7F1D1D]">
            <p className="font-bold">Admin note</p>
            <p className="mt-1">{reason}</p>
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border border-black/10 bg-[var(--bg-primary)] p-4 text-sm text-[#4A4A4A]">
          If you think this was a mistake, contact admin and include your registered email ID.
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={`/contact?${contactSearch.toString()}`}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--text-primary)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]"
          >
            <Mail className="h-4 w-4" /> Contact Admin
          </Link>
          <Link to="/" className="rounded-md border border-black/10 px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-primary)]">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
