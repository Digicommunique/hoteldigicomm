
import React, { useState } from 'react';
import { Guest, Booking, Room } from '../types.ts';

interface CFormProps {
  guest: Guest;
  booking?: Booking;
  room?: Room;
  settings: any;
  onSave?: (updatedGuest: Guest) => void;
  onClose: () => void;
}

const CForm: React.FC<CFormProps> = ({ guest, booking, room, settings, onSave, onClose }) => {
  const [formData, setFormData] = useState<Guest>({
    ...guest,
    hotelArrivalDate: booking?.checkInDate || guest.hotelArrivalDate || '',
    hotelArrivalTime: booking?.checkInTime || guest.hotelArrivalTime || '',
    hotelDepartureDate: booking?.checkOutDate || guest.hotelDepartureDate || '',
    hotelDepartureTime: booking?.checkOutTime || guest.hotelDepartureTime || '',
    purposeOfVisit: booking?.purpose || guest.purposeOfVisit || 'TOUR'
  });

  const handleChange = (field: keyof Guest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (onSave) onSave(formData);
    alert('C-Form Details Stored Successfully.');
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-12 no-print-backdrop">
      <div className="bg-[#f2f7fb] w-full max-w-7xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        
        {/* Header Ribbon */}
        <div className="bg-[#003d80] px-8 py-4 flex justify-between items-center shrink-0 no-print">
          <div>
            <h2 className="text-white font-black uppercase text-sm tracking-widest">Bureau of Immigration - C-Form Portal</h2>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase shadow-lg">Save Record</button>
            <button onClick={() => window.print()} className="bg-blue-500 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase shadow-lg">Print Form</button>
            <button onClick={onClose} className="bg-white/10 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-white/20">Close</button>
          </div>
        </div>

        {/* Form Header (Visible in Print) */}
        <div className="p-8 pb-4 flex justify-between items-start shrink-0">
          <div>
            <h1 className="text-[#003d80] font-black uppercase text-xl tracking-tight">{settings.name || 'HOTEL RAJGIR INTERNATIONAL'}</h1>
          </div>
          <div className="text-right">
             <p className="font-black text-[11px] uppercase text-gray-500">License Number: <span className="text-pink-600">{settings.licenseNumber || 'CL0316'}</span></p>
          </div>
        </div>

        {/* Main 3-Column Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-2 grid grid-cols-1 md:grid-cols-3 gap-12 custom-scrollbar no-print-padding">
          
          {/* Column 1: Identification */}
          <div className="space-y-4">
            <CInput label="Room Number" value={room?.number || ''} disabled />
            <CInput label="Sur Name" value={formData.surName || ''} onChange={v => handleChange('surName', v)} />
            <CInput label="Given Name" value={formData.givenName || ''} onChange={v => handleChange('givenName', v)} />
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-blue-900 block">Gender</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                  <input type="radio" checked={formData.gender === 'Male'} onChange={() => handleChange('gender', 'Male')} /> Male
                </label>
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                  <input type="radio" checked={formData.gender === 'Female'} onChange={() => handleChange('gender', 'Female')} /> Female
                </label>
              </div>
            </div>

            <CInput label="DOB" type="date" value={formData.dob || ''} onChange={v => handleChange('dob', v)} />
            <CInput label="Country" value={formData.country || ''} onChange={v => handleChange('country', v)} isSelect options={['Bhutan', 'India', 'USA', 'UK', 'Nepal']} />
            <CInput label="Nationality" value={formData.nationality || ''} onChange={v => handleChange('nationality', v)} isSelect options={['Bhutanese', 'Indian', 'American', 'British', 'Nepalese']} />
            <CInput label="State/Province" value={formData.state || ''} onChange={v => handleChange('state', v)} />
            <CInput label="Arrival From" value={formData.arrivalFrom || ''} onChange={v => handleChange('arrivalFrom', v)} />
            <CInput label="Next Destination" value={formData.nextDestination || ''} onChange={v => handleChange('nextDestination', v)} />
            
            <div className="grid grid-cols-2 gap-2">
               <CInput label="Arrival in India" type="date" value={formData.arrivalInIndiaDate || ''} onChange={v => handleChange('arrivalInIndiaDate', v)} />
               <CInput label="Time" type="time" value={formData.arrivalInIndiaTime || ''} onChange={v => handleChange('arrivalInIndiaTime', v)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
               <CInput label="Hotel Arrival in India" type="date" value={formData.hotelArrivalDate || ''} onChange={v => handleChange('hotelArrivalDate', v)} />
               <CInput label="Time" type="time" value={formData.hotelArrivalTime || ''} onChange={v => handleChange('hotelArrivalTime', v)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
               <CInput label="Hotel Departure in India" type="date" value={formData.hotelDepartureDate || ''} onChange={v => handleChange('hotelDepartureDate', v)} />
               <CInput label="Time" type="time" value={formData.hotelDepartureTime || ''} onChange={v => handleChange('hotelDepartureTime', v)} />
            </div>
          </div>

          {/* Column 2: Documents & Addresses */}
          <div className="space-y-4">
            <CInput label="Embassy Country Name" value={formData.embassyCountry || ''} onChange={v => handleChange('embassyCountry', v)} isSelect options={['_Select_', 'India', 'Bhutan']} />
            <CInput label="Passport Number" value={formData.passportNo || ''} onChange={v => handleChange('passportNo', v)} />
            <CInput label="Passport Place of Issue" value={formData.passportPlaceOfIssue || ''} onChange={v => handleChange('passportPlaceOfIssue', v)} />
            <CInput label="Passport Date of Issue" type="date" value={formData.passportDateOfIssue || ''} onChange={v => handleChange('passportDateOfIssue', v)} />
            <CInput label="Passport Date of Expiry" type="date" value={formData.passportDateOfExpiry || ''} onChange={v => handleChange('passportDateOfExpiry', v)} />
            
            <hr className="border-slate-300 my-4" />

            <CInput label="Visa Number" value={formData.visaNo || ''} onChange={v => handleChange('visaNo', v)} />
            <CInput label="Visa Place of Issue" value={formData.visaPlaceOfIssue || ''} onChange={v => handleChange('visaPlaceOfIssue', v)} />
            <CInput label="Visa Date of Issue" type="date" value={formData.visaDateOfIssue || ''} onChange={v => handleChange('visaDateOfIssue', v)} />
            <CInput label="Visa Date of Expiry" type="date" value={formData.visaDateOfExpiry || ''} onChange={v => handleChange('visaDateOfExpiry', v)} />
            <CInput label="Visa Type" value={formData.visaType || ''} onChange={v => handleChange('visaType', v)} isSelect options={['_Select_', 'Tourist', 'Business', 'Entry']} />
            
            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-blue-900 block">Residential Address</label>
               <textarea className="w-full border border-[#94b8d7] p-2 text-[11px] font-medium bg-white outline-none h-20 uppercase" value={formData.residentialAddress || ''} onChange={e => handleChange('residentialAddress', e.target.value)} />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-blue-900 block">Address in India</label>
               <textarea className="w-full border border-[#94b8d7] p-2 text-[11px] font-medium bg-white outline-none h-20 uppercase" value={formData.addressInIndia || ''} onChange={e => handleChange('addressInIndia', e.target.value)} />
            </div>
          </div>

          {/* Column 3: Contact & Remarks */}
          <div className="space-y-4">
            <CInput label="Number Of Days Stayed In India" type="number" value={formData.daysStayedInIndia?.toString() || ''} onChange={v => handleChange('daysStayedInIndia', parseInt(v) || 0)} />
            
            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-blue-900 block">Purpose Of Visit</label>
               <textarea className="w-full border border-[#94b8d7] p-2 text-[11px] font-medium bg-white outline-none h-20 uppercase" value={formData.purposeOfVisit || ''} onChange={e => handleChange('purposeOfVisit', e.target.value)} />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-blue-900 block">Photo</label>
               <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border border-[#94b8d7] bg-white overflow-hidden">
                     {formData.documents?.photo ? <img src={formData.documents.photo} className="w-full h-full object-cover" /> : <div className="text-[8px] flex items-center justify-center h-full text-gray-300">NO PHOTO</div>}
                  </div>
                  <input type="file" className="text-[9px] text-gray-400 no-print" />
               </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
               <label className="text-[10px] font-black uppercase text-blue-900">Employ In India ?</label>
               <input type="checkbox" checked={formData.isEmployedInIndia || false} onChange={e => handleChange('isEmployedInIndia', e.target.checked)} />
            </div>

            <CInput label="Contact Number In India" value={formData.contactNoInIndia || ''} onChange={v => handleChange('contactNoInIndia', v)} />
            <CInput label="Cell Number In India" value={formData.cellNoInIndia || ''} onChange={v => handleChange('cellNoInIndia', v)} />
            <CInput label="Contact Number In Residing Country" value={formData.contactNoResidingCountry || ''} onChange={v => handleChange('contactNoResidingCountry', v)} />
            
            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-blue-900 block">Remarks</label>
               <textarea className="w-full border border-[#94b8d7] p-2 text-[11px] font-medium bg-white outline-none h-20 uppercase" value={formData.remarks || ''} onChange={e => handleChange('remarks', e.target.value)} />
            </div>

            <CInput label="Application ID" value={formData.applicationId || ''} onChange={v => handleChange('applicationId', v)} />
          </div>

        </div>

        {/* Print Disclaimer */}
        <div className="p-8 pt-4 text-[8px] text-gray-400 uppercase font-bold text-center italic shrink-0">
          Electronic submission via BOI portal required. This print-out is for property records only.
        </div>
      </div>
    </div>
  );
};

const CInput = ({ label, value, onChange, type = "text", disabled = false, isSelect = false, options = [] }: any) => (
  <div className="space-y-1 w-full">
    <label className="text-[10px] font-black uppercase text-blue-900 block tracking-tight">{label}</label>
    {isSelect ? (
      <select 
        disabled={disabled}
        className="w-full border border-[#94b8d7] p-2 text-[11px] font-bold text-slate-800 bg-white outline-none focus:border-blue-600 appearance-none h-8"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input 
        type={type}
        disabled={disabled}
        className={`w-full border border-[#94b8d7] p-2 text-[11px] font-bold text-slate-800 bg-white outline-none focus:border-blue-600 h-8 ${disabled ? 'bg-slate-50 opacity-60' : ''} uppercase`}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    )}
  </div>
);

export default CForm;
