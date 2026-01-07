
import React, { useState, useMemo } from 'react';
import { Booking, Guest, Room, Charge, Payment, RoomStatus, Transaction } from '../types.ts';

interface StayManagementProps {
  booking: Booking;
  guest: Guest;
  room: Room;
  allRooms: Room[];
  allBookings: Booking[];
  settings: any;
  onUpdate: (booking: Booking) => void;
  onAddPayment: (payment: Payment) => void;
  onUpdateGuest: (guest: Guest) => void;
  onShiftRoom: () => void;
  onClose: () => void;
}

const StayManagement: React.FC<StayManagementProps> = ({ 
  booking, guest, room, settings, onUpdate, onAddPayment, onUpdateGuest, onClose 
}) => {
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newCharge, setNewCharge] = useState({ description: '', amount: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'Cash', remarks: '' });

  const totals = useMemo(() => {
    const totalCharges = (booking.charges || []).reduce((sum, c) => sum + c.amount, 0);
    const totalPayments = (booking.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const roomRent = booking.basePrice || 0;
    const subTotal = roomRent + totalCharges;
    const taxRate = settings.taxRate || 0;
    const taxAmount = (subTotal * taxRate) / 100;
    const grandTotal = subTotal + taxAmount;
    const balance = grandTotal - totalPayments;
    return { totalCharges, totalPayments, roomRent, subTotal, taxAmount, grandTotal, balance };
  }, [booking, settings.taxRate]);

  const handleWhatsAppShare = () => {
    const message = `*Invoice from ${settings.name}*\n\nHello ${guest.name},\nYour bill for Room ${room.number} (Ref: ${booking.bookingNo}) is ready.\n\n*Total Amount:* ₹${totals.grandTotal.toFixed(2)}\n*Balance Due:* ₹${totals.balance.toFixed(2)}\n\nThank you for staying with us!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${guest.phone}?text=${encoded}`, '_blank');
  };

  const handleAddCharge = () => {
    const charge: Charge = { id: Math.random().toString(36).substr(2, 9), description: newCharge.description, amount: parseFloat(newCharge.amount) || 0, date: new Date().toISOString() };
    onUpdate({ ...booking, charges: [...(booking.charges || []), charge] });
    setShowAddCharge(false); setNewCharge({ description: '', amount: '' });
  };

  const handlePostPayment = () => {
    const payment: Payment = { id: Math.random().toString(36).substr(2, 9), amount: parseFloat(newPayment.amount) || 0, date: new Date().toISOString(), method: newPayment.method, remarks: newPayment.remarks };
    onAddPayment(payment);
    setShowAddPayment(false); setNewPayment({ amount: '', method: 'Cash', remarks: '' });
  };

  const handleCheckout = () => {
    if (totals.balance > 0 && !confirm(`Pending balance of ₹${totals.balance.toFixed(2)}. Proceed with checkout?`)) return;
    onUpdate({ ...booking, status: 'COMPLETED' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-7xl h-[95vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Header (UI Control) */}
        <div className="bg-[#003d80] p-10 text-white flex justify-between items-start no-print">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">In-House</span>
              <span className="text-[10px] font-black uppercase text-blue-200 tracking-widest">Room {room.number} | Folio: {booking.bookingNo}</span>
            </div>
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{guest.name}</h2>
          </div>
          <button onClick={onClose} className="bg-white/10 p-6 rounded-3xl hover:bg-white/20 transition-all font-black uppercase text-xs">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 lg:grid-cols-4 gap-12 custom-scrollbar invoice-sheet">
          
          {/* Printable Invoice */}
          <div className="lg:col-span-3 bg-white p-12 border-2 border-slate-100 rounded-[3rem] space-y-10">
            <div className="flex justify-between items-start border-b-2 pb-10">
               <div className="space-y-4">
                  {settings.logo ? <img src={settings.logo} className="h-16 object-contain" /> : <div className="h-16 w-16 bg-blue-900 rounded-xl flex items-center justify-center text-white font-black text-2xl">HS</div>}
                  <h1 className="text-3xl font-black uppercase tracking-tighter text-blue-900">{settings.name || "HotelSphere Pro"}</h1>
                  <p className="text-[10px] font-bold text-gray-500 uppercase w-64 leading-relaxed">{settings.address || "123 Hotel Avenue, City Center"}</p>
               </div>
               <div className="text-right">
                  <h2 className="text-xl font-black uppercase text-gray-400">Tax Invoice</h2>
                  <p className="text-[10px] font-bold uppercase">Bill Date: {new Date().toLocaleDateString()}</p>
                  <p className="text-[10px] font-bold uppercase">No: {booking.bookingNo}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-[11px] font-bold uppercase">
               <div className="space-y-1">
                  <p className="text-gray-400 text-[9px] font-black tracking-widest">Bill To:</p>
                  <p className="text-lg font-black text-blue-900">{guest.name}</p>
                  <p className="text-gray-500">{guest.phone}</p>
               </div>
               <div className="space-y-1 text-right">
                  <p className="text-gray-400 text-[9px] font-black tracking-widest">Occupancy:</p>
                  <p>Room: {room.number} ({room.type})</p>
                  <p>Period: {booking.checkInDate} to {booking.checkOutDate}</p>
               </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase font-black text-gray-400">
                <tr><th className="p-4">Particulars</th><th className="p-4 text-right">Total (₹)</th></tr>
              </thead>
              <tbody className="divide-y font-bold text-gray-700 uppercase">
                <tr>
                  <td className="p-4">Accommodation Charges (Base)</td>
                  <td className="p-4 text-right">₹{booking.basePrice.toFixed(2)}</td>
                </tr>
                {(booking.charges || []).map(c => (
                  <tr key={c.id}>
                    <td className="p-4">{c.description}</td>
                    <td className="p-4 text-right">₹{c.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-black border-t">
                <tr><td className="p-4 text-right opacity-50 uppercase">Sub-Total</td><td className="p-4 text-right">₹{totals.subTotal.toFixed(2)}</td></tr>
                {settings.taxRate > 0 && (
                  <tr className="text-blue-600">
                    <td className="p-4 text-right uppercase">GST ({settings.taxRate}%)</td>
                    <td className="p-4 text-right">₹{totals.taxAmount.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="bg-blue-900 text-white text-lg">
                  <td className="p-4 text-right uppercase font-black">Grand Total</td>
                  <td className="p-4 text-right font-black">₹{totals.grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Controls Sidebar */}
          <div className="space-y-8 no-print">
            {/* Amount Due Card - Fixed padding and font size to prevent overflow */}
            <div className="bg-[#003d80] px-8 py-10 rounded-[4rem] text-white shadow-2xl space-y-8 overflow-hidden">
              <div>
                <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-2">Amount Due</p>
                <h3 className="text-4xl font-black tracking-tighter truncate">₹{totals.balance.toFixed(2)}</h3>
              </div>
              <div className="space-y-3">
                <button onClick={() => setShowAddPayment(true)} className="w-full bg-white text-blue-900 py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl hover:scale-105 transition-all">Settle Payment</button>
                <button onClick={handleWhatsAppShare} className="w-full bg-green-500 text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl hover:bg-green-600 flex items-center justify-center gap-2">
                   <span>WhatsApp Share</span>
                </button>
                <button onClick={() => window.print()} className="w-full bg-orange-500 text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl">Print Invoice</button>
                <button onClick={() => setShowAddCharge(true)} className="w-full bg-blue-800 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Add Extra Charge</button>
              </div>
            </div>
            <button onClick={handleCheckout} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Final Checkout</button>
          </div>
        </div>
      </div>

      {/* Internal Modals */}
      {showAddCharge && (
        <FolioModal title="Service Charge" onClose={() => setShowAddCharge(false)}>
          <div className="space-y-6">
            <FolioInput label="Description" value={newCharge.description} onChange={(v: string) => setNewCharge({...newCharge, description: v})} />
            <FolioInput label="Amount (₹)" type="number" value={newCharge.amount} onChange={(v: string) => setNewCharge({...newCharge, amount: v})} />
            <button onClick={handleAddCharge} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs">Add to Bill</button>
          </div>
        </FolioModal>
      )}

      {showAddPayment && (
        <FolioModal title="Add Payment" onClose={() => setShowAddPayment(false)}>
          <div className="space-y-6">
            <FolioInput label="Amount (₹)" type="number" value={newPayment.amount} onChange={(v: string) => setNewPayment({...newPayment, amount: v})} />
            <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50 text-black" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
            </select>
            <button onClick={handlePostPayment} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-xs">Record Payment</button>
          </div>
        </FolioModal>
      )}
    </div>
  );
};

const FolioModal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 z-[100] bg-slate-900/80 flex items-center justify-center p-4">
    <div className="bg-white rounded-[4rem] w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
      <div className="bg-slate-900 p-8 text-white text-center font-black uppercase">{title}</div>
      <div className="p-10">{children}</div>
      <button onClick={onClose} className="w-full py-4 text-slate-300 font-black uppercase text-[10px] border-t">Close</button>
    </div>
  </div>
);

const FolioInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{label}</label>
    <input type={type} className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50 outline-none focus:border-blue-500 text-black" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default StayManagement;
