import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, MoreHorizontal } from 'lucide-react';

export const SocietyProfilePage = () => {
  const [activeTab, setActiveTab] = useState<'Updates' | 'Events' | 'About'>('Events');

  // Mock data for demonstration purposes
  const society = {
    name: 'Tech Innovators Club',
    category: 'Technology',
    followers: '1.2k',
    bio: 'Empowering students to build the future through code, hardware, and design. Join us for weekly workshops and hackathons.',
    bannerImg: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200',
    logoImg: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=256',
    team: [
      { id: 1, name: 'Alice Chen', title: 'President', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=128' },
      { id: 2, name: 'Bob Smith', title: 'Tech Lead', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=128' },
      { id: 3, name: 'Carla Diaz', title: 'Design Head', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=128' },
      { id: 4, name: 'David Kim', title: 'Events', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=128' },
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative">
      {/* 1. Hero Header & Actions */}
      <div className="relative">
        {/* Top Image Header */}
        <div className="h-48 md:h-56 w-full relative">
          {/* Optional Premium Navigation Controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <button className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-sm transition-transform active:scale-95">
              <ChevronLeft size={20} />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-sm transition-transform active:scale-95">
              <MoreHorizontal size={20} />
            </button>
          </div>
          
          <img 
            src={society.bannerImg} 
            alt="Society Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        </div>

        {/* Profile Info Container */}
        <div className="px-4 pb-6 bg-white rounded-b-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] relative">
          <div className="relative flex justify-between items-end">
            <img 
              src={society.logoImg} 
              alt={`${society.name} Logo`} 
              className="w-24 h-24 rounded-full border-4 border-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] object-cover -mt-12 relative z-10 bg-white ml-2"
            />
          </div>

          <div className="mt-4 ml-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{society.name}</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              <span className="text-blue-600 font-semibold">{society.category}</span> • {society.followers}
            </p>
            <p className="text-gray-600 mt-3 text-sm leading-relaxed line-clamp-2">
              {society.bio}
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-5 mx-2 flex items-center gap-3">
            <button className="flex-1 bg-blue-600 text-white rounded-full py-3 px-6 font-semibold text-sm shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] active:scale-95 transition-transform">
              Follow
            </button>
            <button className="flex-1 bg-white text-gray-700 border-2 border-gray-100 rounded-full py-3 px-6 font-semibold text-sm shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] active:scale-95 transition-all hover:bg-gray-50">
              Message
            </button>
          </div>
        </div>
      </div>

      {/* 2. The 'Core Team' Horizontal Scroll */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 px-6">Core Team</h2>
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-6 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {society.team.map((member) => (
            <div 
              key={member.id} 
              className="snap-start shrink-0 w-[200px] bg-white/80 backdrop-blur-md border border-gray-100/80 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.04)] rounded-2xl p-3 flex items-center gap-3"
            >
              <img 
                src={member.avatar} 
                alt={member.name} 
                className="w-11 h-11 rounded-full object-cover shadow-sm bg-gray-100"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-gray-900 truncate">{member.name}</span>
                <span className="text-xs font-semibold text-blue-600 truncate">{member.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. The Content Tabs (Sticky Navigation) */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 mt-2 px-6 shadow-[0_4px_20px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex space-x-8">
          {(['Updates', 'Events', 'About'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm transition-colors relative outline-none ${
                activeTab === tab 
                  ? 'text-gray-900 font-bold' 
                  : 'text-gray-500 font-medium hover:text-gray-700'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tab Content & The 'Events' Empty State */}
      <div className="flex-1 px-6 py-8 flex flex-col">
        {activeTab === 'Events' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-blue-50/80 rounded-full flex items-center justify-center mb-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
              <CalendarDays className="w-10 h-10 text-blue-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 mb-2">No upcoming events</h3>
            <p className="text-sm text-gray-500 text-center max-w-[240px] leading-relaxed">
              Follow to get notified when they drop.
            </p>
          </div>
        )}
        
        {activeTab === 'Updates' && (
          <div className="text-center py-12 text-gray-400 text-sm font-medium">
            No recent updates to show.
          </div>
        )}
        
        {activeTab === 'About' && (
          <div className="text-gray-600 text-sm leading-relaxed bg-white p-6 rounded-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.04)] border border-gray-50">
            {society.bio}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="font-semibold text-gray-900 mb-3">Contact Info</p>
              <div className="space-y-2 text-gray-500">
                <p>Email: <a href="mailto:hello@techinnovators.club" className="text-blue-600 font-medium">hello@techinnovators.club</a></p>
                <p>Location: Student Union, Room 402</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
