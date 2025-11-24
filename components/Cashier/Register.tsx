



import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { PaymentMethod, OrderStatus, CashRegisterSession } from '../../types';
import { Archive, DollarSign, AlertTriangle, Lock, CheckCircle, CreditCard, Globe, Clock, Receipt, Printer, History, MessageCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const { 
     getCurrentSession, getLastSession, openRegister, closeRegister, 
     orders, settings, currentBranchId, reprintOrder, cashSessions, printShiftReport, users, branches
  } = useApp();

  const activeSession = getCurrentSession();
  const lastSession = getLastSession();
  
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current');

  // --- STATE ---
  // Opening
  const [openAmount, setOpenAmount] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  
  // Closing
  const [closeAmount, setCloseAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  // --- CALCULATIONS ---
  // Get relevant orders for this shift
  const sessionOrders = activeSession ? orders.filter(o => 
     o.branchId === currentBranchId && 
     o.status === OrderStatus.PAID && 
     o.closedAt && new Date(o.closedAt) > new Date(activeSession.openedAt)
  ).sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime()) : [];

  const calculateShiftSales = () => {
     if (!activeSession) return { cash: 0, card: 0, other: 0, total: 0 };
     
     const totals = { cash: 0, card: 0, other: 0, total: 0 };
     
     sessionOrders.forEach(o => {
        o.paymentMethods?.forEach(pm => {
           if (pm.method === PaymentMethod.CASH) totals.cash += pm.amount;
           else if (pm.method === PaymentMethod.CARD) totals.card += pm.amount;
           else totals.other += pm.amount;
        });
        totals.total += o.total; 
     });
     return totals;
  };

  const shiftStats = calculateShiftSales();
  const expectedCashInDrawer = activeSession ? (activeSession.startingCashActual + shiftStats.cash) : 0;
  const difference = activeSession ? (Number(closeAmount) - expectedCashInDrawer) : 0;

  const handleOpen = () => {
     if (!openAmount) return;
     if (lastSession && Number(openAmount) !== lastSession.endingCashActual && !openNotes) {
        alert("Debes justificar la diferencia con el cierre anterior.");
        return;
     }
     openRegister(Number(openAmount), openNotes);
  };

  const handleClose = () => {
     if (!closeAmount) return;
     closeRegister(Number(closeAmount), closeNotes);
     setConfirmClose(false);
     setCloseAmount('');
     setCloseNotes('');
     // Auto-print report on close
     if(activeSession) setTimeout(() => printShiftReport(activeSession.id), 500);
  };

  const handleWhatsAppShare = (session: CashRegisterSession) => {
      const branchName = branches.find(b => b.id === session.branchId)?.name || 'Sucursal';
      const userName = users.find(u => u.id === session.userId)?.name || 'N/A';
      
      // Recalculate stats for this session
      const sOrders = orders.filter(o => 
          o.branchId === currentBranchId && 
          o.status === OrderStatus.PAID && 
          o.closedAt && new Date(o.closedAt) > new Date(session.openedAt) && 
          (session.closedAt ? new Date(o.closedAt) <= new Date(session.closedAt) : true)
      );
      
      const stats = { cash: 0, card: 0, other: 0, total: 0 };
      sOrders.forEach(o => {
          o.paymentMethods?.forEach(pm => {
              if (pm.method === PaymentMethod.CASH) stats.cash += pm.amount;
              else if (pm.method === PaymentMethod.CARD) stats.card += pm.amount;
              else stats.other += pm.amount;
          });
          stats.total += o.total;
      });
      
      const expected = session.startingCashActual + stats.cash;
      const actual = session.endingCashActual || 0;
      const diff = actual - expected;
      const cur = settings.currencySymbol;

      const text = `
📊 *REPORTE DE CIERRE* - ${new Date(session.closedAt || new Date()).toLocaleDateString()}
📍 ${branchName}
👤 ${userName}

*VENTAS*
💵 Efectivo: ${cur}${stats.cash.toFixed(2)}
💳 Tarjeta: ${cur}${stats.card.toFixed(2)}
📱 Apps: ${cur}${stats.other.toFixed(2)}
💰 *TOTAL: ${cur}${stats.total.toFixed(2)}*

*ARQUEO DE CAJA*
🔹 Fondo Inicial: ${cur}${session.startingCashActual.toFixed(2)}
🔹 Sistema (Efvo): ${cur}${expected.toFixed(2)}
🔹 Real (Conteo): ${cur}${actual.toFixed(2)}
⚠️ *Diferencia: ${diff > 0 ? '+' : ''}${cur}${diff.toFixed(2)}*

📝 Notas: ${session.endingNotes || 'Ninguna'}
      `.trim();

      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };
  
  // Filter for History
  const historySessions = cashSessions
     .filter(s => s.branchId === currentBranchId && s.status === 'CLOSED')
     .sort((a, b) => (b.closedAt?.getTime() || 0) - (a.closedAt?.getTime() || 0));

  // --- VIEW: OPENING ---
  if (!activeSession && viewMode === 'current') {
     const expectedStart = lastSession?.endingCashActual || 0;
     const isDiscrepancy = openAmount !== '' && Number(openAmount) !== expectedStart;

     return (
        <div className="flex items-center justify-center h-full p-8 bg-[var(--fr-bg)]">
           <div className="w-full max-w-lg bg-[var(--fr-card)] rounded-3xl shadow-2xl border border-[var(--fr-line)] p-10 relative">
              <div className="absolute top-4 right-4">
                 <button onClick={() => setViewMode('history')} className="text-stone-400 hover:text-[var(--fr-green)] flex items-center gap-1 text-xs font-bold uppercase">
                    <History size={14}/> Historial
                 </button>
              </div>
              <div className="text-center mb-8">
                 <div className="w-20 h-20 bg-[var(--fr-green)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg text-white">
                    <Archive size={32} />
                 </div>
                 <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Abrir Caja</h1>
                 <p className="text-stone-500 mt-2">Inicia un nuevo turno operativo</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[var(--fr-line)] mb-6">
                 <div className="flex justify-between items-center text-sm text-stone-600 mb-1">
                    <span>Saldo Cierre Anterior:</span>
                    <span className="font-bold font-mono text-lg">{settings.currencySymbol}{expectedStart.toFixed(2)}</span>
                 </div>
                 {lastSession && (
                    <div className="text-[10px] text-stone-400 text-right">
                       {new Date(lastSession.closedAt!).toLocaleString()}
                    </div>
                 )}
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">Efectivo Real en Caja</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-lg">{settings.currencySymbol}</span>
                       <input 
                          type="number" 
                          value={openAmount} 
                          onChange={e => setOpenAmount(e.target.value)}
                          className="w-full pl-10 pr-4 py-4 text-2xl font-bold rounded-xl border-2 border-[var(--fr-line)] focus:border-[var(--fr-green)] outline-none text-center bg-white"
                          placeholder="0.00"
                          autoFocus
                       />
                    </div>
                 </div>

                 {isDiscrepancy && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                       <div className="flex items-center gap-2 text-amber-600 text-xs font-bold mb-2">
                          <AlertTriangle size={14} /> Diferencia detectada: {settings.currencySymbol}{(Number(openAmount) - expectedStart).toFixed(2)}
                       </div>
                       <textarea 
                          placeholder="Explique la razón de la diferencia..."
                          value={openNotes}
                          onChange={e => setOpenNotes(e.target.value)}
                          className="w-full p-3 rounded-xl border-2 border-amber-200 bg-amber-50 text-sm focus:outline-none focus:border-amber-400"
                          rows={3}
                       />
                    </div>
                 )}

                 <button 
                    onClick={handleOpen}
                    disabled={!openAmount || (isDiscrepancy && !openNotes)}
                    className="w-full py-4 bg-[var(--fr-green)] text-white font-bold rounded-xl hover:bg-[#1a3b2e] disabled:opacity-50 disabled:hover:bg-[var(--fr-green)] shadow-lg mt-4 flex items-center justify-center gap-2 uppercase tracking-wider text-sm transition"
                 >
                    <CheckCircle size={18} /> Confirmar Apertura
                 </button>
              </div>
           </div>
        </div>
     );
  }

  // --- VIEW: HISTORY ---
  if (viewMode === 'history') {
      return (
          <div className="p-8 max-w-5xl mx-auto pb-24">
             <header className="flex justify-between items-center mb-8">
                 <div>
                    <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Historial de Cierres</h1>
                    <p className="text-stone-500">Registro de turnos pasados</p>
                 </div>
                 <button onClick={() => setViewMode('current')} className="text-sm font-bold text-[var(--fr-green)] hover:underline flex items-center gap-2">
                    ← Volver a Caja Actual
                 </button>
             </header>
             
             <div className="bg-[var(--fr-card)] rounded-2xl border border-[var(--fr-line)] overflow-hidden shadow-sm">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-[var(--fr-bg)] text-stone-500 font-bold border-b border-[var(--fr-line)]">
                         <tr>
                             <th className="p-4">Fecha Cierre</th>
                             <th className="p-4">Apertura</th>
                             <th className="p-4 text-right">Inicio (Efvo)</th>
                             <th className="p-4 text-right">Final (Efvo)</th>
                             <th className="p-4 text-center">Estado</th>
                             <th className="p-4 text-right">Acciones</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-[var(--fr-line)]">
                         {historySessions.map(s => (
                             <tr key={s.id} className="hover:bg-white transition">
                                 <td className="p-4 font-bold text-stone-700">
                                     {new Date(s.closedAt!).toLocaleString()}
                                 </td>
                                 <td className="p-4 text-stone-500 text-xs">
                                     {new Date(s.openedAt).toLocaleString()}
                                 </td>
                                 <td className="p-4 text-right font-mono">
                                     {settings.currencySymbol}{s.startingCashActual.toFixed(2)}
                                 </td>
                                 <td className="p-4 text-right font-mono font-bold">
                                     {settings.currencySymbol}{s.endingCashActual?.toFixed(2)}
                                 </td>
                                 <td className="p-4 text-center">
                                     <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold border border-green-200">CERRADO</span>
                                 </td>
                                 <td className="p-4 text-right flex justify-end gap-2">
                                     <button 
                                        onClick={() => handleWhatsAppShare(s)}
                                        className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 border border-green-200" 
                                        title="Enviar por WhatsApp"
                                     >
                                         <MessageCircle size={16} />
                                     </button>
                                     <button 
                                        onClick={() => printShiftReport(s.id)}
                                        className="p-2 bg-stone-100 text-stone-600 rounded hover:bg-stone-200 border border-stone-200" 
                                        title="Imprimir Reporte"
                                     >
                                         <Printer size={16} />
                                     </button>
                                 </td>
                             </tr>
                         ))}
                         {historySessions.length === 0 && (
                             <tr><td colSpan={6} className="p-8 text-center text-stone-400 italic">No hay historial disponible</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
          </div>
      );
  }

  // --- VIEW: ACTIVE DASHBOARD ---
  if (!confirmClose) {
     return (
        <div className="p-8 max-w-5xl mx-auto pb-24">
           <header className="flex justify-between items-center mb-10">
              <div>
                 <div className="flex items-center gap-3 mb-1">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200 animate-pulse">TURNO ACTIVO</span>
                    <span className="text-xs text-stone-400 font-mono flex items-center gap-1"><Clock size={12}/> Abierto: {new Date(activeSession!.openedAt).toLocaleTimeString()}</span>
                 </div>
                 <h1 className="text-4xl font-bold text-[var(--fr-green)] font-serif">Monitor de Caja</h1>
              </div>
              <div className="flex gap-3">
                  <button onClick={() => setViewMode('history')} className="text-stone-500 hover:text-[var(--fr-green)] font-bold text-sm px-4 py-2">
                    Historial
                  </button>
                  <button 
                     onClick={() => setConfirmClose(true)}
                     className="bg-[var(--fr-red)] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#a32a1e] shadow-lg uppercase tracking-wider text-sm transition transform hover:scale-105"
                  >
                     <Lock size={18} /> Realizar Cierre
                  </button>
              </div>
           </header>

           {/* Main Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[var(--fr-card)] p-6 rounded-2xl shadow-sm border border-[var(--fr-line)] flex flex-col justify-between h-40">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-green-100 text-green-700 rounded-xl"><DollarSign size={24}/></div>
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">En Caja</span>
                 </div>
                 <div>
                    <div className="text-3xl font-bold text-[var(--fr-text)] font-serif">{settings.currencySymbol}{expectedCashInDrawer.toFixed(2)}</div>
                    <p className="text-xs text-stone-500 mt-2">Inicial ({activeSession!.startingCashActual}) + Ventas Efectivo ({shiftStats.cash})</p>
                 </div>
              </div>

              <div className="bg-[var(--fr-card)] p-6 rounded-2xl shadow-sm border border-[var(--fr-line)] flex flex-col justify-between h-40">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-blue-100 text-blue-700 rounded-xl"><CreditCard size={24}/></div>
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Tarjetas</span>
                 </div>
                 <div>
                    <div className="text-3xl font-bold text-[var(--fr-text)] font-serif">{settings.currencySymbol}{shiftStats.card.toFixed(2)}</div>
                    <p className="text-xs text-stone-500 mt-2">Procesado por POS Bancario</p>
                 </div>
              </div>

              <div className="bg-[var(--fr-card)] p-6 rounded-2xl shadow-sm border border-[var(--fr-line)] flex flex-col justify-between h-40">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-xl"><Globe size={24}/></div>
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Plataformas</span>
                 </div>
                 <div>
                    <div className="text-3xl font-bold text-[var(--fr-text)] font-serif">{settings.currencySymbol}{shiftStats.other.toFixed(2)}</div>
                    <p className="text-xs text-stone-500 mt-2">Uber Eats / PedidosYa</p>
                 </div>
              </div>
           </div>
           
           {/* Transaction List */}
           <div className="bg-white rounded-2xl border border-[var(--fr-line)] shadow-sm overflow-hidden">
              <div className="p-4 bg-[var(--fr-bg)] border-b border-[var(--fr-line)] flex justify-between items-center">
                 <h3 className="font-bold text-stone-700 font-serif flex items-center gap-2"><Receipt size={18}/> Transacciones del Turno</h3>
                 <span className="text-xs font-bold text-stone-500 uppercase">{sessionOrders.length} ventas</span>
              </div>
              <table className="w-full text-left text-sm">
                 <thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-100">
                    <tr>
                       <th className="p-3 pl-4">Hora</th>
                       <th className="p-3">Orden #</th>
                       <th className="p-3">Mesa/Tipo</th>
                       <th className="p-3 text-right">Total</th>
                       <th className="p-3">Pago</th>
                       <th className="p-3 text-center">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-100">
                    {sessionOrders.map(order => (
                       <tr key={order.id} className="hover:bg-stone-50 transition">
                          <td className="p-3 pl-4 font-mono text-stone-500">{new Date(order.closedAt!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="p-3 font-bold text-stone-700">#{order.id.slice(-6)}</td>
                          <td className="p-3 text-xs text-stone-600">{order.type === 'DINE_IN' ? 'Mesa' : order.type.replace('DELIVERY_', '')}</td>
                          <td className="p-3 text-right font-bold text-[var(--fr-green)]">{settings.currencySymbol}{order.total.toFixed(2)}</td>
                          <td className="p-3 text-xs">
                             {order.paymentMethods?.map(pm => (
                                <span key={pm.method} className="bg-stone-100 px-2 py-1 rounded mr-1 border border-stone-200">{pm.method}</span>
                             ))}
                          </td>
                          <td className="p-3 text-center">
                             <button 
                                onClick={() => reprintOrder(order.id)}
                                className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition"
                                title="Reimprimir Ticket"
                             >
                                <Printer size={16} />
                             </button>
                          </td>
                       </tr>
                    ))}
                    {sessionOrders.length === 0 && (
                       <tr><td colSpan={6} className="p-8 text-center text-stone-400 italic">Aún no hay ventas en este turno.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>

           {/* Warnings or Info */}
           {activeSession!.startingNotes && (
              <div className="mt-6 bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800 flex items-start gap-3">
                 <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                 <div>
                    <span className="font-bold block mb-1">Nota de Apertura:</span>
                    {activeSession!.startingNotes}
                 </div>
              </div>
           )}
        </div>
     );
  }

  // --- VIEW: CLOSING (ARQUEO) ---
  return (
     <div className="fixed inset-0 z-50 bg-[var(--fr-bg)] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
           <div className="w-full max-w-2xl">
              <button onClick={() => setConfirmClose(false)} className="text-stone-500 hover:text-[var(--fr-text)] mb-6 font-bold text-sm flex items-center gap-2">
                 ← Volver al Monitor
              </button>

              <div className="bg-[var(--fr-card)] rounded-3xl shadow-2xl border-4 border-[var(--fr-line)] overflow-hidden">
                 <div className="p-8 text-center bg-[var(--fr-bg)] border-b border-[var(--fr-line)]">
                    <h2 className="text-3xl font-bold text-[var(--fr-red)] font-serif mb-2">Cierre de Caja</h2>
                    <p className="text-stone-500">Ingrese el conteo final de efectivo</p>
                 </div>

                 <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                       <div className="text-center md:text-left">
                          <div className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-2">Sistema Espera</div>
                          <div className="text-5xl font-bold text-[var(--fr-text)] font-serif">{settings.currencySymbol}{expectedCashInDrawer.toFixed(2)}</div>
                       </div>
                       
                       <div className="space-y-2">
                          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Efectivo Contado</label>
                          <div className="relative">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xl">{settings.currencySymbol}</span>
                             <input 
                                type="number" 
                                value={closeAmount} 
                                onChange={e => setCloseAmount(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 text-3xl font-bold rounded-xl border-2 border-[var(--fr-line)] focus:border-[var(--fr-red)] outline-none bg-white"
                                placeholder="0.00"
                                autoFocus
                             />
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-stone-500 mb-2">Notas del Cierre</label>
                          <textarea 
                             value={closeNotes}
                             onChange={e => setCloseNotes(e.target.value)}
                             className="w-full p-3 rounded-xl border border-[var(--fr-line)] bg-white text-sm focus:outline-none focus:border-stone-400"
                             rows={3}
                             placeholder="Observaciones..."
                          />
                       </div>
                    </div>

                    {/* Summary / Diff */}
                    <div className="bg-[var(--fr-bg)] p-6 rounded-2xl border border-[var(--fr-line)] h-full flex flex-col justify-center">
                       {closeAmount ? (
                          <div className="text-center space-y-6">
                             <div>
                                <div className="text-xs font-bold text-stone-500 uppercase mb-1">Diferencia</div>
                                <div className={`text-4xl font-bold font-serif ${Math.abs(difference) < 0.5 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                   {difference > 0 ? '+' : ''}{settings.currencySymbol}{difference.toFixed(2)}
                                </div>
                                <div className="text-xs font-bold uppercase tracking-widest mt-2 px-3 py-1 rounded-full inline-block bg-white border border-[var(--fr-line)]">
                                   {Math.abs(difference) < 0.5 ? 'Cuadre Perfecto' : difference < 0 ? 'Faltante' : 'Sobrante'}
                                </div>
                             </div>
                             
                             <button 
                                onClick={handleClose}
                                className="w-full py-4 bg-[var(--fr-red)] text-white font-bold rounded-xl hover:bg-[#a32a1e] shadow-lg uppercase tracking-wider text-sm transition transform hover:scale-105"
                             >
                                Confirmar y Cerrar
                             </button>
                          </div>
                       ) : (
                          <div className="text-center text-stone-400 italic">
                             Ingrese el monto contado para ver el cuadre.
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
     </div>
  );
};