
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { Ingredient, Transfer, TransferStatus, TransferItem, ProductIngredient } from '../../types';
import { Search, Plus, ArrowDown, ArrowUp, ChefHat, Save, Trash2, Upload, FileSpreadsheet, DollarSign, Calculator, RefreshCw, Download, Package, Wheat, Layers, ChevronLeft, ChevronRight, ClipboardCheck, RotateCcw, CheckCircle, ArrowDownAZ, ArrowUpAZ, ArrowUpDown, Truck, ArrowRight, ArrowLeft, Calendar, Loader2, Globe, AlertTriangle, CheckSquare, Square, Scale, X } from 'lucide-react';

// --- UNIT CONVERTER COMPONENT ---
const UnitConverterModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [amount, setAmount] = useState<string>('1');
    const [fromUnit, setFromUnit] = useState('lb');
    const [toUnit, setToUnit] = useState('g');

    // Base units: Grams (Weight) and Milliliters (Volume)
    const factors: Record<string, { val: number, type: 'weight' | 'volume' }> = {
        // Weight
        'g': { val: 1, type: 'weight' },
        'kg': { val: 1000, type: 'weight' },
        'lb': { val: 453.592, type: 'weight' },
        'oz': { val: 28.3495, type: 'weight' },
        // Volume
        'ml': { val: 1, type: 'volume' },
        'lt': { val: 1000, type: 'volume' },
        'fl oz': { val: 29.5735, type: 'volume' },
        'cup': { val: 240, type: 'volume' }, // Metric cup approx
        'tbsp': { val: 15, type: 'volume' },
        'tsp': { val: 5, type: 'volume' },
    };

    const result = useMemo(() => {
        const val = parseFloat(amount);
        if (isNaN(val)) return '---';

        const from = factors[fromUnit];
        const to = factors[toUnit];

        if (from.type !== to.type) {
            return "Incompatible (Peso vs Vol)";
        }

        // Convert to base then to target
        const baseValue = val * from.val;
        const finalValue = baseValue / to.val;

        return finalValue.toLocaleString('en-US', { maximumFractionDigits: 3 });
    }, [amount, fromUnit, toUnit]);

    const isMismatch = factors[fromUnit].type !== factors[toUnit].type;

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-sm p-6 border-2 border-[var(--fr-green)] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[var(--fr-green)] font-serif flex items-center gap-2">
                        <Scale size={24}/> Conversor Cocina
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={24}/></button>
                </div>

                <div className="space-y-4 bg-[var(--fr-bg)] p-4 rounded-xl border border-[var(--fr-line)]">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Cantidad</label>
                        <input 
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="w-full p-3 text-2xl font-bold text-center border rounded-xl outline-none focus:border-[var(--fr-green)] text-stone-800" 
                            autoFocus
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">De (Origen)</label>
                            <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} className="w-full p-2 border rounded-lg font-bold text-stone-700 bg-white">
                                <optgroup label="Peso">
                                    <option value="lb">Libras (lb)</option>
                                    <option value="oz">Onzas (oz)</option>
                                    <option value="kg">Kilos (kg)</option>
                                    <option value="g">Gramos (g)</option>
                                </optgroup>
                                <optgroup label="Volumen">
                                    <option value="lt">Litros (L)</option>
                                    <option value="ml">Mililitros (ml)</option>
                                    <option value="fl oz">Onzas Fl (fl oz)</option>
                                    <option value="cup">Tazas (cup)</option>
                                    <option value="tbsp">Cucharadas (tbsp)</option>
                                    <option value="tsp">Cucharaditas (tsp)</option>
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">A (Destino)</label>
                            <select value={toUnit} onChange={e => setToUnit(e.target.value)} className="w-full p-2 border rounded-lg font-bold text-stone-700 bg-white">
                                <optgroup label="Peso">
                                    <option value="g">Gramos (g)</option>
                                    <option value="kg">Kilos (kg)</option>
                                    <option value="lb">Libras (lb)</option>
                                    <option value="oz">Onzas (oz)</option>
                                </optgroup>
                                <optgroup label="Volumen">
                                    <option value="ml">Mililitros (ml)</option>
                                    <option value="lt">Litros (L)</option>
                                    <option value="fl oz">Onzas Fl (fl oz)</option>
                                    <option value="cup">Tazas (cup)</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <div className="text-xs text-stone-500 uppercase font-bold mb-1">Resultado</div>
                    {isMismatch ? (
                        <div className="text-red-500 font-bold bg-red-50 p-2 rounded">No se puede convertir Peso a Volumen sin densidad.</div>
                    ) : (
                        <div className="text-4xl font-bold text-[var(--fr-green)] font-mono bg-white p-4 rounded-xl border-2 border-dashed border-[var(--fr-green)]">
                            {result} <span className="text-lg text-stone-400">{toUnit}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const Inventory: React.FC = () => {
  const { ingredients, updateStock, updateIngredient, addIngredient, addMasterIngredient, updateMasterIngredient, produceBatch, importIngredientsFromCSV, currentBranchId, settings, adjustInventory, transfers, branches, addTransfer, receiveTransfer, cancelTransfer, currentUser, printTransferTicket } = useApp();
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<'all' | 'raw' | 'production' | 'transfers'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'stock'>('name');
  const ITEMS_PER_PAGE = 10;

  // Modal States
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [producingIngredient, setProducingIngredient] = useState<Ingredient | null>(null);
  const [showConverter, setShowConverter] = useState(false);
  
  // Transfer Inspection State
  const [reviewTransfer, setReviewTransfer] = useState<Transfer | null>(null);
  const [validatedItems, setValidatedItems] = useState<Set<number>>(new Set()); // Store indices of checked items
  
  // Production State (Variance)
  const [produceCycles, setProduceCycles] = useState(1); // Input Cycles (Consumption)
  const [produceActualOutput, setProduceActualOutput] = useState(1); // Output Yield (Result)
  
  // Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchYield, setBatchYield] = useState(1);

  // Cost Calculator State
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  
  // Multi-Branch Creation State
  const [selectedBranches, setSelectedBranches] = useState<string[]>([currentBranchId]);
  const [syncToBranches, setSyncToBranches] = useState(false);
  
  // Sub-recipe Search State
  const [recipeSearch, setRecipeSearch] = useState('');

  // --- AUDIT MODE STATE ---
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [auditCounts, setAuditCounts] = useState<{ [id: string]: number }>({});
  const [isAuditConfirmOpen, setIsAuditConfirmOpen] = useState(false);

  // --- TRANSFER STATE ---
  const [transferTarget, setTransferTarget] = useState('');
  const [transferCart, setTransferCart] = useState<TransferItem[]>([]);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferSection, setTransferSection] = useState<'send' | 'receive'>('send');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- UNIFIED INVENTORY LOGIC ---
  const unifiedInventory = useMemo(() => {
      const map = new Map<string, Ingredient>();
      ingredients.forEach(ing => {
          if (ing.branchId === currentBranchId) {
              map.set(ing.name.trim().toLowerCase(), ing);
          }
      });
      ingredients.forEach(ing => {
          const key = ing.name.trim().toLowerCase();
          if (!map.has(key)) {
              map.set(key, {
                  ...ing,
                  id: `catalog-${ing.id}`, 
                  originalId: ing.id, 
                  stock: 0, 
                  branchId: 'CATALOG', 
              } as any);
          }
      });
      return Array.from(map.values());
  }, [ingredients, currentBranchId]);

  // --- FILTERING & PAGINATION ---
  useEffect(() => { setCurrentPage(1); }, [search, activeTab]);
  useEffect(() => { 
      if (isAuditMode) { 
          const initialCounts: any = {}; 
          unifiedInventory.filter(i => i.branchId === currentBranchId).forEach(i => initialCounts[i.id] = i.stock); 
          setAuditCounts(initialCounts); 
      } 
  }, [isAuditMode, unifiedInventory, currentBranchId]);

  const filteredIngredients = unifiedInventory
      .filter(i => {
          const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
          if (!matchesSearch) return false;
          if (activeTab === 'raw') return !i.isSubRecipe;
          if (activeTab === 'production') return i.isSubRecipe;
          return true;
      })
      .sort((a, b) => {
          if (sortBy === 'name') return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          if (sortBy === 'stock') return a.stock - b.stock;
          return 0;
      });

  const totalPages = Math.ceil(filteredIngredients.length / ITEMS_PER_PAGE);
  const paginatedIngredients = filteredIngredients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- HANDLERS ---
  const openEditModal = (ing?: Ingredient) => {
    setIsBatchMode(false); setBatchYield(1); setRecipeSearch('');
    setSelectedBranches([currentBranchId]); // Reset branches selection
    setSyncToBranches(false);

    if (ing && ing.branchId !== 'CATALOG') {
        // Editing existing item
        setEditingIngredient(ing);
        const calcPrice = ing.cost * ing.conversionRatio;
        setPurchasePriceInput(calcPrice > 0 ? calcPrice.toFixed(2) : '');
    } else {
        // It's a New Item OR a Catalog Item we are instantiating
        if (ing && ing.branchId === 'CATALOG') {
            const targetIng = {
                ...ing,
                id: `new-cat-${Date.now()}`, 
                branchId: currentBranchId,
                stock: 0
            };
            setEditingIngredient(targetIng);
            const calcPrice = ing.cost * ing.conversionRatio;
            setPurchasePriceInput(calcPrice > 0 ? calcPrice.toFixed(2) : '');
        } else {
            // Brand New Item
            setEditingIngredient({ 
                id: `new-${Date.now()}`, 
                branchId: currentBranchId, 
                name: '', 
                unit: 'g', 
                purchaseUnit: 'Kg', 
                conversionRatio: 1000, 
                cost: 0, 
                stock: 0, 
                minStock: 1000, 
                isSubRecipe: activeTab === 'production', 
                composition: [], 
                priceHistory: [], 
                batchSize: 1 
            });
            setPurchasePriceInput('');
        }
    }
    setIsEditModalOpen(true);
  };

  // Helper to Recalculate Cost when Recipe Changes
  const calculateRecipeCost = (comp: ProductIngredient[], batchSize: number) => {
      const totalCost = comp.reduce((sum, item) => {
          const raw = ingredients.find(i => i.id === item.ingredientId);
          return sum + (raw ? raw.cost * item.quantity : 0);
      }, 0);
      return totalCost / (batchSize || 1);
  };

  const saveIngredient = async () => {
    if (!editingIngredient) return;
    
    // Logic based strictly on ID prefix as requested
    const isNewEntry = editingIngredient.id.startsWith('new-');

    if (!isNewEntry) {
        // Updating existing
        if (syncToBranches) {
            await updateMasterIngredient(editingIngredient.id, editingIngredient, true);
        } else {
            updateIngredient(editingIngredient.id, editingIngredient);
        }
    } else {
        // Creating New (Local or Multi-branch)
        const newIng = { ...editingIngredient };
        
        // Generate permanent ID
        newIng.id = `ing-${Date.now()}`;
        
        if(selectedBranches.length > 0) {
            await addMasterIngredient(newIng, selectedBranches);
        } else {
            addIngredient({...newIng, branchId: currentBranchId});
        }
    }
    setIsEditModalOpen(false);
  };

  const openProductionModal = (item: Ingredient) => {
      setProducingIngredient(item);
      setProduceCycles(1);
      setProduceActualOutput(item.batchSize || 1); 
  };

  const handleProduction = () => {
    if (!producingIngredient) return;
    if (produceBatch(producingIngredient.id, produceCycles, produceActualOutput)) {
      alert(`Producción realizada. Ticket enviado a impresora.`); 
      setProducingIngredient(null); 
      setProduceCycles(1);
      setProduceActualOutput(1);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) { const reader = new FileReader(); reader.onload = (evt) => { if (typeof evt.target?.result === 'string') importIngredientsFromCSV(evt.target.result); }; reader.readAsText(file); }
     if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportCSV = () => {
      const headers = ["ID", "Nombre", "Tipo", "Unidad Uso", "Stock Actual", "Valor Total"];
      const localItems = unifiedInventory.filter(i => i.branchId === currentBranchId);
      const rows = localItems.map(i => [ i.id, i.name, i.isSubRecipe ? "Prod" : "Insumo", i.unit, i.stock.toFixed(4), (i.cost * i.stock).toFixed(2) ]);
      const csvContent = [ headers.join(";"), ...rows.map(r => r.join(";")) ].join("\n");
      const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement("a"); link.href = url; link.download = `inventario_${branches.find(b=>b.id===currentBranchId)?.name}.csv`; link.click();
  };

  const submitAudit = () => {
      const adjustments = Object.entries(auditCounts).map(([id, newStock]) => {
          const ing = ingredients.find(i => i.id === id);
          if (!ing) return null;
          return { ingredientId: id, newStock, systemStock: ing.stock, cost: ing.cost, name: ing.name };
      }).filter(x => x !== null && x.newStock !== x.systemStock) as any[];
      if (adjustments.length === 0) { alert("Sin cambios."); setIsAuditMode(false); return; }
      adjustInventory(adjustments); setIsAuditConfirmOpen(false); setIsAuditMode(false);
  };

  // --- TRANSFER LOGIC ---
  const handleAddToTransfer = (ing: Ingredient) => {
      if(ing.branchId === 'CATALOG') {
          alert("Este ítem no existe localmente. Debes crearlo o recibir stock primero.");
          return;
      }
      if(transferQty <= 0) return;
      if(ing.stock < transferQty) { alert("Stock insuficiente en origen."); return; }
      const exists = transferCart.find(i => i.ingredientId === ing.id);
      if(exists) {
          if(ing.stock < exists.quantity + transferQty) { alert("Stock insuficiente."); return; }
          setTransferCart(transferCart.map(i => i.ingredientId === ing.id ? { ...i, quantity: i.quantity + transferQty } : i));
      } else {
          setTransferCart([...transferCart, { ingredientId: ing.id, name: ing.name, quantity: transferQty, unit: ing.unit, cost: ing.cost }]);
      }
      setTransferQty(1);
      setTransferSearch('');
  };

  const handleSendTransfer = () => {
      if(!transferTarget) { alert("Seleccione sucursal destino."); return; }
      if(transferCart.length === 0) return;
      
      const newTransfer: Transfer = {
          id: `trf-${Date.now()}`,
          sourceBranchId: currentBranchId,
          targetBranchId: transferTarget,
          items: transferCart,
          status: TransferStatus.PENDING,
          createdAt: new Date(),
          createdBy: currentUser?.name || 'Admin'
      };

      addTransfer(newTransfer);
      printTransferTicket(newTransfer);
      
      setTransferCart([]);
      setTransferTarget('');
      alert("Traslado enviado y stock descontado.");
  };

  const openReviewModal = (t: Transfer) => {
      setReviewTransfer(t);
      setValidatedItems(new Set()); // Reset validation
  };

  const toggleItemValidation = (index: number) => {
      const newSet = new Set(validatedItems);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      setValidatedItems(newSet);
  };

  const handleReceiveConfirmed = async () => {
      if(!reviewTransfer) return;
      const tId = reviewTransfer.id;
      
      try {
          setProcessingId(tId);
          await receiveTransfer(tId);
          setReviewTransfer(null);
      } catch (e) {
          alert("Error al recibir: " + e);
      } finally {
          setProcessingId(null);
      }
  };

  const localIngredientsForTransfer = unifiedInventory.filter(i => i.branchId === currentBranchId);

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Inventario</h1>
          <p className="text-stone-500">Gestión de Insumos, Producción y Traslados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
           {!isAuditMode && activeTab !== 'transfers' ? (
               <>
                   <button onClick={() => setShowConverter(true)} className="bg-white border border-[var(--fr-green)] text-[var(--fr-green)] px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-green-50 shadow-sm"><Scale size={16} /> Calculadora</button>
                   <button onClick={() => setIsAuditMode(true)} className="bg-stone-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-black shadow-lg uppercase tracking-wider border border-stone-900"><ClipboardCheck size={16} /> Auditoría</button>
                   <button onClick={handleExportCSV} className="bg-white border border-[var(--fr-line)] text-[var(--fr-green)] px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-green-50 shadow-sm"><Download size={16} /> Exportar</button>
                   <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleCSVUpload} />
                   <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-[var(--fr-line)] text-stone-600 px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-[var(--fr-bg)] shadow-sm"><FileSpreadsheet size={16} /> Importar</button>
                   <button onClick={() => openEditModal()} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-[#1a3b2e] shadow-lg uppercase tracking-wider"><Plus size={16} /> Nuevo</button>
               </>
           ) : isAuditMode ? (
               <>
                   <div className="bg-amber-100 text-amber-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border border-amber-200 animate-pulse"><ClipboardCheck size={16}/> AUDITORÍA ACTIVA</div>
                   <button onClick={() => setIsAuditConfirmOpen(true)} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-[#1a3b2e] shadow-lg"><Save size={16} /> Guardar</button>
                   <button onClick={() => setIsAuditMode(false)} className="bg-white border border-[var(--fr-line)] text-stone-500 px-4 py-2 rounded-xl font-bold text-sm hover:bg-stone-100">Cancelar</button>
               </>
           ) : null}
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[var(--fr-line)] overflow-x-auto">
          {[{id:'all', l:'Todos', i:Layers}, {id:'raw', l:'Materia Prima', i:Wheat}, {id:'production', l:'Producción', i:ChefHat}, {id:'transfers', l:'Traslados', i:Truck}].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`pb-2 px-4 text-sm font-bold flex items-center gap-2 transition border-b-2 ${activeTab === t.id ? 'border-[var(--fr-green)] text-[var(--fr-green)]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                  <t.i size={16} /> {t.l}
              </button>
          ))}
      </div>

      {activeTab === 'transfers' && (
          <div className="animate-in fade-in">
              <div className="flex gap-4 mb-6">
                  <button onClick={() => setTransferSection('send')} className={`flex-1 p-4 rounded-xl border-2 text-center transition ${transferSection === 'send' ? 'border-[var(--fr-green)] bg-green-50 text-[var(--fr-green)] font-bold' : 'border-[var(--fr-line)] bg-white text-stone-500 hover:bg-stone-50'}`}>ENVIAR MERCADERÍA <ArrowRight size={16} className="inline ml-2"/></button>
                  <button onClick={() => setTransferSection('receive')} className={`flex-1 p-4 rounded-xl border-2 text-center transition ${transferSection === 'receive' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-[var(--fr-line)] bg-white text-stone-500 hover:bg-stone-50'}`}><ArrowLeft size={16} className="inline mr-2"/> RECIBIR MERCADERÍA</button>
              </div>

              {transferSection === 'send' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-6">
                          <div className="bg-white p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm">
                              <h3 className="font-bold text-stone-700 mb-4 font-serif">Crear Traslado</h3>
                              <div className="flex gap-4 mb-4">
                                  <div className="flex-1">
                                      <label className="block text-xs font-bold text-stone-500 mb-1">Sucursal Destino</label>
                                      <select value={transferTarget} onChange={e => setTransferTarget(e.target.value)} className="w-full p-2 border rounded bg-white font-bold text-stone-700">
                                          <option value="">Seleccionar...</option>
                                          {branches.filter(b => b.id !== currentBranchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <div className="bg-[var(--fr-bg)] p-4 rounded-xl border border-[var(--fr-line)] mb-4">
                                  <div className="flex gap-2 mb-2">
                                      <div className="relative flex-1">
                                          <Search size={16} className="absolute left-2 top-2.5 text-stone-400"/>
                                          <input placeholder="Buscar insumo local para agregar..." value={transferSearch} onChange={e => setTransferSearch(e.target.value)} className="w-full pl-8 p-2 border rounded bg-white text-sm text-stone-800"/>
                                      </div>
                                      <input type="number" min="0.1" step="0.1" value={transferQty} onChange={e => setTransferQty(Number(e.target.value))} className="w-20 p-2 border rounded text-center font-bold bg-white text-stone-800"/>
                                  </div>
                                  {transferSearch && (
                                      <div className="max-h-40 overflow-y-auto bg-white border rounded shadow-sm">
                                          {localIngredientsForTransfer.filter(i => i.name.toLowerCase().includes(transferSearch.toLowerCase())).map(i => (
                                              <button key={i.id} onClick={() => handleAddToTransfer(i)} className="w-full text-left p-2 text-xs hover:bg-stone-50 border-b flex justify-between">
                                                  <span className="font-bold text-stone-800">{i.name}</span>
                                                  <span className="text-stone-500">Stock: {i.stock} {i.unit}</span>
                                              </button>
                                          ))}
                                      </div>
                                  )}
                              </div>
                              
                              {transferCart.length > 0 && (
                                  <div className="mb-4 border rounded-xl overflow-hidden">
                                      <table className="w-full text-sm text-left">
                                          <thead className="bg-stone-100 font-bold text-stone-500"><tr><th className="p-2">Item</th><th className="p-2 text-right">Cant</th><th className="p-2"></th></tr></thead>
                                          <tbody>
                                              {transferCart.map((item, idx) => (
                                                  <tr key={idx} className="border-t border-stone-100">
                                                      <td className="p-2 text-stone-800">{item.name}</td>
                                                      <td className="p-2 text-right font-mono text-stone-600">{item.quantity} {item.unit}</td>
                                                      <td className="p-2 text-center"><button onClick={() => setTransferCart(transferCart.filter((_, i) => i !== idx))} className="text-red-400"><Trash2 size={14}/></button></td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                              <button onClick={handleSendTransfer} disabled={transferCart.length === 0 || !transferTarget} className="w-full py-3 bg-[var(--fr-green)] text-white font-bold rounded-xl hover:bg-[#1a3b2e] disabled:opacity-50 shadow-lg">Confirmar Envío</button>
                          </div>
                      </div>
                      <div className="bg-[var(--fr-card)] p-4 rounded-2xl border border-[var(--fr-line)] h-fit">
                          <h3 className="font-bold text-stone-700 mb-4 font-serif text-sm uppercase tracking-widest">Historial Envíos</h3>
                          <div className="space-y-3">
                              {transfers.filter(t => t.sourceBranchId === currentBranchId).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(t => (
                                  <div key={t.id} className="bg-white p-3 rounded-xl border border-[var(--fr-line)] shadow-sm">
                                      <div className="flex justify-between mb-1">
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${t.status === TransferStatus.PENDING ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : t.status === TransferStatus.COMPLETED ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700'}`}>{t.status === 'PENDING' ? 'EN TRANSITO' : t.status === 'COMPLETED' ? 'RECIBIDO' : 'CANCELADO'}</span>
                                          <span className="text-[10px] text-stone-400">{t.createdAt.toLocaleDateString()}</span>
                                      </div>
                                      <div className="font-bold text-sm mb-1 text-stone-800">Para: {branches.find(b => b.id === t.targetBranchId)?.name}</div>
                                      <div className="text-xs text-stone-500">{t.items.length} items • Por: {t.createdBy}</div>
                                      {t.status === TransferStatus.PENDING && (
                                          <button onClick={() => { if(confirm("¿Cancelar envío y devolver stock?")) cancelTransfer(t.id); }} className="mt-2 w-full py-1 text-xs text-red-500 font-bold border border-red-100 rounded hover:bg-red-50">Cancelar / Revertir</button>
                                      )}
                                  </div>
                              ))}
                              {transfers.filter(t => t.sourceBranchId === currentBranchId).length === 0 && <p className="text-xs text-stone-400 italic text-center">Sin envíos recientes.</p>}
                          </div>
                      </div>
                  </div>
              )}

              {transferSection === 'receive' && (
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {transfers.filter(t => t.targetBranchId === currentBranchId && t.status === TransferStatus.PENDING).map(t => (
                              <div key={t.id} className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-md relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                                  <div className="flex justify-between items-start mb-4 pl-2">
                                      <div>
                                          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Envío de {branches.find(b => b.id === t.sourceBranchId)?.name}</div>
                                          <div className="text-xs text-stone-400 flex items-center gap-1"><Calendar size={12}/> {t.createdAt.toLocaleString()}</div>
                                      </div>
                                      <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold text-xs border border-blue-200">PENDIENTE</div>
                                  </div>
                                  <div className="bg-stone-50 rounded-lg p-3 mb-4 text-sm text-stone-600">
                                      Contiene <span className="font-bold text-stone-800">{t.items.length} items</span>
                                  </div>
                                  <button 
                                    onClick={() => openReviewModal(t)}
                                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"
                                  >
                                      <ClipboardCheck size={18}/> Inspeccionar / Recibir
                                  </button>
                              </div>
                          ))}
                          {transfers.filter(t => t.targetBranchId === currentBranchId && t.status === TransferStatus.PENDING).length === 0 && (
                              <div className="col-span-2 p-12 text-center bg-[var(--fr-card)] rounded-2xl border border-dashed border-[var(--fr-line)] text-stone-400 italic">
                                  No hay traslados pendientes de recibir.
                              </div>
                          )}
                      </div>
                      
                      <div className="mt-8 pt-8 border-t border-[var(--fr-line)]">
                          <h3 className="font-bold text-stone-700 font-serif mb-4 text-sm uppercase">Historial Recibidos</h3>
                          <div className="bg-white rounded-xl border border-[var(--fr-line)] overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-stone-50 text-stone-500 font-bold"><tr><th className="p-3">Fecha Recibido</th><th className="p-3">Origen</th><th className="p-3">Items</th><th className="p-3">Estado</th></tr></thead>
                                  <tbody>
                                      {transfers.filter(t => t.targetBranchId === currentBranchId && t.status === TransferStatus.COMPLETED).map(t => (
                                          <tr key={t.id} className="border-t border-stone-100">
                                              <td className="p-3 text-stone-600">{t.receivedAt?.toLocaleDateString()}</td>
                                              <td className="p-3 text-stone-800 font-bold">{branches.find(b => b.id === t.sourceBranchId)?.name}</td>
                                              <td className="p-3 text-stone-600">{t.items.length} productos</td>
                                              <td className="p-3"><span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-100">COMPLETADO</span></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- REVIEW & RECEIVE MODAL --- */}
      {reviewTransfer && (
          <div className="fixed inset-0 bg-[#1a3b2e]/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-[var(--fr-line)] shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-stone-100">
                      <div>
                          <h2 className="text-xl font-bold text-[var(--fr-green)] font-serif">Recepción de Mercadería</h2>
                          <p className="text-xs text-stone-500">Origen: {branches.find(b => b.id === reviewTransfer.sourceBranchId)?.name}</p>
                      </div>
                      <div className="text-xs font-mono text-stone-400 text-right">
                          {new Date(reviewTransfer.createdAt).toLocaleDateString()} <br/>
                          ID: {reviewTransfer.id.slice(-6)}
                      </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800 flex items-center gap-2">
                      <ClipboardCheck size={16}/>
                      Valida físicamente cada ítem antes de confirmar.
                  </div>

                  <div className="flex-1 overflow-y-auto mb-4">
                      <table className="w-full text-sm">
                          <thead className="bg-stone-50 text-stone-600 font-bold sticky top-0">
                              <tr>
                                  <th className="p-2 text-left">Producto</th>
                                  <th className="p-2 text-center">Cantidad</th>
                                  <th className="p-2 text-center">Validado</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                              {reviewTransfer.items.map((item, idx) => {
                                  const isChecked = validatedItems.has(idx);
                                  return (
                                      <tr key={idx} className={`hover:bg-stone-50 cursor-pointer transition ${isChecked ? 'bg-green-50/50' : ''}`} onClick={() => toggleItemValidation(idx)}>
                                          <td className="p-3 font-bold text-stone-700">{item.name}</td>
                                          <td className="p-3 text-center font-mono">{item.quantity} {item.unit}</td>
                                          <td className="p-3 text-center">
                                              {isChecked ? (
                                                  <CheckSquare className="mx-auto text-green-600" size={20}/>
                                              ) : (
                                                  <Square className="mx-auto text-stone-300" size={20}/>
                                              )}
                                          </td>
                                      </tr>
                                  )
                              })}
                          </tbody>
                      </table>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-stone-100 gap-3">
                      <button 
                          onClick={() => {
                              if(validatedItems.size === reviewTransfer.items.length) setValidatedItems(new Set());
                              else setValidatedItems(new Set(reviewTransfer.items.map((_, i) => i)));
                          }}
                          className="text-xs font-bold text-blue-600 hover:underline"
                      >
                          {validatedItems.size === reviewTransfer.items.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                      </button>
                      
                      <div className="flex gap-3">
                          <button onClick={() => setReviewTransfer(null)} className="px-4 py-2 border rounded-xl font-bold text-stone-500 hover:bg-stone-100">Cancelar</button>
                          <button 
                              onClick={handleReceiveConfirmed} 
                              disabled={validatedItems.size !== reviewTransfer.items.length || processingId === reviewTransfer.id}
                              className="px-6 py-2 bg-[var(--fr-green)] text-white rounded-xl font-bold hover:bg-[#1a3b2e] shadow-lg disabled:opacity-50 flex items-center gap-2"
                          >
                              {processingId === reviewTransfer.id ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                              Confirmar Ingreso
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab !== 'transfers' && (
          <>
            <div className="relative w-full mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input type="text" placeholder="Buscar insumo..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--fr-line)] focus:outline-none focus:ring-2 focus:ring-[var(--fr-green)] bg-white shadow-sm text-stone-800" />
            </div>

            <div className="bg-[var(--fr-card)] rounded-2xl shadow-sm border border-[var(--fr-line)] overflow-hidden flex flex-col min-h-[400px]">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--fr-bg)] text-stone-500 font-bold border-b border-[var(--fr-line)]">
                            <tr><th className="p-4">Item</th><th className="p-4">Tipo</th><th className="p-4">Unidades</th><th className="p-4">Stock Sistema</th>{isAuditMode && <th className="p-4 bg-stone-100 border-l">Conteo Físico</th>}{isAuditMode && <th className="p-4 bg-stone-100 text-center">Diferencia</th>}{!isAuditMode && <th className="p-4 text-right">Acciones</th>}</tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--fr-line)]">
                            {paginatedIngredients.map(item => {
                                const isLocal = item.branchId === currentBranchId;
                                const realCount = auditCounts[item.id] !== undefined ? auditCounts[item.id] : item.stock;
                                const diff = realCount - item.stock;
                                const financialImpact = diff * item.cost;
                                return (
                                    <tr key={item.id} className={`hover:bg-white transition group ${!isLocal ? 'opacity-60 bg-stone-50' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {!isLocal && (
                                                    <span title="Item de Catálogo Global (No existe localmente)">
                                                        <span className="text-blue-400"><span title="Global"><Globe size={14}/></span></span>
                                                    </span>
                                                )}
                                                <div className="font-bold text-[var(--fr-text)] text-base">{item.name}</div>
                                            </div>
                                            <div className="text-xs text-stone-400 font-mono mt-1">{settings.currencySymbol}{item.cost.toFixed(4)}/{item.unit}</div>
                                        </td>
                                        <td className="p-4">{item.isSubRecipe ? <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit border border-purple-200"><ChefHat size={12}/> Producción</span> : <span className="bg-amber-50 text-amber-800 px-2 py-1 rounded text-xs font-bold border border-amber-100 flex items-center gap-1 w-fit"><Package size={12} /> Insumo</span>}</td>
                                        <td className="p-4 text-stone-600 text-xs"><div>Compra: <span className="font-bold">{item.purchaseUnit}</span></div><div className="mt-0.5">Uso: <span className="font-bold">{item.unit}</span> (x{item.conversionRatio})</div></td>
                                        <td className="p-4">
                                            {isLocal ? (
                                                <div className={`inline-flex items-center px-3 py-1 rounded-lg font-bold font-mono shadow-sm ${item.stock <= item.minStock && !isAuditMode ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' : 'bg-stone-100 text-stone-700 border border-stone-200'}`}>{item.stock.toFixed(2)} {item.unit}</div>
                                            ) : (
                                                <span className="text-xs italic text-stone-400">No monitoreado</span>
                                            )}
                                        </td>
                                        {isAuditMode && <><td className="p-4 bg-stone-50 border-l"><input disabled={!isLocal} type="number" value={realCount} onChange={e => setAuditCounts(prev => ({ ...prev, [item.id]: Number(e.target.value) }))} className="w-32 p-2 border-2 border-blue-200 rounded-lg font-bold text-blue-900 text-center focus:border-blue-500 outline-none bg-white disabled:bg-stone-100 disabled:opacity-50"/></td><td className="p-4 bg-stone-50 text-center">{diff !== 0 ? <div><span className={`font-bold ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span><div className="text-[10px] font-mono text-stone-500 mt-1">{settings.currencySymbol}{Math.abs(financialImpact).toFixed(2)}</div></div> : <span className="text-stone-300">-</span>}</td></>}
                                        {!isAuditMode && <td className="p-4 text-right"><div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition">{item.isSubRecipe && isLocal && <button onClick={() => openProductionModal(item)} className="px-3 py-1.5 bg-[#1E1E1E] text-white rounded-lg text-xs hover:bg-black font-bold uppercase tracking-wider shadow-md flex items-center gap-1"><RefreshCw size={12} /> Producir</button>}<button onClick={() => openEditModal(item)} className="px-3 py-1.5 bg-white border border-[var(--fr-line)] text-stone-600 rounded-lg text-xs font-bold hover:bg-[var(--fr-bg)] shadow-sm">{isLocal ? 'EDITAR' : '+ CREAR LOCAL'}</button></div></td>}
                                    </tr>
                                );
                            })}
                            {paginatedIngredients.length === 0 && <tr><td colSpan={isAuditMode ? 7 : 5} className="p-12 text-center text-stone-400 italic">No se encontraron items</td></tr>}
                        </tbody>
                    </table>
                </div>
                {filteredIngredients.length > 0 && <div className="p-4 border-t border-[var(--fr-line)] bg-[var(--fr-bg)] flex items-center justify-between"><span className="text-xs text-stone-500 font-medium">Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredIngredients.length)} de {filteredIngredients.length}</span><div className="flex items-center gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-[var(--fr-line)] disabled:opacity-30 transition"><ChevronLeft size={18} /></button><span className="text-sm font-bold text-stone-700 px-2">Página {currentPage} de {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-[var(--fr-line)] disabled:opacity-30 transition"><ChevronRight size={18} /></button></div></div>}
            </div>
          </>
      )}

      {isAuditConfirmOpen && (
          <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center">
                  <div className="w-16 h-16 bg-[var(--fr-green)] text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><CheckCircle size={32}/></div>
                  <h2 className="text-2xl font-bold text-stone-800 mb-2 font-serif">Confirmar Ajuste</h2>
                  <p className="text-stone-500 mb-6 text-sm">Se actualizará el stock y se registrarán las pérdidas.</p>
                  <div className="flex gap-3"><button onClick={() => setIsAuditConfirmOpen(false)} className="flex-1 py-3 border rounded-xl font-bold text-stone-500 hover:bg-stone-100">Cancelar</button><button onClick={submitAudit} className="flex-1 py-3 bg-[var(--fr-green)] text-white rounded-xl font-bold hover:bg-[#1a3b2e] shadow-lg">Aplicar</button></div>
              </div>
          </div>
      )}
      
      {showConverter && <UnitConverterModal onClose={() => setShowConverter(false)} />}

      {isEditModalOpen && editingIngredient && (
        <div key={editingIngredient.id} className="fixed inset-0 bg-[#1a3b2e]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto border border-[var(--fr-line)] shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold mb-4 text-[var(--fr-green)] font-serif">{editingIngredient.id.startsWith('new-') ? 'Nuevo Insumo' : 'Editar Insumo'}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2"><label className="block text-xs font-bold text-stone-500 mb-1">Nombre</label><input value={editingIngredient.name} onChange={e => setEditingIngredient({...editingIngredient, name: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" /></div>
              
              {editingIngredient.id.startsWith('new-') && (
                  <div className="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <label className="block text-xs font-bold text-blue-800 mb-2 flex items-center gap-1"><span className="text-blue-400"><span title="Global"><Globe size={12}/></span></span> Disponibilidad en Sucursales</label>
                      <div className="flex flex-wrap gap-2">
                          <label className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer border transition ${selectedBranches.length === branches.length ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-blue-200 text-blue-500'}`}>
                              <input type="checkbox" className="hidden" checked={selectedBranches.length === branches.length} onChange={() => setSelectedBranches(selectedBranches.length === branches.length ? [currentBranchId] : branches.map(b => b.id))} />
                              Todas
                          </label>
                          {branches.map(b => (
                              <label key={b.id} className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer border transition ${selectedBranches.includes(b.id) ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white border-stone-200 text-stone-400'}`}>
                                  <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={selectedBranches.includes(b.id)} 
                                    onChange={e => {
                                        if(e.target.checked) setSelectedBranches([...selectedBranches, b.id]);
                                        else setSelectedBranches(selectedBranches.filter(id => id !== b.id));
                                    }}
                                  />
                                  {b.name}
                              </label>
                          ))}
                      </div>
                  </div>
              )}

              <div className="col-span-2 bg-[var(--fr-bg)] p-4 rounded-xl border border-[var(--fr-line)]">
                 <h3 className="text-sm font-bold text-[var(--fr-green)] mb-3 font-serif">Conversión de Unidades</h3>
                 <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-xs font-bold text-stone-500 mb-1">Unidad Compra</label><input placeholder="Ej. Saco 25kg" value={editingIngredient.purchaseUnit} onChange={e => setEditingIngredient({...editingIngredient, purchaseUnit: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" /></div>
                    <div><label className="block text-xs font-bold text-stone-500 mb-1">Unidad Uso</label><input placeholder="Ej. g" value={editingIngredient.unit} onChange={e => setEditingIngredient({...editingIngredient, unit: e.target.value})} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" /></div>
                    <div><label className="block text-xs font-bold text-stone-500 mb-1">Factor</label><input type="number" placeholder="Ej. 25000" value={editingIngredient.conversionRatio} onChange={e => setEditingIngredient({...editingIngredient, conversionRatio: Number(e.target.value)})} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" /></div>
                 </div>
                 <div className="mt-4 pt-4 border-t border-[var(--fr-line)]">
                     <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-2"><Calculator size={16}/> <span>Calculadora de Costo</span></div>
                     <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div><label className="block text-xs font-bold text-blue-600 mb-1">Precio Compra ({editingIngredient.purchaseUnit})</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs">{settings.currencySymbol}</span><input type="number" value={purchasePriceInput} onChange={(e) => { const val = e.target.value; setPurchasePriceInput(val); const price = Number(val); if (price >= 0 && editingIngredient.conversionRatio > 0) { setEditingIngredient({ ...editingIngredient, cost: price / editingIngredient.conversionRatio }); } }} className="w-full pl-8 p-2 border border-blue-200 rounded bg-white text-blue-900 font-bold focus:ring-2 focus:ring-blue-300 outline-none" placeholder="0.00"/></div></div>
                        <div className="flex flex-col justify-end pb-2"><div className="text-xs text-blue-600">Costo por {editingIngredient.unit}:</div><div className="text-xl font-bold text-blue-800 font-mono">{settings.currencySymbol}{(editingIngredient.cost || 0).toFixed(4)}</div></div>
                     </div>
                 </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Costo Unitario</label>
                  <input 
                    type="number" 
                    step="0.0001" 
                    value={editingIngredient.cost} 
                    onChange={e => setEditingIngredient({...editingIngredient, cost: Number(e.target.value)})} 
                    disabled={editingIngredient.isSubRecipe} // Disable if sub-recipe
                    className={`w-full p-2 border border-[var(--fr-line)] rounded focus:ring-1 focus:ring-[var(--fr-green)] outline-none ${editingIngredient.isSubRecipe ? 'bg-stone-100 text-stone-500 cursor-not-allowed' : 'bg-white'}`} 
                  />
              </div>
              <div><label className="block text-xs font-bold text-stone-500 mb-1">Min Stock ({editingIngredient.unit})</label><input type="number" value={editingIngredient.minStock} onChange={e => setEditingIngredient({...editingIngredient, minStock: Number(e.target.value)})} className="w-full p-2 border border-[var(--fr-line)] rounded bg-white focus:ring-1 focus:ring-[var(--fr-green)] outline-none" /></div>
            </div>
            <div className="mb-4"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingIngredient.isSubRecipe} onChange={e => setEditingIngredient({...editingIngredient, isSubRecipe: e.target.checked, composition: e.target.checked ? (editingIngredient.composition || []) : undefined })} className="w-4 h-4 accent-[var(--fr-green)]"/><span className="font-bold text-sm text-stone-700">Es Sub-receta / Producción Interna</span></label></div>
            
            {editingIngredient.isSubRecipe && (
                <div className="bg-[var(--fr-bg)] p-4 rounded-xl border border-[var(--fr-line)] mb-6">
                    <div className="flex flex-col gap-4 mb-4 border-b border-[var(--fr-line)] pb-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-sm text-stone-700">Composición de Receta</h3>
                            <div className="bg-stone-800 text-white text-xs px-2 py-1 rounded">Receta Estándar</div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border border-stone-200">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Tamaño de Lote Estándar</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={editingIngredient.batchSize || 1} 
                                    onChange={e => {
                                        const newBatchSize = Math.max(1, Number(e.target.value));
                                        const newCost = calculateRecipeCost(editingIngredient.composition || [], newBatchSize);
                                        setEditingIngredient({...editingIngredient, batchSize: newBatchSize, cost: newCost});
                                    }}
                                    className="w-20 p-2 font-bold border rounded text-center bg-stone-50"
                                />
                                <span className="font-bold text-stone-700">{editingIngredient.unit}</span>
                                <span className="text-xs text-stone-400 italic ml-2">(Define insumos para producir esta cantidad)</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {editingIngredient.composition?.map(comp => { 
                            const raw = ingredients.find(i => i.id === comp.ingredientId);
                            const lineTotal = (raw?.cost || 0) * comp.quantity;
                            return (
                                <div key={comp.ingredientId} className="flex items-center gap-2 bg-white p-2 rounded border border-[var(--fr-line)]">
                                    <span className="flex-1 text-sm font-bold text-stone-700">{raw?.name}</span>
                                    <input 
                                        type="number" 
                                        step="0.0001" 
                                        value={comp.quantity} 
                                        onChange={e => { 
                                            const newVal = Number(e.target.value); 
                                            const newComp = editingIngredient.composition?.map(c => c.ingredientId === comp.ingredientId ? { ...c, quantity: newVal } : c) || []; 
                                            const newCost = calculateRecipeCost(newComp, editingIngredient.batchSize || 1);
                                            setEditingIngredient({...editingIngredient, composition: newComp, cost: newCost}); 
                                        }} 
                                        className="w-20 p-1 border rounded text-right text-sm font-mono bg-stone-50 font-bold"
                                    />
                                    <span className="text-xs text-stone-400 w-8">{raw?.unit}</span>
                                    
                                    <div className="w-20 text-right text-xs font-bold text-stone-600 font-mono">
                                        {settings.currencySymbol}{lineTotal.toFixed(2)}
                                    </div>

                                    <button onClick={() => { 
                                        const newComp = editingIngredient.composition?.filter(c => c.ingredientId !== comp.ingredientId) || []; 
                                        const newCost = calculateRecipeCost(newComp, editingIngredient.batchSize || 1);
                                        setEditingIngredient({...editingIngredient, composition: newComp, cost: newCost}); 
                                    }} className="text-red-400 hover:text-red-600 ml-1"><Trash2 size={14}/></button>
                                </div>
                            ); 
                        })}
                    </div>
                    
                    <div className="mt-4 border-t border-[var(--fr-line)] pt-4">
                        <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">Agregar Ingrediente</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                            <input type="text" placeholder="Buscar..." value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} className="w-full pl-9 p-2 text-sm border rounded-lg bg-white outline-none focus:ring-1 focus:ring-[var(--fr-green)]"/>
                        </div>
                        <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg bg-white shadow-inner">
                            {ingredients.filter(i => i.id !== editingIngredient.id && !i.isSubRecipe && i.name.toLowerCase().includes(recipeSearch.toLowerCase())).map(i => (
                                <button key={i.id} onClick={() => { 
                                    const newComp = [...(editingIngredient.composition || []), { ingredientId: i.id, quantity: 1 }]; 
                                    const newCost = calculateRecipeCost(newComp, editingIngredient.batchSize || 1);
                                    setEditingIngredient({...editingIngredient, composition: newComp, cost: newCost}); 
                                    setRecipeSearch(''); 
                                }} className="w-full text-left p-2 hover:bg-stone-50 text-sm border-b border-stone-100 flex justify-between"><span className="font-bold text-stone-700">{i.name}</span><span className="text-xs text-stone-400 font-mono">{i.unit}</span></button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Sync Checkbox for Existing Ingredients */}
            {!editingIngredient.id.startsWith('new-') && (
                <div className="mb-6 bg-stone-100 p-3 rounded-lg border border-stone-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={syncToBranches} 
                            onChange={e => setSyncToBranches(e.target.checked)} 
                            className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-stone-700">Replicar estructura y receta a todas las sucursales</span>
                    </label>
                    <p className="text-[10px] text-stone-500 mt-1 ml-6">
                        Si se marca, se actualizará la unidad, conversión, lote estándar y composición en todos los ingredientes con el mismo nombre en otras sucursales.
                    </p>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--fr-line)]"><button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-stone-500 hover:bg-[var(--fr-bg)] rounded font-bold">Cancelar</button><button onClick={saveIngredient} className="px-4 py-2 bg-[var(--fr-green)] text-white rounded font-bold hover:bg-[#1a3b2e] uppercase tracking-wider text-sm">Guardar</button></div>
          </div>
        </div>
      )}
      
      {producingIngredient && (
          <div className="fixed inset-0 bg-[#1a3b2e]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[var(--fr-card)] rounded-2xl w-full max-w-md p-6 border border-[var(--fr-line)] shadow-2xl">
                  <div className="flex items-center gap-3 mb-4 text-[var(--fr-green)]">
                      <ChefHat size={32} />
                      <div>
                          <h2 className="text-xl font-bold font-serif">Producir Lote</h2>
                          <p className="text-sm text-stone-500 font-sans">de {producingIngredient.name}</p>
                      </div>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                      <div className="bg-[var(--fr-bg)] p-4 rounded-lg border border-[var(--fr-line)]">
                          <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">Número de Lotes a Cocinar</label>
                          <div className="flex items-center gap-2">
                              <button onClick={() => {
                                  const newVal = Math.max(1, produceCycles - 1);
                                  setProduceCycles(newVal);
                                  setProduceActualOutput(newVal * (producingIngredient.batchSize || 1));
                              }} className="p-2 bg-white border rounded-lg"><ArrowDown size={16}/></button>
                              
                              <input 
                                type="number" 
                                value={produceCycles} 
                                onChange={e => {
                                    const newVal = Math.max(1, Number(e.target.value));
                                    setProduceCycles(newVal);
                                    setProduceActualOutput(newVal * (producingIngredient.batchSize || 1));
                                }} 
                                className="flex-1 text-center p-2 font-bold bg-white border rounded-lg text-stone-800"
                              />
                              
                              <button onClick={() => {
                                  const newVal = produceCycles + 1;
                                  setProduceCycles(newVal);
                                  setProduceActualOutput(newVal * (producingIngredient.batchSize || 1));
                              }} className="p-2 bg-white border rounded-lg"><ArrowUp size={16}/></button>
                          </div>
                          <p className="text-[10px] text-stone-400 mt-1 text-center">1 Lote = {producingIngredient.batchSize || 1} {producingIngredient.unit}</p>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <label className="block text-xs font-bold text-green-700 mb-2 uppercase tracking-wider">Rendimiento Real (Resultado)</label>
                          <div className="relative">
                              <input 
                                type="number" 
                                autoFocus 
                                value={produceActualOutput} 
                                onChange={e => setProduceActualOutput(Number(e.target.value))} 
                                className="w-full text-3xl font-bold text-center p-2 rounded border-2 border-green-300 focus:border-green-600 outline-none bg-white font-serif text-green-900" 
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 font-bold text-sm">{producingIngredient.unit}</span>
                          </div>
                          
                          {produceActualOutput !== (produceCycles * (producingIngredient.batchSize || 1)) && (
                              <div className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                  <AlertTriangle size={14}/>
                                  {produceActualOutput > (produceCycles * (producingIngredient.batchSize || 1)) ? "Rendimiento Superior (+Stock, -Costo)" : "Rendimiento Inferior (-Stock, +Costo)"}
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button onClick={() => setProducingIngredient(null)} className="flex-1 py-3 rounded-lg text-stone-500 hover:bg-[var(--fr-bg)] font-bold">Cancelar</button>
                      <button onClick={handleProduction} className="flex-1 py-3 rounded-lg bg-[var(--fr-green)] text-white hover:bg-[#1a3b2e] font-bold shadow-lg uppercase tracking-wider text-sm">Confirmar & Imprimir</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};