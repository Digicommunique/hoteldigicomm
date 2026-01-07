
import React, { useState, useMemo } from 'react';
import { GroupProfile, Room, Booking, Guest, RoomStatus, Transaction } from '../types';
import { INDIAN_STATES } from '../constants';

interface GroupModuleProps {
  groups: GroupProfile[];
  setGroups: (groups: GroupProfile[]) => void;
  rooms: Room[];
  bookings: Booking[];
  setBookings: (bookings: Booking[]) => void;
  guests: Guest[];
  setGuests: (guests: Guest[]) => void;
  setRooms: (rooms: Room[]) => void;
  onAddTransaction: (tx: Transaction) => void;
}

const GroupModule: React.FC<GroupModuleProps> = ({ groups, setGroups, rooms, bookings, setBookings, guests, setGuests, setRooms, onAddTransaction }) => {
  const [activeSubMenu, setActiveSubMenu] = useState<'PROFILES' | 'BILLING' | 'IMPORT'>('PROFILES');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupProfile | null>(null);

  const handleBulkStatusChange = (groupId: string, newStatus: Booking['status']) => {
    const updatedBookings = bookings.map(b => b.groupId === groupId ? { ...b, status: newStatus } : b);
    setBookings(updatedBookings);
    const groupRoomIds = bookings.filter(b => b.groupId === groupId).map(b => b.roomId);
    const roomStatus = newStatus === 'ACTIVE' ? RoomStatus.OCCUPIED : newStatus === 'COMPLETED' ? RoomStatus.DIRTY : RoomStatus.VACANT;
    const updatedRooms = rooms.map(r => groupRoomIds.includes(r.id) ? { ...r, status: roomStatus } : r);
    setRooms(updatedRooms);
    alert(`Bulk ${newStatus.toLowerCase()} processed for all group units.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const imported = JSON.parse(content);
          if (Array.isArray(imported)) {
            setGuests([...guests, ...imported]);
            alert(`${imported.length} guest records imported successfully.`);
          }
        } catch (err) {
          alert("Invalid file format. Please upload a valid JSON guest list.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">Group Master Console</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Multi-Room & Corporate Registry</p>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all">+ New Group Account</button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-4">
        <SubMenuBtn active={activeSubMenu === 'PROFILES'} label="Profiles" onClick={() => setActiveSubMenu('PROFILES')} />
        <SubMenuBtn active={activeSubMenu === 'BILLING'} label="Billing Desk" onClick={() => setActiveSubMenu('BILLING')} />
        <SubMenuBtn active={activeSubMenu === 'IMPORT'} label="Bulk Import Guests" onClick={() => setActiveSubMenu('IMPORT')} />
      </div>

      <div className="flex-1">
        {activeSubMenu === 'PROFILES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <div key={group.id} className="bg-white border-2 rounded-[2.5rem] p-8 shadow-sm hover:border-blue-200 cursor-pointer" onClick={() => setSelectedGroup(group)}>
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{group.groupType}</span>
                  <span className="text-[9px] font-black uppercase text-green-500">{group.status}</span>
                </div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">{group.groupName}</h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase mb-8">{group.headName} • {group.phone}</p>
                <div className="border-t pt-6 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-gray-300">Blocks</p>
                    <p className="text-[10px] font-black uppercase text-gray-700">{bookings.filter(b => b.groupId === group.id).length} Units</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubMenu === 'IMPORT' && (
          <div className="bg-white p-12 rounded-[3rem] border-2 shadow-sm text-center space-y-8">
             <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-900 text-3xl mx-auto">📥</div>
             <div>
                <h2 className="text-2xl font-black text-blue-900 uppercase">Batch Guest Enrollment</h2>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-2">Upload JSON/CSV File for Automated Profile Creation</p>
             </div>
             <div className="relative inline-block">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept=".json" />
                <button className="bg-blue-900 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs shadow-xl">Select File to Upload</button>
             </div>
          </div>
        )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onSave={(g) => { setGroups([...groups, g]); setShowCreate(false); }} />}
      {selectedGroup && (
        <GroupDetailView 
          group={selectedGroup} 
          bookings={bookings} 
          rooms={rooms} 
          onClose={() => setSelectedGroup(null)} 
          onBulkCheckIn={() => handleBulkStatusChange(selectedGroup.id, 'ACTIVE')}
          onBulkCheckOut={() => handleBulkStatusChange(selectedGroup.id, 'COMPLETED')}
        />
      )}
    </div>
  );
};

const CreateGroupModal = ({ onClose, onSave }: any) => {
  const [name, setName] = useState('');
  const [head, setHead] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl p-12 animate-in zoom-in duration-300">
        <h2 className="text-2xl font-black uppercase tracking-widest text-blue-900 mb-8">Establish Group Profile</h2>
        <div className="space-y-6">
          <Inp label="Group/Tour Name" value={name} onChange={setName} />
          <Inp label="Contact Person" value={head} onChange={setHead} />
          <Inp label="Mobile Number" value={phone} onChange={setPhone} />
          <div className="flex gap-4 pt-6">
            <button onClick={() => onSave({id: Date.now().toString(), groupName: name, headName: head, phone: phone, groupType: 'Tour', status: 'ACTIVE'})} className="flex-1 bg-blue-900 text-white py-5 rounded-2xl font-black uppercase text-xs">Register Profile</button>
            <button onClick={onClose} className="px-8 text-gray-400 font-black uppercase text-[10px]">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GroupDetailView = ({ group, bookings, rooms, onClose, onBulkCheckIn, onBulkCheckOut }: any) => {
  const gBookings = bookings.filter((b: any) => b.groupId === group.id);
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8">
      <div className="bg-[#f8fafc] w-full max-w-7xl h-[95vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-blue-900 p-12 text-white flex justify-between items-start">
          <div>
            <h2 className="text-5xl font-black uppercase tracking-tighter">{group.groupName}</h2>
            <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.3em] mt-4">Management Console | ID: {group.id}</p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-6 rounded-3xl font-black uppercase text-xs">Close</button>
        </div>
        <div className="flex-1 p-12 overflow-y-auto">
           <div className="grid grid-cols-4 gap-4 mb-8">
              <button onClick={onBulkCheckIn} className="bg-green-600 text-white p-6 rounded-3xl font-black uppercase text-[10px] shadow-lg">Bulk Check-in Selection</button>
              <button onClick={onBulkCheckOut} className="bg-red-600 text-white p-6 rounded-3xl font-black uppercase text-[10px] shadow-lg">Bulk Check-out Selection</button>
           </div>
           <div className="bg-white rounded-[3rem] border-2 overflow-hidden">
             <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase font-black text-gray-400">
                  <tr><th className="p-6">Unit</th><th className="p-6">Status</th><th className="p-6 text-right">Rent</th></tr>
                </thead>
                <tbody className="divide-y font-bold uppercase text-gray-700">
                  {gBookings.map((b: any) => (
                    <tr key={b.id}>
                      <td className="p-6 font-black text-blue-900">Room {rooms.find((r:any)=>r.id===b.roomId)?.number}</td>
                      <td className="p-6">{b.status}</td>
                      <td className="p-6 text-right">₹{b.basePrice}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
};

const SubMenuBtn = ({ active, label, onClick }: any) => (
  <button onClick={onClick} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${active ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-400 border-gray-100'}`}>{label}</button>
);

const Inp = ({ label, value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <input className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 text-black outline-none focus:border-blue-500" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default GroupModule;
