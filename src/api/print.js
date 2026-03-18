import { supabase } from '../lib/supabase';
import { deleteFile, extractCloudinaryPublicId, uploadImage, uploadPDF } from '../lib/cloudinary';
import { computeShopOpenNow, decorateShopStatus, normalizeShopSchedule } from '../lib/shopStatus';

async function uploadPrintFileViaSupabase(userId, file) {
  const safeName = `${Date.now()}-${String(file?.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = `${userId}/${safeName}`;
  const bucketsToTry = ['print-files', 'print_files'];
  let lastError = null;

  for (const bucket of bucketsToTry) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      lastError = uploadError;
      continue;
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    if (signedError || !signedData?.signedUrl) {
      lastError = signedError || new Error('Failed to create signed URL for uploaded PDF');
      continue;
    }

    return { data: signedData.signedUrl, error: null };
  }

  return { data: null, error: lastError || new Error('Supabase storage upload failed') };
}

export async function getPrintShops(college) {
  try {
    const baseQuery = supabase
      .from('print_shops')
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
      .from('print_shops')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (fallbackError) throw fallbackError;
    return { data: (fallbackData || []).map(decorateShopStatus), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPrintShopById(id) {
  try {
    const { data, error } = await supabase
      .from('print_shops')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data: decorateShopStatus(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadPrintShopLogo(shopId, file) {
  try {
    const { data, error } = await uploadImage(file, `campus-blink/shop-logos/${shopId}`);
    if (error) throw error;
    return { data: data.url, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadStationeryImage(shopId, file) {
  try {
    const { data, error } = await uploadImage(file, `campus-blink/stationery/${shopId}`);
    if (error) throw error;
    return { data: data.url, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadPrintFile(userId, file) {
  try {
    // Primary path: Supabase Storage signed URL (stable for app preview + print workflow).
    const { data: supabaseUrl, error: supabaseError } = await uploadPrintFileViaSupabase(userId, file);
    if (!supabaseError && supabaseUrl) {
      return { data: supabaseUrl, error: null };
    }

    // Secondary path: Cloudinary upload only if storage is unavailable.
    const { data: uploadData, error: uploadError } = await uploadPDF(
      file,
      `campus-blink/print-files/${userId}`
    );

    if (uploadError || !uploadData?.url) {
      throw supabaseError || uploadError || new Error('Unable to upload print file');
    }

    return { data: uploadData.url, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function cleanupOldPrintFiles(shopId) {
  try {
    if (!shopId) return { data: { scanned: 0, cleaned: 0 }, error: null };

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleOrders, error: fetchError } = await supabase
      .from('print_orders')
      .select('id, file_url, created_at')
      .eq('shop_id', shopId)
      .lt('created_at', cutoff)
      .not('file_url', 'is', null);

    if (fetchError) throw fetchError;

    if (!staleOrders?.length) {
      return { data: { scanned: 0, cleaned: 0 }, error: null };
    }

    let cleaned = 0;
    for (const order of staleOrders) {
      const publicId = extractCloudinaryPublicId(order.file_url);
      if (publicId) {
        await deleteFile(publicId);
      }

      const { error: clearError } = await supabase
        .from('print_orders')
        .update({ file_url: null })
        .eq('id', order.id);

      if (!clearError) cleaned += 1;
    }

    return { data: { scanned: staleOrders.length, cleaned }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createPrintOrder(orderData, college) {
  try {
    if (!navigator.onLine) {
      throw new Error('You need internet to place orders');
    }

    const { data: shop, error: shopError } = await supabase
      .from('print_shops')
      .select('id, college, name, is_active, schedule_json, is_open_now, manual_override_status')
      .eq('id', orderData.shop_id)
      .single();

    if (shopError) throw shopError;

    const status = decorateShopStatus(shop);
    if (!status.is_open_now) {
      throw new Error(status.shop_status_reason || `${shop?.name || 'This print shop'} is currently closed.`);
    }

    const { data, error } = await supabase
      .from('print_orders')
      .insert([orderData])
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updatePrintShopSchedule(shopId, scheduleJson, manualOverride = null) {
  try {
    const schedule = normalizeShopSchedule(scheduleJson);
    const computed = computeShopOpenNow({ is_active: true, schedule_json: schedule, manual_override_status: manualOverride });
    const { data, error } = await supabase
      .from('print_shops')
      .update({
        schedule_json: schedule,
        manual_override_status: manualOverride,
        is_open_now: computed.isOpenNow,
        updated_at: new Date().toISOString(),
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

export async function updatePrintShopAvailability(shopId, manualOverride) {
  try {
    const { data: current, error: fetchError } = await supabase.from('print_shops').select('*').eq('id', shopId).single();
    if (fetchError) throw fetchError;

    const computed = computeShopOpenNow({
      ...current,
      manual_override_status: manualOverride,
      schedule_json: current?.schedule_json,
    });

    const { data, error } = await supabase
      .from('print_shops')
      .update({ manual_override_status: manualOverride, is_open_now: computed.isOpenNow, updated_at: new Date().toISOString() })
      .eq('id', shopId)
      .select('*')
      .single();
    if (error) throw error;
    return { data: decorateShopStatus(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMyPrintOrders(studentId, college) {
  try {
    if (!college) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('print_orders')
      .select('*, print_shops(*)')
      .eq('student_id', studentId)
      .eq('print_shops.college', college)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updatePrintOrderStatus(orderId, status, meta = {}) {
  try {
    const rejectionReason = typeof meta?.rejectionReason === 'string' ? meta.rejectionReason.trim() : '';

    const { data, error } = await supabase
      .from('print_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;

    if (status === 'ready' && data?.student_id) {
      const { data: shop } = await supabase
        .from('print_shops')
        .select('name')
        .eq('id', data.shop_id)
        .maybeSingle();

      const shopName = shop?.name || 'your print shop';

      supabase.functions.invoke('notify-order-ready', {
        body: {
          type: 'print',
          userId: data.student_id,
          orderId: data.id,
          title: 'Your print order is ready!',
          body: `Your print job at ${shopName} is ready`,
          url: '/student/print',
        },
      }).catch(() => {});

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: data.student_id,
            type: 'print_ready',
            title: 'Print job ready',
            message: `Your print job at ${shopName} is ready`,
            link: '/student/print',
          },
        ]);

      if (notificationError) {
        console.error('Failed to insert print ready notification', notificationError);
      }
    }

    if (status === 'printing' && data?.student_id) {
      const { data: shop } = await supabase
        .from('print_shops')
        .select('name')
        .eq('id', data.shop_id)
        .maybeSingle();

      const shopName = shop?.name || 'your print shop';

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: data.student_id,
            type: 'print_ready',
            title: 'Print order accepted',
            message: `Your print order at ${shopName} was accepted and is now printing.`,
            link: '/student/print',
          },
        ]);

      if (notificationError) {
        console.error('Failed to insert print accepted notification', notificationError);
      }
    }

    if (status === 'cancelled' && data?.student_id) {
      const { data: shop } = await supabase
        .from('print_shops')
        .select('name')
        .eq('id', data.shop_id)
        .maybeSingle();

      const shopName = shop?.name || 'your print shop';
      const reasonText = rejectionReason || 'No reason provided by the print shop.';

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: data.student_id,
            type: 'print_ready',
            title: 'Print order rejected',
            message: `Your print order at ${shopName} was rejected. Reason: ${reasonText}`,
            link: '/student/print',
          },
        ]);

      if (notificationError) {
        console.error('Failed to insert print rejected notification', notificationError);
      }
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function calculatePrintCost(pages, copies, isColor, isDoubleSided, hasBinding, shopId) {
  try {
    const { data: shop, error } = await supabase
      .from('print_shops')
      .select('bw_price_per_page, color_price_per_page, binding_charge')
      .eq('id', shopId)
      .single();
      
    if (error) throw error;
    
    let base = pages * copies * (isColor ? shop.color_price_per_page : shop.bw_price_per_page);
    let sided = isDoubleSided ? base * 0.8 : base;
    let total = hasBinding ? sided + shop.binding_charge : sided;
    
    return { data: Math.ceil(total), error: null };
  } catch (error) {
    return { data: 0, error };
  }
}

export async function getShopPrintOrders(shopId) {
  try {
    const { data, error } = await supabase
      .from('print_orders')
      .select('*, profiles(name, avatar_url, username)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deletePrintOrder(orderId) {
  try {
    const { error } = await supabase
      .from('print_orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function requestReorder(orderId, studentId, shopId) {
  try {
    const { data, error } = await supabase
      .from('print_orders')
      .update({ status: 'reorder_requested', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    const { data: shop } = await supabase
      .from('print_shops')
      .select('name')
      .eq('id', shopId)
      .maybeSingle();

    const shopName = shop?.name || 'your print shop';

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: studentId,
        type: 'print_ready',
        title: 'Reprint Required — Free',
        message: `Your print order at ${shopName} was accidentally marked collected without printing. Please reorder — it's completely free, no payment needed.`,
        link: '/student/print',
      }]);

    if (notificationError) {
      console.error('Failed to insert print reorder request notification', notificationError);
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function reorderPrintFree(originalOrder, studentId) {
  try {
    const newOrderData = {
      student_id: studentId,
      shop_id: originalOrder.shop_id,
      file_url: originalOrder.file_url,
      file_name: originalOrder.file_name,
      file_size: originalOrder.file_size,
      pages: originalOrder.pages,
      copies: originalOrder.copies,
      is_color: originalOrder.is_color,
      is_double_sided: originalOrder.is_double_sided,
      has_binding: originalOrder.has_binding,
      total_price: 0,
      special_notes: `FREE REORDER — No payment required (reprint of order #${originalOrder.id.slice(0, 6)}).${originalOrder.special_notes ? ' Original notes: ' + originalOrder.special_notes : ''}`,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('print_orders')
      .insert([newOrderData])
      .select()
      .single();

    if (error) throw error;

    // Mark original as reorder completed so it stops showing the banner
    await supabase
      .from('print_orders')
      .update({ status: 'reorder_completed', updated_at: new Date().toISOString() })
      .eq('id', originalOrder.id);

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function completeReorderRequest(orderId) {
  try {
    const { data, error } = await supabase
      .from('print_orders')
      .update({ status: 'reorder_completed', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function sendReorderInProgressNotification(studentId, orderId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: studentId,
          type: 'print_ready',
          title: 'Reorder Not Completed Yet',
          message: `Please upload your PDF and complete reorder for request #${String(orderId || '').slice(0, 6)}. You will not be charged again.`,
          link: '/student/print',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMyReorderRequests(studentId) {
  try {
    const { data, error } = await supabase
      .from('print_orders')
      .select('*, print_shops(name, college)')
      .eq('student_id', studentId)
      .eq('status', 'reorder_requested')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getReorderRequestById(orderId, studentId) {
  try {
    const { data, error } = await supabase
      .from('print_orders')
      .select('*, print_shops(*)')
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
