import { supabase } from '../lib/supabase';

// RPC functions required to safely increment/decrement campus_credits

export async function getCreditsBalance(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('campus_credits')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return { data: data.campus_credits, error: null };
  } catch (error) {
    return { data: 0, error };
  }
}

export async function addCredits(userId, amount, actionType, referenceId = null, reason = '') {
  try {
    // 1. Get current balance
    const { data: profile, error: profileError } = await getCreditsBalance(userId);
    if (profileError) throw profileError;

    const newBalance = profile + amount;

    // 2. Wrap in a transaction-like flow (ideally an RPC in Supabase, but doing it clientside securely)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ campus_credits: newBalance })
      .eq('id', userId);
      
    if (updateError) throw updateError;

    // 3. Log it
    const { data: logData, error: logError } = await supabase
      .from('credits_log')
      .insert([{
        user_id: userId,
        action_type: actionType,
        credits_change: amount,
        new_balance: newBalance,
        reference_id: referenceId,
        reason
      }])
      .select()
      .single();
      
    if (logError) throw logError;

    return { data: logData, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deductCredits(userId, amount, actionType, referenceId = null, reason = '') {
  try {
    const { data: currentBalance, error: profileError } = await getCreditsBalance(userId);
    if (profileError) throw profileError;

    if (currentBalance < amount) {
      throw new Error("Insufficient Reputation");
    }

    const newBalance = currentBalance - amount;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ campus_credits: newBalance })
      .eq('id', userId);
      
    if (updateError) throw updateError;

    const { data: logData, error: logError } = await supabase
      .from('credits_log')
      .insert([{
        user_id: userId,
        action_type: actionType,
        credits_change: -amount,
        new_balance: newBalance,
        reference_id: referenceId,
        reason
      }])
      .select()
      .single();
      
    if (logError) throw logError;

    return { data: logData, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getCreditsLog(userId) {
  try {
    const { data, error } = await supabase
      .from('credits_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
