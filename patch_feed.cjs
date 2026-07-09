const fs = require('fs');
const path = require('path');

const frontendPath = path.join(__dirname, 'frontend', 'src', 'app', 'components');

const communityFeedContent = `import React, { useState } from 'react';
import PostCard from './PostCard';
import { Image as ImageIcon, MapPin, Smile, List, Calendar } from 'lucide-react';

const MOCK_POSTS = [
  { id: 1, author: 'Campus Admin', username: '@admin', content: 'Welcome to the new Campus Blink!', time: '2h', likes: 120, comments: 45, reposts: 12, views: '10K', bookmarked: false },
  { id: 2, author: 'Computer Science Dept', username: '@cs_dept', content: 'Don\\'t forget about the hackathon this weekend! 🚀', time: '5h', likes: 340, comments: 20, reposts: 50, views: '15K', bookmarked: true },
];

export default function CommunityFeed() {
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');

  return (
    <div className="w-full flex justify-center bg-black min-h-screen text-white">
      {/* Main Feed Column */}
      <div className="w-full max-w-[600px] border-x border-[#2f3336] flex flex-col min-h-screen">
        {/* Header Tabs */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-[#2f3336]">
          <h2 className="px-4 py-3 text-xl font-bold">Home</h2>
          <div className="flex w-full mt-1">
            <button 
              onClick={() => setActiveTab('foryou')}
              className="flex-1 hover:bg-[#181818] transition flex justify-center pb-0"
            >
              <div className="relative py-3">
                <span className={\`font-medium \${activeTab === 'foryou' ? 'text-white' : 'text-[#71767b]'}\`}>For you</span>
                {activeTab === 'foryou' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1d9bf0] rounded-full"></div>
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('following')}
              className="flex-1 hover:bg-[#181818] transition flex justify-center pb-0"
            >
              <div className="relative py-3">
                <span className={\`font-medium \${activeTab === 'following' ? 'text-white' : 'text-[#71767b]'}\`}>Following</span>
                {activeTab === 'following' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1d9bf0] rounded-full"></div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Composer */}
        <div className="p-4 border-b border-[#2f3336] flex gap-3">
          <div className="w-10 h-10 rounded-full bg-[#16181C] flex-shrink-0 flex items-center justify-center text-gray-400 font-bold overflow-hidden">
             <img src="https://ui-avatars.com/api/?name=User&background=1d9bf0&color=fff" alt="User" />
          </div>
          <div className="flex-1 flex flex-col">
            <textarea 
              placeholder="What is happening?!" 
              className="w-full bg-transparent text-xl outline-none resize-none min-h-[50px] text-white placeholder-[#71767b]"
              rows={2}
            />
            <div className="border-b border-[#2f3336] my-2 w-full pb-2 hidden"></div>
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-1 text-[#1d9bf0]">
                <button className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition"><ImageIcon size={20} /></button>
                <button className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition hidden sm:block"><List size={20} /></button>
                <button className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition"><Smile size={20} /></button>
                <button className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition hidden sm:block"><Calendar size={20} /></button>
                <button className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition"><MapPin size={20} /></button>
              </div>
              <button className="bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold py-1.5 px-4 rounded-full transition">
                Post
              </button>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="flex-1">
          {MOCK_POSTS.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-[350px] pl-8 py-2 min-h-screen">
        <div className="sticky top-2">
          <div className="bg-[#16181C] rounded-2xl mb-4 p-4">
            <h2 className="font-bold text-xl mb-4 text-white">Subscribe to Premium</h2>
            <p className="text-[15px] mb-3 text-white">Subscribe to unlock new features and if eligible, receive a share of ads revenue.</p>
            <button className="bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold py-2 px-4 rounded-full transition">Subscribe</button>
          </div>
          
          <div className="bg-[#16181C] rounded-2xl p-4">
            <h2 className="font-bold text-xl mb-4 text-white">What's happening</h2>
            {/* Trends items... */}
            <div className="mb-4">
              <p className="text-sm text-[#71767b]">Trending in Campus</p>
              <p className="font-bold text-white mt-0.5">#Hackathon2024</p>
              <p className="text-sm text-[#71767b] mt-0.5">2,543 posts</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-[#71767b]">Technology · Trending</p>
              <p className="font-bold text-white mt-0.5">React 19</p>
              <p className="text-sm text-[#71767b] mt-0.5">15K posts</p>
            </div>
            <button className="text-[#1d9bf0] hover:text-[#1a8cd8] text-[15px] transition">Show more</button>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const postCardContent = `import React from 'react';
import { MessageCircle, Repeat2, Heart, Share, BarChart2, Bookmark } from 'lucide-react';

interface PostProps {
  post: {
    id: number;
    author: string;
    username: string;
    content: string;
    time: string;
    likes: number;
    comments: number;
    reposts: number;
    views: string;
    bookmarked?: boolean;
  };
}

export default function PostCard({ post }: PostProps) {
  return (
    <div className="border-b border-[#2f3336] p-4 hover:bg-[#080808] transition cursor-pointer text-white">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#16181C] flex-shrink-0 flex items-center justify-center text-gray-400 font-bold overflow-hidden">
          <img src={\`https://ui-avatars.com/api/?name=\${post.author.charAt(0)}&background=1d9bf0&color=fff\`} alt={post.author} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[15px]">
            <span className="font-bold hover:underline truncate text-white">{post.author}</span>
            <span className="text-[#71767b] truncate">{post.username}</span>
            <span className="text-[#71767b]">·</span>
            <span className="text-[#71767b] hover:underline whitespace-nowrap">{post.time}</span>
          </div>
          
          <div className="mt-0.5 text-[15px] whitespace-pre-wrap text-white">
            {post.content}
          </div>
          
          {/* Action Bar */}
          <div className="flex justify-between items-center mt-3 text-[#71767b] max-w-md">
            <button className="flex items-center gap-2 group hover:text-[#1d9bf0] transition">
              <div className="p-2 group-hover:bg-[#1d9bf0]/10 rounded-full -ml-2 transition">
                <MessageCircle size={18} />
              </div>
              <span className="text-[13px]">{post.comments}</span>
            </button>
            
            <button className="flex items-center gap-2 group hover:text-[#00ba7c] transition">
              <div className="p-2 group-hover:bg-[#00ba7c]/10 rounded-full -ml-2 transition">
                <Repeat2 size={18} />
              </div>
              <span className="text-[13px]">{post.reposts}</span>
            </button>
            
            <button className="flex items-center gap-2 group hover:text-[#f91880] transition">
              <div className="p-2 group-hover:bg-[#f91880]/10 rounded-full -ml-2 transition">
                <Heart size={18} />
              </div>
              <span className="text-[13px]">{post.likes}</span>
            </button>
            
            <button className="flex items-center gap-2 group hover:text-[#1d9bf0] transition">
              <div className="p-2 group-hover:bg-[#1d9bf0]/10 rounded-full -ml-2 transition">
                <BarChart2 size={18} />
              </div>
              <span className="text-[13px]">{post.views}</span>
            </button>
            
            <div className="flex items-center gap-0">
              <button className="p-2 hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] rounded-full transition">
                <Bookmark size={18} className={post.bookmarked ? 'fill-[#1d9bf0] text-[#1d9bf0]' : ''} />
              </button>
              <button className="p-2 hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] rounded-full transition">
                <Share size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(frontendPath, 'CommunityFeed.tsx'), communityFeedContent);
fs.writeFileSync(path.join(frontendPath, 'PostCard.tsx'), postCardContent);
console.log('Successfully patched CommunityFeed.tsx and PostCard.tsx');
