
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { OrderType, OrderStatus, Product, PaymentMethod, Customer, Order, ModifierOption, Role, Discount } from '../../types';
import { 
  Users, ShoppingBag, Truck, Bike, Trash2, 
  CreditCard, Banknote, Receipt, Plus, Minus, ArrowLeft, CheckCircle, Gift, Utensils, MoreVertical, Split, ArrowRightLeft, Merge, Sparkles, Layout, ChefHat, Printer, Edit3, XCircle, Percent, Tag, AlertCircle, Award, Crown, Calculator, DollarSign, Lock, ChevronDown, ChevronUp, Clock, Loader2
} from 'lucide-react';

// --- HELPER MODALS ---

const TableSelectModal: React.FC<{ 
  action: 'move' | 'merge', 
  currentTableId?: string, 
  onClose: () => void, 
  onConfirm: (targetId: string) => void 
}> = ({ action, currentTableId, onClose, onConfirm }) => {
  const { tables, currentBranchId } = useApp();
  
  const candidates = (tables || []).filter(t => {
     if (t.branchId !== currentBranchId) return false;
     if (t.id === currentTableId) return false;
     if (action === 'merge' && !t.isOccupied) return false;
     return true;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-2xl p-6 border border-[var(--fr-line)] shadow-2xl">
         <h2 className="text-xl font-bold mb-4 text-[var(--fr-green)] font-serif">
           {action === 'move' ? 'Mover a Mesa' : 'Unir con Mesa'}
         </h2>
         {candidates.length === 0 ? (
            <p className="text-center text-stone-500 py-8 italic">No hay mesas disponibles para esta acción.</p>
         ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
               {candidates.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => onConfirm(t.id)}
                    className="p-4 rounded-xl border border-[var(--fr-line)] hover:border-[var(--fr-green)] hover:bg-[var(--fr-bg)] transition text-center relative"
                  >
                     <div className="font-bold text-lg text-[var(--fr-text)]">{t.name}</div>
                     <div className="text-xs text-stone-400">{t.capacity}p</div>
                     {t.isOccupied && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                  </button>
               ))}
            </div>
         )}
         <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-stone-500 font-bold hover:bg-[var(--fr-bg)] rounded-lg">Cancelar</button>
         </div>
      </div>
    </div>
  );
};

