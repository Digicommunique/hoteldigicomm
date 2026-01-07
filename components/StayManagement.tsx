
import React, { useState, useMemo, useEffect } from 'react';
import { Booking, Guest, Room, Charge, Payment, RoomStatus } from '../types.ts';
import { INDIAN_STATES } from '../constants.tsx';
import QRCode from 'qrcode';
import CForm from './CForm.tsx';

interface StayManagementProps {
  booking: Booking;
  guest: Guest;
  room: Room;
  allRooms: Room[];
  allBookings: Booking[];
  settings: any;
  onUpdate: (booking: Booking) => void;
  onAddPayment: (bookingId: string, payment: Payment) => void;
  onUpdateGuest: (guest: Guest) => void;
  onShiftRoom: (newRoomId: string) => void;
  onClose: () => void;
  isDuplicate?: boolean;
  isPublic?: boolean;
}

const StayManagement: React.FC<StayManagementProps> = ({ 
  booking, guest, room, allRooms, allBookings, settings, onUpdate, onAddPayment, onUpdateGuest, onShiftRoom, onClose, isDuplicate = false, isPublic = false
}) => {
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showExtendStay, setShowExtendStay] = useState(false);
  const [showShiftRoom, setShowShiftRoom] = useState(false);
  const [showEditGuest, setShowEditGuest] = useState(false);
  const [showCForm, setShowCForm] = useState(false);
  
  const [isCombinedMode, setIsCombinedMode] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const [newCharge, setNewCharge] = useState({ description: '', amount: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'Cash', remarks: '' });
  const [autoCheckout, setAutoCheckout] = useState(false);
  
  const [extCheckOut, setExtCheckOut] = useState(booking.checkOutDate);
  const [editedGuest, setEditedGuest] = useState<Guest>({ ...guest });
  const [editedStay, setEditedStay] = useState({ 
    basePrice: booking.basePrice?.toString() || '0', 
    discount: booking.discount?.toString() || '0',
    purpose: booking.purpose || '' 
  });

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const url = `${window.location.origin}${window.location.pathname}?viewBill=${booking.id}`;
    QRCode.toDataURL(url, { margin: 1, width: 120, color: { dark: '#003d80', light: '#ffffff' } }, (err, dataUrl) => {
      if (!err) setQrCodeUrl(dataUrl);
    });
  }, [booking.id]);

  const linkedBookings = useMemo(() => {
    return allBookings.filter(b => 
      b.guestId === guest.id && 
      b.status === 'ACTIVE' && 
      b.id !== booking.id
    );
  }, [allBookings, guest.id, booking.id]);

  const activeBookings = isCombinedMode ? [booking, ...linkedBookings] : [booking];

  const calculateBookingNights = (b: Booking) => {
    const start = new Date(b.checkInDate);
    const end = new Date(b.checkOutDate);
    return Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getBookingIndividualTotals = (b: Booking) => {
    const nights = calculateBookingNights(b);
    const rentAmount = b.basePrice * nights;
    const chargesAmount = (b.charges || []).reduce((s, c) => s + c.amount, 0);
    const subTotal = rentAmount + chargesAmount;
    const totalPayments = (b.payments || []).reduce((s, p) => s + p.amount, 0);
    const afterDisc = Math.max(0, subTotal - (b.discount || 0));
    const taxRate = settings.taxRate || 0;
    const taxAmount = (afterDisc * taxRate) / 100;
    const grossTotal = afterDisc + taxAmount;
    const balance = grossTotal - totalPayments;
    return { grossTotal, balance, subTotal, totalPayments };
  };

  const allBillItems = useMemo(() => {
    const items: any[] = [];
    activeBookings.forEach(b => {
      const r = allRooms.find(rm => rm.id === b.roomId);
      const nights = calculateBookingNights(b);
      
      items.push({
        id: `rent-${b.id}`,
        type: 'RENT',
        description: `TARIFF (${r?.number || 'N/A'}-${r?.type || 'Standard'})`,
        details: `${nights} Night(s)`,
        rate: b.basePrice,
        nights: nights,
        amount: b.basePrice * nights,
        bookingId: b.id,
        hsn: settings.hsnCode || '9963'
      });

      (b.charges || []).forEach(c => {
        items.push({
          id: c.id,
          type: 'CHARGE',
          description: c.description,
          details: `Service Charge`,
          rate: c.amount,
          nights: 1,
          amount: c.amount,
          bookingId: b.id,
          hsn: settings.hsnCode || '9963'
        });
      });
    });
    return items;
  }, [activeBookings, allRooms, settings.hsnCode]);

  const allPayments = useMemo(() => {
    return activeBookings.flatMap(b => (b.payments || []).map(p => ({ ...p, bookingId: b.id, roomNo: allRooms.find(r => r.id === b.roomId)?.number })));
  }, [activeBookings, allRooms]);

  const totals = useMemo(() => {
    const itemsToCalculate = isSplitMode 
      ? allBillItems.filter(item => selectedItemIds.includes(item.id))
      : allBillItems;

    const subTotal = itemsToCalculate.reduce((sum, item) => sum + item.amount, 0);
    const totalPayments = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const totalDiscount = activeBookings.reduce((sum, b) => sum + (b.discount || 0), 0);
    const effectiveDiscount = isSplitMode ? (selectedItemIds.length > 0 ? totalDiscount : 0) : totalDiscount;

    const totalAfterDisc = Math.max(0, subTotal - effectiveDiscount);
    const taxRate = settings.taxRate || 0;
    const taxAmount = (totalAfterDisc * taxRate) / 100;
    const grossTotal = totalAfterDisc + taxAmount;
    const balance = grossTotal - totalPayments;

    return { subTotal, totalPayments, totalAfterDisc, taxAmount, totalDiscount: effectiveDiscount, grossTotal, balance, taxRate };
  }, [allBillItems, allPayments, isSplitMode, selectedItemIds, activeBookings, settings.taxRate]);

  const numberToWords = (num: number) => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const g = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
    
    const makeGroup = ([h, t, o]: string[]) => {
      return [
        parseInt(h) !== 0 ? a[parseInt(h)] + ' Hundred' : '',
        [
          parseInt(t) === 0 ? '' : (parseInt(t) === 1 ? a[parseInt(t + o)] : b[parseInt(t)]),
          parseInt(t) !== 1 ? a[parseInt(o)] : ''
        ].join(' ')
      ].join(' ');
    };

    const formatArr = (n: number) => {
      const s = n.toString().padStart(Math.ceil(n.toString().length / 3) * 3, '0');
      const res = [];
      for (let i = 0; i < s.length; i += 3) res.push(s.substring(i, i + 3));
      return res;
    };

    if (num === 0) return 'Zero';
    const numStr = Math.floor(num).toString();
    const groups = formatArr(parseInt(numStr));
    return groups.reverse().map((grp, i) => {
      const val = makeGroup(grp.split(''));
      return val ? val + ' ' + g[i] : '';
    }).reverse().join(' ').trim() + ' Rupees Only';
  };

  const handleWhatsAppShare = () => {
    const billUrl = `${window.location.origin}${window.location.pathname}?viewBill=${booking.id}`;
    const message = `*Invoice from ${settings.name}*\n\nHello ${guest.name},\nYour bill is ready.\nTotal: ₹${totals.grossTotal.toFixed(2)}\nView & Download: ${billUrl}`;
    window.open(`https://wa.me/${guest.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleAddCharge = () => {
    const charge: Charge = { id: Math.random().toString(36).substr(2, 9), description: newCharge.description, amount: parseFloat(newCharge.amount) || 0, date: new Date().toISOString() };
    onUpdate({ ...booking, charges: [...(booking.charges || []), charge] });
    setShowAddCharge(false); setNewCharge({ description: '', amount: '' });
  };

  const handlePostPayment = () => {
    const paymentAmount = parseFloat(newPayment.amount) || 0;
    if (paymentAmount <= 0) return;

    if (isCombinedMode) {
      const totalCombinedBalance = activeBookings.reduce((sum, b) => sum + getBookingIndividualTotals(b).balance, 0);
      activeBookings.forEach(b => {
        const bBalance = getBookingIndividualTotals(b).balance;
        if (bBalance > 0) {
          const distributedAmount = (bBalance / totalCombinedBalance) * paymentAmount;
          const payment: Payment = { id: Math.random().toString(36).substr(2, 9), amount: distributedAmount, date: new Date().toISOString(), method: newPayment.method, remarks: `Distributed: ${newPayment.remarks}` };
          onAddPayment(b.id, payment);
        }
      });
    } else {
      const payment: Payment = { id: Math.random().toString(36).substr(2, 9), amount: paymentAmount, date: new Date().toISOString(), method: newPayment.method, remarks: newPayment.remarks };
      onAddPayment(booking.id, payment);
    }
    
    if (autoCheckout && paymentAmount >= totals.balance) {
      activeBookings.forEach(b => onUpdate({ ...b, status: 'COMPLETED' }));
      onClose();
    } else {
      setShowAddPayment(false); setNewPayment({ amount: '', method: 'Cash', remarks: '' });
      setAutoCheckout(false);
    }
  };

  const handleCheckout = () => {
    if (totals.balance > 0) {
      setNewPayment({ ...newPayment, amount: totals.balance.toFixed(2), remarks: 'Combined Final Bill Settlement' });
      setAutoCheckout(true);
      setShowAddPayment(true);
      return;
    }
    if (confirm(`Outstanding balance is Zero. Proceed to Check-out all ${activeBookings.length} room(s)?`)) {
      activeBookings.forEach(b => onUpdate({ ...b, status: 'COMPLETED' }));
      onClose();
    }
  };

  return (
    <div className={`fixed inset-0 z-[210] flex items-center justify-center p-0 lg:p-4 ${isPublic ? '' : 'bg-slate-900/60 backdrop-blur-sm'}`}>
      <div className={`bg-white w-full max-w-[1400px] h-full lg:h-[95vh] rounded-none lg:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300`}>
        
        {!isPublic && (
          <div className="bg-[#8b1d1d] p-3 md:p-4 flex flex-col md:flex-row justify-between items-center no-print shrink-0 text-white shadow-md z-50 gap-2">
            <div className="flex gap-2 md:gap-4 items-center w-full md:w-auto">
              <button onClick={onClose} className="bg-white/10 px-3 md:px-4 py-2 rounded-lg hover:bg-white/20 font-bold uppercase text-[10px] md:text-xs">Back</button>
              <div className="h-6 w-px bg-white/20 hidden md:block"></div>
              <h2 className="font-bold text-[10px] md:text-sm tracking-tight uppercase truncate">Folio: {booking.bookingNo}</h2>
            </div>
            <div className="flex gap-2 w-full md:w-auto justify-end overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              {linkedBookings.length > 0 && (
                <button onClick={() => setIsCombinedMode(!isCombinedMode)} className={`px-3 py-2 rounded-lg text-[9px] md:text-xs font-bold uppercase transition-all whitespace-nowrap ${isCombinedMode ? 'bg-orange-500' : 'bg-white/10 hover:bg-white/20'}`}>
                  {isCombinedMode ? 'Separate' : 'Combine'}
                </button>
              )}
              <button onClick={() => setIsSplitMode(!isSplitMode)} className={`px-3 py-2 rounded-lg text-[9px] md:text-xs font-bold uppercase transition-all whitespace-nowrap ${isSplitMode ? 'bg-orange-600' : 'bg-white/10 hover:bg-white/20'}`}>
                {isSplitMode ? 'Exit Split' : 'Split Bill'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-gray-100 p-2 md:p-8 custom-scrollbar no-print-backdrop overflow-x-hidden">
          <div className="max-w-[1200px] mx-auto bg-white shadow-lg invoice-sheet border border-gray-300 print:border-none min-w-[320px] overflow-hidden">
            {/* INVOICE HEADER */}
            <div className="p-3 md:p-4 flex justify-between items-start">
              <div className="flex gap-3 md:gap-4 items-center">
                {settings.logo ? (
                  <img src={settings.logo} className="h-10 w-10 md:h-16 md:w-16 object-contain" />
                ) : (
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-green-800 text-white flex flex-col items-center justify-center italic leading-none font-black text-[8px] md:text-xs shrink-0">
                    <span>BIHAR</span>
                    <span className="text-[6px] md:text-[8px] tracking-widest mt-0.5 uppercase">Tourism</span>
                  </div>
                )}
                <div>
                  <h1 className="text-sm md:text-xl font-bold uppercase text-slate-800 leading-none">{settings.name || "HOTEL RAJGIR INTERNATIONAL"}</h1>
                  <p className="text-[7px] md:text-[10px] font-bold text-slate-600 mt-1 uppercase">GST: {settings.gstNumber || '10AARFH8991A1ZB'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-200 text-center py-1 border-y border-gray-400 font-bold text-[9px] md:text-[11px] uppercase tracking-wider">
              Tax Invoice
            </div>

            {/* GUEST INFO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 text-[9px] md:text-[10px] border-b border-gray-400">
              <div className="border-b md:border-b-0 md:border-r border-gray-400 divide-y divide-gray-400">
                <InfoRow label="Bill No" value={isCombinedMode ? `COMB-${booking.bookingNo}` : booking.bookingNo} />
                <InfoRow label="Guest Name" value={guest.name} />
                <InfoRow label="Address" value={`${guest.address || ''}, ${guest.phone}`} height="h-auto py-1" />
                <InfoRow label="Checkin" value={`${booking.checkInDate} ${booking.checkInTime}`} />
                <InfoRow label="Ref ID" value={booking.bookingNo} />
              </div>
              <div className="divide-y divide-gray-400">
                <InfoRow label="Bill Date" value={new Date().toLocaleDateString('en-GB')} />
                <InfoRow label="Room" value={isCombinedMode ? `${activeBookings.length} Units` : `${room.number}-${room.type}`} />
                <InfoRow label="Pax" value={isCombinedMode ? `Combined` : `(A: ${booking.adults || 0}, C: ${booking.children || 0}, K: ${booking.kids || 0}) Total: ${booking.totalPax || 0}`} />
                <InfoRow label="Checkout" value={`${booking.checkOutDate} ${booking.checkOutTime}`} />
                <InfoRow label="Agent" value={booking.agent || 'Direct'} />
              </div>
            </div>

            {/* MAIN ITEMS TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-[9px] md:text-[10px] border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-400 bg-gray-50 text-left font-bold uppercase divide-x divide-gray-400">
                    <th className="p-2 w-20">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 w-16 text-center">HSN</th>
                    <th className="p-2 w-20 text-right">Rate</th>
                    <th className="p-2 w-16 text-center">Nights</th>
                    <th className="p-2 w-20 text-right">Value</th>
                    <th className="p-2 w-20 text-right">Disc</th>
                    <th className="p-2 w-20 text-right">Tax</th>
                    <th className="p-2 w-24 text-right">Net Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-400 border-b border-gray-400 font-medium">
                  {allBillItems.map(item => {
                    const isSelected = selectedItemIds.includes(item.id);
                    if (isSplitMode && !isSelected && isPublic) return null;
                    const itemGst = (item.amount * (settings.taxRate || 0)) / 100;
                    return (
                      <tr key={item.id} className={`divide-x divide-gray-400 ${isSplitMode && !isSelected ? 'opacity-30' : ''}`}>
                        <td className="p-2">{booking.checkInDate}</td>
                        <td className="p-2 uppercase">{item.description}</td>
                        <td className="p-2 text-center">{item.hsn}</td>
                        <td className="p-2 text-right">{item.rate.toFixed(2)}</td>
                        <td className="p-2 text-center">{item.nights}</td>
                        <td className="p-2 text-right">{item.amount.toFixed(2)}</td>
                        <td className="p-2 text-right">0.00</td>
                        <td className="p-2 text-right">{itemGst.toFixed(2)}</td>
                        <td className="p-2 text-right">{(item.amount + itemGst).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TOTALS SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-400 p-2 md:p-3 gap-4">
              <div className="italic font-bold text-[8px] md:text-[10px] text-gray-400 uppercase w-full md:w-auto text-center md:text-left">
                ({numberToWords(totals.grossTotal)})
              </div>
              <div className="w-full md:w-72 divide-y divide-gray-200 font-bold text-[10px] md:text-[11px] text-right">
                <div className="py-1 flex justify-between px-2"><span className="text-gray-500 uppercase">Gross:</span><span>{totals.grossTotal.toFixed(2)}</span></div>
                <div className="py-1 flex justify-between px-2 text-red-600"><span className="uppercase">Paid:</span><span>{totals.totalPayments.toFixed(2)}</span></div>
                <div className="py-2 flex justify-between px-2 text-[12px] md:text-[14px] bg-gray-50 border-t-2 border-gray-300"><span className="uppercase text-slate-800">Due:</span><span className="text-slate-900">{totals.balance.toFixed(2)}</span></div>
              </div>
            </div>

            {/* FOOTER & DISCLAIMER */}
            <div className="p-3 md:p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left border-t border-gray-200">
               <div className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase space-y-1">
                 <p className="text-slate-800 font-black">Address: NATURE SAFARI ROAD, NH-82, RAJGIR, BIHAR</p>
                 <p>Contact: 7781860495 | Email: {settings.email || 'HOTELRAJGIRINTERNATIONAL@GMAIL.COM'}</p>
               </div>
               <div className="w-20 md:w-24 flex flex-col items-center">
                  {qrCodeUrl ? <img src={qrCodeUrl} className="w-16 h-16 md:w-20 md:h-20" /> : <div className="h-16 w-16 bg-gray-200"></div>}
                  <span className="text-[6px] md:text-[7px] font-black uppercase mt-1">Digital Bill</span>
               </div>
            </div>
          </div>
        </div>

        {/* MOBILE ACTIONS BAR */}
        {!isPublic && (
          <div className="p-3 md:p-4 bg-gray-900 flex flex-wrap justify-center md:justify-between items-center gap-2 md:gap-4 no-print text-white shrink-0">
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => window.print()} className="flex-1 md:flex-none bg-blue-600 px-4 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase shadow-xl hover:bg-blue-700 transition-all">Print</button>
              <button onClick={handleWhatsAppShare} className="flex-1 md:flex-none bg-green-600 px-4 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase shadow-xl hover:bg-green-700 transition-all">WhatsApp</button>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              {!isDuplicate && (
                <>
                  <button onClick={() => { setAutoCheckout(false); setShowAddPayment(true); }} className="flex-1 md:flex-none bg-white/10 px-3 md:px-4 py-3 rounded-xl font-black text-[9px] md:text-xs uppercase hover:bg-white/20 transition-all">Advance</button>
                  <button onClick={() => setShowAddCharge(true)} className="flex-1 md:flex-none bg-white/10 px-3 md:px-4 py-3 rounded-xl font-black text-[9px] md:text-xs uppercase hover:bg-white/20 transition-all">Service</button>
                  <button onClick={handleCheckout} className="flex-1 md:flex-none bg-red-600 px-4 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase shadow-xl hover:bg-red-700">Checkout</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modals for Charge/Payment */}
        {showAddCharge && (
          <FolioModal title="Service Entry" onClose={() => setShowAddCharge(false)}>
            <div className="space-y-4 md:space-y-6 text-black">
              <FolioInput label="Service Name" value={newCharge.description} onChange={(v: string) => setNewCharge({...newCharge, description: v})} />
              <FolioInput label="Amount (₹)" type="number" value={newCharge.amount} onChange={(v: string) => setNewCharge({...newCharge, amount: v})} />
              <button onClick={handleAddCharge} className="w-full bg-blue-600 text-white py-4 md:py-5 rounded-2xl font-black uppercase text-[11px] md:text-xs">Add to Bill</button>
            </div>
          </FolioModal>
        )}

        {showAddPayment && (
          <FolioModal title={autoCheckout ? "Settlement" : "Payment"} onClose={() => { setShowAddPayment(false); setAutoCheckout(false); }}>
            <div className="space-y-4 md:space-y-6 text-black">
              <FolioInput label="Amount (₹)" type="number" value={newPayment.amount} onChange={(v: string) => setNewPayment({...newPayment, amount: v})} />
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mode</label>
                <select className="w-full border-2 p-3 md:p-4 rounded-2xl font-black text-[12px] bg-slate-50 text-black" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Debit/Credit Card</option>
                    <option value="Bank">Bank Transfer</option>
                </select>
              </div>
              <FolioInput label="Remarks" value={newPayment.remarks} onChange={(v: string) => setNewPayment({...newPayment, remarks: v})} />
              <button onClick={handlePostPayment} className={`w-full ${autoCheckout ? 'bg-red-600' : 'bg-green-600'} text-white py-4 md:py-5 rounded-2xl font-black uppercase text-[11px] md:text-xs shadow-xl`}>
                {autoCheckout ? 'Settle & Checkout' : 'Confirm'}
              </button>
            </div>
          </FolioModal>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, height = "h-7" }: { label: string, value: string, height?: string }) => (
  <div className={`flex items-center px-2 ${height}`}>
    <span className="font-bold uppercase w-20 md:w-32 shrink-0 opacity-50">{label}</span>
    <span className="text-gray-400 px-1">:</span>
    <span className="font-black uppercase truncate">{value || ''}</span>
  </div>
);

const FolioModal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 z-[220] bg-slate-900/80 flex items-center justify-center p-4">
    <div className="bg-white rounded-[2rem] md:rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
      <div className="bg-slate-900 p-6 md:p-8 text-white text-center font-black uppercase tracking-widest text-[10px] md:text-xs">{title}</div>
      <div className="p-6 md:p-10">{children}</div>
    </div>
  </div>
);

const FolioInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1 w-full">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input type={type} className="w-full border-2 p-3 md:p-4 rounded-2xl font-black text-[12px] bg-gray-50 outline-none focus:border-blue-500 text-black shadow-inner" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default StayManagement;
