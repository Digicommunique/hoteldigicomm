
import React, { useState, useEffect, useMemo } from 'react';
import { Guest, Room, RoomStatus, ExtraOccupant } from '../types';
import { INDIAN_STATES } from '../constants';
import CameraCapture from './CameraCapture';
import GRCForm from './GRCForm';

interface ReservationEntryProps {
  onClose: () => void;
  existingGuests: Guest[];
  rooms: Room[];
  onSave: (data: { 
    guest: Partial<Guest>, 
    roomIds: string[], 
    bookingNo: string,
    checkInDate: string,
    checkInTime: string,
    checkOutDate: string,
    checkOutTime: string,
    purpose: string,
    mealPlan: string,
    agent: string,
    discount: number,
    adults: number,
    children: number,
    kids: number,
    others: number,
    totalPax: number,
    extraBed: boolean,
    extraOccupants: ExtraOccupant[]
  }) => void;
  settings?: any;
}

const ReservationEntry: React.FC<ReservationEntryProps> = ({ onClose, existingGuests, rooms, onSave, settings }) => {
  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  const [mobileNo, setMobileNo] = useState('');
  const [guestName, setGuestName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [nationality, setNationality] = useState('Indian');
  const [purpose, setPurpose] = useState('');
  
  // Occupancy details
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [kids, setKids] = useState('0');
  const [others, setOthers] = useState('0');
  const [extraOccupants, setExtraOccupants] = useState<ExtraOccupant[]>([]);

  const totalPax = useMemo(() => {
    return (parseInt(adults) || 0) + (parseInt(children) || 0) + (parseInt(kids) || 0) + (parseInt(others) || 0);
  }, [adults, children, kids, others]);

  const extraBedNeeded = totalPax > 2;

  const [mealPlan, setMealPlan] = useState('EP (Room Only)');
  const [bookingAgent, setBookingAgent] = useState('Direct');
  const [discount, setDiscount] = useState('0');

  const [bookingNo, setBookingNo] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Guest['documents']>({});
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showGRC, setShowGRC] = useState(false);

  useEffect(() => {
    const d = new Date();
    setCheckInDate(d.toLocaleDateString('en-CA'));
    setCheckInTime(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCheckOutDate(tomorrow.toLocaleDateString('en-CA'));
    setBookingNo('RES-' + Date.now().toString().slice(-6));
  }, []);

  const handleSearchGuest = () => {
    const found = existingGuests.find(g => g.phone === mobileNo);
    if (found) {
      setGuestName(found.name);
      setIdNumber(found.idNumber || '');
      setEmail(found.email);
      setAddress(found.address);
      setCity(found.city);
      setState(found.state);
      setNationality(found.nationality || 'Indian');
      setDocuments(found.documents || {});
    } else {
      alert("No record found.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: keyof Guest['documents']) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDocuments(prev => ({ ...prev, [type]: reader.result as string }));
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
      bookingNo,
      roomId: selectedRoomIds[0],
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      basePrice: rooms.find(r => r.id === selectedRoomIds[0])?.price || 0,
      discount: parseFloat(discount) || 0,
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
    if (!mobileNo || !guestName || selectedRoomIds.length === 0) return alert("Fill mandatory fields and select a room.");
    onSave({
      guest: { name: guestName, phone: mobileNo, idNumber, email, address, city, state, nationality, documents },
      roomIds: selectedRoomIds,
      bookingNo, 
      checkInDate, 
      checkInTime, 
      checkOutDate, 
      checkOutTime, 
      purpose,
      mealPlan,
      agent: bookingAgent,
      discount: parseFloat(discount) || 0,
      adults: parseInt(adults) || 0,
      children: parseInt(children) || 0,
      kids: parseInt(kids) || 0,
      others: parseInt(others) || 0,
      totalPax,
      extraBed: extraBedNeeded,
      extraOccupants
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 no-print-backdrop overflow-y-auto">
      <div className="bg-white w-full max-w-[1280px] h-full md:h-[90vh] rounded-none md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
        {/* Header */}
        <div className="bg-[#f59e0b] px-6 md:px-10 py-4 md:py-6 flex justify-between items-center text-white no-print shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Reservation Entry</h2>
            <p className="text-[8px] md:text-[10px] font-bold text-orange-100 uppercase tracking-widest mt-1">Ref ID: {bookingNo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 md:p-3 hover:bg-white/10 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Sidebar (Now stacked on mobile) */}
          <div className="w-full lg:w-[420px] border-b lg:border-b-0 lg:border-r bg-slate-50/50 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6 no-print">
            <div className="flex justify-between items-center">
              <SectionHeader title="Guest & Stay" />
              <button onClick={() => setShowGRC(true)} className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase border border-orange-200">GRC</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Inp label="In Date" type="date" value={checkInDate} onChange={setCheckInDate} />
              <Inp label="In Time" type="time" value={checkInTime} onChange={setCheckInTime} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Inp label="Out Date" type="date" value={checkOutDate} onChange={setCheckOutDate} />
              <Inp label="Out Time" type="time" value={checkOutTime} onChange={setCheckOutTime} />
            </div>

            <hr className="border-slate-200" />

            <div className="flex gap-2 items-end">
              <Inp label="Mobile No *" value={mobileNo} onChange={setMobileNo} />
              <button type="button" onClick={handleSearchGuest} className="bg-orange-500 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg mb-0.5">Find</button>
            </div>

            <Inp label="Full Name *" value={guestName} onChange={setGuestName} />
            
            <div className="space-y-4 bg-white/50 p-4 rounded-3xl border border-orange-100">
              <SectionHeader title="Occupancy" />
              <div className="grid grid-cols-2 gap-4">
                <Inp label="Adults" type="number" value={adults} onChange={setAdults} />
                <Inp label="Children" type="number" value={children} onChange={setChildren} />
                <Inp label="Kids" type="number" value={kids} onChange={setKids} />
                <Inp label="Others" type="number" value={others} onChange={setOthers} />
              </div>
              <div className="pt-2 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Total Pax</span>
                  <span className="text-lg font-black text-orange-600">{totalPax}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Extra Bed</span>
                  <span className={`text-[10px] font-black uppercase ${extraBedNeeded ? 'text-orange-500' : 'text-slate-300'}`}>
                    {extraBedNeeded ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Meal Plan" value={mealPlan} options={['EP (Room Only)', 'CP (Breakfast)', 'MAP (Half Board)', 'AP (Full Board)']} onChange={setMealPlan} />
              <Select label="Agent" value={bookingAgent} options={['Direct', 'Booking.com', 'Goibibo/MMT', 'Expedia']} onChange={setBookingAgent} />
            </div>

            <Inp label="Discount (₹)" value={discount} onChange={setDiscount} type="number" />
          </div>

          {/* Center Content (Forms & KYC) */}
          <div className="flex-1 p-6 md:p-10 space-y-10 overflow-y-auto custom-scrollbar bg-white no-print">
            <section className="space-y-6">
              <SectionHeader title="Identification Registry" />
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <DocBox label="Aadhar F" src={documents.aadharFront} onUpload={e => handleFileUpload(e, 'aadharFront')} />
                <DocBox label="Aadhar B" src={documents.aadharBack} onUpload={e => handleFileUpload(e, 'aadharBack')} />
                <DocBox label="PAN Card" src={documents.pan} onUpload={e => handleFileUpload(e, 'pan')} />
              </div>
            </section>

            <hr className="border-slate-100" />

            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <SectionHeader title="Extra Occupants" />
                <button onClick={addOccupant} className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase border border-orange-100">+ Add Person</button>
              </div>
              
              <div className="space-y-6 md:space-y-8">
                {extraOccupants.map((occ, idx) => (
                  <div key={occ.id} className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 space-y-4 md:space-y-6 relative">
                    <button onClick={() => removeOccupant(occ.id)} className="absolute top-4 right-4 text-red-400 p-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <Inp label="Occupant Name" value={occ.name} onChange={(v: string) => updateOccupant(idx, 'name', v)} />
                      <Inp label="ID / Phone" value={occ.phone || ''} onChange={(v: string) => updateOccupant(idx, 'phone', v)} />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      <DocBox label="Aadhar F" src={occ.documents?.aadharFront} onUpload={(e: any) => handleExtraOccupantFileUpload(e, idx, 'aadharFront')} />
                      <DocBox label="Aadhar B" src={occ.documents?.aadharBack} onUpload={(e: any) => handleExtraOccupantFileUpload(e, idx, 'aadharBack')} />
                      <DocBox label="PAN Card" src={occ.documents?.pan} onUpload={(e: any) => handleExtraOccupantFileUpload(e, idx, 'pan')} />
                    </div>
                  </div>
                ))}
                {extraOccupants.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No extra occupants added</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Sidebar (Room Selection) */}
          <div className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l bg-slate-50/50 p-6 md:p-8 flex flex-col no-print shrink-0">
            <SectionHeader title="Unit Selection" />
            <div className="flex-1 mt-6 overflow-y-auto custom-scrollbar pr-2 min-h-[150px]">
              <div className="grid grid-cols-4 lg:grid-cols-2 gap-2 md:gap-3">
                {rooms.map(r => (
                  <button 
                    key={r.id} 
                    type="button" 
                    onClick={() => setSelectedRoomIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])} 
                    className={`p-2 md:p-4 rounded-xl md:rounded-2xl border-2 text-[9px] md:text-[11px] font-black uppercase transition-all shadow-sm ${selectedRoomIds.includes(r.id) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-white hover:border-orange-200'}`}>
                    Rm {r.number}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 space-y-3 md:space-y-4">
              <button onClick={handleSave} className="w-full bg-orange-600 text-white font-black py-4 md:py-5 rounded-2xl md:rounded-[1.5rem] uppercase shadow-xl hover:bg-black transition-all text-xs tracking-widest">Confirm Registry</button>
              <button type="button" onClick={onClose} className="w-full text-slate-400 font-black py-2 uppercase text-[10px] hover:text-gray-900">Discard</button>
            </div>
          </div>
        </div>
      </div>
      {isCameraOpen && <CameraCapture onCapture={(img) => { setDocuments(prev => ({...prev, photo: img})); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 md:gap-3">
    <div className="w-1 md:w-1.5 h-5 md:h-6 bg-orange-500 rounded-full"></div>
    <h3 className="font-black text-slate-800 uppercase text-[10px] md:text-[11px] tracking-wider">{title}</h3>
  </div>
);

const Inp = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input 
      type={type}
      className="w-full border-2 p-2.5 md:p-3 rounded-2xl text-[11px] md:text-[12px] font-black text-black bg-white focus:border-orange-500 transition-all outline-none shadow-sm" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

const Select = ({ label, value, options, onChange }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <select className="w-full border-2 p-2.5 md:p-3 rounded-2xl text-[11px] md:text-[12px] font-black text-black bg-white focus:border-orange-500 transition-all outline-none shadow-sm" value={value} onChange={e => onChange(e.target.value)}>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const DocBox = ({ label, src, onUpload }: any) => (
  <div className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl md:rounded-[2rem] flex flex-col items-center justify-center overflow-hidden hover:border-orange-400 transition-all shadow-sm">
    {src ? (
      <img src={src} className="w-full h-full object-cover" />
    ) : (
      <div className="text-center p-2">
        <svg className="w-6 h-6 md:w-8 md:h-8 text-slate-300 mx-auto mb-1 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
        <span className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider block">{label}</span>
      </div>
    )}
    <input type="file" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
  </div>
);

export default ReservationEntry;
