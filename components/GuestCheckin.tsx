
import React, { useState, useEffect, useMemo } from 'react';
import { Room, RoomStatus, Guest, Booking, Payment, ExtraOccupant } from '../types.ts';
import { INDIAN_STATES } from '../constants.tsx';
import CameraCapture from './CameraCapture.tsx';
import GRCForm from './GRCForm.tsx';

interface GuestCheckinProps {
  room: Room;
  allRooms: Room[];
  existingGuests: Guest[];
  onClose: () => void;
  onSave: (data: { guest: Partial<Guest>, bookings: any[] }) => void;
  settings?: any;
  initialSelectedRoomIds?: string[];
  onSwitchToReservation?: () => void;
}

const GuestCheckin: React.FC<GuestCheckinProps> = ({ 
  room, 
  allRooms, 
  existingGuests, 
  onClose, 
  onSave, 
  settings,
  initialSelectedRoomIds = [],
  onSwitchToReservation 
}) => {
  const [guest, setGuest] = useState<Partial<Guest>>({
    name: '',
    phone: '',
    idNumber: '',
    email: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    nationality: 'Indian',
    documents: {}
  });

  const [extraOccupants, setExtraOccupants] = useState<ExtraOccupant[]>([]);

  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  // Occupancy details
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [kids, setKids] = useState('0');
  const [others, setOthers] = useState('0');

  const totalPax = useMemo(() => {
    return (parseInt(adults) || 0) + (parseInt(children) || 0) + (parseInt(kids) || 0) + (parseInt(others) || 0);
  }, [adults, children, kids, others]);

  const extraBedNeeded = totalPax > 2;

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialSelectedRoomIds.length > 0 ? initialSelectedRoomIds : [room.id]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showGRC, setShowGRC] = useState(false);

  // Core Pricing & Stay Detail fields
  const [mealPlan, setMealPlan] = useState('EP (Room Only)');
  const [bookingAgent, setBookingAgent] = useState('Direct');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [customTariff, setCustomTariff] = useState(room.price?.toString() || '0');
  const [purpose, setPurpose] = useState('');

  // Advance Payment fields
  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const handleSearchGuest = () => {
    if (!guest.phone) return;
    const found = existingGuests.find(g => g.phone === guest.phone);
    if (found) {
      setGuest({ ...found });
    } else {
      alert("No previous record found.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: keyof Guest['documents']) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGuest(prev => ({
          ...prev,
          documents: { ...prev.documents, [docType]: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtraOccupantFileUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number, docType: keyof ExtraOccupant['documents']) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newOccupants = [...extraOccupants];
        newOccupants[index].documents = {
          ...newOccupants[index].documents,
          [docType]: reader.result as string
        };
        setExtraOccupants(newOccupants);
      };
      reader.readAsDataURL(file);
    }
  };

  const addOccupant = () => {
    setExtraOccupants([...extraOccupants, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      documents: {}
    }]);
  };

  const removeOccupant = (id: string) => {
    setExtraOccupants(extraOccupants.filter(o => o.id !== id));
  };

  const updateOccupant = (index: number, field: keyof ExtraOccupant, value: string) => {
    const newOccupants = [...extraOccupants];
    (newOccupants[index] as any)[field] = value;
    setExtraOccupants(newOccupants);
  };

  const constructBookingPreview = () => {
    return {
      bookingNo: 'BK-PREVIEW',
      roomId: selectedRoomIds[0],
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      basePrice: parseFloat(customTariff) || 0,
      discount: parseFloat(discountAmount) || 0,
      mealPlan,
      agent: bookingAgent,
      purpose,
      adults: parseInt(adults) || 0,
      children: parseInt(children) || 0,
      kids: parseInt(kids) || 0,
      others: parseInt(others) || 0,
      totalPax,
      extraBed: extraBedNeeded,
      extraOccupants
    };
  };

  const handleSave = () => {
    if (!guest.name || !guest.phone || selectedRoomIds.length === 0) {
      alert("Please fill name, phone and select room.");
      return;
    }

    const totalAdvance = parseFloat(advanceAmount) || 0;
    const totalDiscount = parseFloat(discountAmount) || 0;
    const advancePerRoom = totalAdvance / selectedRoomIds.length;
    const discountPerRoom = totalDiscount / selectedRoomIds.length;

    const bookings = selectedRoomIds.map(rid => {
      const initialPayments: Payment[] = totalAdvance > 0 ? [{
        id: Math.random().toString(36).substr(2, 9),
        amount: advancePerRoom,
        date: new Date().toISOString(),
        method: paymentMethod,
        remarks: 'Advance at Check-in'
      }] : [];

      return {
        bookingNo: 'BK-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        roomId: rid,
        checkInDate: checkInDate,
        checkInTime: checkInTime,
        checkOutDate: checkOutDate,
        checkOutTime: checkOutTime,
        status: 'ACTIVE',
        basePrice: parseFloat(customTariff) || allRooms.find(r => r.id === rid)?.price || 0,
        discount: discountPerRoom,
        mealPlan,
        agent: bookingAgent,
        purpose,
        charges: [],
        payments: initialPayments,
        adults: parseInt(adults) || 0,
        children: parseInt(children) || 0,
        kids: parseInt(kids) || 0,
        others: parseInt(others) || 0,
        totalPax,
        extraBed: extraBedNeeded,
        extraOccupants
      };
    });

    onSave({ guest, bookings });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 overflow-y-auto no-print-backdrop">
      <div className="bg-white w-full max-w-6xl rounded-none md:rounded-[3rem] shadow-2xl flex flex-col h-full md:h-[90vh] overflow-hidden">
        <div className="bg-[#003d80] p-4 md:p-8 text-white flex justify-between items-center no-print shrink-0">
          <div>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Check-in Registry</h2>
            <p className="text-[8px] md:text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Property Console</p>
          </div>
          <button onClick={onClose} className="p-2 md:p-3 hover:bg-white/10 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 custom-scrollbar">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Primary Guest Info */}
            <section className="space-y-4">
              <div className="flex justify-between items-end border-b pb-2">
                <h3 className="font-black text-[10px] md:text-xs uppercase text-slate-400 tracking-widest">Primary Identity</h3>
                <button onClick={() => setShowGRC(true)} className="bg-slate-100 text-blue-900 px-3 py-1 rounded-xl font-black text-[8px] uppercase border border-blue-100">Preview GRC</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-2 items-end">
                  <Inp label="Mobile Number *" value={guest.phone} onChange={(v: string) => setGuest({...guest, phone: v})} />
                  <button onClick={handleSearchGuest} className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase mb-0.5 shadow-lg">Fetch</button>
                </div>
                <Inp label="Full Name *" value={guest.name} onChange={(v: string) => setGuest({...guest, name: v})} />
                <Inp label="ID Number *" value={guest.idNumber} onChange={(v: string) => setGuest({...guest, idNumber: v})} />
                <Inp label="Nationality" value={guest.nationality} onChange={(v: string) => setGuest({...guest, nationality: v})} />
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">State</label>
                  <select className="w-full border-2 p-3 rounded-2xl text-[11px] md:text-[12px] font-black bg-slate-50 outline-none focus:border-blue-500 transition-all shadow-sm" value={guest.state} onChange={e => setGuest({...guest, state: e.target.value})}>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Inp label="Purpose" value={purpose} onChange={setPurpose} />
              </div>
              <textarea className="w-full border-2 p-3 md:p-4 rounded-2xl text-[11px] md:text-[12px] font-black bg-slate-50 h-20 md:h-24 resize-none outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Address..." value={guest.address} onChange={e => setGuest({...guest, address: e.target.value})} />
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <DocBox label="Aadhar F" src={guest.documents?.aadharFront} onChange={(e: any) => handleFileUpload(e, 'aadharFront')} />
                <DocBox label="Aadhar B" src={guest.documents?.aadharBack} onChange={(e: any) => handleFileUpload(e, 'aadharBack')} />
                <DocBox label="PAN Card" src={guest.documents?.pan} onChange={(e: any) => handleFileUpload(e, 'pan')} />
              </div>
            </section>

            {/* Extra Occupants */}
            <section className="space-y-4">
               <div className="flex justify-between items-center border-b pb-2">
                 <h3 className="font-black text-[10px] md:text-xs uppercase text-blue-600 tracking-widest">Extra Persons</h3>
                 <button onClick={addOccupant} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl font-black text-[8px] uppercase border border-blue-100">+ Add</button>
               </div>
               
               <div className="space-y-4 md:space-y-6">
                 {extraOccupants.map((occ, idx) => (
                   <div key={occ.id} className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 space-y-4 relative">
                      <button onClick={() => removeOccupant(occ.id)} className="absolute top-2 right-2 text-red-400 p-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Inp label="Full Name" value={occ.name} onChange={(v: string) => updateOccupant(idx, 'name', v)} />
                        <Inp label="ID / Phone" value={occ.phone || ''} onChange={(v: string) => updateOccupant(idx, 'phone', v)} />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <DocBox label="Aadhar F" src={occ.documents?.aadharFront} onChange={(e: any) => handleExtraOccupantFileUpload(e, idx, 'aadharFront')} />
                        <DocBox label="Aadhar B" src={occ.documents?.aadharBack} onChange={(e: any) => handleExtraOccupantFileUpload(e, idx, 'aadharBack')} />
                        <DocBox label="PAN Card" src={occ.documents?.pan} onChange={(e: any) => handleExtraOccupantFileUpload(e, idx, 'pan')} />
                      </div>
                   </div>
                 ))}
                 {extraOccupants.length === 0 && (
                   <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                     <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-300 tracking-widest">No extra occupants added</p>
                   </div>
                 )}
               </div>
            </section>

            {/* Occupancy Stats */}
            <section className="space-y-4">
               <h3 className="font-black text-[10px] md:text-xs uppercase text-blue-600 tracking-widest border-b pb-2">Occupancy</h3>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Inp label="Adults" type="number" value={adults} onChange={setAdults} />
                  <Inp label="Children" type="number" value={children} onChange={setChildren} />
                  <Inp label="Kids" type="number" value={kids} onChange={setKids} />
                  <Inp label="Others" type="number" value={others} onChange={setOthers} />
               </div>
               <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest">Total Pax</span>
                    <span className="text-xl md:text-2xl font-black text-blue-900">{totalPax}</span>
                  </div>
                  <div className="hidden md:block w-px h-10 bg-blue-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest">Extra Bed</span>
                    <span className={`text-[11px] md:text-sm font-black uppercase ${extraBedNeeded ? 'text-orange-600' : 'text-green-600'}`}>
                      {extraBedNeeded ? 'Yes (Auto)' : 'No'}
                    </span>
                  </div>
               </div>
            </section>

            {/* Stay & Pricing */}
            <section className="space-y-4">
               <h3 className="font-black text-[10px] md:text-xs uppercase text-orange-600 tracking-widest border-b pb-2">Schedule & Tariff</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Inp label="In Date" type="date" value={checkInDate} onChange={setCheckInDate} />
                    <Inp label="In Time" type="time" value={checkInTime} onChange={setCheckInTime} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Inp label="Out Date" type="date" value={checkOutDate} onChange={setCheckOutDate} />
                    <Inp label="Out Time" type="time" value={checkOutTime} onChange={setCheckOutTime} />
                  </div>
                  <Inp label="Nightly Tariff (₹) *" type="number" value={customTariff} onChange={setCustomTariff} />
                  <Inp label="Discount (₹)" type="number" value={discountAmount} onChange={setDiscountAmount} />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select label="Meal Plan" value={mealPlan} options={['EP (Room Only)', 'CP (Breakfast)', 'MAP (Half Board)', 'AP (Full Board)']} onChange={setMealPlan} />
                  <Select label="Booking Agent" value={bookingAgent} options={['Direct', 'Booking.com', 'Goibibo/MMT', 'Expedia']} onChange={setBookingAgent} />
               </div>
            </section>

            {/* Advance */}
            <section className="space-y-4">
               <h3 className="font-black text-[10px] md:text-xs uppercase text-green-600 tracking-widest border-b pb-2">Financials</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Inp label="Advance (₹)" type="number" value={advanceAmount} onChange={setAdvanceAmount} />
                  <Select label="Mode" value={paymentMethod} options={['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer']} onChange={setPaymentMethod} />
               </div>
            </section>

            {/* Portrait */}
            <section className="space-y-4">
              <h3 className="font-black text-[10px] md:text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Live Identity</h3>
              <div className="flex items-center gap-4 md:gap-6 p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border-2 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                  {guest.documents?.photo ? <img src={guest.documents.photo} className="w-full h-full object-cover" /> : <span className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase text-center">Portrait</span>}
                </div>
                <button onClick={() => setIsCameraOpen(true)} className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase shadow-lg hover:bg-black transition-all">Capture Photo</button>
              </div>
            </section>
          </div>

          <div className="bg-slate-50 p-6 md:p-8 rounded-2xl md:rounded-[3rem] border-2 border-slate-100 space-y-6 h-fit sticky top-0">
            <h3 className="font-black text-[10px] md:text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Unit Assignment</h3>
            <div className="grid grid-cols-3 md:grid-cols-2 gap-2 max-h-40 md:max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {allRooms.map(r => (
                <button key={r.id} type="button" onClick={() => setSelectedRoomIds(prev => prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id])} className={`p-2 md:p-3 rounded-xl border-2 text-[8px] md:text-[10px] font-black uppercase transition-all ${selectedRoomIds.includes(r.id) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-white text-slate-400 hover:border-blue-200'}`}>Rm {r.number}</button>
              ))}
            </div>
            <div className="pt-4 md:pt-10 space-y-3">
              <button onClick={handleSave} className="w-full bg-[#003d80] text-white py-4 md:py-5 rounded-2xl font-black uppercase text-[11px] md:text-xs tracking-widest shadow-2xl hover:bg-black transition-all">Confirm Check-in</button>
              {onSwitchToReservation && <button onClick={onSwitchToReservation} className="w-full bg-orange-500 text-white py-3 md:py-4 rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-lg">Reservation Mode</button>}
              <button onClick={onClose} className="w-full py-2 text-slate-400 font-black uppercase text-[9px] hover:text-slate-900 transition-colors">Discard</button>
            </div>
          </div>
        </div>
      </div>
      {isCameraOpen && <CameraCapture onCapture={(img) => { setGuest(prev => ({...prev, documents: {...prev.documents, photo: img}})); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
      {showGRC && (
        <GRCForm 
          guest={guest} 
          booking={constructBookingPreview()} 
          rooms={allRooms} 
          settings={settings} 
          onClose={() => setShowGRC(false)} 
        />
      )}
    </div>
  );
};

const Inp = ({ label, value, onChange, onBlur, type = "text" }: any) => (
  <div className="space-y-1 w-full">
    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input type={type} className="w-full border-2 p-2.5 md:p-3 rounded-2xl font-black text-[11px] md:text-[12px] bg-white outline-none focus:border-blue-500 transition-all shadow-sm text-black" value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} />
  </div>
);

const Select = ({ label, value, options, onChange }: any) => (
  <div className="space-y-1 w-full">
    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <select className="w-full border-2 p-2.5 md:p-3 rounded-2xl font-black text-[11px] md:text-[12px] bg-white outline-none focus:border-blue-500 transition-all shadow-sm text-black" value={value} onChange={e => onChange(e.target.value)}>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const DocBox = ({ label, src, onChange }: any) => (
  <div className="relative aspect-video bg-white border-2 border-dashed border-slate-200 rounded-xl md:rounded-2xl overflow-hidden flex flex-col items-center justify-center group hover:border-blue-400 transition-all shadow-sm">
    {src ? <img src={src} className="w-full h-full object-cover" /> : <div className="text-center"><svg className="w-4 h-4 md:w-6 md:h-6 text-slate-200 mx-auto mb-1 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg><span className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase tracking-widest text-center block">{label}</span></div>}
    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onChange} />
  </div>
);

export default GuestCheckin;
