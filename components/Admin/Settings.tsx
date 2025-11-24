
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { 
  Product, OrderType, Role, PrinterDefinition, User, AppSettings, 
  Branch, Table, ModifierGroup, Discount, LoyaltyReward, PackagingRule,
  ModifierOption, ProductIngredient, LoyaltyTier, Ingredient
} from '../../types';
import { 
  Settings as SettingsIcon, Save, Plus, Trash2, Edit3, Image as ImageIcon, 
  Copy, SlidersHorizontal, X, Upload, Search, Printer, User as UserIcon, 
  Store, Database, AlertTriangle, CheckCircle, RefreshCw, DollarSign, LayoutGrid,
  MapPin, Layout, Sparkles, Tag, Crown, Package, Clock, Calendar, Globe, UtensilsCrossed, TrendingUp, TrendingDown
} from 'lucide-react';

// --- SUB-COMPONENTS ---

const ProductEditModal: React.FC<{ product?: Product, onClose: () => void, onSave: (p: Product) => void }> = ({ product, onClose, onSave }) => {
    const { productCategories, ingredients, settings, currentBranchId, packagingRules } = useApp();
    
    // Filter duplicates for UI selector - PRIORITIZING CURRENT BRANCH
    const uniqueIngredients = useMemo(() => {
        const map = new Map<string, Ingredient>();
        // 1. Load Current Branch items first (Preferred)
        ingredients.filter(i => i.branchId === currentBranchId).forEach(i => {
            map.set(i.name.trim().toLowerCase(), i);
        });
        // 2. Load others if not present (Fallbacks)
        ingredients.filter(i => i.branchId !== currentBranchId).forEach(i => {
            const key = i.name.trim().toLowerCase();
            if(!map.has(key)) map.set(key, i);
        });
        
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [ingredients, currentBranchId]);

    const [form, setForm] = useState<Product>({
        id: product?.id || `prod-${Date.now()}`,
        name: product?.name || '',
        category: product?.category || (productCategories && productCategories.length > 0 ? productCategories[0] : 'General'),
        prices: product?.prices || { [OrderType.DINE_IN]: 0, [OrderType.TAKEOUT]: 0, [OrderType.DELIVERY_UBER]: 0, [OrderType.DELIVERY_PEDIDOSYA]: 0 },
        ingredients: product?.ingredients || [],
        image: product?.image || ''
    });
    const [newCategory, setNewCategory] = useState('');
    const [showCatInput, setShowCatInput] = useState(false);
    const [searchIng, setSearchIng] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // COMPRESSION & JPG CONVERSION LOGIC
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; // Resize if too big
                    const scale = MAX_WIDTH / img.width;
                    canvas.width = Math.min(MAX_WIDTH, img.width);
                    canvas.height = img.height * (scale < 1 ? scale : 1);
                    
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        // Convert to JPG with 0.7 quality
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        setForm({ ...form, image: dataUrl });
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    // Helper to get ingredient details safely and resolve local cost
    const getIngredientDetails = (id: string) => {
        const directMatch = ingredients.find(i => i.id === id);
        if (directMatch) {
             if (directMatch.branchId === currentBranchId) return directMatch;
             const localEquivalent = ingredients.find(i => i.branchId === currentBranchId && i.name.trim().toLowerCase() === directMatch.name.trim().toLowerCase());
             if (localEquivalent) return localEquivalent;
             return directMatch; 
        }
        return undefined;
    };

    // --- FINANCIAL CALCULATIONS ---
    const recipeCost = form.ingredients.reduce((acc, item) => {
        const ing = getIngredientDetails(item.ingredientId);
        return acc + ((ing?.cost || 0) * item.quantity);
    }, 0);

    const indirectCost = recipeCost * (settings.indirectCostRate / 100);
    const totalBaseCost = recipeCost + indirectCost;

    const channelAnalysis = useMemo(() => {
        return Object.values(OrderType).map(type => {
            const price = form.prices[type] || 0;
            
            // Commission
            let commRate = 0;
            if (type === OrderType.DELIVERY_UBER) commRate = settings.uberCommissionRate || 0;
            if (type === OrderType.DELIVERY_PEDIDOSYA) commRate = settings.pedidosYaCommissionRate || 0;
            const commission = price * (commRate / 100);
            
            // Packaging Cost
            let pkgCost = 0;
            packagingRules.forEach(rule => {
                if (!rule.applyToOrderTypes.includes(type)) return;
                
                let applies = false;
                if (rule.applyToProductIds && rule.applyToProductIds.length > 0) {
                    if (rule.applyToProductIds.includes(form.id)) applies = true;
                } else if (rule.applyToCategories.length > 0) {
                    if (rule.applyToCategories.includes(form.category)) applies = true;
                } else {
                    applies = true; 
                }

                if (applies && rule.applyPer === 'ITEM') {
                     rule.ingredients.forEach(ri => {
                         const ing = getIngredientDetails(ri.ingredientId);
                         if(ing) pkgCost += ing.cost * ri.quantity;
                     });
                }
            });

            const totalCost = recipeCost + indirectCost + pkgCost;
            const profit = (price - commission) - totalCost;
            const margin = price > 0 ? (profit / price) * 100 : 0;

            return { type, price, commission, pkgCost, totalCost, profit, margin };
        });
    }, [form, recipeCost, settings, packagingRules]);

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#FAF3E3] rounded-none md:rounded-xl w-full max-w-5xl h-full md:h-auto md:max-h-[95vh] shadow-2xl flex flex-col overflow-hidden border-4 border-[#FAF3E3]">
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center bg-[#FAF3E3] shrink-0">
                    <h2 className="text-3xl font-bold font-serif text-[#224C3B]">{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                    <button onClick={onClose}><X size={28} className="text-stone-400 hover:text-stone-600" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto px-8 pb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        
                        {/* LEFT COLUMN */}
                        <div className="space-y-8">
                            <div>
                                <label className="block text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider">NOMBRE</label>
                                <input 
                                    value={form.name} 
                                    onChange={e => setForm({...form, name: e.target.value})} 
                                    className="w-full p-4 text-xl font-bold border border-[#D9CBB7] rounded-xl bg-white focus:ring-2 focus:ring-[#224C3B] outline-none text-stone-800 placeholder:text-stone-300" 
                                    placeholder="Ej. Tiramisú"
                                    autoFocus 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider">CATEGORÍA</label>
                                    {!showCatInput ? (
                                        <div className="flex gap-2">
                                            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 border border-[#D9CBB7] rounded-xl bg-white text-stone-700 font-bold">
                                                {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <button onClick={() => setShowCatInput(true)} className="p-3 bg-stone-200 rounded-xl hover:bg-stone-300"><Plus size={18}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nueva..." className="w-full p-3 border border-[#D9CBB7] rounded-xl bg-white" />
                                            <button onClick={() => { if(newCategory) { setForm({...form, category: newCategory}); setShowCatInput(false); } }} className="p-3 bg-[#224C3B] text-white rounded-xl"><CheckCircle size={18}/></button>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider">IMAGEN</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center justify-center gap-2 bg-white border border-dashed border-[#D9CBB7] rounded-xl p-3 cursor-pointer hover:bg-white/50 transition text-stone-500 font-bold text-sm">
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/>
                                            <ImageIcon size={18}/> {form.image ? 'Cambiar Foto' : 'Subir Foto'}
                                        </label>
                                        {form.image && (
                                            <div className="h-32 w-full rounded-xl overflow-hidden border border-[#D9CBB7] shadow-sm">
                                                <img src={form.image} className="w-full h-full object-cover"/>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-[#D9CBB7] shadow-sm">
                                <h3 className="font-bold text-[#224C3B] mb-4 font-serif flex items-center gap-2"><DollarSign size={18}/> Precios por Plataforma</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.values(OrderType).map(type => (
                                        <div key={type}>
                                            <label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase">{type.replace('DELIVERY_', '')}</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">{settings.currencySymbol}</span>
                                                <input 
                                                    type="number" 
                                                    value={form.prices[type] || 0} 
                                                    onChange={e => setForm({ ...form, prices: { ...form.prices, [type]: Number(e.target.value) } })} 
                                                    className="w-full pl-7 p-3 text-base font-bold border border-[#D9CBB7] rounded-xl outline-none focus:border-[#224C3B] text-stone-800"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col gap-6 h-full">
                            {/* RECIPE CARD */}
                            <div className="bg-white rounded-2xl border border-[#D9CBB7] shadow-sm flex flex-col overflow-hidden flex-1 min-h-[300px]">
                                <div className="p-4 border-b border-[#D9CBB7] flex justify-between items-center bg-white">
                                    <h3 className="font-bold text-stone-700 font-serif">Receta (Ficha Técnica)</h3>
                                    
                                    {/* Search Dropdown */}
                                    <div className="relative w-48">
                                        <div className="flex items-center border border-[#D9CBB7] rounded-lg px-2 bg-[#FAF3E3]">
                                            <Plus size={14} className="text-stone-400"/>
                                            <input 
                                                placeholder="Agregar Insumo" 
                                                value={searchIng} 
                                                onChange={e => { setSearchIng(e.target.value); setShowDropdown(true); }}
                                                onFocus={() => setShowDropdown(true)}
                                                className="w-full p-2 text-xs bg-transparent outline-none font-bold text-stone-600 placeholder:text-stone-400"
                                            />
                                        </div>
                                        {showDropdown && (
                                            <div className="absolute top-full right-0 w-64 bg-white border border-[#D9CBB7] rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1 z-50">
                                                {uniqueIngredients.filter(i => i.name.toLowerCase().includes(searchIng.toLowerCase())).map(i => (
                                                    <button 
                                                        key={i.id} 
                                                        onClick={() => { 
                                                            setForm({ ...form, ingredients: [...form.ingredients, { ingredientId: i.id, quantity: 1 }] }); 
                                                            setSearchIng(''); 
                                                            setShowDropdown(false);
                                                        }} 
                                                        className="w-full text-left p-3 text-xs hover:bg-[#FAF3E3] border-b border-stone-100 flex justify-between items-center"
                                                    >
                                                        <span className="font-bold text-stone-700">{i.name}</span>
                                                        <span className="text-stone-400">{i.unit}</span>
                                                    </button>
                                                ))}
                                                {uniqueIngredients.filter(i => i.name.toLowerCase().includes(searchIng.toLowerCase())).length === 0 && (
                                                    <div className="p-3 text-center text-xs text-stone-400 italic">No encontrado</div>
                                                )}
                                                <button onClick={() => setShowDropdown(false)} className="w-full p-2 text-center text-[10px] text-red-400 bg-stone-50 font-bold uppercase tracking-wider">Cerrar</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-stone-50/30">
                                    {form.ingredients.map((pi, idx) => { 
                                        const ing = getIngredientDetails(pi.ingredientId); 
                                        const lineTotal = (ing?.cost || 0) * pi.quantity;
                                        return (
                                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#D9CBB7]/50">
                                                <div className="flex-1">
                                                    <div className="font-bold text-stone-700 text-sm">{ing?.name}</div>
                                                    <div className="text-[10px] text-stone-400 font-mono">{settings.currencySymbol}{(ing?.cost || 0).toFixed(2)}/{ing?.unit}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="number" 
                                                        value={pi.quantity} 
                                                        onChange={e => { 
                                                            const newIngs = [...form.ingredients]; 
                                                            newIngs[idx].quantity = Number(e.target.value); 
                                                            setForm({ ...form, ingredients: newIngs }); 
                                                        }} 
                                                        className="w-16 p-1 border border-[#D9CBB7] rounded text-center text-sm font-bold outline-none bg-white"
                                                    />
                                                    <span className="text-xs text-stone-500 font-bold w-6">{ing?.unit}</span>
                                                    <div className="text-right w-16 font-mono font-bold text-stone-700 text-sm">
                                                        {settings.currencySymbol}{lineTotal.toFixed(2)}
                                                    </div>
                                                    <button 
                                                        onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== idx) })} 
                                                        className="text-red-300 hover:text-red-500"
                                                    >
                                                        <X size={16}/>
                                                    </button>
                                                </div>
                                            </div>
                                        ); 
                                    })}
                                    {form.ingredients.length === 0 && <div className="text-center text-stone-300 text-sm py-10 italic">Agrega insumos para calcular el costo</div>}
                                </div>
                            </div>

                            {/* FINANCIAL CARD */}
                            <div className="bg-[#FAF3E3] rounded-2xl border-2 border-[#D9CBB7] overflow-hidden shadow-sm mt-auto">
                                <div className="bg-[#224C3B] h-1"></div> {/* Decorative Top Bar */}
                                <div className="p-5">
                                    <h3 className="font-bold text-lg font-serif text-[#1E1E1E] mb-4 flex items-center gap-2"><TrendingUp size={18}/> FINANZAS & RENTABILIDAD</h3>
                                    
                                    {/* SUMMARY BOXES */}
                                    <div className="flex gap-4 mb-6">
                                        <div className="flex-1 bg-white border border-[#D9CBB7] rounded-lg p-2 text-center">
                                            <div className="text-[10px] text-stone-400 font-bold uppercase">DIRECTO</div>
                                            <div className="font-mono font-bold text-stone-700 text-lg">{settings.currencySymbol}{recipeCost.toFixed(2)}</div>
                                        </div>
                                        <div className="flex-1 bg-white border border-[#D9CBB7] rounded-lg p-2 text-center">
                                            <div className="text-[10px] text-stone-400 font-bold uppercase">INDIR. ({settings.indirectCostRate}%)</div>
                                            <div className="font-mono font-bold text-stone-700 text-lg">{settings.currencySymbol}{indirectCost.toFixed(2)}</div>
                                        </div>
                                        <div className="flex-1 bg-[#1E1E1E] border border-[#1E1E1E] rounded-lg p-2 text-center text-white">
                                            <div className="text-[10px] text-white/50 font-bold uppercase">COSTO TOTAL</div>
                                            <div className="font-mono font-bold text-[#C0392B] text-lg">{settings.currencySymbol}{totalBaseCost.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    {/* PROFITABILITY TABLE */}
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-stone-400 uppercase font-bold border-b border-[#D9CBB7]">
                                                <th className="text-left pb-2">CANAL</th>
                                                <th className="text-right pb-2">PRECIO</th>
                                                <th className="text-right pb-2">COMISIÓN</th>
                                                <th className="text-right pb-2">GANANCIA</th>
                                                <th className="text-right pb-2">MARGEN</th>
                                            </tr>
                                        </thead>
                                        <tbody className="font-mono font-bold text-stone-600">
                                            {channelAnalysis.map((row) => (
                                                <tr key={row.type} className="border-b border-[#D9CBB7]/30 last:border-0">
                                                    <td className="py-2 uppercase text-stone-800 font-sans">{row.type.replace('DELIVERY_', '')}</td>
                                                    <td className="py-2 text-right text-stone-400 font-normal">{settings.currencySymbol}{row.price.toFixed(2)}</td>
                                                    <td className="py-2 text-right text-red-400">{row.commission > 0 ? `-${settings.currencySymbol}${row.commission.toFixed(2)}` : '-'}</td>
                                                    <td className={`py-2 text-right ${row.profit > 0 ? 'text-[#224C3B]' : 'text-red-600'}`}>{settings.currencySymbol}{row.profit.toFixed(2)}</td>
                                                    <td className={`py-2 text-right ${row.margin >= 50 ? 'text-green-600' : row.margin >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>{row.margin.toFixed(0)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* FOOTER */}
                <div className="p-6 bg-white border-t border-[#D9CBB7] flex justify-end gap-4 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 text-stone-500 font-bold hover:text-stone-700 transition">Cancelar</button>
                    <button 
                        onClick={() => onSave(form)} 
                        disabled={!form.name || form.ingredients.length === 0} 
                        className="px-8 py-3 bg-[#224C3B] text-white font-bold rounded-xl hover:bg-[#1a3b2e] disabled:opacity-50 shadow-lg uppercase tracking-wider text-sm transition transform hover:scale-105"
                    >
                        GUARDAR PRODUCTO
                    </button>
                </div>
            </div>
        </div>
    );
};

const BulkPriceEditor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { products, updateProductBatch, productCategories } = useApp();
    const [category, setCategory] = useState('all');
    const [operation, setOperation] = useState<'increase_pct' | 'decrease_pct' | 'set_fixed'>('increase_pct');
    const [value, setValue] = useState(0);
    const [targetType, setTargetType] = useState<OrderType | 'all'>('all');

    const handleApply = async () => {
        if (value === 0 && operation !== 'set_fixed') return;
        if (!confirm(`¿Estás seguro de modificar precios masivamente? Esta acción afectará a ${category === 'all' ? products.length : products.filter(p => p.category === category).length} productos.`)) return;

        const updates = products
            .filter(p => category === 'all' || p.category === category)
            .map(p => {
                const newPrices = { ...p.prices };
                Object.keys(newPrices).forEach(key => {
                    const type = key as OrderType;
                    if (targetType === 'all' || targetType === type) {
                        const current = newPrices[type];
                        if (operation === 'increase_pct') newPrices[type] = current * (1 + value / 100);
                        else if (operation === 'decrease_pct') newPrices[type] = current * (1 - value / 100);
                        else if (operation === 'set_fixed') newPrices[type] = value;
                        
                        // Round to 2 decimals
                        newPrices[type] = Math.round(newPrices[type] * 100) / 100;
                    }
                });
                return { id: p.id, data: { prices: newPrices } };
            });
            
        await updateProductBatch(updates);
        alert("Precios actualizados correctamente.");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-md p-6 border border-[var(--fr-line)] shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-[var(--fr-green)] font-serif flex items-center gap-2"><SlidersHorizontal size={20}/> Edición Masiva de Precios</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Categoría Afectada</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border rounded bg-white font-bold text-stone-700">
                            <option value="all">Todas las Categorías</option>
                            {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Canal de Venta</label>
                        <select value={targetType} onChange={e => setTargetType(e.target.value as any)} className="w-full p-2 border rounded bg-white font-bold text-stone-700">
                            <option value="all">Todos los Canales</option>
                            {Object.values(OrderType).map(t => <option key={t} value={t}>{t.replace('DELIVERY_', '')}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-1">Operación</label>
                            <select value={operation} onChange={e => setOperation(e.target.value as any)} className="w-full p-2 border rounded bg-white text-sm">
                                <option value="increase_pct">Aumentar %</option>
                                <option value="decrease_pct">Disminuir %</option>
                                <option value="set_fixed">Fijar Precio</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-1">Valor</label>
                            <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-center font-bold" />
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mt-4 text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                    <p>Esta acción modificará múltiples productos permanentemente. Revisa antes de aplicar.</p>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-2 border rounded font-bold text-stone-500">Cancelar</button>
                    <button onClick={handleApply} className="flex-1 py-2 bg-[var(--fr-green)] text-white rounded font-bold hover:bg-[#1a3b2e]">Aplicar Cambios</button>
                </div>
            </div>
        </div>
    );
};

// --- SETTINGS MAIN ---
export const Settings: React.FC = () => {
  const { 
      settings, updateSettings, 
      products, addProduct, updateProduct, deleteProduct, updateProductBatch, productCategories,
      printers, addPrinter, updatePrinter, deletePrinter,
      users, addUser, updateUser, deleteUser,
      branches, addBranch, updateBranch, deleteBranch, currentBranchId,
      tables, addTable, updateTable, deleteTable,
      modifierGroups, addModifierGroup, updateModifierGroup, deleteModifierGroup,
      discounts, addDiscount, updateDiscount, deleteDiscount,
      loyaltyRewards, addLoyaltyReward, updateLoyaltyReward, deleteLoyaltyReward,
      packagingRules, addPackagingRule, updatePackagingRule, deletePackagingRule,
      ingredients,
      initializeDatabase, createBackup, restoreBackup, clearTestData
  } = useApp();

  const [activeTab, setActiveTab] = useState('general');
  
  // State Management for various forms
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  
  const [printerForm, setPrinterForm] = useState<Partial<PrinterDefinition>>({});
  const [showPrinterForm, setShowPrinterForm] = useState(false);
  
  const [userForm, setUserForm] = useState<Partial<User>>({});
  const [showUserForm, setShowUserForm] = useState(false);

  const [branchForm, setBranchForm] = useState<Partial<Branch>>({});
  const [showBranchForm, setShowBranchForm] = useState(false);

  const [tableForm, setTableForm] = useState<Partial<Table>>({});
  const [showTableForm, setShowTableForm] = useState(false);

  const [modForm, setModForm] = useState<Partial<ModifierGroup>>({});
  const [showModForm, setShowModForm] = useState(false);

  const [discForm, setDiscForm] = useState<Partial<Discount>>({});
  const [showDiscForm, setShowDiscForm] = useState(false);

  const [pkgForm, setPkgForm] = useState<Partial<PackagingRule>>({});
  const [showPkgForm, setShowPkgForm] = useState(false);

  const [rwdForm, setRwdForm] = useState<Partial<LoyaltyReward>>({});
  const [showRwdForm, setShowRwdForm] = useState(false);

  // Loyalty Tiers State
  const [editingTierIndex, setEditingTierIndex] = useState<number | null>(null);
  const [tierForm, setTierForm] = useState<LoyaltyTier>({ name: '', minPoints: 0, color: '#000000' });
  const [showTierForm, setShowTierForm] = useState(false);

  // Helper for unique ingredients list in selectors
  const uniqueIngredients = useMemo(() => {
      const seen = new Set();
      return ingredients.filter(i => {
          const name = i.name.trim().toLowerCase();
          if (seen.has(name)) return false;
          seen.add(name);
          return true;
      }).sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients]);

  // --- HANDLERS ---
  const handlePrinterSave = () => { if(!printerForm.name || !printerForm.branchId) return; const p:any = { ...printerForm, id: printerForm.id || `prn-${Date.now()}` }; if(printerForm.id) updatePrinter(p.id, p); else addPrinter(p); setShowPrinterForm(false); setPrinterForm({}); };
  const handleUserSave = () => { if(!userForm.name || !userForm.pin) return; const u:any = { ...userForm, id: userForm.id || `usr-${Date.now()}` }; if(userForm.id) updateUser(u.id, u); else addUser(u); setShowUserForm(false); setUserForm({}); };
  
  const handleBranchSave = () => { if(!branchForm.name) return; const b:any = { ...branchForm, id: branchForm.id || `br-${Date.now()}` }; if(branchForm.id) updateBranch(b.id, b); else addBranch(b); setShowBranchForm(false); setBranchForm({}); };
  
  const handleTableSave = () => { if(!tableForm.name || !tableForm.branchId) return; const t:any = { ...tableForm, id: tableForm.id || `tbl-${Date.now()}`, isOccupied: false, currentOrderIds: [] }; if(tableForm.id) updateTable(t.id, t); else addTable(t); setShowTableForm(false); setTableForm({}); };

  const handleModSave = () => { if(!modForm.name) return; const m:any = { ...modForm, id: modForm.id || `mod-${Date.now()}` }; if(modForm.id) updateModifierGroup(m.id, m); else addModifierGroup(m); setShowModForm(false); setModForm({}); };

  const handleDiscSave = () => { if(!discForm.name) return; const d:any = { ...discForm, id: discForm.id || `dsc-${Date.now()}`, isActive: true }; if(discForm.id) updateDiscount(d.id, d); else addDiscount(d); setShowDiscForm(false); setDiscForm({}); };

  const handlePkgSave = () => { if(!pkgForm.name) return; const p:any = { ...pkgForm, id: pkgForm.id || `pkg-${Date.now()}` }; if(pkgForm.id) updatePackagingRule(p.id, p); else addPackagingRule(p); setShowPkgForm(false); setPkgForm({}); };

  const handleRwdSave = () => { if(!rwdForm.name) return; const r:any = { ...rwdForm, id: rwdForm.id || `rwd-${Date.now()}`, isActive: true }; if(rwdForm.id) updateLoyaltyReward(r.id, r); else addLoyaltyReward(r); setShowRwdForm(false); setRwdForm({}); };

  const handleTierSave = () => {
    if (!tierForm.name) return;
    const newTiers = [...settings.loyaltyTiers];
    if (editingTierIndex !== null) {
        newTiers[editingTierIndex] = tierForm;
    } else {
        newTiers.push(tierForm);
    }
    // Sort by points
    newTiers.sort((a,b) => a.minPoints - b.minPoints);
    updateSettings({ ...settings, loyaltyTiers: newTiers });
    setShowTierForm(false);
    setEditingTierIndex(null);
    setTierForm({ name: '', minPoints: 0, color: '#000000' });
  };

  const deleteTier = (index: number) => {
    const newTiers = settings.loyaltyTiers.filter((_, i) => i !== index);
    updateSettings({ ...settings, loyaltyTiers: newTiers });
  };

  const handleDuplicateProduct = (p: Product) => {
    addProduct({
        ...p,
        id: `prod-${Date.now()}`,
        name: `${p.name} (Copia)`
    });
    alert("Producto duplicado correctamente.");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          const reader = new FileReader();
          reader.onloadend = () => updateSettings({ ...settings, logoUrl: reader.result as string });
          reader.readAsDataURL(file);
      }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if(file) restoreBackup(file); };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
       <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif mb-8">Configuración & Administración</h1>

      <div className="flex gap-2 mb-8 border-b border-[var(--fr-line)] overflow-x-auto scrollbar-hide">
          {[
              {id: 'general', label: 'General', icon: Store},
              {id: 'branches', label: 'Sucursales', icon: MapPin},
              {id: 'tables', label: 'Mesas', icon: Layout},
              {id: 'products', label: 'Menú', icon: LayoutGrid},
              {id: 'modifiers', label: 'Extras', icon: Plus},
              {id: 'discounts', label: 'Ofertas', icon: Tag},
              {id: 'loyalty', label: 'Fidelización', icon: Crown},
              {id: 'packaging', label: 'Empaque', icon: Package},
              {id: 'printers', label: 'Impresoras', icon: Printer},
              {id: 'users', label: 'Usuarios', icon: UserIcon},
              {id: 'database', label: 'Datos', icon: Database}
          ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`pb-3 px-4 font-bold whitespace-nowrap transition flex items-center gap-2 ${activeTab === tab.id ? 'text-[var(--fr-green)] border-b-4 border-[var(--fr-green)]' : 'text-stone-400 hover:text-stone-600'}`}
              >
                  <tab.icon size={18}/> {tab.label}
              </button>
          ))}
      </div>

      {/* --- GENERAL --- */}
      {activeTab === 'general' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-[var(--fr-card)] p-8 rounded-2xl border border-[var(--fr-line)] shadow-sm">
                  <h3 className="font-bold text-xl text-[var(--fr-green)] mb-6 font-serif">Branding & Datos</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                          <label className="block text-xs font-bold text-stone-500 mb-2">Nombre App / Restaurante</label>
                          <input 
                            value={settings.storeName} 
                            onChange={e => updateSettings({...settings, storeName: e.target.value})} 
                            className="w-full p-3 border border-[var(--fr-line)] rounded-xl bg-white outline-none focus:border-[var(--fr-green)]" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-stone-500 mb-2">Logo</label>
                          <div className="flex gap-4">
                              <div className="w-12 h-12 bg-white border rounded-lg flex items-center justify-center overflow-hidden">
                                  {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain"/> : <Store size={20} className="text-stone-300"/>}
                              </div>
                              <label className="flex-1 flex items-center justify-center gap-2 bg-white border border-[var(--fr-line)] rounded-xl cursor-pointer hover:bg-stone-50 font-bold text-sm text-stone-600">
                                  <Upload size={16}/> Cambiar Logo
                                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                              </label>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                          <label className="block text-xs font-bold text-stone-500 mb-2">Moneda</label>
                          <input 
                            value={settings.currencySymbol} 
                            onChange={e => updateSettings({...settings, currencySymbol: e.target.value})} 
                            className="w-full p-3 border border-[var(--fr-line)] rounded-xl bg-white font-mono font-bold" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-stone-500 mb-2">Tasa Impuestos (%)</label>
                          <input 
                            type="number"
                            value={settings.taxRate} 
                            onChange={e => updateSettings({...settings, taxRate: Number(e.target.value)})} 
                            className="w-full p-3 border border-[var(--fr-line)] rounded-xl bg-white" 
                          />
                      </div>
                  </div>

                  <div className="mb-6">
                      <label className="block text-xs font-bold text-stone-500 mb-2">Costos Indirectos (%)</label>
                      <input 
                        type="number"
                        value={settings.indirectCostRate} 
                        onChange={e => updateSettings({...settings, indirectCostRate: Number(e.target.value)})} 
                        className="w-full p-3 border border-[var(--fr-line)] rounded-xl bg-white" 
                      />
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-stone-500 mb-2">Dirección Central</label>
                      <input 
                        value={settings.address} 
                        onChange={e => updateSettings({...settings, address: e.target.value})} 
                        className="w-full p-3 border border-[var(--fr-line)] rounded-xl bg-white" 
                      />
                  </div>
              </div>

              <div className="bg-[var(--fr-card)] p-8 rounded-2xl border border-[var(--fr-line)] shadow-sm">
                  <h3 className="font-bold text-xl text-[var(--fr-green)] mb-6 font-serif flex items-center gap-2"><Printer size={20}/> Personalización de Ticket</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold text-stone-500 mb-2">Encabezado (Bienvenida)</label>
                          <textarea 
                            value={settings.ticketHeader} 
                            onChange={e => updateSettings({...settings, ticketHeader: e.target.value})} 
                            className="w-full p-3 border border-[var(--fr-line)] rounded-xl bg-white h-24 text-sm font-mono" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-stone-500 mb-2">Pie de Página (Despedida / Wifi)</label>
                          <textarea 
                            value={settings.ticketFooter} 
                            onChange={e => updateSettings({...settings, ticketFooter: e.target.value})} 
                            className="w-full p-3 border border-[var(--fr-line)] rounded-xl bg-white h-24 text-sm font-mono" 
                          />
                      </div>
                  </div>
              </div>

              <div className="bg-purple-50 p-8 rounded-2xl border border-purple-100 shadow-sm">
                  <h3 className="font-bold text-xl text-purple-900 mb-6 font-serif flex items-center gap-2"><Globe size={20}/> Comisiones Plataformas (%)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold text-purple-700 mb-2">Uber Eats</label>
                          <input 
                            type="number"
                            value={settings.uberCommissionRate} 
                            onChange={e => updateSettings({...settings, uberCommissionRate: Number(e.target.value)})} 
                            className="w-full p-3 border border-purple-200 rounded-xl bg-white text-purple-900 font-bold text-center" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-purple-700 mb-2">PedidosYa</label>
                          <input 
                            type="number"
                            value={settings.pedidosYaCommissionRate} 
                            onChange={e => updateSettings({...settings, pedidosYaCommissionRate: Number(e.target.value)})} 
                            className="w-full p-3 border border-purple-200 rounded-xl bg-white text-purple-900 font-bold text-center" 
                          />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- PRODUCTS --- */}
      {activeTab === 'products' && (
          <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                  <button onClick={() => setBulkEditOpen(true)} className="text-stone-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-100 border border-stone-200 transition"><SlidersHorizontal size={18} /> Edición Masiva</button>
                  <button onClick={() => { setEditingProduct(undefined); setProductModalOpen(true); }} className="bg-[var(--fr-green)] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a3b2e] shadow-lg transition"><Plus size={20} /> Nuevo Producto</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...products].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <div key={p.id} className="bg-[var(--fr-card)] p-4 rounded-xl border border-[var(--fr-line)] flex gap-4 shadow-sm hover:shadow-md transition group">
                          <div className="w-20 h-20 bg-stone-200 rounded-lg overflow-hidden shrink-0 border border-stone-200">
                              {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-400"><ImageIcon/></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="text-xs text-[var(--fr-green)] font-bold uppercase tracking-wider mb-1">{p.category}</div>
                              <h3 className="font-bold text-[var(--fr-text)] truncate">{p.name}</h3>
                              <p className="text-stone-500 text-sm font-mono mt-1 font-bold">{settings.currencySymbol}{p.prices[OrderType.DINE_IN].toFixed(2)}</p>
                          </div>
                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingProduct(p); setProductModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit3 size={16}/></button>
                              <button onClick={() => handleDuplicateProduct(p)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Duplicar"><Copy size={16}/></button>
                              <button onClick={() => deleteProduct(p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  ))}
              </div>
              {productModalOpen && <ProductEditModal product={editingProduct} onClose={() => setProductModalOpen(false)} onSave={(p) => { if(editingProduct) updateProduct(p.id, p); else addProduct(p); setProductModalOpen(false); }} />}
              {bulkEditOpen && <BulkPriceEditor onClose={() => setBulkEditOpen(false)} />}
          </div>
      )}

      {/* --- BRANCHES --- */}
      {activeTab === 'branches' && (
          <div className="animate-in fade-in">
              <div className="flex justify-end mb-6"><button onClick={() => { setBranchForm({}); setShowBranchForm(true); }} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center"><Plus size={18}/> Nueva Sucursal</button></div>
              {showBranchForm && (
                  <div className="mb-6 bg-[var(--fr-card)] p-6 rounded-xl border shadow-lg max-w-lg mx-auto">
                      <h3 className="font-bold mb-4">{branchForm.id ? 'Editar' : 'Crear'} Sucursal</h3>
                      <div className="space-y-4">
                          <input value={branchForm.name || ''} onChange={e => setBranchForm({...branchForm, name: e.target.value})} className="w-full p-2 border rounded" placeholder="Nombre" autoFocus />
                          <input value={branchForm.address || ''} onChange={e => setBranchForm({...branchForm, address: e.target.value})} className="w-full p-2 border rounded" placeholder="Dirección" />
                          <input value={branchForm.phone || ''} onChange={e => setBranchForm({...branchForm, phone: e.target.value})} className="w-full p-2 border rounded" placeholder="Teléfono" />
                          <div className="flex gap-2 justify-end"><button onClick={() => setShowBranchForm(false)} className="px-4 py-2 border rounded text-stone-500">Cancelar</button><button onClick={handleBranchSave} className="px-4 py-2 bg-[var(--fr-green)] text-white rounded font-bold">Guardar</button></div>
                      </div>
                  </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branches.map(b => (
                      <div key={b.id} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
                          <div><h3 className="font-bold text-lg">{b.name}</h3><p className="text-xs text-stone-500">{b.address}</p></div>
                          <div className="flex gap-2"><button onClick={() => { setBranchForm(b); setShowBranchForm(true); }} className="p-2 bg-blue-50 text-blue-600 rounded"><Edit3 size={16}/></button><button onClick={() => deleteBranch(b.id)} className="p-2 bg-red-50 text-red-600 rounded"><Trash2 size={16}/></button></div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- TABLES --- */}
      {activeTab === 'tables' && (
          <div className="animate-in fade-in">
              <div className="flex justify-end mb-6"><button onClick={() => { setTableForm({ branchId: currentBranchId }); setShowTableForm(true); }} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center"><Plus size={18}/> Nueva Mesa</button></div>
              {showTableForm && (
                  <div className="mb-6 bg-[var(--fr-card)] p-6 rounded-xl border shadow-lg max-w-lg mx-auto">
                      <h3 className="font-bold mb-4">{tableForm.id ? 'Editar' : 'Crear'} Mesa</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2"><label className="text-xs font-bold">Nombre</label><input value={tableForm.name || ''} onChange={e => setTableForm({...tableForm, name: e.target.value})} className="w-full p-2 border rounded" placeholder="Ej. Mesa 1" autoFocus /></div>
                          <div><label className="text-xs font-bold">Capacidad</label><input type="number" value={tableForm.capacity || ''} onChange={e => setTableForm({...tableForm, capacity: Number(e.target.value)})} className="w-full p-2 border rounded" /></div>
                          <div><label className="text-xs font-bold">Sucursal</label><select value={tableForm.branchId} onChange={e => setTableForm({...tableForm, branchId: e.target.value})} className="w-full p-2 border rounded">{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                          <div className="col-span-2 flex gap-2 justify-end mt-4"><button onClick={() => setShowTableForm(false)} className="px-4 py-2 border rounded text-stone-500">Cancelar</button><button onClick={handleTableSave} className="px-4 py-2 bg-[var(--fr-green)] text-white rounded font-bold">Guardar</button></div>
                      </div>
                  </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {tables.filter(t => t.branchId === currentBranchId).map(t => (
                      <div key={t.id} className="bg-white p-4 rounded-xl border shadow-sm text-center relative group">
                          <div className="text-2xl font-serif font-bold text-stone-700">{t.name}</div>
                          <div className="text-xs text-stone-400">{t.capacity} personas</div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                              <button onClick={() => { setTableForm(t); setShowTableForm(true); }} className="p-1 bg-blue-50 text-blue-600 rounded"><Edit3 size={12}/></button>
                              <button onClick={() => deleteTable(t.id)} className="p-1 bg-red-50 text-red-600 rounded"><Trash2 size={12}/></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- EXTRAS / MODIFIERS --- */}
      {activeTab === 'modifiers' && (
          <div className="animate-in fade-in">
              <div className="flex justify-end mb-6"><button onClick={() => { setModForm({ options: [] }); setShowModForm(true); }} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center"><Plus size={18}/> Nueva Grupo Extras</button></div>
              {showModForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                          <h3 className="font-bold mb-4">{modForm.id ? 'Editar' : 'Crear'} Grupo de Extras</h3>
                          <div className="space-y-4">
                              <input value={modForm.name || ''} onChange={e => setModForm({...modForm, name: e.target.value})} className="w-full p-2 border rounded font-bold" placeholder="Nombre (Ej. Salsas)" />
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="text-xs font-bold">Mínimo (0=Opcional)</label><input type="number" value={modForm.minSelection || 0} onChange={e => setModForm({...modForm, minSelection: Number(e.target.value)})} className="w-full p-2 border rounded" /></div>
                                  <div><label className="text-xs font-bold">Máximo</label><input type="number" value={modForm.maxSelection || 1} onChange={e => setModForm({...modForm, maxSelection: Number(e.target.value)})} className="w-full p-2 border rounded" /></div>
                              </div>
                              <div>
                                  <label className="text-xs font-bold">Categorías Aplica</label>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                      {productCategories.map(c => (
                                          <label key={c} className="px-2 py-1 border rounded text-xs flex gap-1 items-center cursor-pointer hover:bg-stone-50">
                                              <input type="checkbox" checked={modForm.categories?.includes(c) || false} onChange={e => { const cats = modForm.categories || []; setModForm({...modForm, categories: e.target.checked ? [...cats, c] : cats.filter(x => x !== c)}); }} /> {c}
                                          </label>
                                      ))}
                                  </div>
                              </div>
                              
                              {/* Specific Products Selection */}
                              <div>
                                  <label className="text-xs font-bold">O aplicar a Productos Específicos</label>
                                  <div className="mt-1 p-2 border rounded bg-stone-50 max-h-32 overflow-y-auto">
                                      {products.map(p => (
                                          <label key={p.id} className="block text-xs mb-1 cursor-pointer">
                                              <input type="checkbox" checked={modForm.applyToProductIds?.includes(p.id) || false} onChange={e => { const pids = modForm.applyToProductIds || []; setModForm({...modForm, applyToProductIds: e.target.checked ? [...pids, p.id] : pids.filter(x => x !== p.id)}); }} className="mr-2"/>
                                              {p.name}
                                          </label>
                                      ))}
                                  </div>
                              </div>

                              <div className="border-t pt-4">
                                  <label className="block font-bold text-sm mb-2">Opciones</label>
                                  {modForm.options?.map((opt, idx) => (
                                      <div key={idx} className="flex gap-2 mb-2 items-center bg-stone-50 p-2 rounded">
                                          <input value={opt.name} onChange={e => { const opts = [...modForm.options!]; opts[idx].name = e.target.value; setModForm({...modForm, options: opts}); }} className="flex-1 p-1 border rounded text-sm" placeholder="Opción" />
                                          <input type="number" value={opt.price} onChange={e => { const opts = [...modForm.options!]; opts[idx].price = Number(e.target.value); setModForm({...modForm, options: opts}); }} className="w-20 p-1 border rounded text-sm" placeholder="Precio" />
                                          
                                          {/* Ingredient Selection for Modifier */}
                                          <select 
                                            className="w-32 p-1 border rounded text-xs"
                                            value={opt.recipe?.[0]?.ingredientId || ''}
                                            onChange={e => {
                                                const ingId = e.target.value;
                                                const opts = [...modForm.options!];
                                                opts[idx].recipe = ingId ? [{ingredientId: ingId, quantity: 1}] : [];
                                                setModForm({...modForm, options: opts});
                                            }}
                                          >
                                              <option value="">Insumo...</option>
                                              {uniqueIngredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                          </select>
                                          {opt.recipe?.[0] && (
                                              <input 
                                                type="number" 
                                                className="w-16 p-1 border rounded text-xs text-center"
                                                value={opt.recipe[0].quantity}
                                                onChange={e => {
                                                    const opts = [...modForm.options!];
                                                    if(opts[idx].recipe[0]) opts[idx].recipe[0].quantity = Number(e.target.value);
                                                    setModForm({...modForm, options: opts});
                                                }}
                                              />
                                          )}

                                          <button onClick={() => setModForm({...modForm, options: modForm.options!.filter((_, i) => i !== idx)})}><Trash2 size={14} className="text-red-500"/></button>
                                      </div>
                                  ))}
                                  <button onClick={() => setModForm({...modForm, options: [...(modForm.options || []), { id: `opt-${Date.now()}`, name: '', price: 0, recipe: [] }]})} className="text-xs font-bold text-blue-600 hover:underline">+ Agregar Opción</button>
                              </div>
                              <div className="flex justify-end gap-2"><button onClick={() => setShowModForm(false)} className="px-4 py-2 border rounded">Cancelar</button><button onClick={handleModSave} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Guardar</button></div>
                          </div>
                      </div>
                  </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{modifierGroups.map(m => (<div key={m.id} className="bg-white p-4 rounded-xl border shadow-sm group"><div className="flex justify-between items-center mb-2"><h3 className="font-bold">{m.name}</h3><div className="opacity-0 group-hover:opacity-100 flex gap-1"><button onClick={() => { setModForm(m); setShowModForm(true); }}><Edit3 size={14} className="text-blue-500"/></button><button onClick={() => deleteModifierGroup(m.id)}><Trash2 size={14} className="text-red-500"/></button></div></div><div className="text-xs text-stone-500 mb-2">{m.categories.join(', ')} {m.applyToProductIds?.length ? `+ ${m.applyToProductIds.length} prods` : ''}</div><div className="flex flex-wrap gap-1">{m.options.map(o => (<span key={o.id} className="px-2 py-1 bg-stone-100 rounded text-[10px] border">{o.name} (${o.price})</span>))}</div></div>))}</div>
          </div>
      )}

      {/* --- OFFERS / DISCOUNTS --- */}
      {activeTab === 'discounts' && (
          <div className="animate-in fade-in">
              <div className="flex justify-end mb-6"><button onClick={() => { setDiscForm({}); setShowDiscForm(true); }} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center"><Plus size={18}/> Nueva Oferta</button></div>
              {showDiscForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                          <h3 className="font-bold mb-4">{discForm.id ? 'Editar' : 'Crear'} Oferta</h3>
                          <div className="space-y-3">
                              <input value={discForm.name || ''} onChange={e => setDiscForm({...discForm, name: e.target.value})} className="w-full p-2 border rounded" placeholder="Nombre (Ej. Happy Hour)" />
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="text-xs font-bold">Tipo</label><select value={discForm.type || 'PERCENTAGE'} onChange={e => setDiscForm({...discForm, type: e.target.value as any})} className="w-full p-2 border rounded"><option value="PERCENTAGE">Porcentaje</option><option value="FIXED">Monto Fijo</option><option value="BOGO">2x1 (BOGO)</option></select></div>
                                  {discForm.type !== 'BOGO' && <div><label className="text-xs font-bold">Valor</label><input type="number" value={discForm.value || ''} onChange={e => setDiscForm({...discForm, value: Number(e.target.value)})} className="w-full p-2 border rounded" /></div>}
                              </div>
                              
                              <div className="bg-stone-50 p-3 rounded border">
                                  <label className="text-xs font-bold block mb-2">Programación (Opcional)</label>
                                  <div className="flex gap-1 mb-2">{['D','L','M','M','J','V','S'].map((d, i) => (<button key={i} onClick={() => { const days = discForm.schedule?.days || []; setDiscForm({...discForm, schedule: { ...discForm.schedule, days: days.includes(i) ? days.filter(x => x !== i) : [...days, i], startTime: discForm.schedule?.startTime || '00:00', endTime: discForm.schedule?.endTime || '23:59' }}); }} className={`w-8 h-8 rounded-full text-xs font-bold ${discForm.schedule?.days?.includes(i) ? 'bg-blue-600 text-white' : 'bg-white border'}`}>{d}</button>))}</div>
                                  <div className="flex gap-2 items-center"><input type="time" value={discForm.schedule?.startTime || ''} onChange={e => setDiscForm({...discForm, schedule: {...discForm.schedule!, startTime: e.target.value}})} className="p-1 border rounded"/><span className="text-xs">a</span><input type="time" value={discForm.schedule?.endTime || ''} onChange={e => setDiscForm({...discForm, schedule: {...discForm.schedule!, endTime: e.target.value}})} className="p-1 border rounded"/></div>
                              </div>

                              <div>
                                  <label className="text-xs font-bold">Aplica a Categorías (Vacío = Todo)</label>
                                  <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                                      {productCategories.map(c => (
                                          <label key={c} className="px-2 py-1 border rounded text-xs bg-white flex items-center gap-1">
                                              <input type="checkbox" checked={discForm.applyToCategories?.includes(c) || false} onChange={e => { const cats = discForm.applyToCategories || []; setDiscForm({...discForm, applyToCategories: e.target.checked ? [...cats, c] : cats.filter(x => x !== c)}); }} /> {c}
                                          </label>
                                      ))}
                                  </div>
                              </div>

                              <div className="flex justify-end gap-2 mt-4"><button onClick={() => setShowDiscForm(false)} className="px-4 py-2 border rounded">Cancelar</button><button onClick={handleDiscSave} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Guardar</button></div>
                          </div>
                      </div>
                  </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{discounts.map(d => (<div key={d.id} className="bg-white p-4 rounded-xl border shadow-sm relative group"><h3 className="font-bold text-blue-700">{d.name}</h3><div className="text-2xl font-bold my-2">{d.type === 'PERCENTAGE' ? `${d.value}% OFF` : d.type === 'BOGO' ? '2x1' : `$${d.value} OFF`}</div><div className="text-xs text-stone-500">{d.schedule?.days ? '📅 Programado' : 'Siempre activo'} {d.applyToCategories?.length ? `• ${d.applyToCategories.join(', ')}` : ''}</div><div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1"><button onClick={() => { setDiscForm(d); setShowDiscForm(true); }} className="p-1 bg-blue-50 text-blue-600 rounded"><Edit3 size={14}/></button><button onClick={() => deleteDiscount(d.id)} className="p-1 bg-red-50 text-red-600 rounded"><Trash2 size={14}/></button></div></div>))}</div>
          </div>
      )}

      {/* --- LOYALTY --- */}
      {activeTab === 'loyalty' && (
          <div className="animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
                      <h3 className="font-bold text-amber-800 mb-4">Configuración Puntos</h3>
                      <div className="flex items-center gap-4">
                          <label className="text-sm font-bold text-amber-700">Gasto para ganar 1 punto:</label>
                          <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-600 font-bold">{settings.currencySymbol}</span>
                              <input 
                                type="number" 
                                value={settings.spendingPerPoint} 
                                onChange={e => updateSettings({...settings, spendingPerPoint: Number(e.target.value)})} 
                                className="w-20 pl-6 p-2 border border-amber-300 rounded font-bold text-center"
                              />
                          </div>
                      </div>
                      <div className="mt-4">
                          <label className="text-sm font-bold text-amber-700 block mb-2">Días Doble Puntos:</label>
                          <div className="flex gap-1">{['D','L','M','M','J','V','S'].map((d, i) => (<button key={i} onClick={() => { const days = settings.doublePointsDays || []; updateSettings({...settings, doublePointsDays: days.includes(i) ? days.filter(x => x !== i) : [...days, i]}); }} className={`w-8 h-8 rounded-full text-xs font-bold ${settings.doublePointsDays?.includes(i) ? 'bg-amber-600 text-white' : 'bg-white border border-amber-300 text-amber-700'}`}>{d}</button>))}</div>
                      </div>
                  </div>
                  
                  <div className="bg-white border p-6 rounded-xl">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold">Niveles de Fidelidad</h3>
                          <button onClick={() => { setTierForm({ name: '', minPoints: 0, color: '#000000' }); setEditingTierIndex(null); setShowTierForm(true); }} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">+ Nuevo</button>
                      </div>
                      <div className="space-y-2">
                          {settings.loyaltyTiers.map((t, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 bg-stone-50 rounded border" style={{ borderLeft: `4px solid ${t.color}` }}>
                                  <div>
                                      <span className="font-bold">{t.name}</span> 
                                      <span className="text-xs text-stone-500 ml-2">({t.minPoints} pts)</span>
                                  </div>
                                  <div className="flex gap-1">
                                      <button onClick={() => { setTierForm(t); setEditingTierIndex(idx); setShowTierForm(true); }}><Edit3 size={14}/></button>
                                      <button onClick={() => deleteTier(idx)}><Trash2 size={14} className="text-red-500"/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
              
              {/* Rewards Config */}
              <div className="bg-white border p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold">Recompensas</h3>
                      <button onClick={() => { setRwdForm({}); setShowRwdForm(true); }} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold">+ Nueva</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {loyaltyRewards.map(r => (
                          <div key={r.id} className="flex justify-between items-center p-3 bg-stone-50 rounded border">
                              <div><span className="font-bold block">{r.name}</span> <span className="text-xs text-stone-500">Cost: {r.costPoints} pts {r.requiredTierName ? `(${r.requiredTierName}+)` : ''}</span></div>
                              <div className="flex gap-1">
                                  <button onClick={() => { setRwdForm(r); setShowRwdForm(true); }}><Edit3 size={14}/></button>
                                  <button onClick={() => deleteLoyaltyReward(r.id)}><Trash2 size={14} className="text-red-500"/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {showRwdForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
                          <h3 className="font-bold mb-4">Recompensa</h3>
                          <input value={rwdForm.name || ''} onChange={e => setRwdForm({...rwdForm, name: e.target.value})} className="w-full p-2 border rounded mb-2" placeholder="Nombre (Ej. Postre Gratis)" />
                          <input type="number" value={rwdForm.costPoints || ''} onChange={e => setRwdForm({...rwdForm, costPoints: Number(e.target.value)})} className="w-full p-2 border rounded mb-2" placeholder="Costo en Puntos" />
                          <select value={rwdForm.requiredTierName || ''} onChange={e => setRwdForm({...rwdForm, requiredTierName: e.target.value})} className="w-full p-2 border rounded mb-4">
                              <option value="">Cualquier Nivel</option>
                              {settings.loyaltyTiers.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                          </select>
                          <div className="flex justify-end gap-2"><button onClick={() => setShowRwdForm(false)} className="px-4 py-2 border rounded">Cancelar</button><button onClick={handleRwdSave} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Guardar</button></div>
                      </div>
                  </div>
              )}

              {showTierForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
                          <h3 className="font-bold mb-4">{editingTierIndex !== null ? 'Editar' : 'Crear'} Nivel</h3>
                          <input value={tierForm.name} onChange={e => setTierForm({...tierForm, name: e.target.value})} className="w-full p-2 border rounded mb-2" placeholder="Nombre (Ej. Gold)" />
                          <label className="text-xs font-bold text-stone-500">Puntos Mínimos</label>
                          <input type="number" value={tierForm.minPoints} onChange={e => setTierForm({...tierForm, minPoints: Number(e.target.value)})} className="w-full p-2 border rounded mb-2" />
                          <label className="text-xs font-bold text-stone-500">Color Distintivo</label>
                          <div className="flex gap-2 mb-4">
                              <input type="color" value={tierForm.color} onChange={e => setTierForm({...tierForm, color: e.target.value})} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={tierForm.color} onChange={e => setTierForm({...tierForm, color: e.target.value})} className="flex-1 p-2 border rounded" />
                          </div>
                          <div className="flex justify-end gap-2">
                              <button onClick={() => setShowTierForm(false)} className="px-4 py-2 border rounded">Cancelar</button>
                              <button onClick={handleTierSave} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Guardar</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- PACKAGING --- */}
      {activeTab === 'packaging' && (
          <div className="animate-in fade-in">
              <div className="flex justify-end mb-6"><button onClick={() => { setPkgForm({ ingredients: [] }); setShowPkgForm(true); }} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center"><Plus size={18}/> Nueva Regla Empaque</button></div>
              {showPkgForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                          <h3 className="font-bold mb-4">Regla de Empaque</h3>
                          <div className="space-y-3">
                              <input value={pkgForm.name || ''} onChange={e => setPkgForm({...pkgForm, name: e.target.value})} className="w-full p-2 border rounded font-bold" placeholder="Nombre (Ej. Caja Pizza)" />
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="text-xs font-bold">Aplica en</label><select multiple value={pkgForm.applyToOrderTypes || []} onChange={e => setPkgForm({...pkgForm, applyToOrderTypes: Array.from(e.target.selectedOptions, (o: HTMLOptionElement) => o.value as any)})} className="w-full p-2 border rounded h-20 text-xs">{Object.values(OrderType).map(t => <option key={t} value={t}>{t.replace('DELIVERY_', '')}</option>)}</select></div>
                                  <div><label className="text-xs font-bold">Método</label><select value={pkgForm.applyPer || 'ORDER'} onChange={e => setPkgForm({...pkgForm, applyPer: e.target.value as any})} className="w-full p-2 border rounded"><option value="ORDER">Por Orden (1 vez)</option><option value="ITEM">Por Ítem</option></select></div>
                              </div>
                              
                              <div>
                                  <label className="text-xs font-bold">Materiales (Insumos)</label>
                                  <div className="mt-1 p-2 border rounded bg-stone-50 max-h-40 overflow-y-auto">
                                      {uniqueIngredients.map(i => (
                                          <button key={i.id} onClick={() => setPkgForm({...pkgForm, ingredients: [...(pkgForm.ingredients || []), { ingredientId: i.id, quantity: 1 }]})} className="text-xs bg-white border px-2 py-1 m-1 rounded hover:bg-blue-50">{i.name}</button>
                                      ))}
                                  </div>
                                  <div className="mt-2 space-y-1">
                                      {pkgForm.ingredients?.map((pi, idx) => {
                                          const ing = ingredients.find(i => i.id === pi.ingredientId);
                                          return (
                                              <div key={idx} className="flex gap-2 items-center text-xs">
                                                  <span className="flex-1">{ing?.name}</span>
                                                  <input type="number" value={pi.quantity} onChange={e => { const newIngs = [...pkgForm.ingredients!]; newIngs[idx].quantity = Number(e.target.value); setPkgForm({...pkgForm, ingredients: newIngs}); }} className="w-16 p-1 border rounded" />
                                                  <button onClick={() => setPkgForm({...pkgForm, ingredients: pkgForm.ingredients!.filter((_, i) => i !== idx)})}>X</button>
                                              </div>
                                          )
                                      })}
                                  </div>
                              </div>
                              <div className="flex justify-end gap-2 mt-4"><button onClick={() => setShowPkgForm(false)} className="px-4 py-2 border rounded">Cancelar</button><button onClick={handlePkgSave} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Guardar</button></div>
                          </div>
                      </div>
                  </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{packagingRules.map(r => (<div key={r.id} className="bg-white p-4 rounded-xl border shadow-sm group relative"><h3 className="font-bold">{r.name}</h3><div className="text-xs text-stone-500 mt-1">Aplica por {r.applyPer === 'ORDER' ? 'Orden' : 'Ítem'} en {r.applyToOrderTypes.length} canales</div><div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1"><button onClick={() => { setPkgForm(r); setShowPkgForm(true); }} className="p-1 bg-blue-50 text-blue-600 rounded"><Edit3 size={14}/></button><button onClick={() => deletePackagingRule(r.id)} className="p-1 bg-red-50 text-red-600 rounded"><Trash2 size={14}/></button></div></div>))}</div>
          </div>
      )}

      {/* --- PRINTERS --- */}
      {activeTab === 'printers' && (
          <div className="animate-in fade-in">
              <div className="flex justify-end mb-6">
                  <button onClick={() => { setPrinterForm({ categories: [] }); setShowPrinterForm(true); }} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center"><Plus size={18}/> Nueva Impresora</button>
              </div>
              
              {showPrinterForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                          <h3 className="font-bold mb-4">{printerForm.id ? 'Editar' : 'Configurar'} Impresora</h3>
                          <div className="space-y-4">
                              <div><label className="text-xs font-bold">Nombre (Identificador)</label><input value={printerForm.name || ''} onChange={e => setPrinterForm({...printerForm, name: e.target.value})} className="w-full p-2 border rounded" placeholder="Ej. Cocina Caliente" /></div>
                              <div><label className="text-xs font-bold">Descripción / IP / Ubicación</label><input value={printerForm.description || ''} onChange={e => setPrinterForm({...printerForm, description: e.target.value})} className="w-full p-2 border rounded" placeholder="Ej. 192.168.1.200" /></div>
                              <div><label className="text-xs font-bold">Sucursal</label><select value={printerForm.branchId || ''} onChange={e => setPrinterForm({...printerForm, branchId: e.target.value})} className="w-full p-2 border rounded"><option value="">Seleccionar...</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                              
                              <div className="bg-stone-50 p-3 rounded border">
                                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                                      <input type="checkbox" checked={printerForm.isCashier || false} onChange={e => setPrinterForm({...printerForm, isCashier: e.target.checked})} className="w-4 h-4 accent-green-600" />
                                      <span className="font-bold text-sm">Es Impresora de Caja (Facturas/Cierres)</span>
                                  </label>
                                  
                                  {!printerForm.isCashier && (
                                      <div>
                                          <label className="text-xs font-bold block mb-1">Categorías que Imprime (Comandas)</label>
                                          <div className="flex flex-wrap gap-2">
                                              {productCategories.map(c => (
                                                  <label key={c} className="px-2 py-1 border rounded text-xs bg-white flex items-center gap-1 cursor-pointer">
                                                      <input 
                                                          type="checkbox" 
                                                          checked={printerForm.categories?.includes(c) || false} 
                                                          onChange={e => {
                                                              const cats = printerForm.categories || [];
                                                              setPrinterForm({
                                                                  ...printerForm, 
                                                                  categories: e.target.checked ? [...cats, c] : cats.filter(x => x !== c)
                                                              });
                                                          }} 
                                                      /> {c}
                                                  </label>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                              
                              <div className="flex justify-end gap-2 mt-4">
                                  <button onClick={() => setShowPrinterForm(false)} className="px-4 py-2 border rounded">Cancelar</button>
                                  <button onClick={handlePrinterSave} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Guardar</button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {printers.map(p => (
                      <div key={p.id} className="bg-white p-4 rounded-xl border shadow-sm relative group">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <h3 className="font-bold text-stone-800 flex items-center gap-2">
                                      <Printer size={16} /> {p.name}
                                  </h3>
                                  <p className="text-xs text-stone-500">{branches.find(b => b.id === p.branchId)?.name}</p>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                  <button onClick={() => { setPrinterForm(p); setShowPrinterForm(true); }} className="p-1 bg-blue-50 text-blue-600 rounded"><Edit3 size={14}/></button>
                                  <button onClick={() => deletePrinter(p.id)} className="p-1 bg-red-50 text-red-600 rounded"><Trash2 size={14}/></button>
                              </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-stone-100 text-xs">
                              {p.isCashier ? (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">CAJA / FACTURACIÓN</span>
                              ) : (
                                  <div className="flex flex-wrap gap-1">
                                      {p.categories.map(c => (
                                          <span key={c} className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded border">{c}</span>
                                      ))}
                                      {p.categories.length === 0 && <span className="text-stone-400 italic">Sin categorías asignadas</span>}
                                  </div>
                              )}
                          </div>
                          {p.description && <div className="mt-2 text-[10px] text-stone-400 font-mono">{p.description}</div>}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- USERS & DB --- */}
      {activeTab === 'users' && (
          <div className="animate-in fade-in">
              <div className="flex justify-end mb-6"><button onClick={() => { setUserForm({}); setShowUserForm(true); }} className="bg-[var(--fr-green)] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Plus size={18} /> Nuevo Usuario</button></div>
              {showUserForm && (
                  <div className="mb-8 bg-[var(--fr-card)] p-6 rounded-xl border shadow-lg max-w-xl mx-auto">
                      <div className="space-y-4">
                          <input value={userForm.name || ''} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-2 border rounded" placeholder="Nombre" />
                          <input type="password" maxLength={4} value={userForm.pin || ''} onChange={e => setUserForm({...userForm, pin: e.target.value})} className="w-full p-2 border rounded bg-white text-center tracking-[0.5em] font-bold" placeholder="PIN" />
                          <select value={userForm.role || ''} onChange={e => setUserForm({...userForm, role: e.target.value as Role})} className="w-full p-2 border rounded">
                              <option value="">Seleccionar...</option>
                              {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <div className="flex gap-3 justify-end"><button onClick={() => setShowUserForm(false)} className="px-4 py-2 border rounded">Cancelar</button><button onClick={handleUserSave} className="px-6 py-2 bg-[var(--fr-green)] text-white rounded font-bold">Guardar</button></div>
                      </div>
                  </div>
              )}
              <div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-left text-sm"><tbody className="divide-y">{users.map(u => (<tr key={u.id}><td className="p-4 font-bold">{u.name}</td><td className="p-4">{u.role}</td><td className="p-4 text-right"><button onClick={() => deleteUser(u.id)}><Trash2 size={16} className="text-red-500"/></button></td></tr>))}</tbody></table></div>
          </div>
      )}

      {activeTab === 'database' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
              <div className="bg-[var(--fr-card)] p-6 rounded-2xl border shadow-sm space-y-4">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Database size={20}/> Gestión de Datos</h3>
                  <button onClick={initializeDatabase} className="w-full p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 font-bold">Reinicializar Base de Datos</button>
                  <button onClick={createBackup} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-bold">Descargar Backup (JSON)</button>
                  <label className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold flex justify-center cursor-pointer">Restaurar Backup<input type="file" className="hidden" onChange={handleRestore} /></label>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-sm">
                  <h3 className="font-bold text-lg text-red-800 mb-4 flex items-center gap-2"><AlertTriangle size={20}/> Zona de Peligro</h3>
                  <p className="text-sm text-red-600 mb-6">Estas acciones son destructivas y no se pueden deshacer. Úsalas con extrema precaución.</p>
                  
                  <button onClick={() => { if(confirm("SE BORRARÁN TODOS LOS DATOS TRANSACCIONALES (Ventas, Gastos, Cierres, Traslados). El Menú y el Stock actual se mantendrán. ¿Continuar?")) clearTestData(); }} className="w-full p-4 bg-red-600 text-white rounded-xl font-bold shadow-lg">Limpiar Datos de Prueba</button>
              </div>
          </div>
      )}
    </div>
  );
};
