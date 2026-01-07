
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Room, RoomStatus, Guest, Booking, HostelSettings, Transaction, GroupProfile, UserRole } from './types.ts';
import { INITIAL_ROOMS, STATUS_COLORS, GUEST_OCCUPANCY_THEMES } from './constants.tsx';
import { db } from './services/db.ts';
import { pushToCloud, supabase, fetchAllFromCloud } from './services/supabase.ts';
import GuestCheckin from './components/GuestCheckin.tsx';
import StayManagement from './components/StayManagement.tsx';
import Reports from './components/Reports.tsx';
import Accounting from './components/Accounting.tsx';
import Settings from './components/Settings.tsx';
import ReservationEntry from './components/ReservationEntry.tsx';
import GroupModule from './components/GroupModule.tsx';
import RoomActionModal from './components/RoomActionModal.tsx';
import Login from './components/Login.tsx';
import BillArchive from './components/BillArchive.tsx';
import OldDataImport from './components/OldDataImport.tsx';

const App: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<GroupProfile[]>([]);
  const [settings, setSettings] = useState<HostelSettings>({
    id: 'primary',
    name: 'HotelSphere Pro',
    address: 'Suite 101, Enterprise Tower, Metro City',
    superadminPassword: 'Durgamaa@18',
    adminPassword: 'admin',
    receptionistPassword: 'admin',
    accountantPassword: 'admin',
    supervisorPassword: 'admin',
    upiId: 'hotel@upi',
    agents: [
      { name: 'Direct', commission: 0 },
      { name: 'Booking.com', commission: 15 },
      { name: 'Expedia', commission: 18 }
    ],
    roomTypes: ['DELUXE ROOM', 'BUDGET ROOM', 'STANDARD ROOM', 'AC FAMILY ROOM']
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('RECEPTIONIST');
  const [syncStatus, setSyncStatus] = useState<'OK' | 'ERROR'>('OK');
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  const [publicBillData, setPublicBillData] = useState<{booking: Booking, guest: Guest, room: Room} | null>(null);
  const [isPublicLoading, setIsPublicLoading] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showRoomActions, setShowRoomActions] = useState(false);
  const [showBillArchive, setShowBillArchive] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GROUP' | 'REPORTS' | 'ACCOUNTING' | 'SETTINGS'>('DASHBOARD');

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedRoomIdsForBulk, setSelectedRoomIdsForBulk] = useState<string[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const refreshFromCloud = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    const cloudData = await fetchAllFromCloud();
    if (cloudData) {
      await (db as any).transaction('rw', [db.rooms, db.guests, db.bookings, db.financialTransactions, db.settings, db.groups], async () => {
        if (cloudData.settings) {
          await db.settings.put(cloudData.settings);
          setSettings(cloudData.settings);
        }
        await db.rooms.clear(); if (cloudData.rooms.length > 0) await db.rooms.bulkPut(cloudData.rooms); setRooms(cloudData.rooms);
        await db.guests.clear(); if (cloudData.guests.length > 0) await db.guests.bulkPut(cloudData.guests); setGuests(cloudData.guests);
        await db.bookings.clear(); if (cloudData.bookings.length > 0) await db.bookings.bulkPut(cloudData.bookings); setBookings(cloudData.bookings);
        await db.financialTransactions.clear(); if (cloudData.transactions.length > 0) await db.financialTransactions.bulkPut(cloudData.transactions); setTransactions(cloudData.transactions);
        await db.groups.clear(); if (cloudData.groups.length > 0) await db.groups.bulkPut(cloudData.groups); setGroups(cloudData.groups);
      });
      setSyncStatus('OK');
    } else {
      setSyncStatus('ERROR');
    }
    if (!silent) setIsSyncing(false);
  };

  const handleRealtimeChange = useCallback(async (payload: any, table: string) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    setIsSyncing(true);
    
    const tableMap: any = {
      'rooms': { store: db.rooms, stateSetter: setRooms },
      'bookings': { store: db.bookings, stateSetter: setBookings },
      'guests': { store: db.guests, stateSetter: setGuests },
      'transactions': { store: db.financialTransactions, stateSetter: setTransactions },
      'groups': { store: db.groups, stateSetter: setGroups },
      'settings': { store: db.settings, stateSetter: setSettings }
    };

    const target = tableMap[table];
    if (!target) return;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      await target.store.put(newRecord);
      if (table === 'settings') {
        setSettings(newRecord);
      } else {
        target.stateSetter((prev: any[]) => {
          const next = [...prev];
          const idx = next.findIndex(item => item.id === newRecord.id);
          if (idx > -1) next[idx] = newRecord;
          else next.push(newRecord);
          return next;
        });
      }
    } else if (eventType === 'DELETE') {
      await target.store.delete(oldRecord.id);
      target.stateSetter((prev: any[]) => prev.filter(item => item.id !== oldRecord.id));
    }
    
    setSyncStatus('OK');
    setTimeout(() => setIsSyncing(false), 800);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, p => handleRealtimeChange(p, 'rooms'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, p => handleRealtimeChange(p, 'bookings'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, p => handleRealtimeChange(p, 'guests'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, p => handleRealtimeChange(p, 'settings'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, p => handleRealtimeChange(p, 'groups'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, p => handleRealtimeChange(p, 'transactions'))
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, [handleRealtimeChange]);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      const cloudData = await fetchAllFromCloud();
      
      if (cloudData && cloudData.settings) {
         // Cloud is source of truth
         await (db as any).transaction('rw', [db.rooms, db.guests, db.bookings, db.financialTransactions, db.settings, db.groups], async () => {
           await db.settings.put(cloudData.settings);
           await db.rooms.clear(); if(cloudData.rooms.length) await db.rooms.bulkPut(cloudData.rooms);
           await db.guests.clear(); if(cloudData.guests.length) await db.guests.bulkPut(cloudData.guests);
           await db.bookings.clear(); if(cloudData.bookings.length) await db.bookings.bulkPut(cloudData.bookings);
           await db.financialTransactions.clear(); if(cloudData.transactions.length) await db.financialTransactions.bulkPut(cloudData.transactions);
           await db.groups.clear(); if(cloudData.groups.length) await db.groups.bulkPut(cloudData.groups);
         });
         setSettings(cloudData.settings);
         setRooms(cloudData.rooms);
         setGuests(cloudData.guests);
         setBookings(cloudData.bookings);
         setTransactions(cloudData.transactions);
         setGroups(cloudData.groups);
      } else {
        // Fallback to local
        const [r, g, b, t, gr, set] = await Promise.all([
          db.rooms.toArray(), db.guests.toArray(), db.bookings.toArray(),
          db.financialTransactions.toArray(), db.groups.toArray(), db.settings.get('primary')
        ]);
        if (set) {
          setSettings(set); setRooms(r); setGuests(g); setBookings(b); setTransactions(t); setGroups(gr);
        } else {
          // Absolute fallback
          await db.settings.put(settings);
          await db.rooms.bulkPut(INITIAL_ROOMS);
          setRooms(INITIAL_ROOMS);
        }
      }
      setIsLoading(false);
    };

    initData();
  }, []);

  const syncToDB = async (table: any, data: any, tableNameForCloud?: string) => {
    try {
      if (Array.isArray(data)) await table.bulkPut(data);
      else await table.put(data);
      if (tableNameForCloud) {
        const payload = Array.isArray(data) ? data : [data];
        const success = await pushToCloud(tableNameForCloud, payload);
        setSyncStatus(success ? 'OK' : 'ERROR');
        return success;
      }
      return true;
    } catch (err) {
      setSyncStatus('ERROR');
      return false;
    }
  };

  const updateRooms = (newRooms: Room[]) => { setRooms([...newRooms]); return syncToDB(db.rooms, newRooms, 'rooms'); };
  const updateGuests = (newGuests: Guest[]) => { setGuests([...newGuests]); return syncToDB(db.guests, newGuests, 'guests'); };
  const updateBookings = (newBookings: Booking[]) => { setBookings([...newBookings]); return syncToDB(db.bookings, newBookings, 'bookings'); };
  const updateTransactions = (newTx: Transaction[]) => { setTransactions([...newTx]); return syncToDB(db.financialTransactions, newTx, 'transactions'); };
  const updateGroups = (newGroups: GroupProfile[]) => { setGroups([...newGroups]); return syncToDB(db.groups, newGroups, 'groups'); };
  const updateSettings = (newSet: HostelSettings) => { setSettings({...newSet}); return syncToDB(db.settings, newSet, 'settings'); };

  const getRoomEffectiveStatus = (room: Room, bookingsList: Booking[]): RoomStatus => {
    const activeBooking = bookingsList.find(b => b.roomId === room.id && b.status === 'ACTIVE' && todayStr >= b.checkInDate && todayStr <= b.checkOutDate);
    if (activeBooking) return RoomStatus.OCCUPIED;
    const reservedBooking = bookingsList.find(b => b.roomId === room.id && b.status === 'RESERVED' && todayStr >= b.checkInDate && todayStr <= b.checkOutDate);
    if (reservedBooking) return RoomStatus.RESERVED;
    if ([RoomStatus.DIRTY, RoomStatus.REPAIR, RoomStatus.MANAGEMENT, RoomStatus.STAFF_BLOCK].includes(room.status)) return room.status;
    return RoomStatus.VACANT;
  };

  const handleAddPayment = (bookingId: string, payment: any) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const updatedBooking = { ...booking, payments: [...(booking.payments || []), payment] };
    updateBookings(bookings.map(b => b.id === bookingId ? updatedBooking : b));

    const newTx: Transaction = {
      id: `TX-PAY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'RECEIPT',
      accountGroup: 'Direct Income',
      ledger: payment.method || 'Cash Account',
      amount: payment.amount,
      entityName: guests.find(g => g.id === booking.guestId)?.name || 'Guest',
      description: `Payment Room ${rooms.find(r => r.id === booking.roomId)?.number}`,
      referenceId: bookingId
    };
    updateTransactions([...transactions, newTx]);
  };

  const roomsByFloor = useMemo(() => rooms.reduce((acc, room) => {
    acc[room.floor] = acc[room.floor] || [];
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>), [rooms]);

  const stats = useMemo(() => {
    const effectiveStatusList = rooms.map(r => getRoomEffectiveStatus(r, bookings));
    return {
      total: rooms.length,
      vacant: effectiveStatusList.filter(s => s === RoomStatus.VACANT).length,
      occupied: effectiveStatusList.filter(s => s === RoomStatus.OCCUPIED).length,
      reserved: effectiveStatusList.filter(s => s === RoomStatus.RESERVED).length,
      dirty: effectiveStatusList.filter(s => s === RoomStatus.DIRTY).length,
    };
  }, [rooms, bookings, todayStr]);

  if (isLoading) return <div className="min-h-screen bg-[#003d80] flex items-center justify-center text-white font-black uppercase tracking-widest">Synchronizing Database...</div>;
  if (!isLoggedIn) return <Login onLogin={(role) => { setCurrentUserRole(role); setIsLoggedIn(true); }} settings={settings} />;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-black">
      <nav className="bg-[#003d80] text-white px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between shadow-2xl sticky top-0 z-50 no-print gap-4">
        <div className="flex items-center gap-4 md:gap-12 w-full md:w-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('DASHBOARD')}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-900 text-lg font-black shadow-lg">HS</div>
            <span className="text-xl font-black uppercase tracking-tighter">{settings.name}</span>
          </div>
          <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            <NavBtn label="Home" active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} />
            <NavBtn label="Accounting" active={activeTab === 'ACCOUNTING'} onClick={() => setActiveTab('ACCOUNTING')} />
            <NavBtn label="Reports" active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} />
            <NavBtn label="Settings" active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-white/10">{currentUserRole}</span>
          <button onClick={() => setIsLoggedIn(false)} className="text-[10px] font-black uppercase text-white/50 hover:text-white">Logout</button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {activeBookingId ? (
          (() => {
            const b = bookings.find(b => b.id === activeBookingId);
            const g = b ? guests.find(g => g.id === b.guestId) : null;
            const r = b ? rooms.find(r => r.id === b.roomId) : null;
            if (!b || !g || !r) return null;
            return <StayManagement 
              booking={b} guest={g} room={r} allRooms={rooms} allBookings={bookings} settings={settings} 
              onUpdate={(ub) => updateBookings(bookings.map(x => x.id === ub.id ? ub : x))} 
              onAddPayment={handleAddPayment} 
              onUpdateGuest={(gu) => updateGuests(guests.map(x => x.id === gu.id ? gu : x))} 
              onShiftRoom={(newRid) => { /* logic */ }} 
              onClose={() => setActiveBookingId(null)} 
            />;
          })()
        ) : showCheckinForm && selectedRoom ? (
          <GuestCheckin room={selectedRoom} allRooms={rooms} existingGuests={guests} onClose={() => setShowCheckinForm(false)} 
            onSave={async (data) => {
              const guestId = data.guest.id || Math.random().toString(36).substr(2, 9);
              await updateGuests([...guests, { ...data.guest, id: guestId } as Guest]);
              const newBs = data.bookings.map(nb => ({ ...nb, guestId }));
              await updateBookings([...bookings, ...newBs]);
              setShowCheckinForm(false);
            }} 
          settings={settings} />
        ) : (
          (() => {
            switch (activeTab) {
              case 'REPORTS': return <Reports bookings={bookings} guests={guests} rooms={rooms} settings={settings} transactions={transactions} shiftLogs={[]} cleaningLogs={[]} quotations={[]} />;
              case 'ACCOUNTING': return <Accounting transactions={transactions} setTransactions={updateTransactions} guests={guests} bookings={bookings} quotations={[]} setQuotations={()=>{}} settings={settings} />;
              case 'SETTINGS': return <Settings settings={settings} setSettings={updateSettings} rooms={rooms} onDeleteRoom={async (id) => { setRooms(prev => prev.filter(r => r.id !== id)); return true; }} setRooms={updateRooms} currentRole={currentUserRole} />;
              default: return (
                <div className="p-4 md:p-6 pb-32">
                  <div className="flex justify-between items-center mb-8 no-print">
                    <h1 className="text-xl md:text-2xl font-black text-black border-l-4 border-blue-600 pl-4 uppercase">Front Desk</h1>
                    <div className="flex gap-2">
                       <button onClick={() => setShowReservationForm(true)} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-orange-600">Reservation</button>
                    </div>
                  </div>
                  <div className="space-y-10">
                    {(Object.entries(roomsByFloor) as [string, Room[]][]).sort().map(([floor, floorRooms]) => (
                      <div key={floor} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                        <div className="bg-blue-50 px-8 py-3 font-black text-black uppercase text-[10px] tracking-widest border-b">Floor Level {floor}</div>
                        <div className="p-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4">
                          {floorRooms.map(room => {
                            const effectiveStatus = getRoomEffectiveStatus(room, bookings);
                            const activeB = bookings.find(b => b.roomId === room.id && (b.status === 'ACTIVE' || b.status === 'RESERVED') && todayStr >= b.checkInDate && todayStr <= b.checkOutDate);
                            return (
                              <button key={room.id} onClick={() => { setSelectedRoom(room); if(activeB) setActiveBookingId(activeB.id); else setShowRoomActions(true); }} 
                                className={`min-h-[140px] border-2 rounded-2xl p-4 flex flex-col items-center justify-between transition-all hover:scale-105 ${STATUS_COLORS[effectiveStatus]}`}>
                                <span className="text-2xl font-black tracking-tighter uppercase">{room.number}</span>
                                <div className="text-center w-full">
                                  <div className="text-[9px] font-black uppercase mb-1 opacity-80 truncate">{room.type}</div>
                                  <div className="text-[8px] font-bold uppercase py-0.5 px-3 rounded-full border border-current inline-block">{effectiveStatus}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          })()
        )}
      </main>

      <footer className="bg-white border-t px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center fixed bottom-0 w-full z-40 shadow-2xl no-print gap-4">
        <div className="flex gap-4 overflow-x-auto w-full md:w-auto no-scrollbar py-1 items-center">
          <Stat label="Total" count={stats.total} color="text-black" />
          <Stat label="Vacant" count={stats.vacant} color="text-green-600" />
          <Stat label="Occ" count={stats.occupied} color="text-blue-600" />
          <Stat label="Resv" count={stats.reserved} color="text-orange-600" />
          <Stat label="Dirty" count={stats.dirty} color="text-red-600" />
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isSyncing ? 'animate-pulse bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <span className="text-[8px] font-black uppercase text-black">{isSyncing ? 'Syncing...' : 'Idle'}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${realtimeConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-[8px] font-black uppercase text-black">{realtimeConnected ? 'Cloud Online' : 'Cloud Offline'}</span>
          </div>
          <button onClick={() => setShowBillArchive(true)} className="p-2 bg-blue-900 text-white rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></button>
        </div>
      </footer>
      {showRoomActions && selectedRoom && (
        <RoomActionModal room={selectedRoom} onClose={() => setShowRoomActions(false)} onCheckIn={() => { setShowRoomActions(false); setShowCheckinForm(true); }} onStatusUpdate={(s) => { updateRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, status: s } : r)); setShowRoomActions(false); }} />
      )}
      {showBillArchive && (
        <BillArchive bookings={bookings} guests={guests} rooms={rooms} settings={settings} onClose={() => setShowBillArchive(false)} />
      )}
      {showReservationForm && <ReservationEntry rooms={rooms} existingGuests={guests} onClose={() => setShowReservationForm(false)} onSave={async (data) => { /* logic */ setShowReservationForm(false); }} settings={settings} />}
    </div>
  );
};

const NavBtn: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-6 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${active ? 'bg-white text-blue-900 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}>{label}</button>
);

const Stat: React.FC<{ label: string, count: number, color: string }> = ({ label, count, color }) => (
  <div className="flex items-center gap-2 shrink-0">
    <span className="text-[9px] font-black uppercase text-black tracking-wider">{label}:</span>
    <span className={`text-lg font-black ${color}`}>{count}</span>
  </div>
);

export default App;
