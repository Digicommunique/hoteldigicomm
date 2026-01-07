
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Guest, Booking, Quotation, AccountGroupName } from '../types';

interface AccountingProps {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  guests: Guest[];
  bookings: Booking[];
  quotations: Quotation[];
  setQuotations: (quotations: Quotation[]) => void;
  settings: any;
}

const Accounting: React.FC<AccountingProps> = ({ transactions, setTransactions, guests, bookings, quotations, setQuotations, settings }) => {
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'LEDGER' | 'CASHBOOK' | 'BS' | 'PL'>('ENTRY');
  const [type, setType] = useState<TransactionType>('RECEIPT');
  const [amount, setAmount] = useState('');
  const [ledger, setLedger] = useState('Cash Account');
  const [group, setGroup] = useState<AccountGroupName>('Operating');
  const [desc, setDesc] = useState('');
  const [targetGuest, setTargetGuest] = useState('');
  const [selectedLedger, setSelectedLedger] = useState('Cash Account');
  
  // Date Filtering States
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const ACCOUNT_GROUPS: AccountGroupName[] = [
    'Capital', 'Fixed Asset', 'Current Asset', 'Direct Expense', 'Indirect Expense', 
    'Direct Income', 'Indirect Income', 'Current Liability', 'Operating'
  ];

  const ledgers = useMemo(() => Array.from(new Set(transactions.map(t => t.ledger))), [transactions]);

  const handleEntry = () => {
    if (!amount || !ledger) return alert("Please fill Amount and Ledger.");
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      type, 
      amount: parseFloat(amount) || 0, 
      ledger, 
      description: desc,
      accountGroup: group,
      entityName: targetGuest || 'Cash/General'
    };
    setTransactions([...transactions, newTx]);
    setAmount(''); setDesc(''); setTargetGuest('');
    alert(`Entry posted.`);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
  }, [transactions, startDate, endDate]);

  const calculatePL = useMemo(() => {
    const income = filteredTransactions.filter(t => t.accountGroup.includes('Income')).reduce((s,t) => s + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.accountGroup.includes('Expense')).reduce((s,t) => s + t.amount, 0);
    return { income, expense, profit: income - expense };
  }, [filteredTransactions]);

  const calculateBS = useMemo(() => {
    const assets = filteredTransactions.filter(t => t.accountGroup.includes('Asset')).reduce((s,t) => s + (t.type === 'RECEIPT' ? t.amount : -t.amount), 0);
    const liabilities = filteredTransactions.filter(t => t.accountGroup === 'Capital' || t.accountGroup === 'Current Liability').reduce((s,t) => s + t.amount, 0);
    return { assets, liabilities };
  }, [filteredTransactions]);

  const ledgerTransactions = useMemo(() => filteredTransactions.filter(t => t.ledger === selectedLedger), [filteredTransactions, selectedLedger]);
  const cashbookTransactions = useMemo(() => filteredTransactions.filter(t => t.ledger.toLowerCase().includes('cash')), [filteredTransactions]);

  return (
    <div className="p-4 md:p-6 bg-[#f8fafc] h-full flex flex-col gap-4 md:gap-6 text-black">
      <div className="flex gap-2 border-b pb-2 overflow-x-auto no-print scrollbar-hide whitespace-nowrap">
        <Tab active={activeTab === 'ENTRY'} onClick={() => setActiveTab('ENTRY')}>New Voucher</Tab>
        <Tab active={activeTab === 'LEDGER'} onClick={() => setActiveTab('LEDGER')}>Ledger</Tab>
        <Tab active={activeTab === 'CASHBOOK'} onClick={() => setActiveTab('CASHBOOK')}>Cashbook</Tab>
        <Tab active={activeTab === 'BS'} onClick={() => setActiveTab('BS')}>B/Sheet</Tab>
        <Tab active={activeTab === 'PL'} onClick={() => setActiveTab('PL')}>P&L</Tab>
      </div>

      <div className="flex-1 bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border p-4 md:p-12 overflow-y-auto custom-scrollbar">
        
        {activeTab !== 'ENTRY' && (
          <div className="mb-6 md:mb-10 p-4 md:p-6 bg-slate-900 rounded-xl md:rounded-[2rem] flex flex-col md:flex-row items-center justify-between no-print shadow-xl gap-4">
             <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                   <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest text-center md:text-left">Start Date</label>
                   <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-[#333] text-white border-none p-3 rounded-xl text-[12px] font-black outline-none w-full md:w-44" style={{ colorScheme: 'dark' }} />
                </div>
                <div className="flex flex-col gap-1 w-full md:w-auto">
                   <label className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest text-center md:text-left">End Date</label>
                   <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-[#333] text-white border-none p-3 rounded-xl text-[12px] font-black outline-none w-full md:w-44" style={{ colorScheme: 'dark' }} />
                </div>
             </div>
             <div className="text-center md:text-right hidden md:block">
                <p className="text-[9px] font-black uppercase text-blue-400 mb-1">Financial Data Period</p>
                <p className="text-xs font-black text-white">{startDate} — {endDate}</p>
             </div>
          </div>
        )}

        {activeTab === 'ENTRY' && (
          <div className="max-w-3xl space-y-6 md:space-y-8 animate-in fade-in duration-300">
             <div className="border-l-4 md:border-l-8 border-blue-900 pl-4 md:pl-6">
               <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tighter leading-none">Voucher Entry</h2>
               <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit-Ready Posting</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <Field label="Voucher Type">
                   <select className="w-full border-2 p-3.5 md:p-4 rounded-xl md:rounded-2xl font-black text-xs bg-gray-50 text-black" value={type} onChange={e => setType(e.target.value as any)}>
                      <option value="RECEIPT">RECEIPT (Cash In)</option>
                      <option value="PAYMENT">PAYMENT (Cash Out)</option>
                      <option value="JOURNAL">JOURNAL (Adj)</option>
                   </select>
                </Field>
                <Field label="Group">
                   <select className="w-full border-2 p-3.5 md:p-4 rounded-xl md:rounded-2xl font-black text-xs bg-gray-50 text-black" value={group} onChange={e => setGroup(e.target.value as any)}>
                      {ACCOUNT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </Field>
                <Field label="Entity Name">
                   <input className="w-full border-2 p-3.5 md:p-4 rounded-xl md:rounded-2xl font-black text-xs bg-gray-50 text-black" value={targetGuest} onChange={e => setTargetGuest(e.target.value)} placeholder="Name..." />
                </Field>
                <Field label="Ledger Account">
                   <input className="w-full border-2 p-3.5 md:p-4 rounded-xl md:rounded-2xl font-black text-xs bg-gray-50 text-black" value={ledger} onChange={e => setLedger(e.target.value)} placeholder="Cash/Bank..." />
                </Field>
                <Field label="Amount (₹)">
                   <input type="number" className="w-full border-2 p-3.5 md:p-4 rounded-xl md:rounded-2xl font-black text-xs bg-gray-50 text-black" value={amount} onChange={e => setAmount(e.target.value)} />
                </Field>
                <div className="md:col-span-2">
                   <Field label="Narration">
                      <textarea className="w-full border-2 p-3.5 md:p-4 rounded-xl md:rounded-2xl font-black text-xs bg-gray-50 h-20 md:h-24 text-black resize-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Details..."></textarea>
                   </Field>
                </div>
             </div>
             <button onClick={handleEntry} className="w-full md:w-auto bg-blue-900 text-white font-black px-12 py-4 md:py-5 rounded-2xl text-xs uppercase shadow-2xl hover:bg-black transition-all tracking-widest">Post Record</button>
          </div>
        )}

        {(activeTab === 'LEDGER' || activeTab === 'CASHBOOK') && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 md:border-b-8 border-blue-900 pb-4 md:pb-6 gap-4">
                <div>
                   <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tighter">{activeTab} Register</h2>
                   {activeTab === 'LEDGER' && (
                      <select className="mt-2 border-2 p-2 rounded-xl font-black text-[10px] uppercase bg-gray-50" value={selectedLedger} onChange={e => setSelectedLedger(e.target.value)}>
                        {ledgers.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                   )}
                </div>
                <div className="flex gap-2 w-full md:w-auto no-print">
                   <button onClick={() => window.print()} className="flex-1 md:flex-none bg-blue-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">Print</button>
                </div>
             </div>
             <div className="border rounded-2xl md:rounded-[2.5rem] overflow-x-auto shadow-sm">
                <table className="w-full text-[10px] md:text-[11px] text-left min-w-[600px]">
                   <thead className="bg-slate-900 text-white uppercase font-black">
                      <tr><th className="p-4 md:p-6">Date</th><th className="p-4 md:p-6">Description</th><th className="p-4 md:p-6 text-right">In (₹)</th><th className="p-4 md:p-6 text-right">Out (₹)</th></tr>
                   </thead>
                   <tbody className="text-black font-bold uppercase divide-y">
                      {(activeTab === 'LEDGER' ? ledgerTransactions : cashbookTransactions).map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                           <td className="p-4 md:p-6">{t.date}</td>
                           <td className="p-4 md:p-6 truncate max-w-[200px] md:max-w-none">{t.description}</td>
                           <td className="p-4 md:p-6 text-right text-green-600">{t.type === 'RECEIPT' ? t.amount.toFixed(2) : '-'}</td>
                           <td className="p-4 md:p-6 text-right text-red-600">{t.type === 'PAYMENT' ? t.amount.toFixed(2) : '-'}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'PL' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="border-b-4 md:border-b-8 border-blue-900 pb-4 md:pb-6">
                <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tighter">Profit & Loss</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">
                   <h3 className="font-black text-green-700 uppercase text-[10px] tracking-widest border-b pb-2">Incomes</h3>
                   <div className="space-y-2">
                      {filteredTransactions.filter(t => t.accountGroup.includes('Income')).map(t => (
                        <div key={t.id} className="flex justify-between font-bold text-[11px]"><span>{t.ledger}</span><span>₹{t.amount.toFixed(2)}</span></div>
                      ))}
                   </div>
                   <div className="border-t-2 pt-4 flex justify-between font-black text-sm"><span>GROSS</span><span>₹{calculatePL.income.toFixed(2)}</span></div>
                </div>
                <div className="space-y-4">
                   <h3 className="font-black text-red-600 uppercase text-[10px] tracking-widest border-b pb-2">Expenses</h3>
                   <div className="space-y-2">
                      {filteredTransactions.filter(t => t.accountGroup.includes('Expense')).map(t => (
                        <div key={t.id} className="flex justify-between font-bold text-[11px]"><span>{t.ledger}</span><span>₹{t.amount.toFixed(2)}</span></div>
                      ))}
                   </div>
                   <div className="border-t-2 pt-4 flex justify-between font-black text-sm"><span>GROSS</span><span>₹{calculatePL.expense.toFixed(2)}</span></div>
                </div>
             </div>
             <div className={`p-6 md:p-10 rounded-2xl md:rounded-[3rem] text-center border-2 md:border-4 ${calculatePL.profit >= 0 ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-2">Net Balance</p>
                <p className="text-2xl md:text-5xl font-black tracking-tighter">₹{Math.abs(calculatePL.profit).toFixed(2)} {calculatePL.profit >= 0 ? 'PROFIT' : 'LOSS'}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Tab: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-4 md:px-8 py-2 md:py-3 rounded-full font-black text-[9px] md:text-[11px] uppercase tracking-widest border-2 transition-all shadow-sm ${active ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-black opacity-40 border-gray-100 hover:border-blue-200'}`}>{children}</button>
);

const Field: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5 w-full">
     <label className="text-[9px] md:text-[10px] font-black uppercase text-black opacity-40 ml-1">{label}</label>
     {children}
  </div>
);

export default Accounting;
