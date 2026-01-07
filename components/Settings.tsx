
import React, { useState, useEffect } from 'react';
import { HostelSettings, Room, AgentConfig, RoomStatus, UserRole } from '../types.ts';
import { exportDatabase, resetDatabase, clearOperationalData, importDatabase } from '../services/db.ts';
import { fetchAllFromCloud, pushToCloud } from '../services/supabase.ts';
import { db } from '../services/db.ts';

interface SettingsProps {
  settings: HostelSettings;
  setSettings: (settings: HostelSettings) => void;
  rooms: Room[];
  onDeleteRoom: (roomId: string) => Promise<boolean>;
  setRooms: (rooms: Room[]) => void;
  currentRole: UserRole;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, rooms, onDeleteRoom, setRooms, currentRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'GENERAL' | 'ROOMS' | 'AGENTS' | 'SECURITY' | 'CLOUD'>('GENERAL');
  const [tempSettings, setTempSettings] = useState<HostelSettings>(settings);
  const [newRoom, setNewRoom] = useState<Partial<Room>>({ number: '', floor: 1, type: settings.roomTypes[0] || '', price: 0 });
  const [newAgent, setNewAgent] = useState<AgentConfig>({ name: '', commission: 0 });
  const [isCloudPulling, setIsCloudPulling] = useState(false);

  useEffect(() => { setTempSettings(settings); }, [settings]);

  const handleUpdate = (field: keyof HostelSettings, value: any) => {
    const updated = { ...tempSettings, [field]: value };
    setTempSettings(updated);
    setSettings(updated);
  };

  const addRoom = () => {
    if (!newRoom.number) return alert("Room number required");
    const r = { ...newRoom, id: Date.now().toString(), status: RoomStatus.VACANT } as Room;
    setRooms([...rooms, r]);
    setNewRoom({...newRoom, number: '', floor: 1, type: settings.roomTypes[0] || '', price: 0});
  };

  const addAgent = () => {
    if (!newAgent.name) return;
    const updatedAgents = [...(tempSettings.agents || []), newAgent];
    handleUpdate('agents', updatedAgents);
    setNewAgent({ name: '', commission: 0 });
  };

  const removeAgent = (name: string) => {
    const updatedAgents = (tempSettings.agents || []).filter(a => a.name !== name);
    handleUpdate('agents', updatedAgents);
  };

  const handleResetData = async () => {
    const confirm1 = window.confirm("FACTORY RESET WARNING: This will permanently delete ALL data (Settings, Rooms, Guests, Bookings). Continue?");
    if (confirm1 && window.confirm("FINAL CONFIRMATION: Wipe all records?")) {
      await resetDatabase();
    }
  };

  const handleClearOps = async () => {
    const confirm1 = window.confirm("RESET OPERATIONS: This will delete all Guests, Bookings, and Bills, and mark all Rooms as VACANT. Room inventory and settings will be KEPT. Continue?");
    if (confirm1 && window.confirm("CONFIRM: Clear operational test data?")) {
      await clearOperationalData();
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm("RESTORE DATA: This will replace all current data with the contents of the backup file. Any unsaved changes will be lost. Continue?")) {
      try {
        await importDatabase(file);
        alert("Data restored successfully! The application will now reload.");
        window.location.reload();
      } catch (err) {
        console.error("Restore failed:", err);
        alert("Failed to restore data. Please ensure you are using a valid HotelSphere backup file.");
      }
    }
    e.target.value = '';
  };

