

import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Expense } from '../../types';
import { Plus, Trash2, X, PieChart as PieIcon, DollarSign, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#C0392B', '#224C3B', '#E67E22', '#8E44AD', '#34495E', '#95A5A6'];

export const Expenses: React.FC = () => {
  const { expenses, addExpense, deleteExpense, expenseCategories, addExpenseCategory, removeExpenseCategory, currentBranchId, settings } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  
  // Form Data
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCategory, setNewCategory] = useState('');

  // Filter Logic
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const filteredExpenses = expenses.filter(e => e.date.toISOString().startsWith(monthFilter));
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Chart Data
  const expensesByCat = filteredExpenses.reduce((acc: any, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const chartData = Object.keys(expensesByCat).map(key => ({ name: key, value: expensesByCat[key] }));

  const handleSave = () => {
    if (!description || !amount || !category) return;
    addExpense({
      id: `exp-${Date.now()}`,
      branchId: currentBranchId,
      description,
      amount: Number(amount),
      category,
      date: new Date(date)
    });
    setIsModalOpen(false);
    setDescription('');
    setAmount('');
    setCategory('');
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addExpenseCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20">
       <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Gastos Operativos</h1>
          <p className="text-stone-500">Registro de salidas no inventariables</p>
        </div>
        <div className="flex gap-3">
           <input 
             type="month" 
             value={monthFilter} 
             onChange={e => setMonthFilter(e.target.value)}
             className="bg-white border border-[var(--fr-line)] rounded-xl px-3 py-2 font-bold text-stone-600 focus:outline-none"
           />
           <button onClick={() => setIsModalOpen(true)} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-[#1a3b2e] shadow-lg uppercase tracking-wider">
             <Plus size={16} /> Registrar Gasto
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         {/* Summary Card */}
         <div className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm flex flex-col justify-center">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Total Gastos ({monthFilter})</div>
            <div className="text-4xl font-bold text-[var(--fr-red)] font-serif mb-2">{settings.currencySymbol}{totalExpenses.toFixed(2)}</div>
            <div className="text-xs text-stone-400">{filteredExpenses.length} registros en el periodo</div>
         </div>

         {/* Chart */}
         <div className="lg:col-span-2 bg-[var(--fr-card)] p-4 rounded-2xl border border-[var(--fr-line)] shadow-sm h-64">
            <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie
                     data={chartData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                  >
                     {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${settings.currencySymbol}${value.toFixed(2)}`} />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
               </PieChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* List */}
      <div className="bg-[var(--fr-card)] rounded-2xl border border-[var(--fr-line)] overflow-hidden shadow-sm">
         <table className="w-full text-left text-sm">
            <thead className="bg-[var(--fr-bg)] text-stone-500 font-bold border-b border-[var(--fr-line)]">
               <tr>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Descripción</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4 w-10"></th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fr-line)]">
               {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-white transition">
                     <td className="p-4 font-mono text-stone-500">{new Date(exp.date).toLocaleDateString()}</td>
                     <td className="p-4 font-bold text-[var(--fr-text)]">{exp.description}</td>
                     <td className="p-4"><span className="bg-[var(--fr-bg)] px-2 py-1 rounded text-xs font-bold text-stone-600 border border-[var(--fr-line)]">{exp.category}</span></td>
                     <td className="p-4 text-right font-bold font-serif text-[var(--fr-red)]">{settings.currencySymbol}{exp.amount.toFixed(2)}</td>
                     <td className="p-4 text-center">
                        <button onClick={() => deleteExpense(exp.id)} className="text-stone-400 hover:text-red-600 transition"><Trash2 size={16}/></button>
                     </td>
                  </tr>
               ))}
               {filteredExpenses.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-stone-400 italic">No hay gastos en este mes</td></tr>
               )}
            </tbody>
         </table>
      </div>

      {/* New Expense Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-[#1a3b2e]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[var(--fr-line)]">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[var(--fr-green)] font-serif">Registrar Gasto</h2>
                  <button onClick={() => setIsModalOpen(false)} className="hover:bg-[var(--fr-bg)] p-1 rounded-full"><X size={20}/></button>
               </div>

               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-stone-500 mb-1">Descripción</label>
                     <input autoFocus value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-white border border-[var(--fr-line)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--fr-green)]" placeholder="Ej. Pago Luz Marzo" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Monto</label>
                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 bg-white border border-[var(--fr-line)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--fr-green)]" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Fecha</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-white border border-[var(--fr-line)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--fr-green)]" />
                     </div>
                  </div>
                  <div>
                     <div className="flex justify-between mb-1">
                        <label className="block text-xs font-bold text-stone-500">Categoría</label>
                        <button onClick={() => setIsCatManagerOpen(!isCatManagerOpen)} className="text-xs text-[var(--fr-green)] font-bold hover:underline">Gestionar Categorías</button>
                     </div>
                     
                     {isCatManagerOpen ? (
                        <div className="bg-[var(--fr-bg)] p-3 rounded-lg border border-[var(--fr-line)] mb-2 animate-in fade-in slide-in-from-top-2">
                           <div className="flex flex-wrap gap-2 mb-2">
                              {expenseCategories.map(c => (
                                 <span key={c} className="bg-white text-xs px-2 py-1 rounded border flex items-center gap-1">
                                    {c} <button onClick={() => removeExpenseCategory(c)}><X size={10}/></button>
                                 </span>
                              ))}
                           </div>
                           <div className="flex gap-2">
                              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-1 text-xs rounded border outline-none" placeholder="Nueva..." />
                              <button onClick={handleAddCategory} className="bg-stone-800 text-white px-2 rounded text-xs font-bold"><Plus size={12}/></button>
                           </div>
                        </div>
                     ) : (
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 bg-white border border-[var(--fr-line)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--fr-green)]">
                           <option value="">Seleccionar...</option>
                           {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     )}
                  </div>
               </div>

               <div className="mt-8 flex justify-end gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-stone-500 font-bold hover:bg-[var(--fr-bg)] rounded-lg">Cancelar</button>
                  <button onClick={handleSave} className="px-6 py-2 bg-[var(--fr-green)] text-white font-bold rounded-lg hover:bg-[#1a3b2e] shadow-lg uppercase tracking-wider text-sm">Guardar</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};