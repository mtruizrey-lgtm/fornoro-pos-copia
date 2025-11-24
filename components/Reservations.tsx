

import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Reservation, ReservationStatus } from '../types';
import { Calendar as CalendarIcon, Clock, Users, Plus, XCircle, CheckCircle, MessageCircle, Copy } from 'lucide-react';

export const Reservations: React.FC = () => {
  const { reservations, tables, addReservation, updateReservation, settings, currentBranchId } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  
  // WA Config
  const [waPhone, setWaPhone] = useState(settings.phone);
  const [waMessage, setWaMessage] = useState(`Hola ${settings.storeName}, quisiera hacer una reserva para...`);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    date: '',
    time: '',
    pax: 2,
    tableId: ''
  });
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const upcomingReservations = reservations
    .filter(r => r.branchId === currentBranchId && new Date(r.date) >= now && new Date(r.date) <= thirtyDaysFromNow)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.time) {
        alert("Por favor selecciona fecha y hora.");
        return;
    }

    // Robust Date Construction for Mobile compatibility
    try {
        const dateTimeString = `${formData.date}T${formData.time}`;
        const dateTime = new Date(dateTimeString);
        
        if (isNaN(dateTime.getTime())) {
            alert("Error: La fecha u hora seleccionada no es válida en este dispositivo.");
            return;
        }

        addReservation({
          id: `res-${Date.now()}`,
          branchId: currentBranchId,
          customerName: formData.customerName,
          phone: formData.phone,
          date: dateTime,
          pax: Number(formData.pax),
          tableId: formData.tableId || undefined,
          status: ReservationStatus.CONFIRMED
        });
        
        alert("¡Reserva creada exitosamente!");
        setShowModal(false);
        setFormData({ customerName: '', phone: '', date: '', time: '', pax: 2, tableId: '' });

    } catch (error) {
        console.error(error);
        alert("Ocurrió un error al procesar la fecha. Intenta nuevamente.");
    }
  };

  const getStatusColor = (status: ReservationStatus) => {
    switch(status) {
      case ReservationStatus.CONFIRMED: return 'bg-blue-50 text-blue-700 border-blue-200';
      case ReservationStatus.SEATED: return 'bg-green-50 text-green-700 border-green-200';
      case ReservationStatus.CANCELLED: return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-stone-50 text-stone-600';
    }
  };

  const generateWaLink = () => {
      const num = waPhone.replace(/\D/g, '');
      const text = encodeURIComponent(waMessage);
      return `https://wa.me/${num}?text=${text}`;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
       <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Reservas de Mesas</h1>
          <p className="text-stone-500">Próximos 30 días</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowWaModal(true)} className="bg-white border border-green-500 text-green-600 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-green-50 shadow-sm">
                <MessageCircle size={16} /> Link WhatsApp
            </button>
            <button onClick={() => setShowModal(true)} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-[#1a3b2e] shadow-lg uppercase tracking-wider">
                <Plus size={16} /> Nueva Reserva
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List View */}
        <div className="lg:col-span-2 space-y-4">
          {upcomingReservations.length === 0 ? (
             <div className="bg-[var(--fr-card)] p-12 text-center rounded-2xl text-stone-400 border border-dashed border-[var(--fr-line)]">
                <CalendarIcon className="mx-auto mb-2 opacity-50" size={48} />
                <p className="font-serif italic">No hay reservas próximas</p>
             </div>
          ) : (
            upcomingReservations.map(res => (
              <div key={res.id} className="bg-[var(--fr-card)] p-4 rounded-xl shadow-sm border border-[var(--fr-line)] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className="bg-[var(--fr-bg)] p-3 rounded-lg text-center min-w-[80px] border border-[var(--fr-line)]">
                    <div className="text-xs font-bold text-[var(--fr-red)] uppercase tracking-wider">{new Date(res.date).toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                    <div className="text-2xl font-bold text-[var(--fr-text)] font-serif">{new Date(res.date).getDate()}</div>
                    <div className="text-xs text-stone-500 font-mono">{new Date(res.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--fr-text)] font-serif">{res.customerName}</h3>
                    <div className="flex items-center gap-3 text-sm text-stone-600 mt-1">
                      <span className="flex items-center gap-1 font-bold"><Users size={14}/> {res.pax} pax</span>
                      <span className="flex items-center gap-1 italic text-stone-400">
                        {tables.find(t => t.id === res.tableId)?.name || 'Mesa por asignar'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-400 mt-1">{res.phone}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(res.status)}`}>
                    {res.status}
                  </span>
                  {res.status === ReservationStatus.CONFIRMED && (
                    <div className="flex gap-1">
                      <button 
                        onClick={() => updateReservation(res.id, { status: ReservationStatus.SEATED })}
                        title="Marcar como sentado"
                        className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition"
                      >
                        <CheckCircle size={20}/>
                      </button>
                      <button 
                        onClick={() => updateReservation(res.id, { status: ReservationStatus.CANCELLED })}
                        title="Cancelar"
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                      >
                        <XCircle size={20}/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Simple Info Sidebar */}
        <div className="bg-[var(--fr-card)] p-6 rounded-2xl h-fit border border-[var(--fr-line)] shadow-sm">
           <h3 className="font-bold text-[var(--fr-green)] mb-4 font-serif text-lg">Resumen</h3>
           <div className="space-y-3">
              <div className="flex justify-between text-sm text-stone-600">
                <span>Reservas (30 días)</span>
                <span className="font-bold text-[var(--fr-text)]">{upcomingReservations.length}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-600">
                <span>Pax Esperados</span>
                <span className="font-bold text-[var(--fr-text)]">{upcomingReservations.reduce((acc, r) => acc + r.pax, 0)}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1a3b2e]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="bg-[var(--fr-card)] rounded-2xl w-full max-w-md p-6 border border-[var(--fr-line)] shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-[var(--fr-green)] font-serif">Nueva Reserva</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-1">Cliente</label>
                <input required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded-lg bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-1">Teléfono</label>
                <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded-lg bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-600 mb-1">Fecha</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded-lg bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-600 mb-1">Hora</label>
                  <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded-lg bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-bold text-stone-600 mb-1">Personas</label>
                  <input type="number" min="1" required value={formData.pax} onChange={e => setFormData({...formData, pax: Number(e.target.value)})} className="w-full p-2 border border-[var(--fr-line)] rounded-lg bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-600 mb-1">Mesa (Opcional)</label>
                  <select value={formData.tableId} onChange={e => setFormData({...formData, tableId: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded-lg bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none">
                    <option value="">Asignar al llegar</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.capacity}p)</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-[var(--fr-line)] rounded-lg hover:bg-[var(--fr-bg)] text-stone-500 font-bold">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-[var(--fr-green)] text-white rounded-lg hover:bg-[#1a3b2e] font-bold uppercase tracking-wider text-sm">Crear Reserva</button>
            </div>
          </form>
        </div>
      )}

      {/* WhatsApp Config Modal */}
      {showWaModal && (
          <div className="fixed inset-0 bg-[#1a3b2e]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-md p-8 border border-[var(--fr-line)] shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-[var(--fr-green)] font-serif flex items-center gap-2">
                    <MessageCircle /> Link de Reservas
                </h2>
                <p className="text-sm text-stone-500 mb-6">Configura un enlace para que tus clientes te escriban directamente por WhatsApp pidiendo mesa.</p>
                
                <div className="space-y-4">
                   <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">Teléfono del Restaurante</label>
                      <input value={waPhone} onChange={e => setWaPhone(e.target.value)} className="w-full p-2 border rounded bg-white" placeholder="50212345678" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">Mensaje Predeterminado</label>
                      <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)} className="w-full p-2 border rounded bg-white h-24 text-sm" />
                   </div>
                </div>

                <div className="mt-6 bg-green-50 p-3 rounded-lg border border-green-200 break-all text-xs font-mono text-green-800">
                   {generateWaLink()}
                </div>

                <div className="flex gap-3 mt-6">
                   <button onClick={() => setShowWaModal(false)} className="flex-1 py-2 text-stone-500 font-bold hover:bg-[var(--fr-bg)] rounded-lg">Cerrar</button>
                   <a href={generateWaLink()} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700">
                      Probar Link
                   </a>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};
