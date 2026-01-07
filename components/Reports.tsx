
import React, { useState, useMemo } from 'react';
import { Booking, Guest, Room, Transaction, RoomShiftLog, CleaningLog, Quotation } from '../types.ts';
import CForm from './CForm.tsx';

interface ReportsProps {
  bookings: Booking[];
  guests: Guest[];
  rooms: Room[];
  transactions: Transaction[];
  shiftLogs: RoomShiftLog[];
  cleaningLogs: CleaningLog[];
  quotations: Quotation[];
  settings: any;
}

type ReportType = 'OCCUPANCY' | 'POLICE' | 'C_FORM' | 'CHECKIN_REG' | 'CHECKOUT_REG' | 'COLLECTION' | 'DAYBOOK' | 'SUMMARY' | 'BS' | 'PL';

const Reports: React.FC<ReportsProps> = ({ bookings, guests, rooms, transactions, settings }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('OCCUPANCY');
  
  // Standardized Date Range States
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const [occCategory, setOccCategory] = useState('All');
  const [selectedCFormGuestId, setSelectedCFormGuestId] = useState<string | null>(null);

  const findGuest = (guestId: string) => {
    return guests.find(g => g.id === guestId || g.phone === guestId);
  };

  // Helper for grid generation in Occupancy
  const gridDates = useMemo(() => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const curr = new Date(start);
    // Limit to 60 days to prevent browser crash
    let count = 0;
    while (curr <= end && count < 60) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return dates;
  }, [startDate, endDate]);

  const filteredData = useMemo(() => {
    const start = startDate;
    const end = endDate;

    if (activeReport === 'DAYBOOK') {
      return transactions.filter(t => t.date >= start && t.date <= end);
    }
    if (activeReport === 'CHECKIN_REG') {
      return bookings.filter(b => b.checkInDate >= start && b.checkInDate <= end && b.status !== 'CANCELLED');
    }
    if (activeReport === 'CHECKOUT_REG') {
      return bookings.filter(b => b.checkOutDate >= start && b.checkOutDate <= end && b.status === 'COMPLETED');
    }
    if (activeReport === 'COLLECTION') {
      return transactions.filter(t => t.type === 'RECEIPT' && t.date >= start && t.date <= end);
    }
    if (activeReport === 'POLICE') {
      return bookings.filter(b => 
        b.status !== 'CANCELLED' && 
        ((b.checkInDate <= end && b.checkOutDate >= start))
      );
    }
    if (activeReport === 'C_FORM') {
      const foreignGuests = guests.filter(g => g.nationality && g.nationality.toLowerCase() !== 'indian');
      return foreignGuests.filter(g => {
        const guestBookings = bookings.filter(b => b.guestId === g.id);
        return guestBookings.some(b => b.checkInDate <= end && b.checkOutDate >= start);
      });
    }
    return [];
  }, [bookings, transactions, guests, activeReport, startDate, endDate]);

  const downloadCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    const filename = `${activeReport}_${startDate}_to_${endDate}.csv`;

    if (activeReport === 'POLICE') {
      headers = ['Guest Name', 'Nationality', 'ID Number', 'Phone', 'In Date', 'Out Date', 'Room'];
      rows = (filteredData as Booking[]).map(b => {
        const g = findGuest(b.guestId);
        return [g?.name || 'N/A', g?.nationality || 'Indian', g?.idNumber || 'N/A', g?.phone || 'N/A', b.checkInDate, b.checkOutDate, rooms.find(r=>r.id===b.roomId)?.number];
      });
    } else if (activeReport === 'CHECKIN_REG') {
      headers = ['Check-in Date', 'Room', 'Guest Name', 'ID Number', 'Phone', 'Base Rent'];
      rows = (filteredData as Booking[]).map(b => {
        const g = findGuest(b.guestId);
        return [b.checkInDate, rooms.find(r=>r.id===b.roomId)?.number, g?.name || 'N/A', g?.idNumber || 'N/A', g?.phone || 'N/A', b.basePrice];
      });
    } else if (activeReport === 'CHECKOUT_REG') {
      headers = ['Check-out Date', 'Room', 'Guest Name', 'Arrival Date', 'Final Amount'];
      rows = (filteredData as Booking[]).map(b => {
        const g = findGuest(b.guestId);
        return [b.checkOutDate, rooms.find(r=>r.id===b.roomId)?.number, g?.name || 'N/A', b.checkInDate, b.basePrice];
      });
    } else if (activeReport === 'COLLECTION') {
      headers = ['Date', 'Particulars', 'Method', 'Amount'];
      rows = (filteredData as Transaction[]).map(t => [t.date, t.entityName || t.description, t.ledger, t.amount]);
    } else if (activeReport === 'DAYBOOK') {
      headers = ['Date', 'Type', 'Ledger', 'Description', 'Amount'];
      rows = (filteredData as Transaction[]).map(t => [t.date, t.type, t.ledger, t.description, t.amount]);
    }

    if (rows.length === 0) return alert("No data to export for this range.");

    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
  };

  const renderHeader = (title: string) => (
    <div className="flex justify-between items-center border-b-8 border-blue-900 pb-6 mb-8">
      <div>
        <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tighter leading-none">{title}</h2>
        <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest mt-2 bg-yellow-400 inline-block px-3 py-1 rounded-full">
          Period: {startDate} to {endDate}
        </p>
      </div>
      <div className="flex gap-2 no-print">
        <button onClick={downloadCSV} className="bg-green-600 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase shadow-xl hover:bg-green-700 transition-all">Download CSV</button>
        <button onClick={() => window.print()} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase shadow-xl hover:bg-black transition-all">Print Report</button>
      </div>
    </div>
  );

  const stats = useMemo(() => {
    const periodReceipts = transactions.filter(t => t.type === 'RECEIPT' && t.date >= startDate && t.date <= endDate);
    const totalColl = periodReceipts.reduce((s, t) => s + t.amount, 0);
    const totalCheckin = bookings.filter(b => b.checkInDate >= startDate && b.checkInDate <= endDate).length;
    const totalCheckout = bookings.filter(b => b.checkOutDate >= startDate && b.checkOutDate <= endDate && b.status === 'COMPLETED').length;
    return { totalColl, totalCheckin, totalCheckout };
  }, [transactions, bookings, startDate, endDate]);

  const getCellStyles = (status: string | undefined) => {
    switch (status) {
      case 'ACTIVE': return 'bg-[#c6f6d5] text-[#22543d] border-r border-[#9ae6b4]';
      case 'RESERVED': return 'bg-[#feebc8] text-[#744210] border-r border-[#fbd38d]';
      case 'COMPLETED': return 'bg-[#edf2f7] text-[#4a5568] border-r border-[#e2e8f0]';
      default: return 'bg-white text-transparent border-r border-slate-100 hover:bg-blue-50 cursor-pointer';
    }
  };

  /**
   * Status Indicator for Guest Documents
   * Uses labeled circles for high visibility in chart cells
   */
  const DocIndicator = ({ guest }: { guest: Guest }) => {
    const docs = guest.documents || {};
    const hasPhoto = !!docs.photo;
    const hasAadhar = !!(docs.aadharFront || docs.aadharBack);
    const hasPan = !!docs.pan;
    const hasPassport = !!(docs.passportFront || docs.passportBack);

    if (!hasPhoto && !hasAadhar && !hasPan && !hasPassport) {
      return <div className="text-[8px] font-black text-red-500 uppercase mt-1">No Docs</div>;
    }

    return (
      <div className="flex flex-wrap gap-1 justify-center mt-1">
        {hasPhoto && (
          <div title="Photo Uploaded" className="w-3 h-3 rounded-full bg-blue-600 text-[6px] text-white flex items-center justify-center font-black">P</div>
        )}
        {hasAadhar && (
          <div title="Aadhar Uploaded" className="w-3 h-3 rounded-full bg-green-600 text-[6px] text-white flex items-center justify-center font-black">A</div>
        )}
        {hasPan && (
          <div title="PAN/ID Uploaded" className="w-3 h-3 rounded-full bg-red-600 text-[6px] text-white flex items-center justify-center font-black">I</div>
        )}
        {hasPassport && (
          <div title="Passport/Visa Uploaded" className="w-3 h-3 rounded-full bg-purple-600 text-[6px] text-white flex items-center justify-center font-black">V</div>
        )}
      </div>
    );
  };

  return (
    <div className="p-10 bg-white min-h-full flex flex-col animate-in fade-in duration-500">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-4 no-print scrollbar-hide">
        {(['OCCUPANCY', 'SUMMARY', 'POLICE', 'C_FORM', 'CHECKIN_REG', 'CHECKOUT_REG', 'COLLECTION', 'DAYBOOK', 'BS', 'PL'] as ReportType[]).map(r => (
           <Tab key={r} active={activeReport === r} label={r === 'BS' ? 'Balance Sheet' : r === 'PL' ? 'Profit & Loss' : r === 'C_FORM' ? 'C-Form (B.O.I)' : r.replace('_', ' ')} onClick={() => setActiveReport(r)} />
        ))}
      </div>

      {/* Unified Date Range Filter Bar */}
      <div className="mb-10 p-8 bg-slate-900 rounded-[2.5rem] flex items-center justify-between no-print shadow-xl">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">From Date</label>
            <input 
              type="date" 
              className="bg-[#333] text-white border-none p-4 rounded-2xl font-black text-sm outline-none ring-4 ring-white/5 shadow-2xl w-56" 
              style={{ colorScheme: 'dark' }}
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">To Date</label>
            <input 
              type="date" 
              className="bg-[#333] text-white border-none p-4 rounded-2xl font-black text-sm outline-none ring-4 ring-white/5 shadow-2xl w-56" 
              style={{ colorScheme: 'dark' }}
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
          {activeReport === 'OCCUPANCY' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Unit Category</label>
              <select 
                value={occCategory} 
                onChange={e => setOccCategory(e.target.value)} 
                className="bg-[#333] text-white border-none p-4 rounded-2xl font-black text-sm outline-none ring-4 ring-white/5 shadow-2xl min-w-[200px]"
              >
                <option value="All">All Categories</option>
                {settings.roomTypes.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="text-right hidden md:block">
           <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{settings.name}</h2>
           <p className="text-[10px] font-black text-blue-400 uppercase mt-2 tracking-widest bg-blue-500/10 px-4 py-1 rounded-full border border-blue-500/20">Data Range Active</p>
        </div>
      </div>

      <div className="report-content flex-1">
        {activeReport === 'OCCUPANCY' && (
          <div className="space-y-6">
            <div className="flex items-center flex-wrap gap-6 no-print mb-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Verification Status Legend:</span>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[10px]">P</div>
                    <span className="text-[9px] font-black uppercase text-slate-600">Photo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center font-black text-[10px]">A</div>
                    <span className="text-[9px] font-black uppercase text-slate-600">Aadhar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-[10px]">I</div>
                    <span className="text-[9px] font-black uppercase text-slate-600">ID/PAN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-[10px]">V</div>
                    <span className="text-[9px] font-black uppercase text-slate-600">Passport/Visa</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto border-2 rounded-[2.5rem] shadow-2xl bg-white max-h-[72vh] custom-scrollbar border-slate-100">
              <table className="w-full border-collapse table-fixed min-w-[2000px]">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-[#003d80] text-white">
                    <th className="w-48 border-r border-white/20 p-5 text-[10px] font-black uppercase tracking-widest text-left sticky left-0 z-40 bg-[#003d80] shadow-md">Unit Identification</th>
                    {gridDates.map((date, idx) => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <th key={idx} className={`w-28 border-r border-white/20 p-2 text-[9px] font-black uppercase text-center ${isWeekend ? 'bg-red-700' : 'bg-[#003d80]'}`}>
                          <div className="opacity-70 font-bold mb-1">{date.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                          <div className="text-[11px] tracking-tighter">{date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="text-[9px] font-bold uppercase">
                  {rooms.filter(r => occCategory === 'All' || r.type === occCategory).map(room => (
                    <tr key={room.id} className="border-b group">
                      <td className="p-4 border-r font-black bg-slate-50 sticky left-0 z-20 group-hover:bg-blue-50 transition-colors shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-blue-900 text-xs">ROOM {room.number}</span>
                          <span className="text-[8px] opacity-40 leading-none mt-1 tracking-widest">{room.type}</span>
                        </div>
                      </td>
                      {gridDates.map((date, idx) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const bookingForDay = bookings.find(b => 
                          b.roomId === room.id && 
                          b.status !== 'CANCELLED' &&
                          dateStr >= b.checkInDate && 
                          dateStr < b.checkOutDate
                        );
                        
                        // Find Guest and ensure robust ID matching
                        const guest = bookingForDay ? guests.find(g => g.id === bookingForDay.guestId || g.phone === bookingForDay.guestId) : null;
                        
                        return (
                          <td key={idx} className={`p-1 h-24 text-center transition-all ${getCellStyles(bookingForDay?.status)}`} title={bookingForDay ? `${guest?.name || 'GUEST'} (${bookingForDay.status})` : 'Available'}>
                            {bookingForDay ? (
                              <div className="flex flex-col items-center justify-center h-full gap-1 px-1">
                                <span className="line-clamp-1 leading-none font-black text-[8px] max-w-full overflow-hidden truncate">{guest?.name || 'GUEST'}</span>
                                <DocIndicator guest={guest as Guest || { id: '', name: '', phone: '', email: '', address: '', city: '', state: '', nationality: '', documents: {} }} />
                                <div className="mt-1 flex items-center justify-center">
                                   <div className="w-1 h-1 rounded-full bg-current opacity-30"></div>
                                </div>
                              </div>
                            ) : (
                              <div className="opacity-0 group-hover:opacity-10 flex items-center justify-center h-full">
                                <span className="text-[7px] tracking-tighter font-black">VACANT</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'SUMMARY' && (
          <div className="space-y-10">
            {renderHeader(`Consolidated Summary`)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <SummaryCard label="Total Inflow" value={`₹${stats.totalColl.toFixed(2)}`} color="bg-green-600" />
              <SummaryCard label="Total Arrivals" value={stats.totalCheckin} color="bg-blue-600" />
              <SummaryCard label="Total Departures" value={stats.totalCheckout} color="bg-orange-500" />
            </div>
          </div>
        )}

        {activeReport === 'POLICE' && (
          <div>
            {renderHeader(`Standard Police Report`)}
            <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-blue-900 text-white uppercase font-black tracking-widest">
                  <tr>
                    <th className="p-5 text-left">Guest Name</th>
                    <th className="p-5 text-left">Nationality</th>
                    <th className="p-5 text-left">ID Number</th>
                    <th className="p-5 text-left">Phone</th>
                    <th className="p-5 text-left">Arrival Date</th>
                    <th className="p-5 text-left">Dep. Date</th>
                    <th className="p-5 text-left">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-black uppercase font-bold">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-300 font-black">No records found for this period.</td></tr>
                  ) : (
                    (filteredData as Booking[]).map(b => {
                      const g = findGuest(b.guestId);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-5 font-black text-blue-900">{g?.name || 'N/A'}</td>
                          <td className="p-5">{g?.nationality || 'Indian'}</td>
                          <td className="p-5 font-black">{g?.idNumber || 'N/A'}</td>
                          <td className="p-5">{g?.phone || 'N/A'}</td>
                          <td className="p-5">{b.checkInDate}</td>
                          <td className="p-5">{b.checkOutDate}</td>
                          <td className="p-5 font-black">Room {rooms.find(r=>r.id===b.roomId)?.number}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'C_FORM' && (
          <div className="space-y-8">
            {renderHeader(`C-Form (B.O.I) Registry`)}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredData.length === 0 ? (
                <div className="col-span-full p-20 text-center text-slate-300 font-black">No foreign nationals found for this period.</div>
              ) : (
                (filteredData as Guest[]).map(g => (
                  <div key={g.id} className="bg-white border-2 rounded-[2.5rem] p-8 shadow-sm hover:border-blue-200 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{g.nationality}</span>
                    </div>
                    <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">{g.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Passport: {g.passportNo || 'MISSING'}</p>
                    <button onClick={() => setSelectedCFormGuestId(g.id)} className="mt-6 w-full bg-blue-900 text-white py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg">View C-Form</button>
                  </div>
                ))
              )}
            </div>
            {selectedCFormGuestId && (
              <CForm 
                guest={guests.find(g => g.id === selectedCFormGuestId)!} 
                booking={bookings.find(b => b.guestId === selectedCFormGuestId)}
                room={rooms.find(r => r.id === bookings.find(b => b.guestId === selectedCFormGuestId)?.roomId)}
                settings={settings}
                onClose={() => setSelectedCFormGuestId(null)}
              />
            )}
          </div>
        )}

        {activeReport === 'CHECKIN_REG' && (
          <div>
            {renderHeader(`Arrival Register`)}
            <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-blue-600 text-white uppercase font-black tracking-widest">
                  <tr>
                    <th className="p-5 text-left">In Date</th>
                    <th className="p-5 text-left">Room</th>
                    <th className="p-5 text-left">Guest Name</th>
                    <th className="p-5 text-left">Phone</th>
                    <th className="p-5 text-right">Base Rent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-black uppercase font-bold">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-300 font-black">No arrivals recorded in this range.</td></tr>
                  ) : (
                    (filteredData as Booking[]).map(b => {
                      const g = findGuest(b.guestId);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-5 text-slate-400">{b.checkInDate}</td>
                          <td className="p-5 font-black">{rooms.find(r=>r.id===b.roomId)?.number}</td>
                          <td className="p-5 font-black text-blue-900">{g?.name || 'N/A'}</td>
                          <td className="p-5">{g?.phone || 'N/A'}</td>
                          <td className="p-5 text-right font-black">₹{b.basePrice.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'CHECKOUT_REG' && (
          <div>
            {renderHeader(`Departure Register`)}
            <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-orange-600 text-white uppercase font-black tracking-widest">
                  <tr>
                    <th className="p-5 text-left">Out Date</th>
                    <th className="p-5 text-left">Room</th>
                    <th className="p-5 text-left">Guest Name</th>
                    <th className="p-5 text-left">In Date</th>
                    <th className="p-5 text-right">Rent Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-black uppercase font-bold">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-300 font-black">No departures recorded in this range.</td></tr>
                  ) : (
                    (filteredData as Booking[]).map(b => {
                      const g = findGuest(b.guestId);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-5 text-slate-400">{b.checkOutDate}</td>
                          <td className="p-5 font-black">{rooms.find(r=>r.id===b.roomId)?.number}</td>
                          <td className="p-5 font-black text-blue-900">{g?.name || 'N/A'}</td>
                          <td className="p-5">{b.checkInDate}</td>
                          <td className="p-5 text-right font-black">₹{b.basePrice.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'COLLECTION' && (
          <div>
            {renderHeader(`Collection Registry`)}
            <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-green-600 text-white uppercase font-black tracking-widest">
                  <tr>
                    <th className="p-5 text-left">Date</th>
                    <th className="p-5 text-left">Particulars</th>
                    <th className="p-5 text-left">Method</th>
                    <th className="p-5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-black uppercase font-bold">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center text-slate-300 font-black">No collections found in this range.</td></tr>
                  ) : (
                    (filteredData as Transaction[]).map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-5 text-slate-400">{t.date}</td>
                        <td className="p-5">{t.entityName || t.description}</td>
                        <td className="p-5">{t.ledger}</td>
                        <td className="p-5 text-right font-black text-green-700">₹{t.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-black">
                  <tr>
                    <td colSpan={3} className="p-5 text-right uppercase">Total Collection</td>
                    <td className="p-5 text-right text-xl">₹{stats.totalColl.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'DAYBOOK' && (
          <div>
            {renderHeader(`Audit Daybook`)}
            <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-slate-900 text-white uppercase font-black tracking-widest">
                  <tr>
                    <th className="p-5 text-left">Date</th>
                    <th className="p-5 text-left">Type</th>
                    <th className="p-5 text-left">Ledger</th>
                    <th className="p-5 text-left">Narrative</th>
                    <th className="p-5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-black uppercase font-bold">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-300 font-black">No transactions found in this range.</td></tr>
                  ) : (
                    (filteredData as Transaction[]).map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-5 text-slate-400">{t.date}</td>
                        <td className={`p-5 font-black ${t.type === 'RECEIPT' ? 'text-green-600' : 'text-red-600'}`}>{t.type}</td>
                        <td className="p-5">{t.ledger}</td>
                        <td className="p-5 text-slate-500 normal-case italic line-clamp-1">{t.description}</td>
                        <td className="p-5 text-right font-black">₹{t.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Tab: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all shadow-sm shrink-0 ${active ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-black border-slate-50 hover:border-blue-200'}`}>{label}</button>
);

const SummaryCard = ({ label, value, color }: any) => (
  <div className={`${color} p-10 rounded-[3rem] text-white shadow-2xl transition-transform hover:scale-105`}>
    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-2">{label}</p>
    <p className="text-4xl font-black tracking-tighter">{value}</p>
  </div>
);

export default Reports;
