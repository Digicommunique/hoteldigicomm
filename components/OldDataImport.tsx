
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Guest, Booking, Room } from '../types.ts';

interface OldDataImportProps {
  rooms: Room[];
  onImport: (data: { guests: Guest[], bookings: Booking[] }) => Promise<void>;
  onClose: () => void;
}

const OldDataImport: React.FC<OldDataImportProps> = ({ rooms, onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setPreview(data.slice(0, 5)); // Show first 5 rows
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const processImport = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const importedGuests: Guest[] = [];
        const importedBookings: Booking[] = [];

        data.forEach((row, index) => {
          const guestName = row['Guest Name'] || row['Name'] || 'Unknown Guest';
          const phone = String(row['Contact Number'] || row['Phone'] || row['Mobile'] || `999000${index}`);
          const roomNumber = String(row['Room Number'] || '');
          const checkIn = row['Checkin Date'] || row['Check-in'] || new Date().toISOString().split('T')[0];
          const checkOut = row['Checkout Date'] || row['Check-out'] || new Date().toISOString().split('T')[0];
          const billNo = row['Bill No.'] || `OLD-${index}-${Date.now()}`;
          const address = row['Address'] || '';
          const state = row['State'] || '';
          const email = row['Email Id'] || row['Email'] || '';
          const agent = row['Agent'] || 'Direct';

          // Try to find the actual room object to get its ID
          const targetRoom = rooms.find(r => r.number === roomNumber);
          const roomId = targetRoom ? targetRoom.id : (rooms[0]?.id || '101');

          const guestId = `OLDG-${phone}-${index}`;
          
          const newGuest: Guest = {
            id: guestId,
            name: guestName,
            phone: phone,
            email: email,
            address: address,
            city: '',
            state: state,
            nationality: 'Indian',
            documents: {}
          };

          const newBooking: Booking = {
            id: `OLDB-${billNo}-${index}`,
            bookingNo: billNo,
            roomId: roomId,
            guestId: guestId,
            status: 'COMPLETED',
            checkInDate: String(checkIn).split(' ')[0],
            checkInTime: '12:00',
            checkOutDate: String(checkOut).split(' ')[0],
            checkOutTime: '11:00',
            basePrice: targetRoom?.price || 0,
            discount: 0,
            charges: [],
            payments: [{
              id: `PAY-${billNo}`,
              amount: targetRoom?.price || 0,
              date: String(checkOut).split(' ')[0],
              method: 'Old Software Migration',
              remarks: 'Imported from hotela'
            }],
            agent: agent
          };

          importedGuests.push(newGuest);
          importedBookings.push(newBooking);
        });

        await onImport({ guests: importedGuests, bookings: importedBookings });
        alert(`Successfully imported ${importedBookings.length} records!`);
        onClose();
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error(err);
      alert("Error processing Excel file. Please check the format.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#003d80] p-10 text-white flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Legacy Data Importer</h2>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Software Migration Tool (hotela)</p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-4 rounded-2xl hover:bg-white/20 font-black uppercase text-xs">Close</button>
        </div>

        <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="bg-blue-50 border-2 border-dashed border-blue-200 p-8 rounded-[2.5rem] text-center space-y-4">
            <p className="text-xs font-bold text-blue-900 uppercase">Select Excel (.xlsx / .csv) File From hotela</p>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-black transition-all cursor-pointer"
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-black text-xs uppercase text-slate-400 ml-1">Data Preview (First 5 Rows)</h3>
              <div className="border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      {Object.keys(preview[0]).map(k => <th key={k} className="p-3 font-black uppercase">{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {Object.values(row).map((v: any, j) => <td key={j} className="p-3 text-slate-600 truncate max-w-[120px]">{String(v)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t flex justify-end gap-4">
          <button 
            disabled={!file || isProcessing} 
            onClick={processImport}
            className="bg-blue-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Importing...' : 'Start Data Migration'}
          </button>
          <button onClick={onClose} className="px-8 py-4 font-black text-xs text-slate-400 uppercase">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default OldDataImport;
