
import React from 'react';
import { Guest, Booking, Room } from '../types.ts';

interface GRCFormProps {
  guest: Partial<Guest>;
  booking?: Partial<Booking>;
  rooms?: Room[];
  settings: any;
  onClose: () => void;
}

const GRCForm: React.FC<GRCFormProps> = ({ guest, booking, rooms, settings, onClose }) => {
  const currentRoom = rooms?.find(r => r.id === booking?.roomId);
  
  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8 no-print-backdrop">
      <div className="bg-white w-full max-w-5xl h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Actions Bar */}
        <div className="bg-slate-100 px-8 py-4 flex justify-between items-center shrink-0 no-print border-b">
          <h2 className="font-black text-xs uppercase tracking-widest text-slate-500">Document Preview: Guest Registration Card</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase shadow-lg">Print GRC</button>
            <button onClick={onClose} className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-slate-300">Close</button>
          </div>
        </div>

        {/* Scrollable Content (Printable Area) */}
        <div className="flex-1 overflow-y-auto p-8 bg-white invoice-sheet">
          <div className="max-w-4xl mx-auto border border-slate-400 p-1">
            
            {/* Logo Section */}
            <div className="flex items-center justify-center p-4 border-b border-slate-400">
               <div className="flex flex-col items-center">
                 <img src="https://fejxskvsjfwjqmiobtpp.supabase.co/storage/v1/object/public/logos/bihar-tourism-logo.png" alt="Bihar Tourism Logo" className="h-20 w-auto mb-2" />
                 <div className="text-[10px] font-black uppercase text-slate-600 tracking-[0.3em]">Department of Tourism, Bihar</div>
               </div>
            </div>

            {/* Title Bar */}
            <div className="bg-slate-200 border-b border-slate-400 text-center py-1 font-black uppercase text-[11px] tracking-widest">
              Guest Registration Card
            </div>

            {/* Section 1: Primary Info */}
            <div className="grid grid-cols-[1fr_250px] border-b border-slate-400">
              <div className="border-r border-slate-400 divide-y border-slate-400">
                <Cell label="Name" value={guest.name} />
                <Cell label="Mobile No." value={guest.phone} />
                <Cell label="Email Id" value={guest.email} />
                <Cell label="Address" value={guest.address} height="h-12" />
              </div>
              <div className="divide-y border-slate-400">
                <Cell label="GRC No." value={`GRC-${booking?.bookingNo?.split('-')?.[1] || 'NEW'}`} />
                <Cell label="Resrv. No." value={booking?.bookingNo || 'N/A'} />
                <Cell label="Designation" value="" />
              </div>
            </div>

            {/* Section 2: Travel Details */}
            <div className="grid grid-cols-2 border-b border-slate-400 divide-x border-slate-400">
              <div className="divide-y border-slate-400">
                <Cell label="Arrival From" value={guest.arrivalFrom} />
                <Cell label="Arrival Date" value={booking?.checkInDate} />
                <Cell label="Mode Of Payment" value={booking?.payments?.[0]?.method || 'Cash/UPI'} />
              </div>
              <div className="divide-y border-slate-400">
                <Cell label="Proceeding To" value={guest.nextDestination} />
                <Cell label="Departure Date" value={booking?.checkOutDate} />
                <Cell label="Purpose Of Visit" value={guest.purposeOfVisit || booking?.purpose || 'TOUR'} />
              </div>
            </div>

            {/* Section 3: Company Details */}
            <div className="border-b border-slate-400">
              <Cell label="Company Name & Address (If Any)" value="" height="h-10" />
            </div>

            <div className="border-b border-slate-400">
               <Cell label="Payment Type" value={booking?.payments?.[0]?.method || ''} />
            </div>

            {/* Foreigners Only Header */}
            <div className="bg-slate-200 border-b border-slate-400 text-center py-1 font-black uppercase text-[10px] tracking-widest">
              Foreigners Only
            </div>
            <div className="grid grid-cols-2 border-b border-slate-400 divide-x border-slate-400">
               <Cell label="Date Of Arrival In India" value={guest.arrivalInIndiaDate} />
               <Cell label="Nationality" value={guest.nationality} />
            </div>
            <div className="border-b border-slate-400">
               <Cell label="Duration Of Stay In India" value={guest.daysStayedInIndia?.toString()} />
            </div>

            {/* Passport Header */}
            <div className="bg-slate-200 border-b border-slate-400 text-center py-1 font-black uppercase text-[10px] tracking-widest">
              Passport Details
            </div>
            <div className="grid grid-cols-2 border-b border-slate-400 divide-x border-slate-400">
               <Cell label="P.No" value={guest.passportNo} />
               <Cell label="DOE" value={guest.passportDateOfExpiry} />
            </div>
            <div className="grid grid-cols-2 border-b border-slate-400 divide-x border-slate-400">
               <Cell label="DOI" value={guest.passportDateOfIssue} />
               <Cell label="Place Of Issue" value={guest.passportPlaceOfIssue} />
            </div>

            {/* Visa Header */}
            <div className="bg-slate-200 border-b border-slate-400 text-center py-1 font-black uppercase text-[10px] tracking-widest">
              Visa Details
            </div>
            <div className="grid grid-cols-2 border-b border-slate-400 divide-x border-slate-400">
               <Cell label="V.No" value={guest.visaNo} />
               <Cell label="DOE" value={guest.visaDateOfExpiry} />
            </div>
            <div className="grid grid-cols-2 border-b border-slate-400 divide-x border-slate-400">
               <Cell label="DOI" value={guest.visaDateOfIssue} />
               <Cell label="Place Of Issue" value={guest.visaPlaceOfIssue} />
            </div>

            {/* Office Use Only */}
            <div className="bg-slate-200 border-b border-slate-400 text-center py-1 font-black uppercase text-[10px] tracking-widest">
              For Office Use Only
            </div>
            <div className="overflow-hidden border-b border-slate-400">
              <table className="w-full text-[9px] border-collapse">
                <thead className="border-b border-slate-400">
                  <tr className="divide-x border-slate-400 font-bold">
                    <th className="p-1 text-left w-20">Room No.</th>
                    <th className="p-1 text-left">Room Type</th>
                    <th className="p-1 text-left">Meal Plan</th>
                    <th className="p-1 text-left w-16">Rate</th>
                    <th className="p-1 text-left w-12">Adult</th>
                    <th className="p-1 text-left w-12">Child</th>
                    <th className="p-1 text-left w-12">Extra Pax</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="divide-x border-slate-400 h-10 align-top">
                    <td className="p-1 font-black">{currentRoom?.number || ''}</td>
                    <td className="p-1 uppercase">{currentRoom?.type || ''}</td>
                    <td className="p-1 uppercase">{booking?.mealPlan || ''}</td>
                    <td className="p-1">{booking?.basePrice ? `₹${booking.basePrice}` : ''}</td>
                    <td className="p-1">{booking?.adults || ''}</td>
                    <td className="p-1">{booking?.children || ''}</td>
                    <td className="p-1">{(booking?.kids || 0) + (booking?.others || 0) || ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Final Section */}
            <div className="p-2 space-y-4">
              <div className="text-[10px] font-bold uppercase">
                <p>Billing Instruction/Address :</p>
                <div className="h-4 border-b border-slate-200 mt-1"></div>
                <p className="mt-2">Discount if any : {booking?.discount ? `₹${booking.discount}` : ''}</p>
              </div>

              <div className="flex justify-between items-end pt-12 pb-4">
                 <div className="text-center w-40 border-t border-slate-400 pt-1 text-[9px] font-black uppercase">Guest Signature</div>
                 <div className="text-center w-40 border-t border-slate-400 pt-1 text-[9px] font-black uppercase">Front Office Signature</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const Cell = ({ label, value, height = "h-7" }: any) => (
  <div className={`flex items-center px-2 py-0.5 gap-2 ${height}`}>
    <span className="text-[10px] font-bold text-slate-800 whitespace-nowrap">{label} :</span>
    <span className="text-[10px] font-black uppercase text-slate-900 truncate">{value || ''}</span>
  </div>
);

export default GRCForm;
