
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
    if (!window.confirm("SYNC WARNING: This will overwrite ALL data in this browser with the current data from Supabase. Use this to sync multiple browsers. Proceed?")) return;
    
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
      alert("Sync Complete! The application will now reload to apply changes.");
      window.location.reload();
    } else {
      alert("Cloud Pull Failed. Check your connection or RLS Policies.");
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
            <SubTab active={activeSubTab === 'CLOUD'} label="Cloud" onClick={() => setActiveSubTab('CLOUD')} />
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
              <div className="grid grid-cols-2 gap-4">
                <Input label="License (C-Form)" value={tempSettings.licenseNumber || ''} onChange={v => handleUpdate('licenseNumber', v)} />
                <Input label="UPI ID" value={tempSettings.upiId || ''} onChange={v => handleUpdate('upiId', v)} />
              </div>
              <Input label="Default Tax (%)" type="number" value={tempSettings.taxRate?.toString() || '12'} onChange={v => handleUpdate('taxRate', parseFloat(v))} />
            </section>
            
            <section className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6 h-fit">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4 text-slate-400">System Tools</h3>
              <div className="space-y-3">
                <button onClick={exportDatabase} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-black transition-all">Download Full Backup</button>
                <button onClick={() => document.getElementById('restore-input')?.click()} className="w-full bg-white text-blue-900 border-2 border-blue-100 py-4 rounded-2xl font-black text-xs uppercase hover:bg-blue-50 transition-all">Restore from Backup</button>
                <input id="restore-input" type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </div>
              
              {['SUPERADMIN', 'ADMIN'].includes(currentRole) && (
                <div className="pt-6 border-t space-y-4">
                  <h3 className="font-black uppercase text-[10px] text-red-600 mb-2">Danger Zone</h3>
                  <div className="p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl space-y-3">
                    <p className="text-[9px] font-black uppercase text-orange-800">Operational Reset</p>
                    <p className="text-[8px] font-bold text-orange-600 leading-tight">Clears all Bookings, Guests, and Bills. Keeps your Room inventory and Branding.</p>
                    <button onClick={handleClearOps} className="w-full bg-white text-orange-600 border-2 border-orange-200 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-orange-600 hover:text-white transition-all">Clear Records Only</button>
                  </div>
                  <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl space-y-3">
                    <p className="text-[9px] font-black uppercase text-red-800">Factory Reset</p>
                    <p className="text-[8px] font-bold text-red-600 leading-tight">Wipes everything. Deletes Rooms, Settings, and all Data.</p>
                    <button onClick={handleResetData} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all">Wipe All Data</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {activeSubTab === 'ROOMS' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <section className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Room Registry</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <Input label="Room No" value={newRoom.number || ''} onChange={v => setNewRoom({...newRoom, number: v})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Category</label>
                  <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 text-black outline-none" value={newRoom.type} onChange={e => setNewRoom({...newRoom, type: e.target.value})}>
                    {tempSettings.roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <Input label="Base Price" value={newRoom.price?.toString() || ''} onChange={v => setNewRoom({...newRoom, price: parseFloat(v) || 0})} />
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
                           <td className="p-5">{r.floor}</td>
                           <td className="p-5 font-black text-lg">{r.number}</td>
                           <td className="p-5 text-blue-600">{r.type}</td>
                           <td className="p-5 text-right font-black">₹{r.price}</td>
                           <td className="p-5 text-center">
                             <button onClick={() => { if(confirm(`Confirm delete Room ${r.number}?`)) onDeleteRoom(r.id); }} className="text-red-500 text-[9px] font-black uppercase hover:underline">Remove</button>
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
                <Input label="Agent/Portal Name" value={newAgent.name} onChange={v => setNewAgent({...newAgent, name: v})} />
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
                <Input label="Accounts Dept" value={tempSettings.accountantPassword || ''} onChange={v => handleUpdate('accountantPassword', v)} type="password" />
                <Input label="Housekeeping Super" value={tempSettings.supervisorPassword || ''} onChange={v => handleUpdate('supervisorPassword', v)} type="password" />
              </div>
            </section>
          </div>
        )}

        {activeSubTab === 'CLOUD' && (
          <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] border shadow-sm space-y-10 animate-in fade-in duration-500">
             <div className="flex items-center gap-6 border-b pb-8">
               <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner shrink-0 text-blue-600">☁️</div>
               <div>
                 <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tighter leading-tight">Supabase Multi-Browser Sync</h2>
                 <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Real-time Data Orchestration</p>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-blue-50 border-2 border-blue-100 rounded-[2rem] space-y-4">
                  <h4 className="text-sm font-black uppercase text-blue-900">Sync Browser Data</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">If data is missing, pull the latest records from the cloud manually.</p>
                  <button onClick={handleForceCloudPull} disabled={isCloudPulling} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all">
                    {isCloudPulling ? 'Synchronizing...' : 'Pull Latest from Cloud'}
                  </button>
                </div>

                <div className="p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] space-y-4">
                   <h4 className="text-sm font-black uppercase text-slate-900">Push Refresh</h4>
                   <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Force upload local settings if cloud status shows 'Error'.</p>
                   <button onClick={async () => {
                      const success = await pushToCloud('settings', [settings]);
                      if (success) alert('Local settings pushed to cloud.');
                    }} className="w-full bg-white text-slate-900 border-2 border-slate-200 py-4 rounded-2xl font-black text-xs uppercase">Force Push Settings</button>
                </div>
             </div>
             
             <div className="p-4 md:p-10 bg-red-50 border-2 border-red-200 rounded-[2rem] space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-black animate-pulse">!</div>
                  <h4 className="text-lg font-black uppercase text-red-900 leading-tight">STOP: FIXING SYNTAX ERROR 42601</h4>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border-2 border-red-200 space-y-4">
                  <h5 className="font-black text-xs uppercase text-red-600">Why are you seeing "Syntax Error near TABLE"?</h5>
                  <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                    You are likely pasting the code into the <span className="underline decoration-red-500 decoration-2">RLS Policy Editor</span>. 
                    The policy editor <b>only</b> accepts simple rules (like "true").
                    To fix your database, you must use the <b>SQL Editor</b> instead.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h5 className="font-black text-xs uppercase text-slate-900 border-l-4 border-blue-600 pl-3">Step 1: Go to the right place</h5>
                    <ol className="text-[11px] font-bold text-slate-600 space-y-3 list-decimal ml-5">
                      <li>Close the "Create Policy" modal you are in.</li>
                      <li>On the left sidebar, click the <b>SQL Editor</b> icon (looks like <code className="bg-slate-200 px-1 px-0.5 rounded">&gt;_</code>).</li>
                      <li>Click <b>"+ New Query"</b> at the top.</li>
                    </ol>
                  </div>
                  <div className="space-y-4">
                    <h5 className="font-black text-xs uppercase text-slate-900 border-l-4 border-green-600 pl-3">Step 2: Run this script</h5>
                    <p className="text-[10px] text-slate-500 font-bold italic">Copy the code below, paste it into the new query window, and click "Run".</p>
                  </div>
                </div>

                <div className="relative">
                  <pre className="bg-white p-6 rounded-2xl border-2 border-red-100 font-mono text-[10px] text-red-900 overflow-x-auto shadow-inner select-all leading-relaxed whitespace-pre-wrap max-h-96 custom-scrollbar">
{`-- PASTE THIS ONLY IN THE "SQL EDITOR" --
-- NOT THE POLICY CREATION DIALOG --

-- 1. ENABLE RLS
ALTER TABLE IF EXISTS "rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "guests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "settings" ENABLE ROW LEVEL SECURITY;

-- 2. CREATE POLICIES (Fixes 42501)
DROP POLICY IF EXISTS "Allow Public" ON "rooms";
DROP POLICY IF EXISTS "Allow Public" ON "guests";
DROP POLICY IF EXISTS "Allow Public" ON "bookings";
DROP POLICY IF EXISTS "Allow Public" ON "transactions";
DROP POLICY IF EXISTS "Allow Public" ON "groups";
DROP POLICY IF EXISTS "Allow Public" ON "settings";

CREATE POLICY "Allow Public" ON "rooms" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "guests" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "bookings" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "transactions" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "groups" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public" ON "settings" FOR ALL USING (true) WITH CHECK (true);

-- 3. REFRESH
NOTIFY pgrst, 'reload schema';`}
                  </pre>
                </div>
             </div>

             <div className="p-4 md:p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] space-y-6">
                <p className="text-xs text-black font-black uppercase">Database Maintenance (Add Columns)</p>
                <div className="relative">
                  <pre className="bg-white p-6 rounded-2xl border font-mono text-[10px] text-blue-900 overflow-x-auto shadow-inner select-all leading-relaxed whitespace-pre-wrap max-h-40 custom-scrollbar">
{`ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "adults" INTEGER DEFAULT 2;
ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "totalPax" INTEGER DEFAULT 2;
ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "extraOccupants" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS "settings" ADD COLUMN IF NOT EXISTS "superadminPassword" TEXT;
ALTER TABLE IF EXISTS "settings" ADD COLUMN IF NOT EXISTS "receptionistPassword" TEXT;
NOTIFY pgrst, 'reload schema';`}
                  </pre>
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
    <label className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 ml-2 tracking-tight">{label}</label>
    <input type={type} className="w-full border-2 p-3.5 md:p-4 rounded-2xl font-black text-[12px] bg-gray-50 focus:bg-white focus:border-blue-500 shadow-inner text-black transition-all outline-none" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

export default Settings;
