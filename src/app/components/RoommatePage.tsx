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
    <div className="min-h-full bg-[#FAFAF8] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-[980px] space-y-5">
        <section className="rounded-[20px] border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(13,13,13,0.06)]">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[#CA8A04]" />
            <h1 className="font-syne text-3xl font-extrabold tracking-tight text-[#0D0D0D]">Find Your roommate</h1>
          </div>
          <p className="mt-1 text-sm text-[#6B6B6B]">Post your location and requirements so students can contact you.</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-[#0D0D0D]">Address</span>
              <div className="flex items-center gap-2 rounded-md border border-[#E8E8E8] bg-[#FFFCF5] px-3 py-2.5">
                <MapPin className="h-4 w-4 text-[#9B9B9B]" />
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Flat/Hostel address" />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#0D0D0D]">Expected Rent (optional)</span>
              <input value={rent} onChange={(e) => setRent(e.target.value)} className="w-full rounded-md border border-[#E8E8E8] bg-[#FFFCF5] px-3 py-2.5 text-sm outline-none" placeholder="e.g. 8000" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#0D0D0D]">Notes (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md border border-[#E8E8E8] bg-[#FFFCF5] px-3 py-2.5 text-sm outline-none" placeholder="Non-smoker, female flatmate, etc." />
            </label>
          </div>

          <button onClick={publish} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0D0D0D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#FFD600] hover:text-[#0D0D0D]">
            <UserPlus className="h-4 w-4" /> Post roommate requirement
          </button>
        </section>

        <section className="rounded-[20px] border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(13,13,13,0.06)]">
          <h2 className="font-syne text-2xl font-extrabold text-[#0D0D0D]">Recent roommate posts</h2>

          {sortedPosts.length === 0 ? (
            <p className="mt-3 text-sm text-[#6B6B6B]">No roommate posts yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {sortedPosts.map((post) => {
                const own = post.userId === profile?.id;
                return (
                  <article key={post.id} className="rounded-[12px] border border-[#E8E8E8] bg-[#FFFCF5] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold text-[#0D0D0D]">{post.name}</p>
                        <p className="mt-1 text-[13px] text-[#6B6B6B]">{new Date(post.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!own && profile?.id ? (
                          <Link
                            to="/student/campus-exchange/messages"
                            className="inline-flex items-center gap-1 rounded-md border border-[#E8E8E8] px-2.5 py-1.5 text-xs text-[#0D0D0D] hover:bg-[#F5F4F0]"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Chat
                          </Link>
                        ) : null}
                        {own && (
                          <button onClick={() => removePost(post.id)} className="inline-flex items-center gap-1 rounded-md border border-[#E8E8E8] px-2.5 py-1.5 text-xs text-[#6B6B6B] hover:bg-[#F5F4F0]">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-[#0D0D0D]"><span className="font-semibold">Address:</span> {post.address}</p>
                    {post.rent ? <p className="mt-1 text-sm text-[#0D0D0D]"><span className="font-semibold">Rent:</span> {post.rent}</p> : null}
                    {post.note ? <p className="mt-1 text-sm text-[#0D0D0D]"><span className="font-semibold">Note:</span> {post.note}</p> : null}
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
