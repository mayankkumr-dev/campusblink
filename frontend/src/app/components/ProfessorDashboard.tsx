import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  UtensilsCrossed, Printer, Clock, ChevronRight, 
  Users, FileText, MessageSquare, MapPin, CheckCircle2,
  LayoutDashboard, Bell
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getFirstName } from '../../lib/user';
import { getProfessorOrders, getTodayOrdersCount, getPendingPaymentsTotal } from '../../api/professor';
import { ListSkeleton } from './ui/Skeletons';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const ProfessorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const firstName = getFirstName(profile?.name, 'Professor');

  const [orders, setOrders] = useState<any[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const [ordersRes, todayRes, pendingRes] = await Promise.all([
        getProfessorOrders(profile.id, 5),
        getTodayOrdersCount(profile.id),
        getPendingPaymentsTotal(profile.id),
      ]);
      if (!mounted) return;
      setOrders(ordersRes.data || []);
      setTodayCount(todayRes.data || 0);
      setPendingTotal(pendingRes.data || 0);
      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [profile?.id]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20 font-sans bg-[#FAFAFA] min-h-screen">
      
      {/* Professor Profile Summary Header */}
      <header className="pt-12 pb-14 border-b border-gray-200/60 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
              Faculty Dashboard
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight font-syne leading-tight">
              {getGreeting()}, <br className="hidden sm:block" />Prof. {firstName}.
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-gray-600 font-medium">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                Computer Science
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                Senior Professor
              </span>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="text-right">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Today</p>
                <p className="text-2xl font-bold text-gray-900 font-syne">3 Classes</p>
             </div>
             <div className="w-px h-12 bg-gray-200 mx-2 self-end hidden sm:block"></div>
             <div className="text-right">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Pending Dues</p>
                <p className={`text-2xl font-bold font-syne ${pendingTotal > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                   ₹{pendingTotal.toLocaleString()}
                </p>
             </div>
          </div>
        </div>
      </header>

      {/* Today's Schedule & Classes Section */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-gray-900 font-syne flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" strokeWidth={2} /> Today's Schedule
          </h2>
          <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 group">
            Full Timetable <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Upcoming Class */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-gray-100 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-3xl"></div>
            <div className="flex justify-between items-start mb-6">
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Upcoming
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 font-syne">Data Structures (CS201)</h3>
            <p className="text-sm text-gray-500 flex items-center gap-2 mb-6 font-medium">
              <MapPin className="w-4 h-4 text-gray-400" strokeWidth={2} /> Lecture Hall 3
            </p>
            <div className="text-sm font-bold text-gray-900">10:00 AM - 11:30 AM</div>
          </div>

          {/* Later Class */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-gray-100 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 rounded-l-3xl"></div>
            <div className="flex justify-between items-start mb-6">
               <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Later Today
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 font-syne">Machine Learning (CS405)</h3>
            <p className="text-sm text-gray-500 flex items-center gap-2 mb-6 font-medium">
              <MapPin className="w-4 h-4 text-gray-400" strokeWidth={2} /> Lab Room 2
            </p>
            <div className="text-sm font-bold text-gray-900">02:00 PM - 04:00 PM</div>
          </div>

          {/* Completed Class */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgb(0,0,0,0.02)] border border-gray-100/50 transition-all duration-300 relative overflow-hidden opacity-75 hover:opacity-100">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gray-200 rounded-l-3xl"></div>
            <div className="flex justify-between items-start mb-6">
              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Completed
              </span>
              <CheckCircle2 className="w-5 h-5 text-gray-300" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-gray-500 mb-2 font-syne line-through decoration-gray-300">Algorithms (CS301)</h3>
            <p className="text-sm text-gray-400 flex items-center gap-2 mb-6 font-medium">
              <MapPin className="w-4 h-4 text-gray-300" strokeWidth={2} /> Lecture Hall 1
            </p>
            <div className="text-sm font-bold text-gray-400">08:00 AM - 09:30 AM</div>
          </div>
        </div>
      </section>

      {/* Quick Actions & Controls Panel */}
      <section className="mb-14">
        <h2 className="text-xl font-extrabold text-gray-900 font-syne mb-6 flex items-center gap-2">
           <LayoutDashboard className="w-5 h-5 text-gray-400" strokeWidth={2} /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <button className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-gray-700">Mark Attendance</span>
          </button>
          
          <button className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-6 h-6 text-amber-600" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-gray-700">Post Notice</span>
          </button>
          
          <button onClick={() => navigate('/professor/canteen')} className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group gap-4 relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <UtensilsCrossed className="w-6 h-6 text-emerald-600" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-gray-700">Canteen Order</span>
          </button>

          <button onClick={() => navigate('/professor/print')} className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Printer className="w-6 h-6 text-sky-600" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-gray-700">Print Jobs</span>
          </button>
        </div>
      </section>

      {/* Recent Activity & Notifications Feed */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-gray-900 font-syne flex items-center gap-2">
             <Bell className="w-5 h-5 text-gray-400" strokeWidth={2} /> Recent Activity
          </h2>
        </div>
        
        <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-100">
          {loading ? (
            <div className="p-4 space-y-4">
               <ListSkeleton rows={3} />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* Combine real orders and dummy activities for a complete feed */}
              <div className="p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/80 transition-colors rounded-2xl group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-blue-50/50 flex items-center justify-center shrink-0 border border-blue-100 text-blue-500 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-gray-900 font-bold font-syne">Department Meeting Scheduled</p>
                  <p className="text-sm text-gray-500 mt-1">HOD has scheduled a faculty meeting in Conference Room B.</p>
                </div>
                <span className="text-xs font-semibold text-gray-400 whitespace-nowrap pt-1">2h ago</span>
              </div>

              {orders.map(order => (
                 <div key={order.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/80 transition-colors rounded-2xl group cursor-pointer">
                    <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 text-gray-500 group-hover:scale-105 transition-transform">
                       {order._type === 'canteen' ? <UtensilsCrossed className="w-5 h-5" strokeWidth={1.5} /> : <Printer className="w-5 h-5" strokeWidth={1.5} />}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                       <p className="text-sm text-gray-900 font-bold font-syne">
                          {order._type === 'canteen' ? 'Canteen Order Status' : 'Print Job Update'}
                       </p>
                       <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {order.shop?.name || 'Campus Shop'} • ₹{order.total_amount || order.amount || 0} • 
                          <span className="capitalize ml-1 font-medium text-gray-700">{order.status}</span>
                       </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-400 whitespace-nowrap pt-1">{formatDate(order.created_at)}</span>
                 </div>
              ))}
              
              <div className="p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/80 transition-colors rounded-2xl group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-rose-50/50 flex items-center justify-center shrink-0 border border-rose-100 text-rose-500 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-gray-900 font-bold font-syne">Student Leave Request</p>
                  <p className="text-sm text-gray-500 mt-1">Rahul Sharma (CS201) requested leave for medical reasons.</p>
                </div>
                <span className="text-xs font-semibold text-gray-400 whitespace-nowrap pt-1">Yesterday</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
