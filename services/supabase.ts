
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fejxskvsjfwjqmiobtpp.supabase.co';
// User provided key: sb_publishable_2uT90ihz2_hKT4ax30ysbA_hZZBiX9P
const SUPABASE_ANON_KEY = 'sb_publishable_2uT90ihz2_hKT4ax30ysbA_hZZBiX9P';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper to sync local table data to Supabase.
 * Uses upsert to either update existing records (by ID) or insert new ones.
 */
export async function pushToCloud(tableName: string, data: any) {
  try {
    const { error } = await supabase
      .from(tableName)
      .upsert(data, { onConflict: 'id' });
    
    if (error) {
      if (error.message.includes('schema cache') || error.message.includes('column') || error.code === '42703') {
        console.warn(`[Supabase Schema Sync] Table: ${tableName} requires a remote schema refresh.`);
      } else {
        console.error(`Supabase Sync Error [${tableName}]:`, error.message, error.code);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Cloud Connection Failed [${tableName}]:`, err);
    return false;
  }
}

/**
 * Fetches all records from all tables in Supabase to sync a new browser/device.
 */
export async function fetchAllFromCloud() {
  try {
    const [rooms, guests, bookings, transactions, settings, groups] = await Promise.all([
      supabase.from('rooms').select('*'),
      supabase.from('guests').select('*'),
      supabase.from('bookings').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('settings').select('*').eq('id', 'primary').maybeSingle(),
      supabase.from('groups').select('*')
    ]);

    return {
      rooms: rooms.data || [],
      guests: guests.data || [],
      bookings: bookings.data || [],
      transactions: transactions.data || [],
      settings: settings.data || null,
      groups: groups.data || []
    };
  } catch (err) {
    console.error("Cloud Pull Failed:", err);
    return null;
  }
}
