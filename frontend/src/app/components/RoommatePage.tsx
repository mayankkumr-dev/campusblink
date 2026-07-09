import React, { useEffect, useMemo, useState } from 'react';
import { Home, MapPin, MessageCircle, Trash2, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

type RoommatePost = {
  id: string;
  userId: string;
  name: string;
  address: string;
  rent: string;
  note: string;
  createdAt: string;
};

const STORAGE_KEY = 'cb-roommate-posts-v1';

function loadPosts(): RoommatePost[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePosts(posts: RoommatePost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export const RoommatePage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [posts, setPosts] = useState<RoommatePost[]>([]);
  const [address, setAddress] = useState('');
  const [rent, setRent] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setPosts(loadPosts());
  }, []);

  const sortedPosts = useMemo(() => [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [posts]);

  const publish = () => {
    if (!profile?.id) {
      toast.error('Please log in first.');
      return;
    }
    if (!address.trim()) {
      toast.error('Address is required.');
      return;
    }

    const nextPost: RoommatePost = {
      id: crypto.randomUUID(),
      userId: profile.id,
      name: profile.name || 'Student',
      address: address.trim(),
      rent: rent.trim(),
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    const next = [nextPost, ...posts];
    setPosts(next);
    savePosts(next);
    setAddress('');
    setRent('');
    setNote('');
    toast.success('Roommate post published.');
  };

  const removePost = (id: string) => {
    const next = posts.filter((post) => post.id !== id);
    setPosts(next);
    savePosts(next);
    toast.success('Post deleted.');
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-6 pb-24 sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Sleek Posting Form Section */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-syne text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Find Your Roommate
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Post your location and requirements so verified campus students can connect with you.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Hostel / Flat Address *
              </span>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 pl-11 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 shadow-2xs"
                  placeholder="e.g. Hostels Block C, Flat 402 near Campus Gate 2..."
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Expected Rent (Optional)
              </span>
              <input
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 shadow-2xs"
                placeholder="e.g. ₹7,500 / month"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Preferences & Notes (Optional)
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 shadow-2xs"
                placeholder="e.g. Non-smoker, clean habits, study-focused..."
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={publish}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2.2} />
              Post Roommate Requirement
            </button>
          </div>
        </section>

        {/* Structured Scannable Recent Roommate Posts Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="font-syne text-xl sm:text-2xl font-extrabold text-slate-900">
                Recent Roommate Posts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse active requirements posted by fellow students on campus.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs">
              {sortedPosts.length} Active
            </span>
          </div>

          {sortedPosts.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white px-8 py-16 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="mx-auto mb-3.5 h-14 w-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Home className="h-6 w-6" />
              </div>
              <p className="font-syne text-lg font-bold text-slate-900">No roommate posts yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Be the first to post a requirement using the form above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedPosts.map((post) => {
                const own = post.userId === profile?.id;
                return (
                  <article
                    key={post.id}
                    className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-syne font-bold text-sm shrink-0">
                            {post.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-syne font-bold text-base text-slate-900 truncate">
                              {post.name}
                            </h3>
                            <p className="text-xs text-slate-400">
                              {new Date(post.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        {post.rent ? (
                          <span className="shrink-0 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-bold text-blue-600">
                            {post.rent}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex items-start gap-2.5">
                        <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {post.address}
                        </p>
                      </div>

                      {post.note ? (
                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 leading-relaxed">
                          <span className="font-semibold text-slate-700">Note: </span>
                          {post.note}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-400">Verified campus student</span>
                      <div className="flex items-center gap-2">
                        {!own && profile?.id ? (
                          <Link
                            to="/student/campus-exchange/messages"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Connect
                          </Link>
                        ) : null}
                        {own && (
                          <button
                            onClick={() => removePost(post.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