const SplitOrderModal: React.FC<{ order: Order, onClose: () => void, onConfirm: (itemQuantities: { [id: string]: number }) => void }> = ({ order, onClose, onConfirm }) => {
   const { settings } = useApp();
   const [moveQuantities, setMoveQuantities] = useState<{ [id: string]: number }>({});

   const updateQty = (itemId: string, max: number, delta: number) => {
      const current = moveQuantities[itemId] || 0;
      const next = Math.min(max, Math.max(0, current + delta));
      setMoveQuantities(prev => ({ ...prev, [itemId]: next }));
   };

   const hasSelection = Object.values(moveQuantities).some(v => (v as number) > 0);

   return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
         <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-lg p-6 border border-[var(--fr-line)] shadow-2xl flex flex-col max-h-[80vh]">
            <h2 className="text-xl font-bold mb-2 text-[var(--fr-green)] font-serif">Dividir Cuenta (Crear Sub-cuenta)</h2>
            <p className="text-xs text-stone-500 mb-4">Selecciona ítems para mover a una nueva cuenta en esta misma mesa.</p>
            
            <div className="flex-1 overflow-y-auto space-y-2 bg-[var(--fr-bg)] p-4 rounded-xl border border-[var(--fr-line)]">
               {order.items.map(item => {
                  const qtyToMove = moveQuantities[item.id] || 0;
                  const remaining = item.quantity - qtyToMove;
                  
                  return (
                     <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-[var(--fr-line)]">
                        <div className="flex-1">
                           <div className="text-sm font-bold text-[var(--fr-text)]">{item.name}</div>
                           <div className="text-xs text-stone-400 font-mono">{settings.currencySymbol}{item.price.toFixed(2)} c/u</div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                           <div className="text-xs text-stone-500 mr-2">
                              Quedan: <span className="font-bold text-[var(--fr-text)]">{remaining}</span>
                           </div>
                           <div className="flex items-center bg-stone-100 rounded-lg border border-[var(--fr-line)]">
                              <button 
                                 onClick={() => updateQty(item.id, item.quantity, -1)}
                                 className="p-2 hover:bg-stone-200 rounded-l-lg disabled:opacity-30"
                                 disabled={qtyToMove === 0}
                              ><Minus size={14}/></button>
                              <div className="w-8 text-center font-bold text-[var(--fr-green)]">{qtyToMove}</div>
                              <button 
                                 onClick={() => updateQty(item.id, item.quantity, 1)}
                                 className="p-2 hover:bg-stone-200 rounded-r-lg disabled:opacity-30"
                                 disabled={qtyToMove >= item.quantity}
                              ><Plus size={14}/></button>
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>

            <div className="mt-6 flex gap-3">
               <button onClick={onClose} className="flex-1 py-3 text-stone-500 font-bold hover:bg-[var(--fr-bg)] rounded-lg">Cancelar</button>
               <button 
                  onClick={() => onConfirm(moveQuantities)}
                  disabled={!hasSelection}
                  className="flex-1 py-3 bg-[var(--fr-green)] text-white font-bold rounded-lg hover:bg-[#1a3b2e] disabled:opacity-50 disabled:hover:bg-[var(--fr-green)] shadow-lg"
               >
                  Crear Nueva Cuenta
               </button>
            </div>
         </div>
      </div>
   );
};

const DiscountModal: React.FC<{ orderId: string, onClose: () => void, onApply: (d: Discount | null) => void, onCourtesy: () => void }> = ({ orderId, onClose, onApply, onCourtesy }) => {
    const { discounts, settings, orders, customers, loyaltyRewards, currentUser } = useApp();
    const [tab, setTab] = useState<'catalog' | 'manual' | 'rewards'>('catalog');
    
    // Manual Discount State
    const [manualVal, setManualVal] = useState('');
    const [manualType, setManualType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');

    const order = (orders || []).find(o => o.id === orderId);
    const customer = (customers || []).find(c => c.id === order?.customerId);

    const checkSchedule = (d: Discount) => {
        if (!d.schedule) return { valid: true, reason: '' };
        const now = new Date();
        const currentDay = now.getDay(); // 0=Sun
        
        if (d.schedule.days && !d.schedule.days.includes(currentDay)) return { valid: false, reason: 'Día no válido' };
        
        const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        if (d.schedule.startTime && d.schedule.endTime) {
             if (currentTime < d.schedule.startTime || currentTime > d.schedule.endTime) {
                return { valid: false, reason: `Horario: ${d.schedule.startTime} - ${d.schedule.endTime}` };
             }
        }
        
        return { valid: true, reason: '' };
    };

    // Filter active and valid dates
    const availableDiscounts = (discounts || []).filter(d => {
        if (!d.isActive) return false;
        const now = new Date();
        if (d.startDate && now < new Date(d.startDate)) return false;
        if (d.endDate && now > new Date(d.endDate)) return false;
        return true;
    });

    const handleManualApply = () => {
        const val = parseFloat(manualVal);
        if (!val || val <= 0) return;
        
        const manualDiscount: Discount = {
            id: `man-${Date.now()}`,
            name: `Ajuste Manual (${manualType === 'PERCENTAGE' ? val + '%' : settings.currencySymbol + val})`,
            type: manualType,
            value: val,
            isActive: true
        };
        onApply(manualDiscount);
    };

    const handleCatalogApply = (d: Discount) => {
        const status = checkSchedule(d);
        if (status.valid) {
            onApply(d);
        } else {
            // If invalid, check for Authorization
            if (currentUser?.role === Role.ADMIN || currentUser?.role === Role.CASHIER) {
                if (confirm(`Esta oferta está fuera de horario (${status.reason}). ¿Deseas AUTORIZAR la aplicación manual?`)) {
                    onApply(d);
                }
            } else {
                alert(`Oferta no disponible: ${status.reason}. Requiere autorización de Cajero o Gerente.`);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-md p-6 border border-[var(--fr-line)] shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-xl font-bold text-[var(--fr-green)] font-serif">Beneficios</h2>
                   <button onClick={onClose}><XCircle className="text-stone-400 hover:text-stone-600" /></button>
                </div>

                <div className="flex gap-2 mb-4 border-b border-[var(--fr-line)] pb-1 overflow-x-auto">
                    <button onClick={() => setTab('catalog')} className={`flex-1 pb-2 text-sm font-bold whitespace-nowrap ${tab === 'catalog' ? 'text-[var(--fr-green)] border-b-2 border-[var(--fr-green)]' : 'text-stone-400'}`}>Catálogo</button>
                    <button onClick={() => setTab('manual')} className={`flex-1 pb-2 text-sm font-bold whitespace-nowrap ${tab === 'manual' ? 'text-[var(--fr-green)] border-b-2 border-[var(--fr-green)]' : 'text-stone-400'}`}>Manual</button>
                    <button onClick={() => setTab('rewards')} className={`flex-1 pb-2 text-sm font-bold whitespace-nowrap ${tab === 'rewards' ? 'text-[var(--fr-green)] border-b-2 border-[var(--fr-green)]' : 'text-stone-400'}`}>Puntos</button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto mb-6 min-h-[200px]">
                    {tab === 'catalog' && (
                        <>
                            {availableDiscounts.map(d => {
                                const status = checkSchedule(d);
                                return (
                                    <button 
                                        key={d.id}
                                        onClick={() => handleCatalogApply(d)}
                                        className={`w-full p-4 border rounded-xl hover:bg-[var(--fr-bg)] transition flex justify-between items-center group relative ${status.valid ? 'bg-white border-[var(--fr-line)] hover:border-[var(--fr-green)]' : 'bg-stone-100 border-stone-200 opacity-70'}`}
                                    >
                                        <div className="text-left">
                                            <div className="font-bold text-stone-700">{d.name}</div>
                                            {!status.valid && <div className="text-[10px] text-red-500 font-bold flex items-center gap-1"><Clock size={10}/> {status.reason}</div>}
                                        </div>
                                        <div className="font-mono font-bold text-[var(--fr-green)] text-right">
                                            {d.type === 'PERCENTAGE' ? `${d.value}%` : d.type === 'BOGO' ? '2x1' : `${settings.currencySymbol}${d.value}`}
                                            {!status.valid && (currentUser?.role === Role.ADMIN || currentUser?.role === Role.CASHIER) && (
                                                <div className="text-[9px] text-amber-600 uppercase font-bold border border-amber-200 bg-amber-50 px-1 rounded mt-1">Autorizar</div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            {availableDiscounts.length === 0 && <div className="text-center text-stone-400 italic p-4">No hay ofertas activas</div>}
                        </>
                    )}

                    {tab === 'manual' && (
                        <div className="bg-[var(--fr-bg)] p-4 rounded-xl border border-[var(--fr-line)] h-full flex flex-col justify-center">
                            <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={() => setManualType('FIXED')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${manualType === 'FIXED' ? 'bg-stone-800 text-white' : 'bg-white border text-stone-500'}`}
                                >
                                    <DollarSign size={14}/> Monto Fijo
                                </button>
                                <button 
                                    onClick={() => setManualType('PERCENTAGE')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${manualType === 'PERCENTAGE' ? 'bg-stone-800 text-white' : 'bg-white border text-stone-500'}`}
                                >
                                    <Percent size={14}/> Porcentaje
                                </button>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider">Valor del Descuento</label>
                                <div className="relative">
                                    {manualType === 'FIXED' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">{settings.currencySymbol}</span>}
                                    <input 
                                        type="number" 
                                        autoFocus
                                        value={manualVal}
                                        onChange={e => setManualVal(e.target.value)}
                                        className={`w-full p-3 rounded-xl text-xl font-bold text-center border-2 border-[var(--fr-line)] focus:border-[var(--fr-green)] outline-none bg-white text-stone-800 ${manualType === 'FIXED' ? 'pl-8' : ''}`}
                                        placeholder="0.00"
                                    />
                                    {manualType === 'PERCENTAGE' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">%</span>}
                                </div>
                            </div>
                            <button 
                                onClick={handleManualApply}
                                disabled={!manualVal || parseFloat(manualVal) <= 0}
                                className="w-full py-3 bg-[var(--fr-green)] text-white font-bold rounded-xl hover:bg-[#1a3b2e] disabled:opacity-50 shadow-lg"
                            >
                                Aplicar Manual
                            </button>
                        </div>
                    )}

                    {tab === 'rewards' && (
                        <>
                            {customer ? (
                                <div>
                                    <div className="flex justify-between items-center bg-amber-50 p-3 rounded-lg border border-amber-100 mb-3">
                                        <div className="text-sm font-bold text-amber-800 flex items-center gap-2"><Crown size={16}/> {customer.name} <span className="text-xs opacity-75">({customer.currentTier})</span></div>
                                        <div className="text-sm font-bold text-amber-600">{customer.points} pts</div>
                                    </div>
                                    {(loyaltyRewards || []).filter(r => r.isActive).map(r => {
                                        const canAfford = customer.points >= r.costPoints;
                                        
                                        // Check Tier Requirement
                                        let tierQualified = true;
                                        if (r.requiredTierName) {
                                            const reqTier = settings.loyaltyTiers?.find(t => t.name === r.requiredTierName);
                                            const currentTier = settings.loyaltyTiers?.find(t => t.name === customer.currentTier);
                                            
                                            if (reqTier && currentTier) {
                                                tierQualified = currentTier.minPoints >= reqTier.minPoints;
                                            } else if (reqTier && !customer.currentTier) {
                                                tierQualified = false;
                                            }
                                        }
                                        
                                        const canRedeem = canAfford && tierQualified;

                                        return (
                                            <button 
                                                key={r.id}
                                                onClick={() => {
                                                    if(canRedeem) onApply({ id: `rwd-${r.id}`, name: r.name, type: 'FIXED', value: 0, isActive: true }); 
                                                }}
                                                disabled={!canRedeem}
                                                className={`w-full p-3 mb-2 border rounded-xl flex justify-between items-center relative overflow-hidden ${canRedeem ? 'bg-white border-[var(--fr-line)] hover:border-[var(--fr-green)]' : 'bg-stone-50 border-stone-100 opacity-70'}`}
                                            >
                                                <div className="text-left z-10">
                                                    <div className="font-bold text-stone-700">{r.name}</div>
                                                    <div className="text-xs text-stone-500">{r.costPoints} pts</div>
                                                    {!tierQualified && <div className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-1"><Lock size={10}/> Requiere {r.requiredTierName}</div>}
                                                </div>
                                                <Gift size={18} className={canRedeem ? 'text-[var(--fr-green)] z-10' : 'text-stone-300 z-10'}/>
                                                {!tierQualified && <div className="absolute inset-0 bg-stone-100/50 cursor-not-allowed"/>}
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center p-6 text-stone-500 italic">
                                    Asigna un cliente a la orden para ver sus puntos.
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                <div className="pt-4 border-t border-[var(--fr-line)]">
                    <h3 className="text-xs font-bold text-stone-400 uppercase mb-2">Acciones Especiales</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => onApply(null)}
                            className="w-full py-3 border border-stone-300 text-stone-500 rounded-xl font-bold hover:bg-stone-100 text-xs"
                        >
                            Quitar Descuentos
                        </button>
                        <button 
                            onClick={onCourtesy}
                            className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold hover:bg-black transition flex items-center justify-center gap-2 text-xs"
                        >
                            <Gift size={14}/> Cortesía (100%)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CustomItemModal: React.FC<{ onClose: () => void, onConfirm: (name: string, price: number) => void }> = ({ onClose, onConfirm }) => {
   const [desc, setDesc] = useState('');
   const [price, setPrice] = useState('');

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(desc && price) onConfirm(desc, Number(price));
   };

   return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
         <form onSubmit={handleSubmit} className="bg-[var(--fr-card)] rounded-2xl w-full max-w-sm p-6 border border-[var(--fr-line)] shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-[var(--fr-green)] font-serif">Agregar Extra / Servicio</h2>
            <div className="space-y-3">
               <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Descripción</label>
                  <input autoFocus value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white" placeholder="Ej. Descorche" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Precio</label>
                  <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white" placeholder="0.00" />
               </div>
            </div>
            <div className="mt-6 flex gap-3">
               <button type="button" onClick={onClose} className="flex-1 py-2 text-stone-500 font-bold hover:bg-[var(--fr-bg)] rounded-lg">Cancelar</button>
               <button type="submit" className="flex-1 py-2 bg-[var(--fr-green)] text-white font-bold rounded-lg hover:bg-[#1a3b2e]">Agregar</button>
            </div>
         </form>
      </div>
   );
};

const AccountSelectModal: React.FC<{ 
  tableId: string, 
  onSelect: (orderId: string) => void, 
  onNew: () => void,
  onClose: () => void
}> = ({ tableId, onSelect, onNew, onClose }) => {
  const { tables, orders, settings } = useApp();
  const table = (tables || []).find(t => t.id === tableId);
  const tableOrders = (orders || []).filter(o => table?.currentOrderIds.includes(o.id) && o.status !== OrderStatus.VOID && o.status !== OrderStatus.PAID);

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
       <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-md p-8 border border-[var(--fr-line)] shadow-2xl">
          <h2 className="text-2xl font-bold mb-2 text-[var(--fr-green)] font-serif text-center">{table?.name}</h2>
          <p className="text-center text-stone-500 mb-6">Seleccione una cuenta abierta o cree una nueva</p>
          
          <div className="space-y-3 mb-6">
             {tableOrders.map((order, idx) => (
                <button 
                   key={order.id} 
                   onClick={() => onSelect(order.id)}
                   className="w-full p-4 bg-white border border-[var(--fr-line)] rounded-xl hover:bg-[var(--fr-bg)] hover:border-[var(--fr-green)] transition flex justify-between items-center group shadow-sm"
                >
                   <div className="text-left">
                      <div className="font-bold text-[var(--fr-text)]">Cuenta #{idx + 1}</div>
                      <div className="text-xs text-stone-400">{new Date(order.openedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                   </div>
                   <div className="font-bold text-[var(--fr-green)] text-lg group-hover:scale-110 transition">
                      {settings.currencySymbol}{order.total.toFixed(2)}
                   </div>
                </button>
             ))}
          </div>

          <div className="flex gap-3">
             <button onClick={onClose} className="flex-1 py-3 text-stone-500 font-bold hover:bg-[var(--fr-bg)] rounded-xl">Cancelar</button>
             <button onClick={onNew} className="flex-1 py-3 bg-[var(--fr-green)] text-white font-bold rounded-xl hover:bg-[#1a3b2e] shadow-lg flex items-center justify-center gap-2">
                <Plus size={18}/> Nueva Cuenta
             </button>
          </div>
       </div>
    </div>
  );
};

// --- NEW: PRODUCT CUSTOMIZATION MODAL ---
const ProductCustomizationModal: React.FC<{
    product: Product,
    onClose: () => void,
    onConfirm: (modifiers: ModifierOption[], excludedIds: string[]) => void
}> = ({ product, onClose, onConfirm }) => {
    const { ingredients, modifierGroups, settings } = useApp();
    const [excludedIds, setExcludedIds] = useState<string[]>([]);
    const [selectedModifiers, setSelectedModifiers] = useState<ModifierOption[]>([]);

    // Filter Modifier Groups applicable to this product category OR specific product ID
    const availableGroups = (modifierGroups || []).filter(g => {
        const catMatch = g.categories.includes(product.category);
        const prodMatch = g.applyToProductIds?.includes(product.id);
        return catMatch || prodMatch;
    });

    const toggleExclusion = (ingId: string) => {
        if (excludedIds.includes(ingId)) {
            setExcludedIds(prev => prev.filter(id => id !== ingId));
        } else {
            setExcludedIds(prev => [...prev, ingId]);
        }
    };

    const toggleModifier = (group: any, option: ModifierOption) => {
        const currentInGroup = selectedModifiers.filter(m => group.options.find((o: any) => o.id === m.id));
        
        // Check if already selected
        if (selectedModifiers.some(m => m.id === option.id)) {
            setSelectedModifiers(prev => prev.filter(m => m.id !== option.id));
            return;
        }

        // Check Max Selection
        if (group.maxSelection === 1) {
            // Replace
            const otherMods = selectedModifiers.filter(m => !group.options.find((o: any) => o.id === m.id));
            setSelectedModifiers([...otherMods, option]);
        } else {
            if (currentInGroup.length < group.maxSelection) {
                setSelectedModifiers(prev => [...prev, option]);
            }
        }
    };

    const totalPrice = selectedModifiers.reduce((sum, m) => sum + m.price, 0);

    return (
        <div className="fixed inset-0 bg-[#1a3b2e]/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--fr-card)] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[var(--fr-line)] shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-[var(--fr-line)] bg-[var(--fr-bg)] flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--fr-green)] font-serif">{product.name}</h2>
                        <p className="text-stone-500 text-xs">Personalización del producto</p>
                    </div>
                    <div className="text-right">
                         <div className="text-[10px] uppercase font-bold text-stone-400">Extras</div>
                         <div className="text-xl font-bold text-[var(--fr-red)]">+{settings.currencySymbol}{totalPrice.toFixed(2)}</div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                    {/* INGREDIENT EXCLUSIONS */}
                    {product.ingredients.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <XCircle size={16} className="text-red-400"/> Ingredientes Base
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {product.ingredients.map(pi => {
                                    const ing = (ingredients || []).find(i => i.id === pi.ingredientId);
                                    if(!ing) return null;
                                    const isExcluded = excludedIds.includes(ing.id);
                                    return (
                                        <button 
                                            key={ing.id}
                                            onClick={() => toggleExclusion(ing.id)}
                                            className={`px-4 py-2 rounded-full border text-sm font-bold transition flex items-center gap-2 ${
                                                isExcluded 
                                                ? 'bg-red-50 border-red-200 text-red-400 line-through decoration-2' 
                                                : 'bg-white border-[var(--fr-line)] text-[var(--fr-text)] hover:border-[var(--fr-green)]'
                                            }`}
                                        >
                                            {!isExcluded && <CheckCircle size={14} className="text-[var(--fr-green)]"/>}
                                            {ing.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* MODIFIERS */}
                    {availableGroups.map(group => (
                        <div key={group.id}>
                            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Sparkles size={16} className="text-amber-400"/> {group.name} 
                                <span className="text-[10px] normal-case font-normal opacity-50">(Max {group.maxSelection})</span>
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {group.options.map(opt => {
                                    const isSelected = selectedModifiers.some(m => m.id === opt.id);
                                    return (
                                        <button 
                                            key={opt.id}
                                            onClick={() => toggleModifier(group, opt)}
                                            className={`p-3 rounded-xl border text-left transition relative overflow-hidden ${
                                                isSelected 
                                                ? 'bg-[var(--fr-green)] text-white border-[var(--fr-green)] shadow-md' 
                                                : 'bg-white text-stone-600 border-[var(--fr-line)] hover:bg-[var(--fr-bg)]'
                                            }`}
                                        >
                                            <div className="font-bold text-sm">{opt.name}</div>
                                            <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-[var(--fr-red)]'}`}>+{settings.currencySymbol}{opt.price.toFixed(2)}</div>
                                            {isSelected && <div className="absolute top-2 right-2"><CheckCircle size={16}/></div>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-[var(--fr-line)] bg-[var(--fr-bg)] flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-200 transition">Cancelar</button>
                    <button onClick={() => onConfirm(selectedModifiers, excludedIds)} className="flex-[2] py-3 rounded-xl bg-[var(--fr-green)] text-white font-bold hover:bg-[#1a3b2e] shadow-lg uppercase tracking-wider text-sm">
                        Confirmar Agregar
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN COMPONENTS ---

const TableGrid: React.FC<{ onSelectTable: (id: string) => void }> = ({ onSelectTable }) => {
  const { tables, currentBranchId } = useApp();
  const branchTables = (tables || []).filter(t => t.branchId === currentBranchId);

  return (
    <div className="p-8">
      {branchTables.length === 0 ? (
         <div className="text-center text-stone-400 mt-20 italic font-serif">No hay mesas configuradas en esta sucursal.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {branchTables.map(table => {
             const activeCount = table.currentOrderIds?.length || 0;
             return (
                <button
                  key={table.id}
                  onClick={() => onSelectTable(table.id)}
                  className={`h-40 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden shadow-sm ${
                    table.isOccupied 
                      ? 'bg-red-50 border-[var(--fr-red)] text-[var(--fr-red)]' 
                      : 'bg-[var(--fr-card)] border-[var(--fr-line)] hover:border-[var(--fr-green)] hover:shadow-md text-[var(--fr-green)]'
                  }`}
                >
                  <span className="text-2xl font-bold font-serif tracking-tight">{table.name}</span>
                  <div className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${table.isOccupied ? 'bg-red-100' : 'bg-[var(--fr-bg)]'}`}>
                    <Users size={14} />
                    <span>{table.capacity}p</span>
                  </div>
                  
                  {/* Badge for multiple accounts */}
                  {activeCount > 0 && (
                     <div className="absolute top-3 right-3 flex flex-col items-end">
                        <span className="w-3 h-3 bg-[var(--fr-red)] rounded-full animate-pulse mb-1"></span>
                        {activeCount > 1 && (
                           <span className="text-[10px] bg-[var(--fr-red)] text-white px-1.5 py-0.5 rounded font-bold">
                              {activeCount} ctas
                           </span>
                        )}
                     </div>
                  )}
                </button>
             );
          })}
        </div>
      )}
    </div>
  );
};

const ProductGrid: React.FC<{ onAdd: (p: Product) => void }> = ({ onAdd }) => {
  const { products, settings, productCategories } = useApp();
  // Use global productCategories instead of deriving locally to ensure defaults exist
  const [activeCat, setActiveCat] = useState(productCategories?.[0] || '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Force set active category if undefined initially
  useEffect(() => {
      if (!activeCat && productCategories && productCategories.length > 0) {
          setActiveCat(productCategories[0]);
      }
  }, [productCategories, activeCat]);

  return (
    <div className="flex flex-col h-full">
      {/* Customization Modal */}
      {selectedProduct && (
         <ProductCustomizationModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)}
            onConfirm={(mods, excluded) => {
                onAdd({ ...selectedProduct, modifiers: mods, excludedIds: excluded } as any); 
                setSelectedProduct(null);
            }}
         />
      )}

      <div className="flex gap-2 overflow-x-auto p-2 lg:p-6 bg-[var(--fr-bg)] border-b border-[var(--fr-line)] sticky top-0 z-10 scrollbar-hide items-center whitespace-nowrap">
        {(productCategories || []).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`px-3 py-1.5 lg:px-6 lg:py-2 rounded-full whitespace-nowrap text-xs lg:text-sm font-bold transition-all border shadow-sm font-serif tracking-wide flex-shrink-0 ${
              activeCat === cat 
                ? 'bg-[var(--fr-green)] text-white border-[var(--fr-green)]' 
                : 'bg-[var(--fr-card)] text-[var(--fr-text)] hover:bg-white border-[var(--fr-line)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="p-2 lg:p-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-5 overflow-y-auto bg-[var(--fr-bg)] pb-20 lg:pb-6">
        {(products || []).filter(p => p.category === activeCat)
          .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
          .map(product => (
          <button
            key={product.id}
            onClick={() => setSelectedProduct(product)} // Open Modal instead of direct add
            className="bg-[var(--fr-card)] p-3 rounded-xl shadow-sm border border-[var(--fr-line)] hover:shadow-lg hover:border-[var(--fr-green)] transition text-left flex flex-col h-full group"
          >
            <div className="h-24 lg:h-32 bg-[var(--fr-bg)] rounded-lg mb-3 overflow-hidden relative border border-[var(--fr-line)]/30">
              {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" /> : <div className="w-full h-full flex items-center justify-center text-stone-400"><Utensils/></div>}
              <div className="absolute bottom-2 right-2 bg-[var(--fr-card)] px-2 py-1 rounded border border-[var(--fr-line)] text-xs font-bold text-[var(--fr-green)] shadow-sm">
                {settings.currencySymbol}{(product.prices[OrderType.DINE_IN] || 0).toFixed(2)}
              </div>
            </div>
            <h3 className="font-bold text-[var(--fr-text)] text-sm leading-tight font-serif">{product.name}</h3>
          </button>
        ))}
      </div>
    </div>
  );
};

const OrderSummary: React.FC<{ 
  order: Order, 
  siblingOrders: Order[],
  onSwitchOrder: (id: string) => void,
  onBack: () => void, 
  onPay: () => void 
}> = ({ order, siblingOrders, onSwitchOrder, onBack, onPay }) => {
  const { 
     orders, updateOrder, updateOrderItemQuantity, addCustomItemToOrder, addItemToOrder,
     moveOrder, mergeOrders, splitOrder, applyDiscountToOrder, applyCourtesyToOrder, voidOrder,
     tables, settings, sendOrderToKitchen, printPreBill, ingredients, currentUser, customers
  } = useApp();
  
  // Use passed order object which might be Optimistic UI (tempOrder)
  const orderId = order.id;
  const customer = (customers || []).find(c => c.id === order?.customerId);
  
  // Local UI States
  const [showActions, setShowActions] = useState(false);
  const [tableAction, setTableAction] = useState<'move' | 'merge' | null>(null);
  const [showSplit, setShowSplit] = useState(false);
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  
  // Customer Selector State
  const [searchCust, setSearchCust] = useState('');
  const [showCustSelect, setShowCustSelect] = useState(false);

  const handleCourtesy = () => {
      if (currentUser?.role === Role.ADMIN || currentUser?.role === Role.CASHIER) {
          if (confirm("¿Seguro que deseas dar esta orden como CORTESÍA (100% descuento)?")) {
              applyCourtesyToOrder(order.id, "Autorizado por " + currentUser.name);
              setShowDiscount(false);
          }
      } else {
          alert("Solo Administradores o Cajeros pueden autorizar cortesías.");
      }
  };

  const confirmVoid = () => {
      voidOrder(order.id);
      setShowVoidConfirm(false);
      onBack();
  };
  
  const handleSetCustomer = (c: Customer) => {
      updateOrder(order.id, { customerId: c.id });
      setShowCustSelect(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--fr-card)] border-l border-[var(--fr-line)] shadow-2xl z-40 relative">
      {/* --- MODALS --- */}
      {tableAction && (
         <TableSelectModal 
            action={tableAction} 
            currentTableId={order.tableId}
            onClose={() => setTableAction(null)} 
            onConfirm={(targetId) => {
               if(tableAction === 'move') moveOrder(order.id, targetId);
               else {
                  // Find the active order on the target table to merge into
                  const targetTable = tables.find(t => t.id === targetId);
                  const targetOrderId = targetTable?.currentOrderIds[0];
                  if(targetOrderId) mergeOrders(order.id, targetOrderId);
               }
               setTableAction(null);
               onBack();
            }} 
         />
      )}
      {showSplit && (
         <SplitOrderModal 
            order={order} 
            onClose={() => setShowSplit(false)} 
            onConfirm={(quantities) => { splitOrder(order.id, quantities); setShowSplit(false); }} 
         />
      )}
      {showCustomItem && (
         <CustomItemModal 
            onClose={() => setShowCustomItem(false)} 
            onConfirm={(name, price) => { addCustomItemToOrder(order.id, name, price); setShowCustomItem(false); }} 
         />
      )}
      {showDiscount && (
         <DiscountModal 
            orderId={orderId}
            onClose={() => setShowDiscount(false)}
            onApply={(d) => { applyDiscountToOrder(order.id, d); setShowDiscount(false); }}
            onCourtesy={handleCourtesy}
         />
      )}
      {showVoidConfirm && (
          <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-red-200 max-w-sm w-full text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 size={32}/>
                  </div>
                  <h2 className="text-xl font-bold text-stone-800 mb-2 font-serif">¿Anular Orden?</h2>
                  <p className="text-sm text-stone-500 mb-6">Esta acción eliminará la orden permanentemente y liberará la mesa. No se puede deshacer.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowVoidConfirm(false)} className="flex-1 py-3 rounded-xl border font-bold text-stone-500 hover:bg-stone-100">Cancelar</button>
                      <button onClick={confirmVoid} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg">Si, Anular</button>
                  </div>
              </div>
          </div>
      )}

      {/* Multi-Account Tabs */}
      {siblingOrders.length > 1 && (
         <div className="flex bg-[var(--fr-bg)] border-b border-[var(--fr-line)] overflow-x-auto scrollbar-hide">
            {siblingOrders.map((o, idx) => (
               <button 
                  key={o.id} 
                  onClick={() => onSwitchOrder(o.id)}
                  className={`px-4 py-2 text-xs font-bold whitespace-nowrap border-r border-[var(--fr-line)] ${o.id === orderId ? 'bg-[var(--fr-card)] text-[var(--fr-green)] border-b-2 border-b-[var(--fr-green)]' : 'text-stone-400 hover:bg-stone-100'}`}
               >
                  Cuenta {idx + 1}
               </button>
            ))}
         </div>
      )}

      {/* Header */}
      <div className="p-2 lg:p-4 border-b border-[var(--fr-line)] bg-[var(--fr-card)] relative">
        <div className="flex justify-between items-center mb-1">
           <button onClick={onBack} className="p-2 hover:bg-[var(--fr-bg)] rounded-full text-[var(--fr-text)] transition"><ArrowLeft size={20}/></button>
           <div className="flex items-center gap-2">
               <span className="font-mono text-xs text-stone-400">#{orderId.slice(-6)}</span>
               <div className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${order.type.includes('DELIVERY') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-[var(--fr-bg)] text-[var(--fr-green)] border-[var(--fr-line)]'}`}>
                  {order.type.replace('DELIVERY_', '')}
               </div>
           </div>
           <button onClick={() => setShowActions(!showActions)} className="p-2 hover:bg-[var(--fr-bg)] rounded-full text-[var(--fr-text)] transition relative">
              <MoreVertical size={20} />
              {showActions && (
                 <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-[var(--fr-line)] z-50 py-2 text-sm font-bold text-stone-600">
                    <button onClick={(e) => { e.stopPropagation(); setTableAction('move'); setShowActions(false); }} className="w-full text-left px-4 py-3 hover:bg-[var(--fr-bg)] flex items-center gap-2"><ArrowRightLeft size={16}/> Mover Mesa</button>
                    <button onClick={(e) => { e.stopPropagation(); setTableAction('merge'); setShowActions(false); }} className="w-full text-left px-4 py-3 hover:bg-[var(--fr-bg)] flex items-center gap-2"><Merge size={16}/> Unir Cuentas</button>
                    <button onClick={(e) => { e.stopPropagation(); setShowSplit(true); setShowActions(false); }} className="w-full text-left px-4 py-3 hover:bg-[var(--fr-bg)] flex items-center gap-2"><Split size={16}/> Dividir Cuenta</button>
                    
                    {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.CASHIER) && (
                        <button onClick={(e) => { e.stopPropagation(); setShowVoidConfirm(true); setShowActions(false); }} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-stone-100"><Trash2 size={16}/> Anular Orden</button>
                    )}
                 </div>
              )}
           </button>
        </div>
        
        {/* CUSTOMER SELECTOR */}
        <div className="relative mb-1">
            {customer ? (
                <div className="flex justify-between items-center bg-stone-100 p-1.5 rounded-lg">
                    <div>
                        <div className="text-xs font-bold text-stone-700 bg-transparent">{customer.name}</div>
                        <div className="text-[10px] text-stone-500 flex items-center gap-1">
                            {customer.currentTier && <span className="text-amber-600 flex items-center gap-0.5"><Crown size={10}/> {customer.currentTier}</span>}
                            <span>• {customer.points} pts</span>
                        </div>
                    </div>
                    <button onClick={() => updateOrder(orderId, { customerId: null as any })} className="text-stone-400 hover:text-red-500"><XCircle size={14}/></button>
                </div>
            ) : (
                <button onClick={() => setShowCustSelect(!showCustSelect)} className="w-full text-left text-xs font-bold text-[var(--fr-green)] hover:underline flex items-center gap-1">
                    + Asignar Cliente
                </button>
            )}

            {showCustSelect && (
                <div className="absolute top-full left-0 w-full bg-white border shadow-xl rounded-lg z-50 p-2">
                    <input autoFocus placeholder="Buscar cliente..." value={searchCust} onChange={e => setSearchCust(e.target.value)} className="w-full p-1 text-xs border rounded mb-2 bg-white text-stone-800"/>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        {(customers || []).filter(c => c.name.toLowerCase().includes(searchCust.toLowerCase()) || c.phone.includes(searchCust)).map(c => (
                            <button key={c.id} onClick={() => handleSetCustomer(c)} className="w-full text-left text-xs p-1 hover:bg-stone-100 rounded">
                                <span className="font-bold">{c.name}</span> <span className="text-stone-400">({c.points} pts)</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
        
        {/* TICKET BRANDING - Hidden on Mobile */}
        <div className="hidden lg:flex flex-col items-center pb-2 border-b-2 border-dashed border-[var(--fr-line)] mb-2">
           {settings.logoUrl && (
             <div className="w-16 h-16 mb-1 flex items-center justify-center">
               <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
             </div>
           )}
           <h3 className="font-bold text-[var(--fr-red)] uppercase tracking-wider text-lg font-serif">{settings.storeName}</h3>
           {order.tableId ? (
              (tables || []).find(t => t.id === order.tableId) && (
                 <span className="text-xs text-stone-400 mt-1 font-bold">{(tables || []).find(t => t.id === order.tableId)?.name}</span>
              )
           ) : (
              <span className="text-xs text-stone-400 mt-1 font-bold">Sin Mesa / Delivery</span>
           )}
        </div>

        {/* Platform Order ID Input */}
        {(order.type === OrderType.DELIVERY_UBER || order.type === OrderType.DELIVERY_PEDIDOSYA) && (
           <div className="mb-1">
              <input 
                placeholder="ID Orden Plataforma" 
                value={order.platformOrderId || ''}
                onChange={e => updateOrder(order.id, { platformOrderId: e.target.value })}
                className="w-full text-xs p-1.5 bg-stone-100 border border-stone-200 rounded text-center font-mono focus:outline-none focus:ring-1 focus:ring-stone-400 text-stone-800"
              />
           </div>
        )}

        <div className="flex justify-center mt-2 lg:hidden">
          <div className={`px-3 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border ${
             order.type.includes('DELIVERY') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-[var(--fr-bg)] text-[var(--fr-green)] border-[var(--fr-line)]'
          }`}>
            {order.type.replace('DELIVERY_', '').replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Order Type Selector */}
      <div className="p-1 lg:p-2 grid grid-cols-4 gap-1 text-[10px] border-b border-[var(--fr-line)] bg-[var(--fr-bg)]">
        <button onClick={() => updateOrder(order.id, { type: OrderType.DINE_IN })} className={`p-1.5 rounded flex flex-col items-center gap-1 transition ${order.type === OrderType.DINE_IN ? 'bg-white text-[var(--fr-red)] border border-[var(--fr-red)] font-bold' : 'text-stone-400 hover:bg-white border border-transparent'}`}>
           <Utensils size={12}/> Mesa
        </button>
        <button onClick={() => updateOrder(order.id, { type: OrderType.TAKEOUT })} className={`p-1.5 rounded flex flex-col items-center gap-1 transition ${order.type === OrderType.TAKEOUT ? 'bg-white text-[var(--fr-red)] border border-[var(--fr-red)] font-bold' : 'text-stone-400 hover:bg-white border border-transparent'}`}>
           <ShoppingBag size={12}/> Llevar
        </button>
        <button onClick={() => updateOrder(order.id, { type: OrderType.DELIVERY_UBER })} className={`p-1.5 rounded flex flex-col items-center gap-1 transition ${order.type === OrderType.DELIVERY_UBER ? 'bg-white text-green-600 border border-green-200 font-bold' : 'text-stone-400 hover:bg-white border border-transparent'}`}>
           <Truck size={12}/> Uber
        </button>
        <button onClick={() => updateOrder(order.id, { type: OrderType.DELIVERY_PEDIDOSYA })} className={`p-1.5 rounded flex flex-col items-center gap-1 transition ${order.type === OrderType.DELIVERY_PEDIDOSYA ? 'bg-white text-red-600 border border-red-200 font-bold' : 'text-stone-400 hover:bg-white border border-transparent'}`}>
           <Bike size={12}/> P.Ya
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-sm bg-[var(--fr-card)]">
        <button onClick={() => setShowCustomItem(true)} className="w-full py-1.5 mb-2 border-2 border-dashed border-[var(--fr-line)] text-stone-400 rounded text-xs font-bold hover:bg-[var(--fr-bg)] hover:text-[var(--fr-green)] flex items-center justify-center gap-2">
           <Sparkles size={12}/> Agregar Extra / Servicio
        </button>

        {order.items.length === 0 && <div className="text-center text-stone-400 italic mt-4 font-sans">Orden vacía</div>}
        {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-start group py-2 border-b border-dashed border-[var(--fr-line)]/50 last:border-0">
              <div className="flex-1">
                <div className="flex items-start gap-2">
                   {/* Quantity Controls */}
                   <div className="flex items-center bg-[var(--fr-bg)] rounded-md border border-[var(--fr-line)] shrink-0 mt-0.5">
                      <button onClick={() => updateOrderItemQuantity(order.id, item.id, -1)} className="px-2 py-1 text-[10px] hover:text-red-500"><Minus size={10}/></button>
                      <span className="font-bold text-[var(--fr-green)] text-xs min-w-[1.2rem] text-center">{item.quantity}</span>
                      <button onClick={() => updateOrderItemQuantity(order.id, item.id, 1)} className="px-2 py-1 text-[10px] hover:text-green-600"><Plus size={10}/></button>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[var(--fr-text)] leading-tight font-bold text-sm">{item.name}</span>
                      {item.isCustom && <span className="text-[10px] text-[var(--fr-red)] italic">Extra</span>}
                      
                      {/* Modifiers Display */}
                      {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-[10px] text-stone-500 mt-0.5">
                              {item.modifiers.map(m => (
                                  <div key={m.id}>+ {m.name}</div>
                              ))}
                          </div>
                      )}
                      {/* Exclusions Display */}
                      {item.excludedIngredientIds && item.excludedIngredientIds.length > 0 && (
                          <div className="text-[10px] text-red-400 italic mt-0.5">
                              {item.excludedIngredientIds.map(eid => {
                                  const ing = (ingredients || []).find(i => i.id === eid);
                                  return ing ? <div key={eid} className="line-through decoration-1">Sin {ing.name}</div> : null;
                              })}
                          </div>
                      )}
                   </div>
                </div>
              </div>
              <div className="font-bold text-[var(--fr-text)] ml-2 mt-0.5 text-sm">
                {settings.currencySymbol}{(item.quantity * item.price).toFixed(2)}
              </div>
            </div>
          ))
        }
      </div>

      {/* Totals Area */}
      <div className="p-3 lg:p-6 bg-[var(--fr-bg)] border-t border-[var(--fr-line)] space-y-2">
        {/* Discount Display */}
        {order.appliedDiscount ? (
            <div className="flex justify-between text-xs text-red-600 font-bold bg-red-50 p-1.5 rounded border border-red-100 items-center">
                <span className="flex items-center gap-1"><Tag size={12}/> {order.appliedDiscount.name}</span>
                <div className="flex items-center gap-2">
                    <span>-{settings.currencySymbol}{order.discountAmount?.toFixed(2)}</span>
                    <button onClick={(e) => { e.stopPropagation(); applyDiscountToOrder(order.id, null); }}><XCircle size={12}/></button>
                </div>
            </div>
        ) : order.isCourtesy ? (
            <div className="flex justify-between text-xs text-white font-bold bg-stone-800 p-1.5 rounded items-center">
                <span className="flex items-center gap-1"><Gift size={12}/> CORTESÍA</span>
                <div className="flex items-center gap-2">
                    <span>100% OFF</span>
                    <button onClick={() => applyDiscountToOrder(order.id, null)} className="text-stone-400 hover:text-white"><XCircle size={12}/></button>
                </div>
            </div>
        ) : (
            <button onClick={() => setShowDiscount(true)} className="w-full py-1.5 border border-dashed border-stone-300 text-stone-500 rounded hover:bg-white hover:text-[var(--fr-green)] text-xs font-bold flex items-center justify-center gap-2">
                <Percent size={12}/> Descuento / Cortesía / Puntos
            </button>
        )}

        <div className="flex justify-between text-xs text-stone-500">
          <span>Subtotal</span>
          <span>{settings.currencySymbol}{order.subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-xs items-center text-stone-600">
           <span>Servicio / Extra</span>
           <div className="flex items-center gap-1 bg-white rounded border border-[var(--fr-line)]">
              <button className="p-0.5 hover:bg-[var(--fr-bg)]" onClick={() => updateOrder(order.id, { serviceCharge: Math.max(0, order.serviceCharge - 5) })}><Minus size={10}/></button>
              <span className="text-[10px] min-w-[20px] text-center font-bold">{settings.currencySymbol}{order.serviceCharge.toFixed(0)}</span>
              <button className="p-0.5 hover:bg-[var(--fr-bg)]" onClick={() => updateOrder(order.id, { serviceCharge: order.serviceCharge + 5 })}><Plus size={10}/></button>
           </div>
        </div>
        
        <div className="border-t border-[var(--fr-text)] pt-2 mt-1">
          <div className="flex justify-between text-xl font-bold text-[var(--fr-text)] font-serif">
            <span>Total</span>
            <span>{settings.currencySymbol}{order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
            <button 
               onClick={() => sendOrderToKitchen(order.id)}
               disabled={order.items.length === 0}
               className="flex-1 py-2 bg-white border border-[var(--fr-green)] text-[var(--fr-green)] rounded-lg font-bold hover:bg-[var(--fr-bg)] disabled:opacity-50 transition flex flex-col items-center justify-center text-[10px] uppercase tracking-wider"
            >
               <ChefHat size={14} />
               Cocina
            </button>
            <button 
               onClick={() => printPreBill(order.id)}
               disabled={order.items.length === 0}
               className="flex-1 py-2 bg-white border border-stone-400 text-stone-600 rounded-lg font-bold hover:bg-stone-50 disabled:opacity-50 transition flex flex-col items-center justify-center text-[10px] uppercase tracking-wider"
            >
               <Printer size={14} />
               Pre-Cta
            </button>
        </div>
        
        <button 
          onClick={onPay}
          disabled={order.items.length === 0}
          className="w-full py-3 bg-[var(--fr-green)] text-white rounded-xl font-bold hover:bg-[#1a3b2e] disabled:opacity-50 disabled:hover:bg-[var(--fr-green)] transition-colors flex items-center justify-center gap-2 shadow-lg uppercase tracking-wider text-sm"
        >
          <Receipt size={16} />
          <span>Cobrar</span>
        </button>
      </div>
    </div>
  );
};

// --- PAYMENT MODAL ---
const PaymentModal: React.FC<{ order: Order, onClose: () => void, onConfirm: (methods: any[], tip: number) => void }> = ({ order, onClose, onConfirm }) => {
   const { settings } = useApp();
   
   // Helper to get default method based on order type
   const getDefaultMethod = (type: OrderType) => {
       if (type === OrderType.DELIVERY_UBER) return PaymentMethod.CREDIT_UBER;
       if (type === OrderType.DELIVERY_PEDIDOSYA) return PaymentMethod.CREDIT_PEDIDOSYA;
       return PaymentMethod.CASH;
   };

   const [methods, setMethods] = useState<{ method: PaymentMethod, amount: number }[]>([]);
   const [tip, setTip] = useState(0);

   // Initialization
   useEffect(() => {
       if (order && methods.length === 0) {
           const defaultMethod = getDefaultMethod(order.type);
           setMethods([{ method: defaultMethod, amount: order.total }]);
       }
   }, [order]); 

   // AUTO-FILL EFFECT (Keeps single payment method synced with total+tip)
   useEffect(() => {
       if (order && methods.length === 1) {
           setMethods([{ method: methods[0].method, amount: order.total + tip }]);
       }
   }, [tip, order?.total]);

   if(!order) return null;

   const totalPaid = methods.reduce((acc, m) => acc + m.amount, 0);
   const remaining = (order.total + tip) - totalPaid;

   const handleAddMethod = () => {
       setMethods([...methods, { method: PaymentMethod.CARD, amount: remaining > 0 ? remaining : 0 }]);
   };

   const updateMethod = (index: number, field: keyof typeof methods[0], value: any) => {
       const newMethods = [...methods];
       newMethods[index] = { ...newMethods[index], [field]: value };
       setMethods(newMethods);
   };

   const removeMethod = (index: number) => {
       setMethods(methods.filter((_, i) => i !== index));
   };
   
   const handleCloseOrder = () => {
       // Tolerance increased for small float errors
       if(remaining > 0.05) {
           alert("Falta cubrir el total");
           return;
       }
       onConfirm(methods, tip); // Pass back to parent
   };

   return (
      <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-lg p-8 border border-[var(--fr-line)] shadow-2xl flex flex-col max-h-[90vh]">
              <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Cobrar Orden</h2>
                  <div className="text-4xl font-bold mt-2 text-[var(--fr-text)]">{settings.currencySymbol}{(order.total + tip).toFixed(2)}</div>
              </div>

              <div className="bg-[var(--fr-bg)] p-4 rounded-xl border border-[var(--fr-line)] mb-6">
                   <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-stone-500">Propina Sugerida</span>
                       <div className="flex gap-2">
                           {settings.suggestedTips.map(t => (
                               <button key={t} onClick={() => setTip(parseFloat((order.subtotal * (t/100)).toFixed(2)))} className="px-2 py-1 bg-white border rounded text-xs font-bold hover:bg-stone-100 shadow-sm text-stone-800">{t}%</button>
                           ))}
                           <button onClick={() => setTip(0)} className="px-2 py-1 bg-white border rounded text-xs font-bold hover:bg-stone-100 shadow-sm text-stone-800">0</button>
                       </div>
                   </div>
                   <div className="flex justify-between items-center">
                       <span className="font-bold text-stone-500">Monto Propina</span>
                       <input 
                           type="number" 
                           value={tip} 
                           onChange={e => setTip(parseFloat(Number(e.target.value).toFixed(2)))} 
                           className="w-24 p-2 text-right border rounded bg-white text-stone-900 font-bold outline-none focus:ring-1 focus:ring-[var(--fr-green)]" 
                       />
                   </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-6">
                  {methods.map((m, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                          <select value={m.method} onChange={e => updateMethod(idx, 'method', e.target.value)} className="flex-1 p-3 border rounded-xl bg-white font-bold text-stone-800">
                              {Object.values(PaymentMethod).map(pm => <option key={pm} value={pm}>{pm}</option>)}
                          </select>
                          <div className="relative w-32">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">{settings.currencySymbol}</span>
                              <input 
                                type="number" 
                                value={m.amount} 
                                onChange={e => updateMethod(idx, 'amount', Number(e.target.value))} 
                                className="w-full pl-8 p-3 border rounded-xl font-bold text-right outline-none focus:border-[var(--fr-green)] bg-white text-stone-900" 
                              />
                          </div>
                          {methods.length > 1 && <button onClick={() => removeMethod(idx)} className="text-red-400"><Trash2 size={18}/></button>}
                      </div>
                  ))}
                  <button onClick={handleAddMethod} className="text-sm font-bold text-[var(--fr-green)] hover:underline flex items-center gap-1">+ Agregar Método de Pago</button>
              </div>

              <div className="flex justify-between items-center mb-6 p-4 bg-stone-100 rounded-xl">
                  <div>
                      <div className="text-xs font-bold text-stone-500 uppercase">Pagado</div>
                      <div className="font-bold text-lg">{settings.currencySymbol}{totalPaid.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                      <div className="text-xs font-bold text-stone-500 uppercase">{remaining > 0.05 ? 'Faltante' : 'Cambio'}</div>
                      <div className={`font-bold text-2xl ${remaining > 0.05 ? 'text-red-500' : 'text-green-600'}`}>
                          {settings.currencySymbol}{Math.abs(remaining).toFixed(2)}
                      </div>
                  </div>
              </div>

              <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 py-4 text-stone-500 font-bold hover:bg-[var(--fr-bg)] rounded-xl">Cancelar</button>
                  <button onClick={handleCloseOrder} className="flex-[2] py-4 bg-[var(--fr-green)] text-white font-bold rounded-xl hover:bg-[#1a3b2e] shadow-lg uppercase tracking-wider text-sm">
                      Finalizar Venta
                  </button>
              </div>
          </div>
      </div>
   );
};

export const PosMain: React.FC = () => {
  const { orders, createOrder, tables, addItemToOrder, getCurrentSession, settings, closeOrder, customers } = useApp();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showAccountSelect, setShowAccountSelect] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  
  // OPTIMISTIC UI STATE
  const [tempOrder, setTempOrder] = useState<Order | null>(null);

  const activeSession = getCurrentSession();

  // Find active orders without a table (Takeout/Delivery)
  const takeoutOrders = (orders || []).filter(o => 
      o &&
      !o.tableId && 
      o.status !== OrderStatus.PAID && 
      o.status !== OrderStatus.VOID
  ).sort((a,b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

  if (!activeSession) {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-stone-100 p-8 text-center">
              <div className="w-24 h-24 bg-stone-200 text-stone-400 rounded-full flex items-center justify-center mb-6">
                  <Lock size={48} />
              </div>
              <h1 className="text-3xl font-bold text-stone-700 font-serif mb-2">Caja Cerrada</h1>
              <p className="text-stone-500 max-w-md mb-8">
                  No hay un turno activo. Para comenzar a tomar órdenes y realizar cobros, es necesario abrir la caja.
              </p>
              <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm text-sm text-stone-600">
                  Ve al módulo <span className="font-bold text-[var(--fr-green)]">Caja / Turno</span> en el menú lateral.
              </div>
          </div>
      );
  }

  const handleCreateNoTableOrder = (type: OrderType) => {
    const newOrder = createOrder(type); 
    // OPTIMISTIC UPDATE
    setTempOrder(newOrder);
    setSelectedOrderId(newOrder.id);
    setSelectedTableId(null);
    setShowMobileSummary(false);
  };

  const handleTableSelect = (tableId: string) => {
      setSelectedTableId(tableId);
      const activeOrders = (orders || []).filter(o => o.tableId === tableId && o.status !== OrderStatus.PAID && o.status !== OrderStatus.VOID);
      
      if (activeOrders.length === 0) {
          const newOrder = createOrder(OrderType.DINE_IN, tableId);
          setTempOrder(newOrder);
          setSelectedOrderId(newOrder.id);
      } else if (activeOrders.length === 1) {
          setSelectedOrderId(activeOrders[0].id);
      } else {
          setShowAccountSelect(true);
      }
      setShowMobileSummary(false);
  };

  const handleOrderSelect = (orderId: string) => {
      setSelectedOrderId(orderId);
      setShowAccountSelect(false);
      setShowMobileSummary(false);
      
      const ord = (orders || []).find(o => o.id === orderId);
      if(ord && !ord.tableId) setSelectedTableId(null);
  };

  const handleNewAccount = () => {
      if (selectedTableId) {
          const newOrder = createOrder(OrderType.DINE_IN, selectedTableId);
          setTempOrder(newOrder);
          setSelectedOrderId(newOrder.id);
          setShowAccountSelect(false);
          setShowMobileSummary(false);
      }
  };

  const handleBack = () => {
      setSelectedOrderId(null);
      setSelectedTableId(null);
      setShowMobileSummary(false);
      setTempOrder(null);
  };

  // Resolve order
  const currentOrder = (orders || []).find(o => o.id === selectedOrderId) || (tempOrder?.id === selectedOrderId ? tempOrder : null);

  // --- LOADING STATE ---
  if (selectedOrderId && !currentOrder) {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-stone-50 gap-4">
              <Loader2 className="h-12 w-12 text-[var(--fr-green)] animate-spin" />
              <p className="text-stone-500 font-bold text-sm animate-pulse">Sincronizando orden...</p>
          </div>
      );
  }

  if (selectedOrderId && currentOrder) {
      // Get siblings for multi-account tabs
      const siblingOrders = currentOrder.tableId 
         ? (orders || []).filter(o => o.tableId === currentOrder.tableId && o.status !== OrderStatus.PAID && o.status !== OrderStatus.VOID)
         : [currentOrder];

      const totalItems = currentOrder.items.reduce((acc, i) => acc + i.quantity, 0);
      const tableName = (tables || []).find(t => t.id === currentOrder.tableId)?.name || (currentOrder.type === OrderType.TAKEOUT ? 'Para Llevar' : 'Delivery');

      return (
          <div className="flex h-full relative flex-col lg:flex-row overflow-hidden">
              {showPayment && <PaymentModal order={currentOrder} onClose={() => { setShowPayment(false); handleBack(); }} onConfirm={(m, t) => { closeOrder(selectedOrderId, m, t); setShowPayment(false); handleBack(); }} />}
              
              {/* PRODUCT GRID AREA */}
              <div className={`flex-1 h-full overflow-hidden bg-stone-50 flex flex-col ${showMobileSummary ? 'hidden lg:flex' : 'flex'}`}>
                  {/* Mobile Header for Navigation */}
                  <div className="lg:hidden p-3 bg-white border-b border-stone-200 flex items-center justify-between shadow-sm z-10">
                       <button onClick={handleBack} className="p-2 -ml-2 text-stone-600 rounded-full hover:bg-stone-100">
                           <ArrowLeft size={20} />
                       </button>
                       <div className="flex flex-col items-center">
                           <span className="font-bold text-[var(--fr-green)] font-serif text-sm">{tableName}</span>
                           <span className="text-[10px] text-stone-400 font-mono">#{selectedOrderId.slice(-4)}</span>
                       </div>
                       <div className="w-8"></div> 
                  </div>

                  <ProductGrid onAdd={(p: any) => addItemToOrder(selectedOrderId, p, p.modifiers, p.excludedIds)} />
              </div>
              
              {/* MOBILE BOTTOM ACTION BAR */}
              {!showMobileSummary && (
                  <div 
                    className="lg:hidden p-4 bg-[var(--fr-green)] text-white flex justify-between items-center cursor-pointer shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30"
                    onClick={() => setShowMobileSummary(true)}
                  >
                      <div className="flex items-center gap-3">
                          <div className="bg-white text-[var(--fr-green)] w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                              {totalItems}
                          </div>
                          <span className="font-bold text-sm uppercase tracking-wider flex items-center gap-1">
                              Ver Pedido <ChevronUp size={16}/>
                          </span>
                      </div>
                      <div className="font-bold text-xl font-serif">{settings.currencySymbol}{currentOrder.total.toFixed(2)}</div>
                  </div>
              )}

              {/* ORDER SUMMARY (SIDEBAR / MOBILE FULL OVERLAY) */}
              <div className={`
                  lg:w-96 bg-[var(--fr-card)] border-l border-[var(--fr-line)] z-40 transition-transform duration-300
                  ${showMobileSummary ? 'absolute inset-0 flex flex-col' : 'hidden lg:flex'}
              `}>
                  {/* Mobile Close Toggle */}
                  <div className="lg:hidden p-3 bg-[var(--fr-bg)] border-b border-[var(--fr-line)] flex justify-center items-center" onClick={() => setShowMobileSummary(false)}>
                      <button className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest">
                          <ChevronDown size={16} /> Ocultar Detalle
                      </button>
                  </div>

                  <OrderSummary 
                      order={currentOrder}
                      siblingOrders={siblingOrders} 
                      onSwitchOrder={setSelectedOrderId}
                      onBack={handleBack} 
                      onPay={() => setShowPayment(true)} 
                  />
              </div>
          </div>
      );
  }

  return (
      <div className="h-full overflow-y-auto">
          {showAccountSelect && selectedTableId && (
              <AccountSelectModal 
                  tableId={selectedTableId}
                  onSelect={handleOrderSelect}
                  onNew={handleNewAccount}
                  onClose={() => { setShowAccountSelect(false); setSelectedTableId(null); }}
              />
          )}
          
          <div className="p-4 lg:p-8 space-y-8">
             {/* HEADER */}
             <header className="flex justify-between items-center">
                <div>
                   <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Punto de Venta</h1>
                   <p className="text-stone-500">Seleccione una opción para comenzar</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
                        <div className="w-3 h-3 rounded-full bg-[var(--fr-card)] border border-[var(--fr-green)]"></div> Libre
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
                        <div className="w-3 h-3 rounded-full bg-red-50 border border-[var(--fr-red)]"></div> Ocupada
                    </div>
                </div>
             </header>

             {/* QUICK ACTIONS & TAKEOUT */}
             <div className="bg-white p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm">
                <h2 className="text-xl font-bold text-stone-700 mb-4 font-serif flex items-center gap-2">
                    <ShoppingBag size={20}/> Pedidos Sin Mesa
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => handleCreateNoTableOrder(OrderType.TAKEOUT)} className="p-4 bg-[var(--fr-bg)] rounded-xl border border-[var(--fr-line)] hover:border-[var(--fr-green)] text-left transition group">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-3 text-stone-600 group-hover:text-[var(--fr-green)] shadow-sm">
                            <ShoppingBag size={20}/>
                        </div>
                        <div className="font-bold text-[var(--fr-text)]">Para Llevar</div>
                        <div className="text-xs text-stone-400">Crear nueva orden</div>
                    </button>
                    <button onClick={() => handleCreateNoTableOrder(OrderType.DELIVERY_UBER)} className="p-4 bg-[var(--fr-bg)] rounded-xl border border-[var(--fr-line)] hover:border-green-500 text-left transition group">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-3 text-green-600 shadow-sm">
                            <Truck size={20}/>
                        </div>
                        <div className="font-bold text-[var(--fr-text)]">Uber Eats</div>
                        <div className="text-xs text-stone-400">Crear nueva orden</div>
                    </button>
                    <button onClick={() => handleCreateNoTableOrder(OrderType.DELIVERY_PEDIDOSYA)} className="p-4 bg-[var(--fr-bg)] rounded-xl border border-[var(--fr-line)] hover:border-red-500 text-left transition group">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-3 text-red-600 shadow-sm">
                            <Bike size={20}/>
                        </div>
                        <div className="font-bold text-[var(--fr-text)]">PedidosYa</div>
                        <div className="text-xs text-stone-400">Crear nueva orden</div>
                    </button>
                </div>

                {/* Active Takeout List */}
                {takeoutOrders.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-[var(--fr-line)]">
                        <h3 className="text-xs font-bold text-stone-400 uppercase mb-3">Activos (Para Llevar / Delivery)</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {takeoutOrders.map(o => {
                                if (!o || !o.type) return null;
                                return (
                                    <button 
                                        key={o.id}
                                        onClick={() => handleOrderSelect(o.id)}
                                        className="min-w-[160px] p-3 bg-white border border-[var(--fr-line)] rounded-xl text-left hover:shadow-md transition flex flex-col gap-1 relative"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-[var(--fr-text)]">#{o.id.slice(-4)}</span>
                                            <span className="text-[10px] font-mono text-stone-400">{new Date(o.openedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="text-xs text-stone-500 truncate">
                                            {o.type.replace('DELIVERY_', '')} {o.platformOrderId ? `(${o.platformOrderId})` : ''}
                                        </div>
                                        <div className="font-bold text-[var(--fr-green)] mt-1">{settings.currencySymbol}{o.total.toFixed(2)}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
             </div>

             {/* TABLES */}
             <div>
                 <h2 className="text-xl font-bold text-stone-700 mb-4 font-serif flex items-center gap-2">
                    <Layout size={20}/> Salón / Mesas
                 </h2>
                 <TableGrid onSelectTable={handleTableSelect} />
             </div>
          </div>
      </div>
  );
};
