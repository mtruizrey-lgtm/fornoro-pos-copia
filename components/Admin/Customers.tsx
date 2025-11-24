
import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Customer } from '../../types';
import { Search, UserPlus, Gift, History } from 'lucide-react';

export const Customers: React.FC = () => {
  const { customers, addCustomer } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({
      id: `c-${Date.now()}`,
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email,
      points: 0,
      visitCount: 0,
    });
    setShowAddModal(false);
    setNewCustomer({ name: '', phone: '', email: '' });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Clientes & Fidelidad</h1>
          <p className="text-stone-500">Gestiona puntos y recompensas</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-[#1a3b2e] shadow-lg uppercase tracking-wider">
          <UserPlus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-yellow-600 to-amber-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><Gift size={20}/></div>
            <span className="font-medium opacity-90 text-sm uppercase tracking-wider">Puntos Circulantes</span>
          </div>
          <div className="text-4xl font-bold font-serif">{customers.reduce((acc, c) => acc + c.points, 0)}</div>
        </div>
        <div className="bg-[var(--fr-card)] border border-[var(--fr-line)] rounded-2xl p-6 shadow-sm">
          <div className="text-stone-500 text-xs font-bold uppercase tracking-widest">Clientes Registrados</div>
          <div className="text-3xl font-bold text-[var(--fr-text)] mt-2 font-serif">{customers.length}</div>
        </div>
        <div className="bg-[var(--fr-card)] border border-[var(--fr-line)] rounded-2xl p-6 shadow-sm">
           <div className="text-stone-500 text-xs font-bold uppercase tracking-widest">Canje: $10 de compra</div>
           <div className="text-3xl font-bold text-[var(--fr-green)] mt-2 font-serif">= 1 Punto</div>
        </div>
      </div>

      <div className="bg-[var(--fr-card)] rounded-2xl shadow-sm border border-[var(--fr-line)] overflow-hidden">
        <div className="p-4 border-b border-[var(--fr-line)]">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--fr-line)] focus:outline-none focus:ring-2 focus:ring-[var(--fr-green)] bg-white"
            />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--fr-bg)] text-stone-500 font-bold border-b border-[var(--fr-line)]">
            <tr>
              <th className="p-4">Cliente</th>
              <th className="p-4">Contacto</th>
              <th className="p-4">Visitas</th>
              <th className="p-4">Puntos Actuales</th>
              <th className="p-4 text-right">Última Visita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--fr-line)]">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-white transition">
                <td className="p-4">
                  <div className="font-bold text-[var(--fr-text)]">{c.name}</div>
                  <div className="text-xs text-stone-400">ID: {c.id.slice(-6)}</div>
                </td>
                <td className="p-4 text-stone-600">
                  <div>{c.phone}</div>
                  <div className="text-xs opacity-70">{c.email || '-'}</div>
                </td>
                <td className="p-4 font-mono">{c.visitCount}</td>
                <td className="p-4">
                  <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold text-xs border border-amber-200">
                    {c.points} pts
                  </span>
                </td>
                <td className="p-4 text-right text-stone-500 font-mono">
                  {c.lastVisit ? c.lastVisit.toLocaleDateString() : 'Nunca'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
               <tr><td colSpan={5} className="p-8 text-center text-stone-400 italic">No se encontraron clientes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1a3b2e]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleAdd} className="bg-[var(--fr-card)] rounded-2xl w-full max-w-md p-6 border border-[var(--fr-line)] shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-[var(--fr-green)] font-serif">Nuevo Cliente</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-1">Nombre Completo</label>
                <input required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded-lg bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-1">Teléfono</label>
                <input required value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded-lg bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-1">Email (Opcional)</label>
                <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded-lg bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-[var(--fr-line)] rounded-lg hover:bg-[var(--fr-bg)] text-stone-600 font-bold">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-[var(--fr-green)] text-white rounded-lg hover:bg-[#1a3b2e] font-bold uppercase tracking-wider text-sm">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};