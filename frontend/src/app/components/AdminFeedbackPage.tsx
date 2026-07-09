import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Clock } from 'lucide-react';

export function AdminFeedbackPage() {
  const { profile } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feedback')
        .select('*, profiles(username, name, email, role)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f))
      );
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (!profile || profile.role !== 'admin') {
    return <div className="p-4 text-center">Access denied</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Feedback</h1>
      </div>

      <div className="bg-[var(--bg)] rounded-lg shadow p-6">
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center text-[var(--text-3)]">No feedback found</div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((f) => (
              <div key={f.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold capitalize">{f.category || 'General Feedback'}</h3>
                    <div className="text-sm text-[var(--text-3)] flex items-center gap-2 mt-1">
                      <span>{f.profiles?.name || f.profiles?.username || 'Unknown'}</span>
                      <span>•</span>
                      <span className="capitalize">{f.profiles?.role}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{new Date(f.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <select
                    value={f.status}
                    onChange={(e) => updateStatus(f.id, e.target.value)}
                    className="text-sm rounded border-gray-300 p-1"
                  >
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
                <div className="mt-2 text-[var(--text-2)] whitespace-pre-wrap">
                  {f.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
