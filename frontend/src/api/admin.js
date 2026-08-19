import { approveProfessor, rejectProfessor } from './professor';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/pushNotifications';

export async function logAdminAction(adminId, action, targetType, targetId, targetName, details = null) {
  try {
    await supabase.from('admin_audit_log').insert([{
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      target_name: targetName,
      details
    }]);
  } catch (e) {
    console.error("Failed to log admin action", e);
  }
}

export async function getAllUsers(filters, page = 1) {
  try {
    const limit = 20;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);

    if (filters?.searchTerm) {
      query = query.or(`username.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%,name.ilike.%${filters.searchTerm}%`);
    }
    if (filters?.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    if (filters?.searchTerm && data?.length) {
      const q = String(filters.searchTerm).trim().toLowerCase();
      data.sort((a, b) => {
        const aUser = String(a.username || '').toLowerCase();
        const bUser = String(b.username || '').toLowerCase();
        const aEmail = String(a.email || '').toLowerCase();
        const bEmail = String(b.email || '').toLowerCase();

        const aPrio =
          aUser.startsWith(q) || aEmail.startsWith(q) ? 0 :
          aUser.includes(q) || aEmail.includes(q) ? 1 : 2;
        const bPrio =
          bUser.startsWith(q) || bEmail.startsWith(q) ? 0 :
          bUser.includes(q) || bEmail.includes(q) ? 1 : 2;
        return aPrio - bPrio;
      });
    }

    return { data, count, error: null };
  } catch (error) {
    return { data: null, count: 0, error };
  }
}