  const handleForceCloudPull = async () => {
    if (!window.confirm("FORCE SYNC: This will wipe this browser's local memory and pull EVERYTHING from the cloud. Use this to fix discrepancies. Proceed?")) return;
    
    setIsCloudPulling(true);
    const cloudData = await fetchAllFromCloud();
    if (cloudData) {
      await (db as any).transaction('rw', [db.rooms, db.guests, db.bookings, db.financialTransactions, db.settings, db.groups], async () => {
        if (cloudData.settings) await db.settings.put(cloudData.settings);
        await db.rooms.clear(); await db.rooms.bulkPut(cloudData.rooms);
        await db.guests.clear(); await db.guests.bulkPut(cloudData.guests);
        await db.bookings.clear(); await db.bookings.bulkPut(cloudData.bookings);
        await db.financialTransactions.clear(); await db.financialTransactions.bulkPut(cloudData.transactions);
        await db.groups.clear(); await db.groups.bulkPut(cloudData.groups);
      });
      alert("Synchronization Complete! The app will now reload.");
      window.location.reload();
    } else {
      alert("Cloud Pull Failed. Most likely an RLS Policy error in Supabase.");
    }
    setIsCloudPulling(false);
  };

  return (
    <div className="p-4 md:p-6 bg-[#f8fafc] min-h-full pb-20 text-black">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border shadow-sm sticky top-2 z-10">
          <div className="flex gap-1 overflow-x-auto no-scrollbar scrollbar-hide w-full md:w-auto">
            <SubTab active={activeSubTab === 'GENERAL'} label="Profile" onClick={() => setActiveSubTab('GENERAL')} />
            <SubTab active={activeSubTab === 'ROOMS'} label="Inventory" onClick={() => setActiveSubTab('ROOMS')} />
            <SubTab active={activeSubTab === 'AGENTS'} label="Agents" onClick={() => setActiveSubTab('AGENTS')} />
            <SubTab active={activeSubTab === 'SECURITY'} label="Security" onClick={() => setActiveSubTab('SECURITY')} />
            <SubTab active={activeSubTab === 'CLOUD'} label="Sync Fix (IMPORTANT)" onClick={() => setActiveSubTab('CLOUD')} />
          </div>
        </div>

        {activeSubTab === 'GENERAL' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <section className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4 text-blue-900">Branding & Billing</h3>
              <Input label="Business Name" value={tempSettings.name} onChange={v => handleUpdate('name', v)} />
              <Input label="Property Address" value={tempSettings.address} onChange={v => handleUpdate('address', v)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="GSTIN" value={tempSettings.gstNumber || ''} onChange={v => handleUpdate('gstNumber', v)} />
                <Input label="HSN Code" value={tempSettings.hsnCode || ''} onChange={v => handleUpdate('hsnCode', v)} />
              </div>
              <Input label="UPI ID" value={tempSettings.upiId || ''} onChange={v => handleUpdate('upiId', v)} />
              <Input label="Default Tax (%)" type="number" value={tempSettings.taxRate?.toString() || '12'} onChange={v => handleUpdate('taxRate', parseFloat(v))} />
            </section>
            
            <section className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6 h-fit">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4 text-slate-400">System Management</h3>
              <div className="space-y-3">
                <button onClick={exportDatabase} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-black transition-all">Download Local Backup</button>
                <button onClick={() => document.getElementById('restore-input')?.click()} className="w-full bg-white text-blue-900 border-2 border-blue-100 py-4 rounded-2xl font-black text-xs uppercase hover:bg-blue-50 transition-all">Restore from File</button>
                <input id="restore-input" type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </div>
              
              {['SUPERADMIN', 'ADMIN'].includes(currentRole) && (
                <div className="pt-6 border-t space-y-4">
                  <h3 className="font-black uppercase text-[10px] text-red-600 mb-2">Danger Area</h3>
                  <button onClick={handleClearOps} className="w-full bg-white text-orange-600 border-2 border-orange-200 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-orange-600 hover:text-white transition-all">Clear Records Only</button>
                  <button onClick={handleResetData} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all">Factory Reset All</button>
                </div>
              )}
            </section>
          </div>
        )}

        {activeSubTab === 'ROOMS' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <section className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Room Registry</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                <Input label="Room No" value={newRoom.number || ''} onChange={v => setNewRoom({...newRoom, number: v})} />
                <Input label="Floor" type="number" value={newRoom.floor?.toString() || '1'} onChange={v => setNewRoom({...newRoom, floor: parseInt(v) || 1})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Category</label>
                  <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 text-black outline-none" value={newRoom.type} onChange={e => setNewRoom({...newRoom, type: e.target.value})}>
                    {tempSettings.roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <Input label="Base Rate" value={newRoom.price?.toString() || ''} onChange={v => setNewRoom({...newRoom, price: parseFloat(v) || 0})} />
                <button onClick={addRoom} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg uppercase hover:bg-black transition-all">Add Unit</button>
              </div>
            </section>
            
            <div className="bg-white rounded-3xl border shadow-sm overflow-x-auto">
               <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-900 text-white uppercase font-black">
                     <tr><th className="p-5">Floor</th><th className="p-5">Room</th><th className="p-5">Type</th><th className="p-5 text-right">Rate</th><th className="p-5 text-center">Action</th></tr>
                  </thead>
                  <tbody className="divide-y font-bold text-black">
                     {rooms.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-5 font-black text-blue-600">{r.floor}</td>
                           <td className="p-5 font-black text-lg text-black">{r.number}</td>
                           <td className="p-5"><span className="bg-blue-50 text-black px-3 py-1 rounded-full text-[9px] uppercase font-black">{r.type}</span></td>
                           <td className="p-5 text-right font-black">₹{r.price}</td>
                           <td className="p-5 text-center">
                             <button onClick={() => { if(confirm(`Delete Room ${r.number}?`)) onDeleteRoom(r.id); }} className="text-red-500 text-[9px] font-black uppercase hover:underline">Remove</button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeSubTab === 'AGENTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <section className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Agent Configuration</h3>
              <div className="space-y-4">
                <Input label="Agent Name" value={newAgent.name} onChange={v => setNewAgent({...newAgent, name: v})} />
                <Input label="Commission (%)" type="number" value={newAgent.commission.toString()} onChange={v => setNewAgent({...newAgent, commission: parseFloat(v) || 0})} />
                <button onClick={addAgent} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg">Add Agent</button>
              </div>
            </section>
            <section className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6 h-fit">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Active Partners</h3>
              <div className="divide-y">
                {tempSettings.agents?.map(agent => (
                  <div key={agent.name} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-black text-xs uppercase">{agent.name}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase">{agent.commission}% Commission</p>
                    </div>
                    <button onClick={() => removeAgent(agent.name)} className="text-red-400 text-[9px] font-black uppercase">Remove</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeSubTab === 'SECURITY' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <section className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-8">
              <div className="border-l-8 border-orange-500 pl-6">
                <h3 className="font-black uppercase text-2xl tracking-tighter">Access Controls</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Password Management</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Superadmin Master" value={tempSettings.superadminPassword || ''} onChange={v => handleUpdate('superadminPassword', v)} type="password" />
                <Input label="Admin Password" value={tempSettings.adminPassword || ''} onChange={v => handleUpdate('adminPassword', v)} type="password" />
                <Input label="Receptionist Desk" value={tempSettings.receptionistPassword || ''} onChange={v => handleUpdate('receptionistPassword', v)} type="password" />
              </div>
            </section>
          </div>
        )}

        {activeSubTab === 'CLOUD' && (
          <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] border shadow-sm space-y-10 animate-in fade-in duration-500">
             <div className="flex items-center gap-6 border-b pb-8">
               <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner shrink-0 text-blue-600">☁️</div>
               <div>
                 <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tighter leading-tight">Fix Sync Errors</h2>
                 <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Real-time Cloud Control</p>
               </div>
             </div>

             <div className="p-8 bg-red-50 border-2 border-red-200 rounded-[2rem] space-y-8">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center text-xl font-black animate-pulse">!</div>
                   <div>
                     <h4 className="text-xl font-black uppercase text-red-900 leading-tight">FIX: Syntax Error & Different Data</h4>
                     <p className="text-[11px] font-bold text-red-700 uppercase">Follow these 2 steps exactly to synchronize your browsers.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h5 className="font-black text-xs uppercase text-slate-900 border-l-4 border-blue-600 pl-3">Step 1: Use SQL Editor Only</h5>
                    <ol className="text-[12px] font-bold text-slate-700 space-y-4 list-decimal ml-5">
                      <li>Go to Supabase.</li>
                      <li>Click the <b>SQL Editor</b> icon (looks like <code className="bg-slate-200 px-1 rounded">&gt;_</code>).</li>
                      <li>Click <b>"+ New Query"</b> at the top.</li>
                      <li><b>DO NOT</b> use the "Policies" or "RLS" dialog.</li>
                    </ol>
                  </div>
                  <div className="space-y-4">
                    <h5 className="font-black text-xs uppercase text-slate-900 border-l-4 border-green-600 pl-3">Step 2: Copy-Paste Everything Below</h5>
                    <p className="text-[11px] text-slate-500 font-bold">Paste the entire script into the "New Query" window and click "Run".</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border-2 border-red-100 relative shadow-inner">
                  <pre className="font-mono text-[10px] text-red-900 overflow-x-auto select-all leading-relaxed whitespace-pre-wrap max-h-96 custom-scrollbar">
{`-- PASTE THIS INTO "SQL EDITOR" -> "NEW QUERY" --

-- 1. Enable RLS on all tables
ALTER TABLE IF EXISTS "rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "guests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "groups" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow Public" ON "rooms";
DROP POLICY IF EXISTS "Allow Public" ON "bookings";
DROP POLICY IF EXISTS "Allow Public" ON "guests";
DROP POLICY IF EXISTS "Allow Public" ON "transactions";
DROP POLICY IF EXISTS "Allow Public" ON "settings";
DROP POLICY IF EXISTS "Allow Public" ON "groups";

-- 3. Create permissive public policies
CREATE POLICY "Allow Public" ON "rooms" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "bookings" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "guests" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "transactions" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "settings" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "groups" FOR ALL USING (true) WITH CHECK (true);

-- 4. CRITICAL: Enable Full Replication (Fixes different data in browsers)
ALTER TABLE "rooms" REPLICA IDENTITY FULL;
ALTER TABLE "bookings" REPLICA IDENTITY FULL;
ALTER TABLE "guests" REPLICA IDENTITY FULL;
ALTER TABLE "transactions" REPLICA IDENTITY FULL;
ALTER TABLE "settings" REPLICA IDENTITY FULL;
ALTER TABLE "groups" REPLICA IDENTITY FULL;

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';`}
                  </pre>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-blue-50 border-2 border-blue-100 rounded-[2rem] space-y-4">
                  <h4 className="text-sm font-black uppercase text-blue-900">Sync & Force Reload</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">If Browser B still shows old data, click this to wipe local memory and pull from cloud.</p>
                  <button onClick={handleForceCloudPull} disabled={isCloudPulling} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all">
                    {isCloudPulling ? 'Synchronizing...' : 'Full Sync & Reload'}
                  </button>
                </div>
                <div className="p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] space-y-4 flex flex-col justify-center">
                  <h4 className="text-sm font-black uppercase text-slate-900">Connection State</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Look for 🟢 Cloud Online in the bottom footer. If it is 🔴, your browser is not connected to Supabase.</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SubTab: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
  <button onClick={onClick} className={`px-6 md:px-8 py-2.5 md:py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${active ? 'bg-blue-900 text-white shadow-lg' : 'text-black hover:bg-gray-100'}`}>{label}</button>
);

const Input: React.FC<{ label: string, value: string, onChange: (v: string) => void, type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 ml-1 tracking-tight">{label}</label>
    <input type={type} className="w-full border-2 p-3.5 md:p-4 rounded-2xl font-black text-[12px] bg-gray-50 focus:bg-white focus:border-blue-500 shadow-inner text-black transition-all outline-none" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

export default Settings;
