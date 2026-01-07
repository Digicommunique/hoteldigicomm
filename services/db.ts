
import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { Room, Guest, Booking, Transaction, HostelSettings, GroupProfile, RoomStatus } from '../types';
import { supabase } from './supabase.ts';

/**
 * HotelSphereDB class extending Dexie to manage local indexedDB storage.
 */
export class HotelSphereDB extends Dexie {
  rooms!: Table<Room>;
  guests!: Table<Guest>;
  bookings!: Table<Booking>;
  financialTransactions!: Table<Transaction>;
  settings!: Table<HostelSettings>;
  groups!: Table<GroupProfile>;

  constructor() {
    // Call super with the database name.
    super('HotelSphereDB');
    
    // Define the database schema and version.
    (this as any).version(4).stores({
      rooms: 'id, number, floor, status, type',
      guests: 'id, name, phone, email, nationality',
      bookings: 'id, bookingNo, roomId, guestId, groupId, status, checkInDate, checkOutDate',
      financialTransactions: 'id, date, type, accountGroup, ledger, referenceId, entityName',
      settings: 'id',
      groups: 'id, groupName, groupType, headName, phone, status'
    });
  }
}

export const db = new HotelSphereDB();

/**
 * Resets the entire local database by clearing all tables.
 * This is a factory reset.
 */
export async function resetDatabase() {
  await (db as any).transaction('rw', [db.rooms, db.guests, db.bookings, db.financialTransactions, db.settings, db.groups], async () => {
    await db.rooms.clear();
    await db.guests.clear();
    await db.bookings.clear();
    await db.financialTransactions.clear();
    await db.settings.clear();
    await db.groups.clear();
  });

  // Attempt to clear cloud if connected
  try {
    await Promise.all([
      supabase.from('rooms').delete().neq('id', '0'),
      supabase.from('guests').delete().neq('id', '0'),
      supabase.from('bookings').delete().neq('id', '0'),
      supabase.from('transactions').delete().neq('id', '0'),
      supabase.from('settings').delete().neq('id', '0'),
      supabase.from('groups').delete().neq('id', '0'),
    ]);
  } catch (e) {
    console.warn("Cloud wipe failed or not configured", e);
  }

  window.location.reload();
}

/**
 * Clears only operational data (Guests, Bookings, Transactions) 
 * but keeps Rooms Inventory and Branding Settings.
 */
export async function clearOperationalData() {
  await (db as any).transaction('rw', [db.guests, db.bookings, db.financialTransactions, db.groups, db.rooms], async () => {
    // 1. Clear operational tables
    await db.guests.clear();
    await db.bookings.clear();
    await db.financialTransactions.clear();
    await db.groups.clear();

    // 2. Reset all rooms to VACANT
    const allRooms = await db.rooms.toArray();
    const resetRooms = allRooms.map(r => ({
      ...r,
      status: RoomStatus.VACANT,
      currentBookingId: undefined
    }));
    await db.rooms.bulkPut(resetRooms);
  });

  // Sync deletions to cloud
  try {
    await Promise.all([
      supabase.from('guests').delete().neq('id', '0'),
      supabase.from('bookings').delete().neq('id', '0'),
      supabase.from('transactions').delete().neq('id', '0'),
      supabase.from('groups').delete().neq('id', '0'),
      // For rooms, we update them to VACANT in cloud rather than delete
      supabase.from('rooms').update({ status: RoomStatus.VACANT, currentBookingId: null }).neq('id', '0')
    ]);
  } catch (e) {
    console.warn("Cloud operational reset failed", e);
  }

  window.location.reload();
}

/**
 * Exports all data from the database into a JSON file for backup.
 */
export async function exportDatabase() {
  const data = {
    rooms: await db.rooms.toArray(),
    guests: await db.guests.toArray(),
    bookings: await db.bookings.toArray(),
    transactions: await db.financialTransactions.toArray(),
    settings: await db.settings.toArray(),
    groups: await db.groups.toArray()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hotelsphere_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

/**
 * Imports data from a provided JSON file back into the database.
 */
export async function importDatabase(jsonFile: File) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        const result = e.target?.result;
        if (!result) throw new Error("Could not read file result");
        
        const data = JSON.parse(result as string);
        await (db as any).transaction('rw', [db.rooms, db.guests, db.bookings, db.financialTransactions, db.settings, db.groups], async () => {
          if (data.rooms) { await db.rooms.clear(); await db.rooms.bulkAdd(data.rooms); }
          if (data.guests) { await db.guests.clear(); await db.guests.bulkAdd(data.guests); }
          if (data.bookings) { await db.bookings.clear(); await db.bookings.bulkAdd(data.bookings); }
          if (data.transactions) { await db.financialTransactions.clear(); await db.financialTransactions.bulkAdd(data.transactions); }
          if (data.settings) { await db.settings.clear(); await db.settings.bulkAdd(data.settings); }
          if (data.groups) { await db.groups.clear(); await db.groups.bulkAdd(data.groups); }
        });
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(jsonFile);
  });
}