export async function updateUserStatus(adminId, userId, status, reason = '') {
  if (!import.meta.env.VITE_BACKEND_URL) return { error: { message: "Backend URL not configured." } };
  try {
    const { getClerkToken } = await import('../lib/supabase');
    const token = getClerkToken();
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, ban_reason: reason })
    });
      
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    
    await logAdminAction(adminId, `USER_${status.toUpperCase()}`, 'profile', userId, data.email || userId, { reason });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function changeUserRole(adminId, userId, newRole) {
  if (!import.meta.env.VITE_BACKEND_URL) return { error: { message: "Backend URL not configured." } };
  try {
    const { getClerkToken } = await import('../lib/supabase');
    const token = getClerkToken();
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role: newRole })
    });
      
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change role');
    
    await logAdminAction(adminId, 'CHANGED_ROLE', 'profile', userId, data.email || userId, { new_role: newRole });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPendingTeacherRequests() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, college, role, requested_role, role_request_status, created_at')
      .eq('requested_role', 'teacher')
      .eq('role_request_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      const message = String(error?.message || '').toLowerCase();
      const missingColumns =
        message.includes('requested_role') ||
        message.includes('role_request_status') ||
        (message.includes('column') && message.includes('does not exist'));

      if (missingColumns) {
        return { data: [], error: null };
      }

      throw error;
    }

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function resolveTeacherRequest(adminId, userId, decision) {
  try {
    const approve = decision === 'approve';
    
    if (approve) {
      const { error: rpcError } = await supabase
        .from('profiles')
        .update({
          role: 'professor',
          requested_role: null,
          role_request_status: 'approved',
          professor_status: 'approved',
          professor_verified_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (rpcError) throw rpcError;
      
      // Also update professor_requests table if it exists
      await supabase
        .from('professor_requests')
        .update({ status: 'approved' })
        .eq('user_id', userId);
      
      const { data: updatedRow, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      return { data: updatedRow, error: null };
    } else {
      // Reject via profiles table update
      const { data: updatedRow, error } = await supabase
        .from('profiles')
        .update({
          requested_role: null,
          role_request_status: 'rejected',
        })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw error;
      return { data: updatedRow, error: null };
    }
  } catch (error) {
    console.error('Error resolving teacher request:', error);
    return { data: null, error };
  }
}

export async function manageCredits(adminId, userId, amount, type, reason) {
  try {
    const { data: profile } = await supabase.from('profiles').select('campus_credits, email').eq('id', userId).single();
    if (!profile) throw new Error("User not found");
    
    let newBalance = profile.campus_credits;
    if (type === 'admin_add') {
      newBalance += amount;
    } else {
      newBalance -= amount;
    }

    const { error: updateError } = await supabase.from('profiles').update({ campus_credits: newBalance }).eq('id', userId);
    if (updateError) throw updateError;
    
    await supabase.from('credits_log').insert([{
      user_id: userId,
      action_type: type,
      credits_change: type === 'admin_add' ? amount : -amount,
      new_balance: newBalance,
      reason,
      performed_by: adminId
    }]);
    
    await logAdminAction(adminId, 'MANAGE_CREDITS', 'profile', userId, profile.email, { original: profile.campus_credits, amount, new_balance: newBalance });
    
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getAllCanteens() {
  try {
    const { data, error } = await supabase
      .from('canteen_shops')
      .select('*, owner:profiles(name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateCanteenStatus(adminId, shopId, shopName, isActive) {
  try {
     const { data, error } = await supabase
       .from('canteen_shops')
       .update({ is_active: isActive })
       .eq('id', shopId)
       .select()
       .single();
     if (error) throw error;
     await logAdminAction(adminId, isActive ? 'REACTIVATED_CANTEEN' : 'SUSPENDED_CANTEEN', 'canteen_shop', shopId, shopName);
     return { data, error: null };
  } catch (error) {
     return { data: null, error };
  }
}

export async function getAdminCanteenOwners() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, college, role, status')
      .neq('role', 'admin')
      .order('name', { ascending: true })
      .limit(300);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createAdminCanteen(adminId, payload) {
  try {
    const name = String(payload?.name || '').trim();
    const ownerId = String(payload?.owner_id || '').trim();
    const college = String(payload?.college || '').trim();
    const logoUrl = String(payload?.logo_url || '').trim() || null;
    const isActive = Boolean(payload?.is_active ?? true);

    if (!name) throw new Error('Canteen name is required.');
    if (!ownerId) throw new Error('Select an owner for the canteen.');
    if (!college) throw new Error('College is required for the canteen.');

    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', ownerId)
      .single();

    if (ownerError) throw ownerError;
    if (!owner) throw new Error('Selected owner was not found.');

    const { data: existingShop, error: existingShopError } = await supabase
      .from('canteen_shops')
      .select('id, name')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (existingShopError) throw existingShopError;
    if (existingShop) {
      throw new Error(`${owner.name || 'This user'} already owns ${existingShop.name}.`);
    }

    if (owner.role !== 'canteen_owner') {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'canteen_owner' })
        .eq('id', ownerId);

      if (roleError) throw roleError;
    }

    const insertPayload = {
      owner_id: ownerId,
      name,
      college,
      logo_url: logoUrl,
      is_active: isActive,
    };

    const { data, error } = await supabase
      .from('canteen_shops')
      .insert([insertPayload])
      .select('*, owner:profiles(name, email)')
      .single();

    if (error) throw error;

    await logAdminAction(adminId, 'CREATED_CANTEEN', 'canteen_shop', data.id, name, {
      owner_id: ownerId,
      owner_email: owner.email,
      college,
      is_active: isActive,
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateAdminCanteen(adminId, shopId, payload) {
  try {
    const name = String(payload?.name || '').trim();
    const ownerId = String(payload?.owner_id || '').trim();
    const college = String(payload?.college || '').trim();
    const logoUrl = String(payload?.logo_url || '').trim() || null;
    const isActive = Boolean(payload?.is_active ?? true);

    if (!shopId) throw new Error('Canteen id is required.');
    if (!name) throw new Error('Canteen name is required.');
    if (!ownerId) throw new Error('Select an owner for the canteen.');
    if (!college) throw new Error('College is required for the canteen.');

    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', ownerId)
      .single();

    if (ownerError) throw ownerError;
    if (!owner) throw new Error('Selected owner was not found.');

    const { data: conflictingShop, error: conflictingShopError } = await supabase
      .from('canteen_shops')
      .select('id, name')
      .eq('owner_id', ownerId)
      .neq('id', shopId)
      .maybeSingle();

    if (conflictingShopError) throw conflictingShopError;
    if (conflictingShop) {
      throw new Error(`${owner.name || 'This user'} already owns ${conflictingShop.name}.`);
    }

    if (owner.role !== 'canteen_owner') {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'canteen_owner' })
        .eq('id', ownerId);

      if (roleError) throw roleError;
    }

    const updatePayload = {
      owner_id: ownerId,
      name,
      college,
      logo_url: logoUrl,
      is_active: isActive,
    };

    const { data, error } = await supabase
      .from('canteen_shops')
      .update(updatePayload)
      .eq('id', shopId)
      .select('*, owner:profiles(name, email)')
      .single();

    if (error) throw error;

    await logAdminAction(adminId, 'UPDATED_CANTEEN', 'canteen_shop', shopId, name, {
      owner_id: ownerId,
      owner_email: owner.email,
      college,
      is_active: isActive,
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllPrintShops() {
  try {
    const { data, error } = await supabase
      .from('print_shops')
      .select('*, owner:profiles(name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAdminPrintShopOwners() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, college, role, status')
      .neq('role', 'admin')
      .order('name', { ascending: true })
      .limit(300);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createAdminPrintShop(adminId, payload) {
  try {
    const name = String(payload?.name || '').trim();
    const ownerId = String(payload?.owner_id || '').trim();
    const college = String(payload?.college || '').trim();
    const bwPricePerPage = Number(payload?.bw_price_per_page ?? 1);
    const colorPricePerPage = Number(payload?.color_price_per_page ?? 5);
    const bindingCharge = Number(payload?.binding_charge ?? 20);
    const logoUrl = String(payload?.logo_url || '').trim() || null;
    const isActive = Boolean(payload?.is_active ?? true);

    if (!name) throw new Error('Print shop name is required.');
    if (!ownerId) throw new Error('Select an owner for the print shop.');
    if (!college) throw new Error('College is required for the print shop.');
    if (Number.isNaN(bwPricePerPage) || bwPricePerPage < 0) throw new Error('B/W price must be 0 or more.');
    if (Number.isNaN(colorPricePerPage) || colorPricePerPage < 0) throw new Error('Color price must be 0 or more.');
    if (Number.isNaN(bindingCharge) || bindingCharge < 0) throw new Error('Binding charge must be 0 or more.');

    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, name, email, role, college')
      .eq('id', ownerId)
      .single();

    if (ownerError) throw ownerError;
    if (!owner) throw new Error('Selected owner was not found.');

    const { data: existingShop, error: existingShopError } = await supabase
      .from('print_shops')
      .select('id, name')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (existingShopError) throw existingShopError;
    if (existingShop) {
      throw new Error(`${owner.name || 'This user'} already owns ${existingShop.name}.`);
    }

    if (owner.role !== 'print_shop') {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'print_shop' })
        .eq('id', ownerId);

      if (roleError) throw roleError;
    }

    const insertPayload = {
      owner_id: ownerId,
      name,
      college,
      bw_price_per_page: bwPricePerPage,
      color_price_per_page: colorPricePerPage,
      binding_charge: bindingCharge,
      logo_url: logoUrl,
      is_active: isActive,
    };

    const { data, error } = await supabase
      .from('print_shops')
      .insert([insertPayload])
      .select('*, owner:profiles(name, email)')
      .single();

    if (error) throw error;

    await logAdminAction(adminId, 'CREATED_PRINT_SHOP', 'print_shop', data.id, name, {
      owner_id: ownerId,
      owner_email: owner.email,
      college,
      bw_price_per_page: bwPricePerPage,
      color_price_per_page: colorPricePerPage,
      binding_charge: bindingCharge,
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateAdminPrintShop(adminId, shopId, payload) {
  try {
    const name = String(payload?.name || '').trim();
    const ownerId = String(payload?.owner_id || '').trim();
    const college = String(payload?.college || '').trim();
    const bwPricePerPage = Number(payload?.bw_price_per_page ?? 1);
    const colorPricePerPage = Number(payload?.color_price_per_page ?? 5);
    const bindingCharge = Number(payload?.binding_charge ?? 20);
    const logoUrl = String(payload?.logo_url || '').trim() || null;
    const isActive = Boolean(payload?.is_active ?? true);

    if (!shopId) throw new Error('Print shop id is required.');
    if (!name) throw new Error('Print shop name is required.');
    if (!ownerId) throw new Error('Select an owner for the print shop.');
    if (!college) throw new Error('College is required for the print shop.');
    if (Number.isNaN(bwPricePerPage) || bwPricePerPage < 0) throw new Error('B/W price must be 0 or more.');
    if (Number.isNaN(colorPricePerPage) || colorPricePerPage < 0) throw new Error('Color price must be 0 or more.');
    if (Number.isNaN(bindingCharge) || bindingCharge < 0) throw new Error('Binding charge must be 0 or more.');

    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', ownerId)
      .single();

    if (ownerError) throw ownerError;
    if (!owner) throw new Error('Selected owner was not found.');

    const { data: conflictingShop, error: conflictingShopError } = await supabase
      .from('print_shops')
      .select('id, name')
      .eq('owner_id', ownerId)
      .neq('id', shopId)
      .maybeSingle();

    if (conflictingShopError) throw conflictingShopError;
    if (conflictingShop) {
      throw new Error(`${owner.name || 'This user'} already owns ${conflictingShop.name}.`);
    }

    if (owner.role !== 'print_shop') {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'print_shop' })
        .eq('id', ownerId);

      if (roleError) throw roleError;
    }

    const updatePayload = {
      owner_id: ownerId,
      name,
      college,
      bw_price_per_page: bwPricePerPage,
      color_price_per_page: colorPricePerPage,
      binding_charge: bindingCharge,
      logo_url: logoUrl,
      is_active: isActive,
    };

    const { data, error } = await supabase
      .from('print_shops')
      .update(updatePayload)
      .eq('id', shopId)
      .select('*, owner:profiles(name, email)')
      .single();

    if (error) throw error;

    await logAdminAction(adminId, 'UPDATED_PRINT_SHOP', 'print_shop', shopId, name, {
      owner_id: ownerId,
      owner_email: owner.email,
      college,
      bw_price_per_page: bwPricePerPage,
      color_price_per_page: colorPricePerPage,
      binding_charge: bindingCharge,
      is_active: isActive,
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllCanteenMenuItems(shopId) {
  try {
    let query = supabase
      .from('menu_items')
      .select('*, shop:canteen_shops(id, name, college)')
      .order('created_at', { ascending: false });

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllCanteenOrders() {
  try {
    const { data, error } = await supabase
      .from('canteen_orders')
      .select('*, student:profiles!student_id(name, email), shop:canteen_shops!shop_id(id, name, college)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllPrintOrders() {
  try {
    const { data, error } = await supabase
      .from('print_orders')
      .select('*, student:profiles!student_id(name, email), shop:print_shops!shop_id(id, name, college)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updatePrintShopStatus(adminId, shopId, shopName, isActive) {
  try {
     const { data, error } = await supabase
       .from('print_shops')
       .update({ is_active: isActive })
       .eq('id', shopId)
       .select()
       .single();
     if (error) throw error;
     await logAdminAction(adminId, isActive ? 'REACTIVATED_PRINT' : 'SUSPENDED_PRINT', 'print_shop', shopId, shopName);
     return { data, error: null };
  } catch (error) {
     return { data: null, error };
  }
}

export async function getAllMarketplaceListings() {
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*, seller:profiles(name, email, college), disabled_by_profile:profiles!disabled_by(name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Fetch report counts
    const { data: reports } = await supabase.from('reports').select('target_id').eq('target_type', 'listing');
    const enrichedData = (listings || []).map(item => ({
      ...item,
      report_count: reports?.filter(r => r.target_id === item.id).length || 0
    }));

    return { data: enrichedData, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateListingStatus(adminId, listingId, listingTitle, status) {
  try {
    const normalized = String(status || '').toLowerCase();
    let updatePayload = {};

    if (normalized === 'disabled') {
      updatePayload = {
        is_admin_disabled: true,
        disabled_reason: 'Disabled by admin',
        disabled_by: adminId,
        updated_at: new Date().toISOString(),
      };
    } else if (normalized === 'enabled' || normalized === 'active') {
      updatePayload = {
        is_admin_disabled: false,
        disabled_reason: null,
        disabled_by: null,
        updated_at: new Date().toISOString(),
      };
    } else if (normalized === 'sold') {
      updatePayload = {
        is_sold: true,
        updated_at: new Date().toISOString(),
      };
    } else {
      throw new Error('Unsupported listing status update.');
    }

    const { data, error } = await supabase
       .from('listings')
       .update(updatePayload)
       .eq('id', listingId)
       .select()
       .single();
    if (error) throw error;

    const action = normalized === 'disabled'
      ? 'DISABLED_LISTING'
      : normalized === 'sold'
        ? 'MARKED_LISTING_SOLD'
        : 'ENABLED_LISTING';
    await logAdminAction(adminId, action, 'marketplace_listing', listingId, listingTitle);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteMarketplaceListing(adminId, listingId, listingTitle) {
  try {
    const { error } = await supabase.from('listings').delete().eq('id', listingId);
    if (error) throw error;
    await logAdminAction(adminId, 'DELETED_LISTING', 'marketplace_listing', listingId, listingTitle);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getAllCommunityPosts() {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*, author:profiles(name, email, college)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Fetch top comments count?
    const { data: comments } = await supabase.from('comments').select('post_id');
    const { data: reports } = await supabase.from('reports').select('target_id').eq('target_type', 'post');

    const enrichedData = (posts || []).map(post => ({
      ...post,
      comment_count: comments?.filter(c => c.post_id === post.id).length || 0,
      report_count: reports?.filter(r => r.target_id === post.id).length || 0
    }));

    return { data: enrichedData, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAdminPostReveal(extractedPostId) {
  try {
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', extractedPostId)
      .single();
    if (postError) throw postError;

    const { data: author, error: authorError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', post.author_id)
      .single();
    if (authorError) throw authorError;

    let collegeName = author?.college || 'Unknown College';
    let collegeShort = null;

    if (author?.college_id) {
      const { data: college } = await supabase
        .from('colleges')
        .select('name, short_name')
        .eq('id', author.college_id)
        .maybeSingle();

      if (college?.name) {
        collegeName = college.name;
        collegeShort = college.short_name || null;
      }
    }

    const { count: reportCount, error: reportError } = await supabase
      .from('reports')
      .select('*', { head: true, count: 'exact' })
      .eq('target_type', 'post')
      .eq('target_id', extractedPostId);

    if (reportError) throw reportError;

    return {
      data: {
        post: {
          ...post,
          report_count: reportCount || 0,
          comment_count: post.comments_count ?? post.comment_count ?? 0,
          like_count: post.likes_count ?? post.upvotes ?? 0,
        },
        author: {
          id: author.id,
          name: author.name,
          email: author.email,
          username: author.username,
          avatar_url: author.avatar_url,
          role: author.role,
          status: author.status,
          campus_credits: author.campus_credits,
          joined_at: author.created_at,
          no_show_count: author.no_show_count,
          college_name: collegeName,
          college_short: collegeShort,
        },
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteCommunityPost(adminId, postId, snippet) {
  try {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
    await logAdminAction(adminId, 'DELETED_POST', 'community_post', postId, snippet);
    return { error: null };
  } catch (error) {
    return { error };
  }
}
export async function getReports(status = 'pending') {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter:profiles(name, email)')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAuditLogs() {
  try {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('*, admin_user:profiles(name, email)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAdminPostDetail(postId) {
  try {
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, author:profiles!author_id(id, name, email, avatar_url, college, role, status, created_at)')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    const authorId = post.author_id;

    const [{ data: authorPosts }, { data: authorComments }] = await Promise.all([
      supabase
        .from('posts')
        .select('id, title, content, is_anonymous, created_at, likes_count, comments_count, type')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false }),
      supabase
        .from('comments')
        .select('id, content, created_at, post_id, is_anonymous')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return {
      data: {
        post,
        author: post.author,
        authorPosts: authorPosts || [],
        authorComments: authorComments || [],
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function sendUserWarning(adminId, userId, title, message) {
  try {
    const { error } = await supabase.from('notifications').insert([
      {
        user_id: userId,
        type: 'admin_warning',
        title,
        message,
        link: '/student/notifications',
      },
    ]);
    if (error) throw error;

    await sendPushNotification(userId, {
      type: 'announcement',
      title,
      body: message,
      url: '/student/notifications',
      important: false,
    }).catch(() => {});

    await logAdminAction(adminId, 'WARNED_USER', 'profile', userId, title, { message });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function resolveReport(adminId, reportId, verdict) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .update({ status: 'reviewed', reviewed_by: adminId })
      .eq('id', reportId)
      .select()
      .single();
    if (error) throw error;
    await logAdminAction(adminId, 'RESOLVED_REPORT', 'report', reportId, `Report #${reportId}`, { verdict });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getCommunityReports(status = 'pending') {
  try {
    let reportsQuery = supabase
      .from('reports')
      .select('*')
      .in('target_type', ['post', 'profile'])
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      reportsQuery = reportsQuery.eq('status', status);
    }

    const { data: reports, error: reportsError } = await reportsQuery;
    if (reportsError) throw reportsError;

    const rows = reports || [];
    if (rows.length === 0) {
      return { data: [], error: null };
    }

    const reporterIds = Array.from(new Set(rows.map((row) => row.reporter_id).filter(Boolean)));
    const postIds = Array.from(new Set(rows.filter((row) => row.target_type === 'post').map((row) => row.target_id).filter(Boolean)));
    const accountIds = Array.from(new Set(rows.filter((row) => row.target_type === 'profile').map((row) => row.target_id).filter(Boolean)));

    const { data: reporterProfiles } = reporterIds.length
      ? await supabase.from('profiles').select('id, name, email, username').in('id', reporterIds)
      : { data: [] };

    const { data: reportedPosts } = postIds.length
      ? await supabase.from('posts').select('id, content, author_id, created_at, is_anonymous').in('id', postIds)
      : { data: [] };

    const postAuthorIds = Array.from(new Set((reportedPosts || []).map((post) => post.author_id).filter(Boolean)));
    const combinedAccountIds = Array.from(new Set([...accountIds, ...postAuthorIds]));

    const { data: targetProfiles } = combinedAccountIds.length
      ? await supabase.from('profiles').select('id, name, email, username, status').in('id', combinedAccountIds)
      : { data: [] };

    const reporterMap = new Map((reporterProfiles || []).map((item) => [item.id, item]));
    const postMap = new Map((reportedPosts || []).map((item) => [item.id, item]));
    const profileMap = new Map((targetProfiles || []).map((item) => [item.id, item]));

    const enriched = rows.map((row) => {
      const relatedPost = row.target_type === 'post' ? postMap.get(row.target_id) : null;
      const targetAccountId = row.target_type === 'profile' ? row.target_id : relatedPost?.author_id || null;
      const targetAccount = targetAccountId ? profileMap.get(targetAccountId) : null;

      return {
        ...row,
        reporter: reporterMap.get(row.reporter_id) || null,
        target_post: relatedPost || null,
        target_account: targetAccount || null,
      };
    });

    return { data: enriched, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getSettings() {
  try {
    const { data, error } = await supabase.from('platform_settings').select('*');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateSetting(adminId, key, value) {
  try {
    const { error } = await supabase.from('platform_settings').update({ value, updated_by: adminId }).eq('key', key);
    if (error) throw error;
    await logAdminAction(adminId, 'UPDATED_SETTING', 'platform_setting', null, key, { value });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getDashboardStats() {
  try {
    // 1. Total Users
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    
    // 2. Active Orders (canteen)
    const { count: activeOrders } = await supabase.from('canteen_orders')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("picked_up","cancelled")');
      
    // 3. Total Listings
    const { count: totalListings } = await supabase.from('listings').select('*', { count: 'exact', head: true });

    // Shared stats
    const { count: totalCommunityPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true });
    const { count: totalMarketplaceListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('is_sold', false);
    const { count: totalActiveUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    // 4. Pending Reports
    const { count: pendingReports } = await supabase.from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
      
    // 5. Total revenue (sum)
    const { data: shops } = await supabase.from('canteen_shops').select('total_revenue');
    const revenue = shops ? shops.reduce((acc, shop) => acc + (Number(shop.total_revenue) || 0), 0) : 0;
    
    // 6. Recent Activity (Latest signups, listed items, orders)
    // We'll just fetch latest 5 audit logs as activity
    const { data: recentActivity } = await supabase.from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Per-college stats
    const { data: profiles } = await supabase.from('profiles').select('id, college, role');
    const { data: posts } = await supabase.from('posts').select('id, college, created_at');
    const { data: listings } = await supabase.from('listings').select('id, college, is_sold');
    const { data: canteenShops } = await supabase.from('canteen_shops').select('id, college');
    const { data: printShops } = await supabase.from('print_shops').select('id, college');
    const { data: canteenOrders } = await supabase.from('canteen_orders').select('shop_id, created_at');
    const { data: printOrders } = await supabase.from('print_orders').select('shop_id, created_at');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTs = startOfToday.getTime();

    const collegeNames = Array.from(
      new Set(
        (profiles || [])
          .map((p) => p.college)
          .filter((name) => typeof name === 'string' && name.trim().length > 0)
      )
    );

    const canteenCollegeByShop = new Map((canteenShops || []).map((s) => [s.id, s.college]));
    const printCollegeByShop = new Map((printShops || []).map((s) => [s.id, s.college]));

    const perCollegeStats = collegeNames.map((college) => {
      const activeStudentsCount = (profiles || []).filter((p) => p.college === college && p.role === 'student').length;
      const activeListingsCount = (listings || []).filter((l) => l.college === college && !l.is_sold).length;
      const postsTodayCount = (posts || []).filter((p) => p.college === college && new Date(p.created_at).getTime() >= startTs).length;

      const canteenOrdersToday = (canteenOrders || []).filter((o) => {
        const orderCollege = canteenCollegeByShop.get(o.shop_id);
        return orderCollege === college && new Date(o.created_at).getTime() >= startTs;
      }).length;

      const printOrdersToday = (printOrders || []).filter((o) => {
        const orderCollege = printCollegeByShop.get(o.shop_id);
        return orderCollege === college && new Date(o.created_at).getTime() >= startTs;
      }).length;

      return {
        college,
        collegeLogo: null,
        activeStudentsCount,
        canteenOrdersToday,
        printOrdersToday,
        activeListingsCount,
        postsTodayCount,
      };
    });

    return {
      data: {
        totalUsers: totalUsers || 0,
        activeOrders: activeOrders || 0,
        totalListings: totalListings || 0,
        creditsCirculating: 0, // Need RPC for sum, hard skip for now or set to 'N/A'
        pendingReports: pendingReports || 0,
        totalRevenue: revenue,
        recentActivity: recentActivity || [],
        sharedStats: {
          totalCommunityPosts: totalCommunityPosts || 0,
          totalMarketplaceListings: totalMarketplaceListings || 0,
          totalActiveUsers: totalActiveUsers || 0,
        },
        perCollegeStats,
      },
      error: null
    };
  } catch (error) {
    return { data: null, error };
  }
}

// --- Announcements ---
export const getAnnouncements = async () => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*, target_user:profiles!target_user_id(id, name, email)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data };
    } catch (err) {
        return { error: err.message };
    }
};

export const createAnnouncement = async (announcement) => {
    try {
        const basePayload = {
          type: announcement?.type || 'info',
          target: announcement?.target || 'all',
          target_user_id: announcement?.target_user_id || null,
          link_url: announcement?.link_url || null,
          is_active: announcement?.is_active ?? true,
          created_by: announcement?.created_by || null,
          expires_at: announcement?.expires_at || null,
        };

        let data = null;
        let error = null;

        // Preferred schema: message column.
        const primaryInsert = await supabase
          .from('announcements')
          .insert([{ ...basePayload, message: announcement?.message || announcement?.content || '' }])
          .select();

        data = primaryInsert.data;
        error = primaryInsert.error;

        // Legacy fallback schema: content column.
        if (error && String(error?.message || '').toLowerCase().includes("could not find the 'message' column")) {
          const fallbackInsert = await supabase
            .from('announcements')
            .insert([{ ...basePayload, content: announcement?.message || announcement?.content || '' }])
            .select();
          data = fallbackInsert.data;
          error = fallbackInsert.error;
        }

        if (error) throw error;

        const created = data?.[0];
        if (!created) {
          return { data, recipientsCount: 0 };
        }

        const notificationTitle = 'Campus Announcement';
        const notificationMessage = created.message || created.content || announcement?.message || announcement?.content || '';

        let notificationsPayload = [];
        if (created.target === 'all') {
          const { data: activeUsers, error: usersError } = await supabase
            .from('profiles')
            .select('id')
            .eq('status', 'active');
          if (usersError) throw usersError;

          notificationsPayload = (activeUsers || []).map((user) => ({
            user_id: user.id,
            type: 'announcement',
            title: notificationTitle,
            message: notificationMessage,
            link: created.link_url || null,
          }));
        } else if (created.target === 'specific_user' && created.target_user_id) {
          notificationsPayload = [
            {
              user_id: created.target_user_id,
              type: 'announcement',
              title: notificationTitle,
              message: notificationMessage,
              link: created.link_url || null,
            },
          ];
        }

        if (notificationsPayload.length > 0) {
          const { error: notificationError } = await supabase.from('notifications').insert(notificationsPayload);
          if (notificationError) throw notificationError;

          await Promise.all(
            notificationsPayload.map((notification) =>
              sendPushNotification(notification.user_id, {
                type: 'announcement',
                title: notification.title,
                body: notification.message,
                url: notification.link || '/',
                important: true,
              }).catch(() => {})
            )
          );
        }

        return { data, recipientsCount: notificationsPayload.length };
    } catch (err) {
        return { error: err.message };
    }
};

export const updateAnnouncement = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message || error };
  }
};

export const searchAnnouncementUsers = async (term) => {
  try {
    if (!term?.trim()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, username, status')
      .or(`username.ilike.%${term}%,email.ilike.%${term}%,name.ilike.%${term}%`)
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) throw error;

    const sortedData = (data || []).sort((a, b) => {
      const q = String(term).trim().toLowerCase();
      const aUser = String(a.username || '').toLowerCase();
      const bUser = String(b.username || '').toLowerCase();
      const aEmail = String(a.email || '').toLowerCase();
      const bEmail = String(b.email || '').toLowerCase();

      const aPrio =
        aUser.startsWith(q) || aEmail.startsWith(q) ? 0 :
        aUser.includes(q) || aEmail.includes(q) ? 1 : 2;
      const bPrio =
        bUser.startsWith(q) || bEmail.startsWith(q) ? 0 :
        bUser.includes(q) || bEmail.includes(q) ? 1 : 2;
      return aPrio - bPrio;
    });

    return { data: sortedData, error: null };
  } catch (error) {
    return { data: [], error: error.message || error };
  }
};

export const getAnnouncementRecipients = async (announcement) => {
  try {
    if (!announcement) return { data: [], count: 0, error: null };

    if (announcement.target === 'specific_user' && announcement.target_user_id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, status')
        .eq('id', announcement.target_user_id)
        .limit(1);
      if (error) throw error;
      return { data: data || [], count: data?.length || 0, error: null };
    }

    const { data, error, count } = await supabase
      .from('profiles')
      .select('id, name, email, status', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return { data: data || [], count: count || 0, error: null };
  } catch (error) {
    return { data: [], count: 0, error: error.message || error };
  }
};

export const deleteAnnouncement = async (id) => {
    try {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { data: true };
    } catch (err) {
        return { error: err.message };
    }
};

// --- Finance ---
export const getFinanceStats = async () => {
  try {
    const { data: shops } = await supabase.from('canteen_shops').select('total_revenue');
    const totalRevenue = shops ? shops.reduce((acc, shop) => acc + (Number(shop.total_revenue) || 0), 0) : 0;
    
    const { data: creditsAdded } = await supabase.from('credits_log')
      .select('credits_change')
      .gt('credits_change', 0);
    const creditsPurchased = creditsAdded ? creditsAdded.reduce((acc, log) => acc + (Number(log.credits_change) || 0), 0) : 0;

    const platformFees = totalRevenue * 0.025;

    return { 
      data: {
        totalRevenue,
        creditsPurchased,
        platformFees,
        pendingPayouts: 0
      }
    };
  } catch (error) {
    return { error: error.message };
  }
};

export const getTransactions = async () => {
  try {
    const { data, error } = await supabase
      .from('credits_log')
      .select('*, user_profile:profiles!user_id(name, email)')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
        const { data: fallbackData } = await supabase
          .from('credits_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        return { data: fallbackData };
    }
    return { data };
  } catch (error) {
    return { error: error.message };
  }
};


export async function permanentlyDeleteUser(adminId, userId) {
  if (!import.meta.env.VITE_BACKEND_URL) return { error: { message: "Backend URL not configured." } };
  try {
    const { getClerkToken } = await import('../lib/supabase');
    const token = getClerkToken();
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error((await res.json())?.error || 'Failed to delete user fully.');
    await logAdminAction(adminId, 'USER_DELETED_PERMANENTLY', 'users', userId, userId);
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}



export const adminAPI = {
  getSocieties: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'society')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  createSocietyUser: async (societyData) => {
    const { getClerkToken } = await import('../lib/supabase');
    const token = getClerkToken();
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/admin/users/society`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(societyData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create society');
    }
    
    return response.json();
  },

  updateSocietyUser: async (societyId, updateData) => {
    const { useAuthStore } = await import('../store/authStore');
    const adminId = useAuthStore.getState().profile?.id;
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', societyId)
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    
    await logAdminAction(adminId, 'UPDATED_SOCIETY', 'profile', societyId, updateData.name || societyId, updateData);
    
    return data;
  }
};

export async function createCanteenOwnerAccount(ownerData) {
  const { getClerkToken } = await import('../lib/supabase');
  const token = getClerkToken();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  const response = await fetch(`${backendUrl}/api/admin/users/canteen-owner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(ownerData)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create canteen owner');
  }
  return response.json();
}

export async function createPrintOwnerAccount(ownerData) {
  const { getClerkToken } = await import('../lib/supabase');
  const token = getClerkToken();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  const response = await fetch(`${backendUrl}/api/admin/users/print-owner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(ownerData)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create print owner');
  }
  return response.json();
}


