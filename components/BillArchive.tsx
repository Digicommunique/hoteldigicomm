
import React, { useState, useMemo } from 'react';
import { Booking, Guest, Room, Charge, Payment } from '../types.ts';
import StayManagement from './StayManagement.tsx';

interface BillArchiveProps {
  bookings: Booking[];
  guests: Guest[];
  rooms: Room[];
  settings: any;
  onClose: () => void;
}

const BillArchive: React.FC<BillArchiveProps> = ({ bookings, guests, rooms, settings, onClose }) => {
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const g = guests.find(guest => guest.id === b.guestId);
      const r = rooms.find(room => room.id === b.roomId);
      const matchesDate = b.checkInDate === filterDate || b.checkOutDate === filterDate;
      const matchesSearch = 
        g?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r?.number.includes(searchTerm) ||
        b.bookingNo.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesDate && matchesSearch;
    }).sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime());
  }, [bookings, guests, rooms, filterDate, searchTerm]);

  const activeBooking = useMemo(() => 
    bookings.find(b => b.id === selectedBookingId), 
  [bookings, selectedBookingId]);

  const activeGuest = useMemo(() => 
    activeBooking ? guests.find(g => g.id === activeBooking.guestId) : null,
  [activeBooking, guests]);

  const activeRoom = useMemo(() => 
    activeBooking ? rooms.find(r => r.id === activeBooking.roomId) : null,
  [activeBooking, rooms]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 lg:p-12">
      <div className="bg-white w-full h-full rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-[#003d80] p-10 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Bill Archive & Repository</h2>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Audit Log • {filteredBookings.length} Records Found</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2 rounded-2xl flex items-center gap-4">
               <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase text-blue-300 ml-1">Search Database</span>
                 <input 
                    type="text" 
                    placeholder="GUEST / ROOM / REF..." 
                    className="bg-transparent border-none outline-none text-white font-black uppercase placeholder:text-white/30 text-xs w-48"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
               <div className="w-px h-8 bg-white/20"></div>
               <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase text-blue-300 ml-1">Filter Date</span>
                 <input 
                    type="date" 
                    className="bg-transparent border-none outline-none text-white font-black uppercase text-xs cursor-pointer"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                 />
               </div>
            </div>
            <button onClick={onClose} className="bg-white/10 p-5 rounded-3xl hover:bg-white/20 transition-all font-black uppercase text-xs">Close</button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-widest">
                  <tr>
                    <th className="p-6">Invoice / Ref</th>
                    <th className="p-6">Stay Period</th>
                    <th className="p-6">Guest Identity</th>
                    <th className="p-6">Room</th>
                    <th className="p-6 text-center">Status</th>
                    <th className="p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold uppercase text-black">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-20 text-center text-slate-300 font-black text-2xl opacity-50 tracking-tighter">No Billing Records Found For Selected Date</td>
                    </tr>
                  ) : (
                    filteredBookings.map(b => {
                      const guest = guests.find(g => g.id === b.guestId);
                      const room = rooms.find(r => r.id === b.roomId);
                      return (
                        <tr key={b.id} className="hover:bg-blue-50/50 transition-colors group">
                          <td className="p-6">
                            <span className="text-blue-900 font-black block">{b.bookingNo}</span>
                            <span className="text-[9px] text-slate-400">Gen: {b.checkInDate}</span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <span>{b.checkInDate}</span>
                              <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                              <span>{b.checkOutDate}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="text-slate-900 block">{guest?.name || 'Walk-in Guest'}</span>
                            <span className="text-[9px] text-slate-400">{guest?.phone}</span>
                          </td>
                          <td className="p-6">
                            <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-black">Room {room?.number}</span>
                          </td>
                          <td className="p-6 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black ${
                              b.status === 'ACTIVE' ? 'bg-green-100 text-green-600' :
                              b.status === 'COMPLETED' ? 'bg-blue-100 text-blue-600' :
                              'bg-slate-100 text-slate-400'
                            }`}>
                              {b.status === 'ACTIVE' ? 'IN-HOUSE' : b.status}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <button 
                              onClick={() => setSelectedBookingId(b.id)}
                              className="bg-blue-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-black hover:scale-105 transition-all"
                            >
                              View Invoice
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-center p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">All monetary figures and tax computations are recalculated live from stay logs.</p>
            </div>
          </div>
        </div>
      </div>

      {selectedBookingId && activeBooking && activeGuest && activeRoom && (
        <StayManagement 
          booking={activeBooking}
          guest={activeGuest}
          room={activeRoom}
          allRooms={rooms}
          allBookings={bookings}
          settings={settings}
          onUpdate={() => {}} // Read-only from archive
          onAddPayment={() => {}} // Read-only from archive
          onUpdateGuest={() => {}} // Read-only from archive
          onShiftRoom={() => {}} // Read-only from archive
          onClose={() => setSelectedBookingId(null)}
          isDuplicate={true}
        />
      )}
    </div>
  );
};

export default BillArchive;
