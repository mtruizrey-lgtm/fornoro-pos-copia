
import React, { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { PurchaseItem, Purchase, Supplier } from '../../types';
import { Plus, ShoppingBag, Trash2, Calendar, FileText, AlertTriangle, TrendingUp, Users, Phone, Edit3, Truck, Upload, Eye, X } from 'lucide-react';

export const Purchases: React.FC = () => {
  const { ingredients, addPurchase, purchases, currentBranchId, settings, suppliers, addSupplier, updateSupplier, deleteSupplier } = useApp();
  const [activeTab, setActiveTab] = useState<'history' | 'suppliers'>('history');
  
  // --- PURCHASE MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [provider, setProvider] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceImage, setInvoiceImage] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedIng, setSelectedIng] = useState('');
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);

  // --- SUPPLIER MODAL ---
  const [isSupModalOpen, setIsSupModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | undefined>(undefined);
  const [supForm, setSupForm] = useState<Partial<Supplier>>({});

  // --- INVOICE VIEWER ---
  const [viewingInvoice, setViewingInvoice] = useState<string | null>(null);

  // Deduplicate ingredients for the dropdown list
  const uniqueIngredients = useMemo(() => {
      const seen = new Set();
      return ingredients.filter(i => {
          if(i.isSubRecipe) return false; // Exclude produced items from purchase list
          const name = i.name.trim().toLowerCase();
          if(seen.has(name)) return false;
          seen.add(name);
          return true;
      }).sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients]);

  const handleAddItem = () => {
     if (!selectedIng || qty <= 0) return;
     setItems([...items, { ingredientId: selectedIng, quantity: qty, cost: cost }]);
     setSelectedIng('');
     setQty(1);
     setCost(0);
  };

  const handleRemoveItem = (index: number) => {
     setItems(items.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const img = new Image();
              img.src = reader.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const maxWidth = 800;
                  const scale = maxWidth / img.width;
                  canvas.width = maxWidth;
                  canvas.height = img.height * scale;
                  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                  setInvoiceImage(canvas.toDataURL('image/jpeg', 0.7));
              };
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmitPurchase = () => {
     if (!provider || items.length === 0) return;
     const total = items.reduce((acc, i) => acc + i.cost, 0);
     
     const newPurchase: Purchase = {
        id: `pur-${Date.now()}`,
        branchId: currentBranchId,
        provider,
        invoiceNumber,
        invoiceImageUrl: invoiceImage,
        date: new Date(date),
        items,
        total
     };
     
     addPurchase(newPurchase);
     setIsModalOpen(false);
     // Reset
     setProvider('');
     setInvoiceNumber('');
     setInvoiceImage('');
     setItems([]);
  };

  const handleSaveSupplier = () => {
     if (!supForm.name) return;
     if (editingSup) {
         updateSupplier(editingSup.id, supForm);
     } else {
         addSupplier({
             id: `sup-${Date.now()}`,
             name: supForm.name!,
             contact: supForm.contact,
             phone: supForm.phone,
             visitDays: supForm.visitDays
         } as Supplier);
     }
     setIsSupModalOpen(false);
  };

  const openSupModal = (s?: Supplier) => {
      setEditingSup(s);
      setSupForm(s || { name: '', contact: '', phone: '', visitDays: '' });
      setIsSupModalOpen(true);
  };

  // Stats Calculation for Suppliers
  const supplierStats = suppliers.map(s => {
      const totalBought = purchases.filter(p => p.provider === s.name).reduce((acc, p) => acc + p.total, 0);
      return { ...s, totalBought };
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
       <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Compras & Proveedores</h1>
          <p className="text-stone-500">Gestión de abastecimiento</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setActiveTab('history')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold border ${activeTab === 'history' ? 'bg-[var(--fr-green)] text-white border-[var(--fr-green)]' : 'bg-white text-stone-500 border-[var(--fr-line)]'}`}
            >
                Historial Compras
            </button>
            <button 
                onClick={() => setActiveTab('suppliers')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold border ${activeTab === 'suppliers' ? 'bg-[var(--fr-green)] text-white border-[var(--fr-green)]' : 'bg-white text-stone-500 border-[var(--fr-line)]'}`}
            >
                Directorio Proveedores
            </button>
        </div>
      </div>

      {/* --- TAB: HISTORY --- */}
      {activeTab === 'history' && (
          <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => setIsModalOpen(true)} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-[#1a3b2e] shadow-lg uppercase tracking-wider">
                    <Plus size={16} /> Registrar Compra
                </button>
            </div>
            <div className="bg-[var(--fr-card)] rounded-2xl shadow-sm border border border-[var(--fr-line)] overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--fr-bg)] text-stone-500 font-bold border-b border-[var(--fr-line)]">
                    <tr>
                        <th className="p-4">Fecha</th>
                        <th className="p-4">Proveedor</th>
                        <th className="p-4">Factura #</th>
                        <th className="p-4">Ítems</th>
                        <th className="p-4">Factura</th>
                        <th className="p-4 text-right">Total</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fr-line)]">
                    {[...purchases].reverse().map(p => (
                        <tr key={p.id} className="hover:bg-white transition">
                            <td className="p-4 font-mono">{new Date(p.date).toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-stone-700">{p.provider}</td>
                            <td className="p-4 text-stone-500">{p.invoiceNumber || '-'}</td>
                            <td className="p-4 text-stone-500">{p.items.length} productos</td>
                            <td className="p-4">
                                {p.invoiceImageUrl && (
                                    <button 
                                        onClick={() => setViewingInvoice(p.invoiceImageUrl!)} 
                                        className="text-[var(--fr-green)] hover:text-stone-800 transition"
                                        title="Ver Foto Factura"
                                    >
                                        <Eye size={20}/>
                                    </button>
                                )}
                            </td>
                            <td className="p-4 text-right font-bold text-[var(--fr-text)] font-mono">{settings.currencySymbol}{p.total.toFixed(2)}</td>
                        </tr>
                    ))}
                    {purchases.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-stone-400 italic">No hay compras registradas</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      {/* --- TAB: SUPPLIERS --- */}
      {activeTab === 'suppliers' && (
          <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => openSupModal()} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-lg uppercase tracking-wider">
                    <Users size={16} /> Nuevo Proveedor
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {supplierStats.map(s => (
                     <div key={s.id} className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm hover:shadow-md transition relative group">
                         <div className="flex justify-between items-start mb-4">
                             <div>
                                <h3 className="font-bold text-lg text-[var(--fr-green)] font-serif">{s.name}</h3>
                                <div className="text-xs text-stone-500 flex items-center gap-1"><Users size={12}/> {s.contact || 'Sin contacto'}</div>
                             </div>
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                 <button onClick={() => openSupModal(s)} className="p-2 bg-white border rounded-lg hover:bg-stone-100 text-blue-600"><Edit3 size={14}/></button>
                                 <button onClick={() => deleteSupplier(s.id)} className="p-2 bg-white border rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14}/></button>
                             </div>
                         </div>
                         
                         <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-stone-600 bg-white p-2 rounded border border-stone-100">
                                <Phone size={14} className="text-[var(--fr-red)]"/> {s.phone || '-'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-stone-600 bg-white p-2 rounded border border-stone-100">
                                <Truck size={14} className="text-amber-600"/> {s.visitDays || 'Días no definidos'}
                            </div>
                         </div>

                         <div className="pt-4 border-t border-[var(--fr-line)] flex justify-between items-center">
                             <span className="text-xs font-bold text-stone-400 uppercase">Total Comprado</span>
                             <span className="font-bold text-lg text-[var(--fr-text)] font-mono">{settings.currencySymbol}{s.totalBought.toFixed(0)}</span>
                         </div>
                     </div>
                 ))}
                 {supplierStats.length === 0 && (
                     <div className="col-span-3 text-center p-12 text-stone-400 italic">No hay proveedores registrados</div>
                 )}
              </div>
          </div>
      )}

      {/* New Purchase Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-[#1a3b2e]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto border border-[var(--fr-line)] shadow-2xl flex flex-col">
               <h2 className="text-2xl font-bold mb-6 text-[var(--fr-green)] font-serif">Nueva Compra</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-[var(--fr-bg)] p-4 rounded-xl border border-[var(--fr-line)]">
                  <div>
                     <label className="block text-xs font-bold text-stone-500 mb-1">Proveedor</label>
                     <select 
                        value={provider} 
                        onChange={e => setProvider(e.target.value)} 
                        className="w-full p-2 border border-[var(--fr-line)] rounded bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none"
                     >
                        <option value="">Seleccionar...</option>
                        {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                     </select>
                     {suppliers.length === 0 && <p className="text-[10px] text-red-500 mt-1">* Registra proveedores primero</p>}
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-stone-500 mb-1">Fecha</label>
                     <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-stone-500 mb-1">Factura #</label>
                     <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" />
                  </div>
                  <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-stone-500 mb-1">Foto Factura (Opcional)</label>
                      <div className="flex items-center gap-4">
                          {invoiceImage && (
                              <div className="w-12 h-12 border rounded overflow-hidden">
                                  <img src={invoiceImage} className="w-full h-full object-cover" />
                              </div>
                          )}
                          <label className="flex-1 cursor-pointer bg-white border border-dashed border-[var(--fr-green)] rounded-lg p-2 text-center text-xs font-bold text-[var(--fr-green)] hover:bg-green-50 flex items-center justify-center gap-2">
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/>
                              <Upload size={16}/> {invoiceImage ? 'Cambiar Foto' : 'Subir Foto'}
                          </label>
                      </div>
                  </div>
               </div>

               <div className="flex-1 flex flex-col">
                  <h3 className="font-bold text-sm text-stone-700 mb-2">Detalle de Productos</h3>
                  <div className="flex gap-2 mb-4 items-end">
                     <div className="flex-1">
                        <label className="block text-xs font-bold text-stone-500 mb-1">Producto</label>
                        <select 
                           value={selectedIng} 
                           onChange={e => setSelectedIng(e.target.value)} 
                           className="w-full p-2 border border-[var(--fr-line)] rounded bg-white text-sm"
                        >
                           <option value="">Seleccionar...</option>
                           {uniqueIngredients.map(i => (
                                  <option key={i.id} value={i.id}>{i.name} ({i.purchaseUnit})</option>
                               ))}
                        </select>
                     </div>
                     <div className="w-24">
                        <label className="block text-xs font-bold text-stone-500 mb-1">Cant.</label>
                        <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white text-sm text-center" />
                     </div>
                     <div className="w-32">
                        <label className="block text-xs font-bold text-stone-500 mb-1">Costo Total</label>
                        <input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white text-sm text-right" />
                     </div>
                     <button onClick={handleAddItem} className="px-3 py-2 bg-stone-800 text-white rounded hover:bg-black"><Plus size={18}/></button>
                  </div>

                  <div className="border border-[var(--fr-line)] rounded-lg overflow-hidden flex-1 min-h-[200px]">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-stone-100 text-stone-500 font-bold">
                           <tr>
                              <th className="p-2">Producto</th>
                              <th className="p-2 text-center">Cant.</th>
                              <th className="p-2 text-right">Costo</th>
                              <th className="w-10"></th>
                           </tr>
                        </thead>
                        <tbody>
                           {items.map((item, idx) => {
                              const ing = ingredients.find(i => i.id === item.ingredientId);
                              const unitCost = item.cost / item.quantity;
                              const lastCost = ing?.lastPurchaseCost || 0;
                              const isPriceHike = lastCost > 0 && unitCost > lastCost * 1.10;

                              return (
                                 <tr key={idx} className="border-b border-stone-100 last:border-0">
                                    <td className="p-2">
                                       <div className="flex items-center gap-2">
                                          <span>{ing?.name} <span className="text-xs text-stone-400">({ing?.purchaseUnit})</span></span>
                                          {isPriceHike && (
                                             <span title={`Sobrecosto! Anterior: ${settings.currencySymbol}${lastCost.toFixed(2)}`} className="text-[10px] font-bold text-red-600 bg-red-100 px-1 rounded flex items-center gap-1">
                                                <AlertTriangle size={10} /> +{((unitCost - lastCost)/lastCost * 100).toFixed(0)}%
                                             </span>
                                          )}
                                       </div>
                                    </td>
                                    <td className="p-2 text-center">{item.quantity}</td>
                                    <td className="p-2 text-right font-mono">{settings.currencySymbol}{item.cost.toFixed(2)}</td>
                                    <td className="p-2 text-center"><button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
                  <div className="text-right p-4 text-xl font-bold font-serif text-[var(--fr-text)]">
                     Total: {settings.currencySymbol}{items.reduce((a, b) => a + b.cost, 0).toFixed(2)}
                  </div>
               </div>

               <div className="flex justify-end gap-3 mt-6 border-t border-[var(--fr-line)] pt-4">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-stone-500 hover:bg-[var(--fr-bg)] rounded font-bold">Cancelar</button>
                  <button onClick={handleSubmitPurchase} className="px-6 py-2 bg-[var(--fr-green)] text-white rounded font-bold hover:bg-[#1a3b2e] uppercase tracking-wider text-sm shadow-lg">Guardar Compra</button>
               </div>
            </div>
         </div>
      )}

      {/* Supplier Modal */}
      {isSupModalOpen && (
          <div className="fixed inset-0 bg-[#1a3b2e]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-md p-6 border border-[var(--fr-line)] shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-[var(--fr-green)] font-serif">{editingSup ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Nombre Empresa</label>
                        <input value={supForm.name} onChange={e => setSupForm({...supForm, name: e.target.value})} className="w-full p-2 border rounded bg-white outline-none focus:ring-2 focus:ring-[var(--fr-green)]" autoFocus />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Contacto (Vendedor)</label>
                        <input value={supForm.contact} onChange={e => setSupForm({...supForm, contact: e.target.value})} className="w-full p-2 border rounded bg-white outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Teléfono</label>
                        <input value={supForm.phone} onChange={e => setSupForm({...supForm, phone: e.target.value})} className="w-full p-2 border rounded bg-white outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Días de Visita</label>
                        <input value={supForm.visitDays} onChange={e => setSupForm({...supForm, visitDays: e.target.value})} className="w-full p-2 border rounded bg-white outline-none" placeholder="Ej. Lunes y Jueves" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setIsSupModalOpen(false)} className="px-4 py-2 text-stone-500 hover:bg-[var(--fr-bg)] rounded font-bold">Cancelar</button>
                    <button onClick={handleSaveSupplier} className="px-6 py-2 bg-[var(--fr-green)] text-white rounded font-bold hover:bg-[#1a3b2e]">Guardar</button>
                </div>
            </div>
          </div>
      )}

      {/* Invoice Viewer Modal */}
      {viewingInvoice && (
          <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4 cursor-pointer" onClick={() => setViewingInvoice(null)}>
              <div className="relative max-w-3xl w-full max-h-full overflow-auto p-1">
                  <button className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 hover:bg-red-600 z-10">
                      <X size={24}/>
                  </button>
                  <img src={viewingInvoice} className="w-full h-auto rounded-lg shadow-2xl" />
              </div>
          </div>
      )}
    </div>
  );
};
