import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, ShoppingBag, Utensils } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { completeCanteenReorderRequest, getCanteenReorderRequestById, placeOrder } from '../../api/canteen';

export const CanteenReorderPage: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const profile = useAuthStore(state => state.profile);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [request, setRequest] = useState<any | null>(null);

  useEffect(() => {
    async function loadRequest() {
      if (!profile?.id || !orderId) return;
      setIsLoading(true);
      const { data, error } = await getCanteenReorderRequestById(orderId, profile.id);

      if (error) {
        toast.error('Unable to load reorder request.');
        navigate('/student/canteen');
        return;
      }

      if (!data) {
        toast.error('This canteen reorder request is not available anymore.');
        navigate('/student/canteen');
        return;
      }

      setRequest(data);
      setIsLoading(false);
    }

    loadRequest();
  }, [profile?.id, orderId, navigate]);

  const handleSubmitReorder = async () => {
    if (!profile?.id || !request) return;
    setIsSubmitting(true);

    const orderData = {
      student_id: profile.id,
      shop_id: request.shop_id,
      items: request.items,
      total: request.total,
      status: 'placed',
    };

    const { error: placeError } = await placeOrder(orderData, profile.college);
    if (placeError) {
      toast.error(placeError.message || 'Failed to reorder items.');
      setIsSubmitting(false);
      return;
    }

    const { error: completeError } = await completeCanteenReorderRequest(request.id);
    if (completeError) {
      toast.error('Reorder created but failed to update original request status.');
    } else {
      toast.success('Canteen reorder placed successfully.');
    }

    setIsSubmitting(false);
    navigate('/student/canteen');
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-[var(--text-primary)]/10 bg-[var(--bg)] p-8 text-center shadow-soft">
          <h2 className="font-syne font-bold text-2xl mb-3">Login Required</h2>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-md bg-[var(--yellow)] text-[var(--text-primary)] font-bold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">Loading canteen reorder request...</div>;
  }

  if (!request) return null;

  const shop = request.canteen_shops || {};
  const items = Array.isArray(request.items) ? request.items : [];

  return (
    <div className="p-4 md:p-8 bg-[var(--bg-primary)] min-h-full font-sans pb-32">
      <div className="max-w-[900px] mx-auto">
        <button
          onClick={() => navigate('/student/canteen')}
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] hover:text-[var(--yellow)] mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Canteen
        </button>

        <div className="mb-5 rounded-lg border border-amber-400/40 bg-accent-amber-soft px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[var(--text-primary)] text-sm">Canteen Reorder Request #{request.id.slice(0, 6)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Review the same items below and place the reorder again.</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">If you already paid, you do not need to pay again. If not, you can pay at the canteen.</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Shop: {shop.name || 'Canteen'}</p>
          </div>
        </div>

        <div className="bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg shadow-medium overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--text-primary)]/10 bg-[var(--bg-secondary)] flex items-center justify-between gap-4">
            <div>
              <h1 className="font-syne font-bold text-2xl text-[var(--text-primary)]">Reorder Same Items</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Confirm this repeated order for free/requested reorder flow.</p>
            </div>
            <div className="rounded-lg bg-[var(--bg)] border border-[var(--text-primary)]/10 px-4 py-3 text-right">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Order Total</p>
              <p className="font-syne font-bold text-2xl text-[var(--text-primary)]">₹{request.total}</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {items.length === 0 ? (
              <div className="rounded-lg border border-[var(--text-primary)]/10 bg-[var(--bg-primary)] p-6 text-center text-[var(--text-secondary)]">
                No items found for this reorder request.
              </div>
            ) : (
              items.map((item: any, index: number) => (
                <div key={`${item.id || item.name}-${index}`} className="flex items-center gap-4 rounded-lg border border-[var(--text-primary)]/10 bg-[var(--bg)] p-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-[var(--text-secondary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-syne font-bold text-[var(--text-primary)] leading-tight">{item.name}</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Quantity: {item.qty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Subtotal</p>
                    <p className="font-syne font-bold text-lg text-[var(--text-primary)]">₹{(item.price || 0) * (item.qty || 0)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[var(--text-primary)]/10 bg-[var(--bg-secondary)] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
              <ShoppingBag className="w-4 h-4 text-[var(--yellow)]" />
              The same items will be ordered again at {shop.name || 'this canteen'}.
            </div>
            <button
              onClick={handleSubmitReorder}
              disabled={isSubmitting || items.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[var(--yellow)] text-[var(--text-primary)] font-bold hover:brightness-95 disabled:opacity-60"
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Reordering...</> : <><RotateCcw className="w-4 h-4" /> Confirm Reorder</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
