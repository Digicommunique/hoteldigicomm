
import React, { useState, useMemo, useEffect } from 'react';
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
  
  const [publicBillData, setPublicBillData] = useState<{booking: Booking, guest: Guest, room: Room} | null>(null);
  const [isPublicLoading, setIsPublicLoading] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showRoomActions, setShowRoomActions] = useState(false);
  const [showBillArchive, setShowBillArchive] = useState(false);
  const [showOldDataImport, setShowOldDataImport] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GROUP' | 'REPORTS' | 'ACCOUNTING' | 'SETTINGS'>('DASHBOARD');

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedRoomIdsForBulk, setSelectedRoomIdsForBulk] = useState<string[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const refreshFromCloud = async () => {
    setIsSyncing(true);
    const cloudData = await fetchAllFromCloud();
    if (cloudData) {
      // Fix: Property 'transaction' does not exist on type 'HotelSphereDB'. Casting to any.
      await (db as any).transaction('rw', [db.rooms, db.guests, db.bookings, db.financialTransactions, db.settings, db.groups], async () => {
        if (cloudData.settings) {
          await db.settings.put(cloudData.settings);
          setSettings(cloudData.settings);
        }
        if (cloudData.rooms.length > 0) {
          await db.rooms.clear();
          await db.rooms.bulkPut(cloudData.rooms);
          setRooms(cloudData.rooms);
        }
        if (cloudData.guests.length > 0) {
          await db.guests.clear();
          await db.guests.bulkPut(cloudData.guests);
          setGuests(cloudData.guests);
        }
        if (cloudData.bookings.length > 0) {
          await db.bookings.clear();
          await db.bookings.bulkPut(cloudData.bookings);
          setBookings(cloudData.bookings);
        }
        if (cloudData.transactions.length > 0) {
          await db.financialTransactions.clear();
          await db.financialTransactions.bulkPut(cloudData.transactions);
          setTransactions(cloudData.transactions);
        }
        if (cloudData.groups.length > 0) {
          await db.groups.clear();
          await db.groups.bulkPut(cloudData.groups);
          setGroups(cloudData.groups);
        }
      });
      setSyncStatus('OK');
    } else {
      setSyncStatus('ERROR');
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    const checkPublicView = async () => {
      const params = new URLSearchParams(window.location.search);
      const viewBillId = params.get('viewBill');
      
      if (viewBillId) {
        setIsPublicLoading(true);
        try {
          const { data: bData } = await supabase.from('bookings').select('*').eq('id', viewBillId).single();
          if (bData) {
            const [gRes, rRes, sRes] = await Promise.all([
              supabase.from('guests').select('*').eq('id', bData.guestId).single(),
              supabase.from('rooms').select('*').eq('id', bData.roomId).single(),
              supabase.from('settings').select('*').eq('id', 'primary').single()
            ]);
            
            if (gRes.data && rRes.data) {
              setPublicBillData({ booking: bData, guest: gRes.data, room: rRes.data });
              if (sRes.data) setSettings(sRes.data);
            }
          }
        } catch (e) {
          console.error("Error loading public bill", e);
        }
        setIsPublicLoading(false);
      }
    };

    const initData = async () => {
      try {
        let [r, g, b, t, gr, set] = await Promise.all([
          db.rooms.toArray(),
          db.guests.toArray(),
          db.bookings.toArray(),
          db.financialTransactions.toArray(),
          db.groups.toArray(),
          db.settings.get('primary')
        ]);

        // If local is empty or missing settings, it might be a new browser. Attempt cloud pull.
        if (!set || r.length === 0) {
          const cloudData = await fetchAllFromCloud();
          if (cloudData && cloudData.settings) {
             set = cloudData.settings;
             r = cloudData.rooms;
             g = cloudData.guests;
             b = cloudData.bookings;
             t = cloudData.transactions;
             gr = cloudData.groups;

             // Fix: Property 'transaction' does not exist on type 'HotelSphereDB'. Casting to any.
             await (db as any).transaction('rw', [db.rooms, db.guests, db.bookings, db.financialTransactions, db.settings, db.groups], async () => {
               await db.settings.put(set);
               if (r.length > 0) await db.rooms.bulkPut(r);
               if (g.length > 0) await db.guests.bulkPut(g);
               if (b.length > 0) await db.bookings.bulkPut(b);
               if (t.length > 0) await db.financialTransactions.bulkPut(t);
               if (gr.length > 0) await db.groups.bulkPut(gr);
             });
          }
        }

        // If still no settings after cloud check, it's a fresh install from scratch
        if (!set) {
          await db.settings.put({ ...settings });
          await pushToCloud('settings', [{ ...settings }]);
          await db.rooms.bulkPut(INITIAL_ROOMS);
          await pushToCloud('rooms', INITIAL_ROOMS);
          setRooms(INITIAL_ROOMS);
          set = settings;
        } else {
          setRooms(r || []);
        }
        
        setGuests(g || []);
        setBookings(b || []);
        setTransactions(t || []);
        setGroups(gr || []);
        setSettings(set);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Critical error during initialization:", error);
        setRooms(INITIAL_ROOMS);
        setIsLoading(false);
      }
    };

    checkPublicView();
    initData();
  }, []);

  const syncToDB = async (table: any, data: any, tableNameForCloud?: string) => {
    try {
      if (Array.isArray(data)) {
        await table.bulkPut(data);
      } else {
        await table.put(data);
      }
      if (tableNameForCloud) {
        const payload = Array.isArray(data) ? data : [data];
        const success = await pushToCloud(tableNameForCloud, payload);
        setSyncStatus(success ? 'OK' : 'ERROR');
        return success;
      }
      return true;
    } catch (err) {
      console.error(`Sync error:`, err);
      setSyncStatus('ERROR');
      return false;
    }
  };

  const updateRooms = (newRooms: Room[]) => { 
    setRooms([...newRooms]); 
    return syncToDB(db.rooms, newRooms, 'rooms'); 
  };

  const deleteRoom = async (roomId: string) => {
    try {
      setRooms(prev => prev.filter(r => r.id !== roomId));
      await db.rooms.delete(roomId);
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) throw error;
      setSyncStatus('OK');
      return true;
    } catch (err) {
      console.error("Failed to delete room:", err);
      setSyncStatus('ERROR');
      return false;
    }
  };
  
  const updateGuests = async (newGuests: Guest[]) => { 
    setGuests([...newGuests]); 
    return await syncToDB(db.guests, newGuests, 'guests');
  };
  
  const updateBookings = async (newBookings: Booking[], currentGuestsList?: Guest[]) => { 
    const guestSource = currentGuestsList || guests;
    const validBookings = newBookings.filter(b => guestSource.some(g => g.id === b.guestId));
    setBookings([...validBookings]); 
    return await syncToDB(db.bookings, validBookings, 'bookings'); 
  };

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
    const guest = guests.find(g => g.id === booking?.guestId);
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
      entityName: guest?.name || 'Walk-in Guest',
      description: `Payment from ${guest?.name} (Room ${rooms.find(r => r.id === booking.roomId)?.number})`,
      referenceId: bookingId
    };
    updateTransactions([...transactions, newTx]);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setActiveBookingId(null);
    setShowCheckinForm(false);
    setShowReservationForm(false);
    setShowRoomActions(false);
    setSelectedRoom(null);
    setIsMultiSelectMode(false);
    setSelectedRoomIdsForBulk([]);
  };

  const stats = useMemo(() => {
    const effectiveStatusList = rooms.map(r => getRoomEffectiveStatus(r, bookings));
    return {
      total: rooms.length,
      vacant: effectiveStatusList.filter(s => s === RoomStatus.VACANT).length,
      occupied: effectiveStatusList.filter(s => s === RoomStatus.OCCUPIED).length,
      reserved: effectiveStatusList.filter(s => s === RoomStatus.RESERVED).length,
      dirty: effectiveStatusList.filter(s => s === RoomStatus.DIRTY).length,
      repair: effectiveStatusList.filter(s => s === RoomStatus.REPAIR).length,
    };
  }, [rooms, bookings, todayStr]);

  const roomsByFloor = useMemo(() => rooms.reduce((acc, room) => {
    acc[room.floor] = acc[room.floor] || [];
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>), [rooms]);

  const handleRoomClick = (room: Room) => {
    const effectiveStatus = getRoomEffectiveStatus(room, bookings);
    if (currentUserRole === 'SUPERVISOR' && effectiveStatus !== RoomStatus.DIRTY) return;
    if (isMultiSelectMode) {
      if (effectiveStatus !== RoomStatus.VACANT) return;
      setSelectedRoomIdsForBulk(prev => prev.includes(room.id) ? prev.filter(id => id !== room.id) : [...prev, room.id]);
      return;
    }
    setSelectedRoom(room);
    const todayBooking = bookings.find(b => b.roomId === room.id && (b.status === 'ACTIVE' || b.status === 'RESERVED') && todayStr >= b.checkInDate && todayStr <= b.checkOutDate);
    if (todayBooking && currentUserRole !== 'SUPERVISOR') setActiveBookingId(todayBooking.id);
    else setShowRoomActions(true);
  };

  const handleCheckinSave = async (data: { guest: Partial<Guest>, bookings: any[] }) => {
    const guestId = data.guest.id || Math.random().toString(36).substr(2, 9);
    const guestToSave = { ...data.guest, id: guestId } as Guest;
    const existingIdx = guests.findIndex(g => g.id === guestId);
    let newGuests = [...guests];
    if (existingIdx > -1) newGuests[existingIdx] = { ...newGuests[existingIdx], ...data.guest } as Guest;
    else newGuests.push(guestToSave);
    
    await updateGuests(newGuests);
    const newBookingsList: Booking[] = data.bookings.map(b => ({ ...b, id: b.id || Math.random().toString(36).substr(2, 9), guestId: guestId }));
    await updateBookings([...bookings, ...newBookingsList], newGuests);

    const updatedRooms = rooms.map(r => {
      const bForRoomToday = newBookingsList.find(nb => nb.roomId === r.id && todayStr >= nb.checkInDate && todayStr <= nb.checkOutDate);
      if (bForRoomToday) return { ...r, status: bForRoomToday.status === 'ACTIVE' ? RoomStatus.OCCUPIED : RoomStatus.RESERVED, currentBookingId: bForRoomToday.id };
      return r;
    });
    updateRooms(updatedRooms);
    
    setShowCheckinForm(false); setShowReservationForm(false); setShowRoomActions(false); setIsMultiSelectMode(false); setSelectedRoomIdsForBulk([]);
  };

  const handleBookingUpdate = (updatedBooking: Booking) => {
    updateBookings(bookings.map(x => x.id === updatedBooking.id ? updatedBooking : x));
    if (todayStr >= updatedBooking.checkInDate && todayStr <= updatedBooking.checkOutDate) {
        updateRooms(rooms.map(r => {
          if (r.id === updatedBooking.roomId) {
            if (updatedBooking.status === 'COMPLETED') return { ...r, status: RoomStatus.DIRTY, currentBookingId: undefined };
            if (updatedBooking.status === 'ACTIVE') return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: updatedBooking.id };
          }
          return r;
        }));
    }
  };

  const handleShiftRoom = (bookingId: string, newRoomId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const oldRoomId = booking.roomId;
    
    const updatedBooking = { ...booking, roomId: newRoomId };
    updateBookings(bookings.map(b => b.id === bookingId ? updatedBooking : b));

    const updatedRooms = rooms.map(r => {
      if (r.id === oldRoomId) return { ...r, status: RoomStatus.DIRTY, currentBookingId: undefined };
      if (r.id === newRoomId) return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: bookingId };
      return r;
    });
    updateRooms(updatedRooms);
    setActiveBookingId(null);
    alert(`Shift Successful: Room ${rooms.find(r=>r.id===oldRoomId)?.number} is now DIRTY. Guest moved to Room ${rooms.find(r=>r.id===newRoomId)?.number}.`);
  };

  if (publicBillData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 md:p-12">
        <StayManagement 
          booking={publicBillData.booking} 
          guest={publicBillData.guest} 
          room={publicBillData.room} 
          allRooms={[]} 
          allBookings={[]} 
          settings={settings} 
          onUpdate={() => {}} 
          onAddPayment={() => {}} 
          onUpdateGuest={() => {}} 
          onShiftRoom={() => {}} 
          onClose={() => setPublicBillData(null)} 
          isDuplicate={false}
          isPublic={true}
        />
      </div>
    );
  }

  if (isPublicLoading || isLoading) return <div className="min-h-screen bg-[#003d80] flex items-center justify-center text-white font-black uppercase tracking-widest text-center px-4">HotelSphere Pro Loading...</div>;
  if (!isLoggedIn) return <Login onLogin={(role) => { setCurrentUserRole(role); setIsLoggedIn(true); }} settings={settings} />;

  const getOccupancyColor = (room: Room, bookingsList: Booking[]): string => {
    const effectiveStatus = getRoomEffectiveStatus(room, bookingsList);
    if (effectiveStatus !== RoomStatus.OCCUPIED) return STATUS_COLORS[effectiveStatus];

    const activeB = bookingsList.find(b => b.roomId === room.id && b.status === 'ACTIVE' && todayStr >= b.checkInDate && todayStr <= b.checkOutDate);
    if (!activeB) return STATUS_COLORS[RoomStatus.OCCUPIED];

    const hashSource = activeB.groupId || activeB.guestId;
    let hash = 0;
    for (let i = 0; i < hashSource.length; i++) {
      hash = hashSource.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % GUEST_OCCUPANCY_THEMES.length;
    return GUEST_OCCUPANCY_THEMES[colorIndex];
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-black">
      <nav className="bg-[#003d80] text-white px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between shadow-2xl sticky top-0 z-50 no-print gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-12 w-full md:w-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleTabChange('DASHBOARD')}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-900 text-lg font-black shadow-lg">HS</div>
            <span className="text-xl font-black uppercase tracking-tighter whitespace-nowrap">{settings.name}</span>
          </div>
          <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            <NavBtn label="Home" active={activeTab === 'DASHBOARD'} onClick={() => handleTabChange('DASHBOARD')} />
            {['SUPERADMIN', 'ADMIN', 'RECEPTIONIST'].includes(currentUserRole) && <NavBtn label="Groups" active={activeTab === 'GROUP'} onClick={() => handleTabChange('GROUP')} />}
            {['SUPERADMIN', 'ADMIN', 'ACCOUNTANT'].includes(currentUserRole) && (
              <>
                <NavBtn label="Accounting" active={activeTab === 'ACCOUNTING'} onClick={() => handleTabChange('ACCOUNTING')} />
                <NavBtn label="Reports" active={activeTab === 'REPORTS'} onClick={() => handleTabChange('REPORTS')} />
              </>
            )}
            {['SUPERADMIN', 'ADMIN'].includes(currentUserRole) && <NavBtn label="Settings" active={activeTab === 'SETTINGS'} onClick={() => handleTabChange('SETTINGS')} />}
          </div>
        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <span className={`text-[9px] md:text-[10px] font-black uppercase px-3 py-1 rounded-full ${currentUserRole === 'SUPERADMIN' ? 'bg-orange-500 text-white' : 'bg-white/10'}`}>
            {currentUserRole}
          </span>
          <button onClick={() => setIsLoggedIn(false)} className="text-[10px] font-black uppercase text-white/50 hover:text-white transition-colors">Logout</button>
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
              booking={b} 
              guest={g} 
              room={r} 
              allRooms={rooms} 
              allBookings={bookings} 
              settings={settings} 
              onUpdate={handleBookingUpdate} 
              onAddPayment={handleAddPayment} 
              onUpdateGuest={(gu) => updateGuests(guests.map(x => x.id === gu.id ? gu : x))} 
              onShiftRoom={(newRid) => handleShiftRoom(b.id, newRid)} 
              onClose={() => setActiveBookingId(null)} 
            />;
          })()
        ) : showCheckinForm && (selectedRoom || selectedRoomIdsForBulk.length > 0) ? (
          <GuestCheckin room={selectedRoom || rooms.find(r => r.id === selectedRoomIdsForBulk[0])!} allRooms={rooms} existingGuests={guests} onClose={() => setShowCheckinForm(false)} onSave={handleCheckinSave} settings={settings} initialSelectedRoomIds={selectedRoomIdsForBulk} onSwitchToReservation={() => { setShowCheckinForm(false); setShowReservationForm(true); }} />
        ) : showReservationForm ? (
          <ReservationEntry rooms={rooms} existingGuests={guests} onClose={() => setShowReservationForm(false)} onSave={async (data) => {
              const bookingsData = data.roomIds.map(rid => ({
                bookingNo: data.bookingNo, roomId: rid, guestId: '', checkInDate: data.checkInDate, checkInTime: data.checkInTime, checkOutDate: data.checkOutDate, checkOutTime: data.checkOutTime,
                status: 'RESERVED', basePrice: rooms.find(room => room.id === rid)?.price || 0, mealPlan: data.mealPlan, agent: data.agent, discount: data.discount,
                charges: [], payments: [], purpose: data.purpose, adults: data.adults, children: data.children, kids: data.kids, others: data.others, totalPax: data.totalPax, extraBed: data.extraBed, extraOccupants: data.extraOccupants
              }));
              await handleCheckinSave({ guest: data.guest, bookings: bookingsData });
            }} settings={settings} />
        ) : (
          (() => {
            switch (activeTab) {
              case 'GROUP': return <GroupModule groups={groups} setGroups={updateGroups} rooms={rooms} bookings={bookings} setBookings={updateBookings} guests={guests} setGuests={updateGuests} setRooms={updateRooms} onAddTransaction={(tx) => updateTransactions([...transactions, tx])} />;
              case 'REPORTS': return <Reports bookings={bookings} guests={guests} rooms={rooms} settings={settings} transactions={transactions} shiftLogs={[]} cleaningLogs={[]} quotations={[]} />;
              case 'ACCOUNTING': return <Accounting transactions={transactions} setTransactions={updateTransactions} guests={guests} bookings={bookings} quotations={[]} setQuotations={()=>{}} settings={settings} />;
              case 'SETTINGS': return <Settings settings={settings} setSettings={updateSettings} rooms={rooms} onDeleteRoom={deleteRoom} setRooms={updateRooms} currentRole={currentUserRole} />;
              default: return (
                <div className="p-4 md:p-6 pb-32 text-black">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 no-print gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <h1 className="text-xl md:text-2xl font-black text-black border-l-4 md:border-l-8 border-blue-600 pl-4 uppercase">Front Desk</h1>
                      {currentUserRole !== 'SUPERVISOR' && (
                        <div className="flex items-center gap-2">
                           <button onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedRoomIdsForBulk([]); }} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${isMultiSelectMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600'}`}>
                             {isMultiSelectMode ? `Done (${selectedRoomIdsForBulk.length})` : 'Bulk Selection'}
                           </button>
                           {isMultiSelectMode && selectedRoomIdsForBulk.length > 0 && (
                             <button onClick={() => setShowCheckinForm(true)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg">Check-in</button>
                           )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      {['SUPERADMIN', 'ADMIN', 'RECEPTIONIST'].includes(currentUserRole) && (
                        <>
                          <button onClick={() => setShowReservationForm(true)} className="flex-1 md:flex-none bg-orange-500 text-white px-4 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase shadow-xl hover:bg-orange-600 transition-all">Reservation</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6 md:space-y-10">
                    {(Object.entries(roomsByFloor) as [string, Room[]][]).sort().map(([floor, floorRooms]) => (
                      <div key={floor} className="bg-white rounded-2xl md:rounded-[2rem] shadow-sm border overflow-hidden">
                        <div className="bg-blue-50 px-4 md:px-8 py-3 font-black text-black uppercase text-[10px] tracking-widest border-b">Floor Level {floor}</div>
                        <div className="p-4 md:p-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-4">
                          {floorRooms.map(room => {
                            const isSelected = selectedRoomIdsForBulk.includes(room.id);
                            const effectiveStatus = getRoomEffectiveStatus(room, bookings);
                            const bookingClasses = getOccupancyColor(room, bookings);
                            return (
                              <button key={room.id} onClick={() => handleRoomClick(room)} className={`min-h-[120px] md:min-h-[140px] border-2 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-between transition-all shadow-sm ${isSelected ? 'ring-4 ring-blue-600 scale-105 bg-blue-100 border-blue-600' : bookingClasses} hover:scale-105 active:scale-95`}>
                                <span className="text-xl md:text-2xl font-black tracking-tighter uppercase">{room.number}</span>
                                <div className="text-center w-full">
                                  <div className="text-[8px] md:text-[9px] font-black uppercase mb-1 opacity-80 truncate">{room.type}</div>
                                  <div className={`text-[7px] md:text-[8px] font-bold uppercase py-0.5 px-2 md:px-3 rounded-full border border-current inline-block`}>{effectiveStatus}</div>
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
        <div className="flex gap-3 md:gap-4 overflow-x-auto w-full md:w-auto no-scrollbar py-1 items-center pb-2 md:pb-0">
          <Stat label="Total" count={stats.total} color="text-black" />
          <Stat label="Vacant" count={stats.vacant} color="text-green-600" />
          <Stat label="Occ" count={stats.occupied} color="text-blue-600" />
          <Stat label="Resv" count={stats.reserved} color="text-orange-600" />
          <Stat label="Dirty" count={stats.dirty} color="text-red-600" />
          <Stat label="Rep" count={stats.repair} color="text-[#5c2d0a]" />
        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex gap-2">
            <button onClick={() => setShowBillArchive(true)} className="p-2 bg-blue-900 text-white rounded-lg shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </button>
            <button 
              onClick={refreshFromCloud}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${syncStatus === 'OK' ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'} ${isSyncing ? 'animate-pulse' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full ${syncStatus === 'OK' ? 'bg-green-500' : 'bg-red-500'} ${isSyncing ? 'db-sync-pulse' : ''}`}></div>
              <span className="text-[8px] font-black uppercase text-black">{isSyncing ? 'Syncing...' : 'Cloud'}</span>
            </button>
          </div>
        </div>
      </footer>
      {showRoomActions && selectedRoom && (
        <RoomActionModal room={selectedRoom} onClose={() => setShowRoomActions(false)} onCheckIn={() => { setShowRoomActions(false); setShowCheckinForm(true); }} onStatusUpdate={(s) => { updateRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, status: s } : r)); setShowRoomActions(false); }} />
      )}
      {showBillArchive && (
        <BillArchive bookings={bookings} guests={guests} rooms={rooms} settings={settings} onClose={() => setShowBillArchive(false)} />
      )}
    </div>
  );
};

const NavBtn: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-4 md:px-6 py-2 rounded-xl transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest whitespace-nowrap ${active ? 'bg-white text-blue-900 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}>{label}</button>
);

const Stat: React.FC<{ label: string, count: number, color: string }> = ({ label, count, color }) => (
  <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
    <span className="text-[8px] md:text-[9px] font-black uppercase text-black tracking-wider">{label}:</span>
    <span className={`text-sm md:text-lg font-black ${color}`}>{count}</span>
  </div>
);

export default App;
