import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/pushNotifications';
import { uploadImage } from '../lib/cloudinary';
import { computeShopOpenNow, decorateShopStatus, normalizeShopSchedule } from '../lib/shopStatus';

export async function uploadMenuItemPhoto(shopId, file) {
  try {
    const { data, error } = await uploadImage(file, `campus-blink/menu/${shopId}`);
    if (error) throw error;
    return { data: data.url, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadShopLogo(shopId, file) {
  try {
    const { data, error } = await uploadImage(file, `campus-blink/shop-logos/${shopId}`);
    if (error) throw error;
    return { data: data.url, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadStationeryPhoto(shopId, file) {
  try {
    const { data, error } = await uploadImage(file, `campus-blink/stationery/${shopId}`);
    if (error) throw error;
    return { data: data.url, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getCanteens(college) {
  try {
    const baseQuery = supabase
      .from('canteen_shops')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!college) {
      const { data, error } = await baseQuery;
      if (error) throw error;
      return { data: (data || []).map(decorateShopStatus), error: null };
    }

    const { data, error } = await baseQuery.eq('college', college);
    if (error) throw error;

    if (data?.length) {
      return { data: (data || []).map(decorateShopStatus), error: null };
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('canteen_shops')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (fallbackError) throw fallbackError;
    return { data: (fallbackData || []).map(decorateShopStatus), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getCanteenById(id) {
  try {
    const { data, error } = await supabase
      .from('canteen_shops')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data: decorateShopStatus(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMenuItems(shopId) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('shop_id', shopId)
      .order('category')
      .order('name');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMenuByCategory(shopId, category) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('shop_id', shopId)
      .eq('category', category)
      .order('name');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function placeOrder(orderData, college) {
  try {
    if (!navigator.onLine) {
      throw new Error('You need internet to place orders');
    }

    if (!college) {
      throw new Error('Update your profile with a college to place canteen orders.');
    }

    const { data: shop, error: shopError } = await supabase
      .from('canteen_shops')
      .select('id, college, name, is_active, schedule_json, is_open_now, manual_override_status')
      .eq('id', orderData.shop_id)
      .single();

    if (shopError) throw shopError;
    if (shop?.college !== college) {
      throw new Error('You can only place canteen orders within your own college.');
    }

    const status = decorateShopStatus(shop);
    if (!status.is_open_now) {
      throw new Error(status.shop_status_reason || `${shop?.name || 'This canteen'} is currently closed.`);
    }

    const { data, error } = await supabase
      .from('canteen_orders')
      .insert([orderData])
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateCanteenShopSchedule(shopId, scheduleJson, manualOverride = null) {
  try {
    const schedule = normalizeShopSchedule(scheduleJson);
    const computed = computeShopOpenNow({ is_active: true, schedule_json: schedule, manual_override_status: manualOverride });
    const { data, error } = await supabase
      .from('canteen_shops')
      .update({
        schedule_json: schedule,
        manual_override_status: manualOverride,
        is_open_now: computed.isOpenNow,
      })
      .eq('id', shopId)
      .select('*')
      .single();
    if (error) throw error;
    return { data: decorateShopStatus(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateCanteenShopAvailability(shopId, manualOverride) {
  try {
    const { data: current, error: fetchError } = await supabase.from('canteen_shops').select('*').eq('id', shopId).single();
    if (fetchError) throw fetchError;

    const computed = computeShopOpenNow({
      ...current,
      manual_override_status: manualOverride,
      schedule_json: current?.schedule_json,
    });

    const { data, error } = await supabase
      .from('canteen_shops')
      .update({ manual_override_status: manualOverride, is_open_now: computed.isOpenNow })
      .eq('id', shopId)
      .select('*')
      .single();
    if (error) throw error;
    return { data: decorateShopStatus(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMyOrders(studentId, college) {
  try {
    if (!college) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('canteen_orders')
      .select('*, canteen_shops(*)')
      .eq('student_id', studentId)
      .eq('canteen_shops.college', college)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateOrderStatus(orderId, status, meta = {}) {
  try {
    const rejectionReason = typeof meta?.rejectionReason === 'string' ? meta.rejectionReason.trim() : '';

    const { data, error } = await supabase
      .from('canteen_orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;

    if (status === 'ready' && data?.student_id) {
      const { data: shop } = await supabase
        .from('canteen_shops')
        .select('name')
        .eq('id', data.shop_id)
        .maybeSingle();

      const shopName = shop?.name || 'your canteen';

      supabase.functions.invoke('notify-order-ready', {
        body: {
          type: 'canteen',
          userId: data.student_id,
          orderId: data.id,
          title: 'Your canteen order is ready!',
          body: `Your order at ${shopName} is ready`,
          url: '/student/canteen',
        },
      }).catch(() => {});

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: data.student_id,
            type: 'canteen_ready',
            title: 'Order ready',
            message: `Your order at ${shopName} is ready`,
            link: '/student/canteen',
          },
        ]);

      if (notificationError) {
        console.error('Failed to insert canteen ready notification', notificationError);
      }

      await sendPushNotification(data.student_id, {
        type: 'order_ready',
        title: 'Your canteen order is ready! 🍔',
        body: `Your order at ${shopName} is ready`,
        url: '/student/canteen',
        important: true,
      }).catch(() => {});
    }

    if (status === 'preparing' && data?.student_id) {
      const { data: shop } = await supabase
        .from('canteen_shops')
        .select('name')
        .eq('id', data.shop_id)
        .maybeSingle();

      const shopName = shop?.name || 'your canteen';

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: data.student_id,
            type: 'canteen_ready',
            title: 'Order accepted',
            message: `Your order at ${shopName} was accepted and is now being prepared.`,
            link: '/student/canteen',
          },
        ]);

      if (notificationError) {
        console.error('Failed to insert canteen accepted notification', notificationError);
      }

      await sendPushNotification(data.student_id, {
        type: 'order_ready',
        title: 'Order accepted',
        body: `Your order at ${shopName} was accepted and is now being prepared.`,
        url: '/student/canteen',
        important: false,
      }).catch(() => {});
    }

    if (status === 'cancelled' && data?.student_id) {
      const { data: shop } = await supabase
        .from('canteen_shops')
        .select('name')
        .eq('id', data.shop_id)
        .maybeSingle();

      const shopName = shop?.name || 'your canteen';
      const reasonText = rejectionReason || 'No reason provided by the canteen.';

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: data.student_id,
            type: 'canteen_ready',
            title: 'Canteen order rejected',
            message: `Your order at ${shopName} was rejected. Reason: ${reasonText}`,
            link: '/student/canteen',
          },
        ]);

      if (notificationError) {
        console.error('Failed to insert canteen rejected notification', notificationError);
      }

      await sendPushNotification(data.student_id, {
        type: 'order_ready',
        title: 'Canteen order rejected',
        body: `Your order at ${shopName} was rejected. Reason: ${reasonText}`,
        url: '/student/canteen',
        important: false,
      }).catch(() => {});
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getShopOrders(shopId) {
  try {
    const { data, error } = await supabase
      .from('canteen_orders')
      .select('*, profiles(name, avatar_url, username)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function requestCanteenReorder(orderId, studentId, shopId) {
  try {
    const { data, error } = await supabase
      .from('canteen_orders')
      .update({ status: 'reorder_requested' })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    const { data: shop } = await supabase
      .from('canteen_shops')
      .select('name')
      .eq('id', shopId)
      .maybeSingle();

    const shopName = shop?.name || 'your canteen';

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: studentId,
          type: 'canteen_ready',
          title: 'Canteen reorder requested',
          message: `Your order at ${shopName} needs to be reordered. If you already paid, you do not need to pay again. If you have not paid yet, please pay at the canteen.`,
          link: '/student/canteen',
        },
      ]);

    if (notificationError) {
      console.error('Failed to insert canteen reorder request notification', notificationError);
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMyCanteenReorderRequests(studentId) {
  try {
    const { data, error } = await supabase
      .from('canteen_orders')
      .select('*, canteen_shops(name, college)')
      .eq('student_id', studentId)
      .eq('status', 'reorder_requested')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function completeCanteenReorderRequest(orderId) {
  try {
    const { data, error } = await supabase
      .from('canteen_orders')
      .update({ status: 'reorder_completed' })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getCanteenReorderRequestById(orderId, studentId) {
  try {
    const { data, error } = await supabase
      .from('canteen_orders')
      .select('*, canteen_shops(*)')
      .eq('id', orderId)
      .eq('student_id', studentId)
      .eq('status', 'reorder_requested')
      .maybeSingle();

    if (error) throw error;
    return { data: data || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function toggleMenuItemAvailability(itemId, isAvailable) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createMenuItem(itemData) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([itemData])
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateMenuItem(itemId, updates) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteMenuItem(itemId) {
  try {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}
