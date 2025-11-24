

import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../store/AppContext';
import { 
  LayoutDashboard, UtensilsCrossed, Store, Settings, 
  LogOut, ShoppingCart, Activity, Users, CalendarDays, Bell, MapPin, FileText, DollarSign, Printer, BarChart3, Archive, Menu, X
} from 'lucide-react';
import { Role, PrintJob, AppSettings, Branch, Customer, User, Table, Ingredient } from '../types';

// --- HTML GENERATOR FOR THERMAL TICKET ---
const generateTicketHtml = (job: PrintJob, settings: AppSettings, branch?: Branch, customer?: Customer, users?: User[], tables?: Table[], ingredients?: Ingredient[], allBranches?: Branch[]) => {
  const dateStr = new Date().toLocaleString('es-ES');
  const currency = settings.currencySymbol || '$';
  const address = branch?.address || settings.address;
  const phone = branch?.phone || settings.phone;
  
  // CSS Styles (Common)
  const css = `
    <style>
      body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 0; width: 100%; color: black; background: white; }
      .container { padding: 10px; max-width: 80mm; margin: 0 auto; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .mb-1 { margin-bottom: 4px; }
      .mb-2 { margin-bottom: 8px; }
      .mb-4 { margin-bottom: 16px; }
      .border-b { border-bottom: 1px dashed black; }
      .flex { display: flex; justify-content: space-between; }
      .uppercase { text-transform: uppercase; }
      .text-xs { font-size: 10px; }
      .text-lg { font-size: 16px; }
      .italic { font-style: italic; }
      img { width: 60px; height: auto; display: block; margin: 0 auto; filter: grayscale(100%); }
      .loyalty-box { border: 1px solid black; padding: 5px; margin: 10px 0; border-radius: 4px; }
      .signature-box { margin-top: 40px; border-top: 1px solid black; padding-top: 5px; text-align: center; font-size: 10px; }
      @media print {
        @page { margin: 0; size: auto; }
        body { margin: 0.5cm; }
      }
    </style>
  `;
  
  const logoHtml = settings.logoUrl ? `<div class="mb-2"><img src="${settings.logoUrl}" /></div>` : '';
  const headerHtml = `
    <div class="text-center mb-4">
        ${logoHtml}
        <h1 class="font-bold text-lg uppercase">${settings.storeName}</h1>
        ${branch ? `<p class="font-bold">${branch.name}</p>` : ''}
        <p class="text-xs">${address}</p>
        <p class="text-xs">${phone}</p>
        <div class="border-b mb-2 mt-2"></div>
    </div>
  `;

  // --- PRODUCTION TICKET ---
  if (job.type === 'PRODUCTION' && job.productionData) {
      const p = job.productionData;
      return `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8"/><title>Producción</title>${css}</head>
          <body>
            <div class="container">
                ${headerHtml}
                <h2 class="text-center font-bold uppercase text-lg mb-4">REPORTE PRODUCCION</h2>
                
                <div class="mb-4 text-xs">
                    <div class="flex"><span>Fecha:</span><span>${new Date().toLocaleString()}</span></div>
                    <div class="flex"><span>Usuario:</span><span>${p.user}</span></div>
                </div>
                <div class="border-b mb-4"></div>

                <div class="text-center mb-4">
                    <div class="text-lg font-bold">${p.itemName}</div>
                    <div class="text-sm mt-1">Producido: <span class="font-bold">${p.actualQty} ${p.unit}</span></div>
                    <div class="text-xs text-stone-500">(Teórico: ${p.expectedQty} ${p.unit})</div>
                </div>

                <div class="mb-2 font-bold text-xs">Insumos Utilizados:</div>
                <div class="mb-4">
                    ${p.ingredientsUsed.map(ing => `
                        <div class="flex mb-1 text-xs">
                            <div style="flex:1">${ing.name}</div>
                            <div>${ing.qty.toFixed(2)} ${ing.unit}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="border-b mb-2 mt-2"></div>
                <div class="text-center mt-6 text-xs">--- Control Interno ---</div>
            </div>
          </body>
        </html>
      `;
  }

  // --- TRANSFER TICKET ---
  if (job.type === 'TRANSFER' && job.transferData) {
      const t = job.transferData;
      const sourceName = allBranches?.find(b => b.id === t.sourceBranchId)?.name || 'N/A';
      const targetName = allBranches?.find(b => b.id === t.targetBranchId)?.name || 'N/A';

      return `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8"/><title>Traslado</title>${css}</head>
          <body>
            <div class="container">
                ${headerHtml}
                <h2 class="text-center font-bold uppercase text-lg mb-4">TRASLADO DE MERCADERIA</h2>
                
                <div class="mb-4 text-xs">
                    <div class="flex"><span>Fecha:</span><span>${new Date(t.createdAt).toLocaleString()}</span></div>
                    <div class="flex"><span>ID:</span><span>${t.id.slice(-6)}</span></div>
                    <div class="flex"><span>Origen:</span><span class="font-bold">${sourceName}</span></div>
                    <div class="flex"><span>Destino:</span><span class="font-bold">${targetName}</span></div>
                    <div class="flex"><span>Usuario:</span><span>${t.createdBy}</span></div>
                </div>
                <div class="border-b mb-2"></div>

                <div class="mb-4">
                    ${t.items.map(item => `
                        <div class="flex mb-1">
                            <div style="flex:1">
                                <span class="font-bold">${item.quantity} ${item.unit}</span> ${item.name}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="border-b mb-2 mt-2"></div>
                
                <div class="flex" style="gap: 10px; margin-top: 30px;">
                    <div style="flex:1; text-align: center;">
                        <div style="border-top: 1px solid black; padding-top: 5px;">Enviado Por</div>
                    </div>
                    <div style="flex:1; text-align: center;">
                        <div style="border-top: 1px solid black; padding-top: 5px;">Recibido Por</div>
                    </div>
                </div>
                
                <div class="text-center mt-6 text-xs">--- Documento Interno ---</div>
            </div>
          </body>
        </html>
      `;
  }

  // --- SHIFT REPORT TEMPLATE ---
  if (job.type === 'SHIFT_REPORT' && job.shiftData) {
      const { session, stats, byChannel } = job.shiftData;
      const diff = (session.endingCashActual || 0) - (session.startingCashActual + stats.cash);
      
      return `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8"/><title>Cierre Caja</title>${css}</head>
          <body>
            <div class="container">
                ${headerHtml}
                <h2 class="text-center font-bold uppercase text-lg mb-4">REPORTE DE CIERRE</h2>
                
                <div class="mb-4 text-xs">
                    <div class="flex"><span>Apertura:</span><span>${new Date(session.openedAt).toLocaleString()}</span></div>
                    <div class="flex"><span>Cierre:</span><span>${new Date(session.closedAt || new Date()).toLocaleString()}</span></div>
                    <div class="flex"><span>Usuario:</span><span>${users?.find(u => u.id === session.userId)?.name || 'N/A'}</span></div>
                </div>
                <div class="border-b mb-2"></div>

                <h3 class="font-bold text-xs uppercase mb-2">Flujo de Efectivo</h3>
                <div class="flex mb-1"><span>Fondo Inicial:</span><span>${currency}${session.startingCashActual.toFixed(2)}</span></div>
                <div class="flex mb-1"><span>+ Ventas Efvo:</span><span>${currency}${stats.cash.toFixed(2)}</span></div>
                <div class="flex mb-1 font-bold" style="margin-top:4px"><span>= SISTEMA:</span><span>${currency}${(session.startingCashActual + stats.cash).toFixed(2)}</span></div>
                <div class="flex mb-1 font-bold"><span>REAL (CONTEO):</span><span>${currency}${(session.endingCashActual || 0).toFixed(2)}</span></div>
                <div class="flex mb-1"><span>DIFERENCIA:</span><span class="${diff < 0 ? 'font-bold' : ''}">${currency}${diff.toFixed(2)}</span></div>

                <div class="border-b mb-2 mt-2"></div>
                <h3 class="font-bold text-xs uppercase mb-2">Ventas Totales</h3>
                <div class="flex mb-1"><span>Efectivo:</span><span>${currency}${stats.cash.toFixed(2)}</span></div>
                <div class="flex mb-1"><span>Tarjetas:</span><span>${currency}${stats.card.toFixed(2)}</span></div>
                <div class="flex mb-1"><span>Plataformas:</span><span>${currency}${stats.other.toFixed(2)}</span></div>
                <div class="flex font-bold text-lg mt-2"><span>TOTAL TURNO:</span><span>${currency}${stats.total.toFixed(2)}</span></div>
                <div class="text-center text-xs mt-1">(${stats.orders} Transacciones)</div>
                
                <div class="border-b mb-2 mt-2"></div>
                <h3 class="font-bold text-xs uppercase mb-2">Ventas por Canal</h3>
                ${byChannel ? Object.entries(byChannel).map(([ch, val]) => `
                    <div class="flex mb-1"><span>${ch}:</span><span>${currency}${Number(val).toFixed(2)}</span></div>
                `).join('') : ''}

                <div class="border-b mb-2 mt-2"></div>
                <div class="flex font-bold"><span>Total Propinas:</span><span>${currency}${(stats.tips || 0).toFixed(2)}</span></div>

                ${session.endingNotes ? `<div class="mt-4 text-xs italic border p-2">Nota: ${session.endingNotes}</div>` : ''}
                
                <div class="text-center mt-6 text-xs">--- Fin Reporte ---</div>
            </div>
          </body>
        </html>
      `;
  }

  // --- STANDARD ORDER TICKET (Bill, Receipt, Command) ---
  const order = job.order;
  if (!order) return '';

  const items = job.itemsToPrint || order.items;
  const waiterName = users?.find(u => u.id === order.waiterId)?.name || order.waiterId;
  const tableName = tables?.find(t => t.id === order.tableId)?.name || order.tableId || 'Barra/Llevar';

  const itemsHtml = items.map(item => {
    // Resolve exclusions names
    const exclusionsHtml = item.excludedIngredientIds?.map(id => {
       const ing = ingredients?.find(i => i.id === id);
       return ing ? `<div class="text-xs font-bold italic">** SIN ${ing.name.toUpperCase()} **</div>` : '';
    }).join('') || '';

    return `
    <div class="flex mb-1">
      <div style="flex:1">
        <span class="font-bold">${item.quantity}x</span> ${item.name}
        ${item.isCustom ? '<div class="text-xs italic">* Extra</div>' : ''}
        ${exclusionsHtml}
        ${item.modifiers ? item.modifiers.map(m => `<div class="text-xs">+ ${m.name}</div>`).join('') : ''}
      </div>
      ${job.type !== 'COMMAND' ? `<span>${currency}${(item.price * item.quantity).toFixed(2)}</span>` : ''}
    </div>
  `}).join('');
  
  let totalsHtml = '';
  if (job.type !== 'COMMAND') {
      // Calculate Final Total (Revenue + Tip)
      const grandTotal = order.total + (order.tip || 0);

      totalsHtml = `
        <div class="text-right">
          <div class="flex"><span>Subtotal:</span><span>${currency}${order.subtotal.toFixed(2)}</span></div>
          ${order.discountAmount ? `<div class="flex"><span>Desc:</span><span>-${currency}${order.discountAmount.toFixed(2)}</span></div>` : ''}
          <div class="flex"><span>Servicio:</span><span>${currency}${order.serviceCharge.toFixed(2)}</span></div>
          
          ${job.type === 'RECEIPT' && order.tip > 0 ? `<div class="flex italic"><span>Propina:</span><span>${currency}${order.tip.toFixed(2)}</span></div>` : ''}
          
          <div class="flex font-bold text-lg" style="margin-top:8px"><span>TOTAL:</span><span>${currency}${grandTotal.toFixed(2)}</span></div>
        </div>
      `;
      
      // PRE-BILL SUGGESTED TIP
      if (job.type === 'BILL') {
          const suggestedTip = order.total * 0.10;
          const totalWithTip = order.total + suggestedTip;
          totalsHtml += `
            <div class="border-b mb-2 mt-2"></div>
            <div class="text-right text-xs">
                <div class="flex italic"><span>Propina Sugerida (10%):</span><span>${currency}${suggestedTip.toFixed(2)}</span></div>
                <div class="flex font-bold text-sm mt-1"><span>Total c/ Propina:</span><span>${currency}${totalWithTip.toFixed(2)}</span></div>
            </div>
          `;
      }
  }

  // Loyalty Logic
  let loyaltyHtml = '';
  if (job.type !== 'COMMAND') {
      if (customer) {
          const rate = settings.spendingPerPoint || 10;
          let earnedPoints = Math.floor(order.total / rate);
          
          const todayIndex = new Date().getDay();
          if (settings.doublePointsDays?.includes(todayIndex)) {
              earnedPoints *= 2;
          }

          loyaltyHtml = `
            <div class="loyalty-box text-center">
                <div class="font-bold uppercase">Famiglia Forno Rosso</div>
                <div class="text-xs">Cliente: ${customer.name}</div>
                <div class="text-xs">Puntos Actuales: ${customer.points}</div>
                <div class="font-bold mt-1">¡Ganas +${earnedPoints} pts hoy!</div>
                ${settings.doublePointsDays?.includes(todayIndex) ? '<div class="text-[10px] italic font-bold">* Bonus Doble Puntos *</div>' : ''}
            </div>
          `;
      } else {
          loyaltyHtml = `
            <div class="text-center mt-4 mb-2 text-xs italic px-2">
                "Haz parte de la Famiglia Forno Rosso y empieza a acumular puntos con tu visita"
            </div>
          `;
      }
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Imprimir Ticket</title>
        ${css}
      </head>
      <body>
        <div class="container">
            ${headerHtml}
            <h2 class="text-center font-bold uppercase text-lg mb-4">${job.type === 'COMMAND' ? `COMANDA: ${job.printerName}` : job.type === 'BILL' ? 'PRE-CUENTA' : 'RECIBO'}</h2>

            <div class="mb-4 text-xs">
            <div class="flex"><span>Fecha:</span><span>${dateStr}</span></div>
            <div class="flex"><span>Orden #:</span><span class="font-bold">${order.id.slice(-6)}</span></div>
            <div class="flex"><span>Tipo:</span><span>${order.type}</span></div>
            ${order.platformOrderId ? `<div class="flex"><span>Ref:</span><span class="font-bold">${order.platformOrderId}</span></div>` : ''}
            <div class="flex"><span>Mesa:</span><span class="font-bold">${tableName}</span></div>
            <div class="flex"><span>Mesero:</span><span>${waiterName}</span></div>
            </div>

            <div class="border-b mb-2"></div>
            <div class="mb-4">${itemsHtml}</div>
            <div class="border-b mb-2"></div>
            
            ${totalsHtml}

            ${loyaltyHtml}

            <div class="text-center mt-4 text-xs">
            <p>${settings.ticketHeader || ''}</p>
            <p class="mt-1">${settings.ticketFooter}</p>
            </div>
        </div>
      </body>
    </html>
  `;
};

const PrintManager: React.FC = () => {
  const { printQueue, clearPrintJob, settings, branches, customers, users, tables, ingredients } = useApp();
  const [currentJob, setCurrentJob] = useState<PrintJob | null>(null);

  useEffect(() => {
    if (printQueue.length > 0 && !currentJob) {
       setCurrentJob(printQueue[0]);
    }
  }, [printQueue, currentJob]);

  const handlePrint = () => {
    if (!currentJob) return;

    const branch = branches.find(b => b.id === currentJob.order?.branchId || currentJob.shiftData?.session.branchId || currentJob.transferData?.sourceBranchId);
    const customer = customers.find(c => c.id === currentJob.order?.customerId);
    
    // Updated call to include branches list
    const html = generateTicketHtml(currentJob, settings, branch, customer, users, tables, ingredients, branches);
    
    const width = 400;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const printWindow = window.open('', 'PRINT_TICKET', `width=${width},height=${height},top=${top},left=${left},toolbar=0,scrollbars=0,status=0`);

    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
            handleDone(); 
        }, 500);
    } else {
        alert("El navegador bloqueó la ventana emergente. Por favor permite Pop-ups para imprimir.");
    }
  };

  const handleDone = () => {
     if (currentJob) {
        clearPrintJob(currentJob.id);
        setCurrentJob(null);
     }
  };

  if (!currentJob) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white text-black p-6 rounded-xl max-w-md w-full shadow-2xl text-center animate-in fade-in zoom-in-95">
             <Printer size={48} className="mx-auto mb-4 text-[var(--fr-green)] animate-pulse"/>
             <h2 className="text-2xl font-bold mb-1">Imprimiendo...</h2>
             <p className="text-stone-500 text-xs mb-6">Si la ventana no se abre automáticamente, haz clic abajo.</p>
             
             <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 text-left">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Impresora Destino:</p>
                <p className="text-lg font-bold text-stone-800">{currentJob.printerName}</p>
             </div>
             
             <div className="space-y-3">
                <button onClick={handlePrint} className="w-full py-4 bg-[var(--fr-green)] text-white font-bold rounded-xl hover:bg-[#1a3b2e] shadow-lg text-lg flex items-center justify-center gap-2">
                   ABRIR TICKET
                </button>
                <button onClick={handleDone} className="w-full py-3 text-stone-400 text-xs hover:text-stone-600 underline">
                   Saltar / Ya impreso
                </button>
             </div>
          </div>
    </div>
  );
};

// ... (Rest of Layout component - unchanged)
interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onChangeView: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
  const { currentUser, logout, ingredients, settings, branches, currentBranchId, setBranch } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const lowStockCount = ingredients.filter(i => i.stock <= i.minStock).length;
  const currentBranch = branches.find(b => b.id === currentBranchId);

  const menuItems = [
    { id: 'pos', label: 'Punto de Venta', icon: Store, roles: [Role.ADMIN, Role.WAITER, Role.CASHIER] },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.ADMIN] },
    { id: 'register', label: 'Caja / Turno', icon: Archive, roles: [Role.ADMIN, Role.CASHIER] },
    { id: 'reservations', label: 'Reservas', icon: CalendarDays, roles: [Role.ADMIN, Role.WAITER] },
    { id: 'inventory', label: 'Inventario', icon: ShoppingCart, roles: [Role.ADMIN, Role.KITCHEN, Role.CASHIER] },
    { id: 'purchases', label: 'Compras', icon: FileText, roles: [Role.ADMIN, Role.CASHIER] },
    { id: 'expenses', label: 'Gastos', icon: DollarSign, roles: [Role.ADMIN, Role.CASHIER] },
    { id: 'customers', label: 'Clientes', icon: Users, roles: [Role.ADMIN, Role.CASHIER, Role.WAITER] },
    { id: 'reports', label: 'Reportes', icon: BarChart3, roles: [Role.ADMIN] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: [Role.ADMIN, Role.CASHIER] },
  ];

  const handleViewChange = (id: string) => {
      onChangeView(id);
      setIsMobileMenuOpen(false); 
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--fr-bg)] text-[var(--fr-text)]">
      <PrintManager />

      {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
      )}

      <aside className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-[var(--fr-green)] text-[var(--fr-card)] flex flex-col shadow-2xl border-r border-[var(--fr-green)] transition-transform duration-300 transform
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
      `}>
        <div className="p-6 border-b border-[#ffffff20] flex justify-between items-start">
           <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-[var(--fr-card)] rounded-lg text-[var(--fr-red)] shrink-0 shadow-md flex items-center justify-center overflow-hidden">
                        {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain" /> : <UtensilsCrossed size={24} />}
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-bold text-lg leading-none font-serif tracking-wide text-[#F3E5AB] truncate">{settings.storeName}</h1>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-sans">GastroPOS</span>
                    </div>
                </div>
                
                <div className="relative group w-full">
                    <button className="w-full flex items-center justify-between bg-[#1a3b2e] px-4 py-3 rounded-lg text-xs font-medium text-white/80 hover:bg-[#142d23] border border-[#ffffff10] transition-colors">
                        <div className="flex items-center gap-2 truncate font-sans">
                        <MapPin size={14} className="text-[#C0392B]"/>
                        <span>{currentBranch?.name}</span>
                        </div>
                    </button>
                    <div className="hidden group-hover:block absolute top-full left-0 w-full bg-[#1a3b2e] border border-[#ffffff10] rounded-lg mt-1 shadow-xl z-50 overflow-hidden">
                    {branches.map(b => (
                        <button 
                            key={b.id} 
                            onClick={() => setBranch(b.id)}
                            className={`w-full text-left px-4 py-3 text-xs hover:bg-[#142d23] transition-colors border-b border-[#ffffff05] last:border-0 ${b.id === currentBranchId ? 'text-[#C0392B] font-bold' : 'text-white/70'}`}
                        >
                            {b.name}
                        </button>
                    ))}
                    </div>
                </div>
           </div>
           
           <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/50 hover:text-white">
               <X size={24} />
           </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.filter(item => item.roles.includes(currentUser?.role || Role.WAITER)).map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium font-sans text-sm ${
                currentView === item.id 
                  ? 'bg-[var(--fr-red)] text-white shadow-lg' 
                  : 'hover:bg-[#ffffff10] text-[#F3E5AB]/80 hover:text-[#F3E5AB]'
              }`}
            >
              <item.icon size={18} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#ffffff20] bg-[#1a3b2e]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-[var(--fr-card)] flex items-center justify-center text-[var(--fr-green)] font-bold border border-[var(--fr-line)] shadow-sm font-serif">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#F3E5AB] truncate font-serif">{currentUser?.name}</p>
              <p className="text-[10px] text-white/50 truncate capitalize font-sans tracking-wider">{currentUser?.role.toLowerCase()}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-[#ffffff10] hover:bg-red-900/40 hover:text-red-200 text-white/50 transition"
          >
            <LogOut size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative flex flex-col bg-[var(--fr-bg)] w-full">
        <div className="bg-[var(--fr-bg)]/80 backdrop-blur-md h-16 border-b border-[var(--fr-line)] flex items-center justify-between px-6 gap-4 shrink-0 sticky top-0 z-10">
           <button 
             onClick={() => setIsMobileMenuOpen(true)}
             className="md:hidden p-2 text-[var(--fr-green)] hover:bg-[var(--fr-line)]/20 rounded-lg"
           >
              <Menu size={24} />
           </button>
           
           <div className="md:hidden font-serif font-bold text-[var(--fr-green)] truncate flex-1 text-center">
               {settings.storeName}
           </div>

           <div className="flex items-center justify-end flex-1">
                <button 
                    onClick={() => handleViewChange('inventory')}
                    className="relative p-2.5 rounded-full hover:bg-[var(--fr-line)]/20 transition text-[var(--fr-green)]"
                    title="Notificaciones de Inventario"
                >
                    <Bell size={22} />
                    {lowStockCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--fr-red)] text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse shadow-sm">
                        {lowStockCount}
                    </span>
                    )}
                </button>
           </div>
        </div>
        
        <div className="flex-1 overflow-auto">
           {children}
        </div>
      </main>
    </div>
  );
};
