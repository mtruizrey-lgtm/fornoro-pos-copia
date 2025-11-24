
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, Product, Order, Ingredient, Table, Branch, PrinterDefinition, 
  ModifierGroup, Discount, LoyaltyReward, PackagingRule, Purchase, 
  Supplier, Expense, CashRegisterSession, Reservation, Customer,
  Role, OrderType, OrderStatus, Transfer, AppSettings, PrintJob, TimeLog,
  TransferItem, TransferStatus, ProductionData, OrderItem,
  ProductIngredient, PaymentMethod
} from '../types';
import { db } from '../services/firebase';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, 
  onSnapshot, query, where, getDocs, Timestamp 
} from 'firebase/firestore';

// Helper to remove undefined values for Firestore
const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const newObj: any = {};
  for (const key in obj) {
    const val = sanitizeForFirestore(obj[key]);
    if (val !== undefined) newObj[key] = val;
  }
  return newObj;
};

// Helpers for Dates
const safeDate = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'string' || typeof val === 'number') return new Date(val);
    return new Date();
};
const safeDateOpt = (val: any): Date | undefined => {
    if (!val) return undefined;
    return safeDate(val);
};

// Initial Settings
const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Forno Rosso',
  address: '123 Pizza Street',
  phone: '555-0123',
  taxRate: 10,
  currencySymbol: '$',
  suggestedTips: [10, 15, 20],
  ticketHeader: 'Welcome to Forno Rosso',
  ticketFooter: 'Thank you for visiting!',
  indirectCostRate: 15,
  uberCommissionRate: 30,
  pedidosYaCommissionRate: 25,
  loyaltyTiers: [
    { name: 'Bronze', minPoints: 0, color: '#CD7F32' },
    { name: 'Silver', minPoints: 500, color: '#C0C0C0' },
    { name: 'Gold', minPoints: 1000, color: '#FFD700' }
  ],
  spendingPerPoint: 10,
  doublePointsDays: []
};

interface AppContextType {
  login: (pin: string) => boolean;
  logout: () => void;
  currentUser: User | null;
  settings: AppSettings;
  updateSettings: (s: AppSettings) => void;
  
  users: User[];
  addUser: (u: User) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;

  branches: Branch[];
  currentBranchId: string;
  setBranch: (id: string) => void;
  addBranch: (b: Branch) => void;
  updateBranch: (id: string, b: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;

  products: Product[];
  productCategories: string[];
  addProduct: (p: Product) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  updateProductBatch: (updates: {id: string, data: Partial<Product>}[]) => Promise<void>;
  deleteProduct: (id: string) => void;

  ingredients: Ingredient[];
  addIngredient: (i: Ingredient) => void;
  updateIngredient: (id: string, i: Partial<Ingredient>) => void;
  addMasterIngredient: (i: Ingredient, branchIds: string[]) => Promise<void>;
  updateMasterIngredient: (id: string, i: Partial<Ingredient>, sync: boolean) => Promise<void>;
  importIngredientsFromCSV: (csv: string) => void;
  updateStock: (id: string, qty: number) => void;
  adjustInventory: (adjustments: any[]) => void;
  produceBatch: (ingredientId: string, cycles: number, actualOutput: number) => boolean;

  orders: Order[];
  createOrder: (type: OrderType, tableId?: string) => Order;
  addItemToOrder: (orderId: string, product: Product, modifiers?: any[], excludedIds?: string[]) => void;
  updateOrder: (orderId: string, data: Partial<Order>) => void;
  updateOrderItemQuantity: (orderId: string, itemId: string, delta: number) => void;
  addCustomItemToOrder: (orderId: string, name: string, price: number) => void;
  moveOrder: (orderId: string, targetTableId: string) => void;
  mergeOrders: (sourceId: string, targetId: string) => void;
  splitOrder: (orderId: string, items: {[id: string]: number}) => void;
  applyDiscountToOrder: (orderId: string, discount: Discount | null) => void;
  applyCourtesyToOrder: (orderId: string, reason: string) => void;
  voidOrder: (orderId: string) => void;
  closeOrder: (orderId: string, methods: any[], tip: number) => void;
  sendOrderToKitchen: (orderId: string) => void;
  printPreBill: (orderId: string) => void;
  reprintOrder: (orderId: string) => void;

  tables: Table[];
  addTable: (t: Table) => void;
  updateTable: (id: string, t: Partial<Table>) => void;
  deleteTable: (id: string) => void;

  printers: PrinterDefinition[];
  addPrinter: (p: PrinterDefinition) => void;
  updatePrinter: (id: string, p: Partial<PrinterDefinition>) => void;
  deletePrinter: (id: string) => void;
  printQueue: PrintJob[];
  clearPrintJob: (id: string) => void;

  modifierGroups: ModifierGroup[];
  addModifierGroup: (m: ModifierGroup) => void;
  updateModifierGroup: (id: string, m: Partial<ModifierGroup>) => void;
  deleteModifierGroup: (id: string) => void;

  packagingRules: PackagingRule[];
  addPackagingRule: (p: PackagingRule) => void;
  updatePackagingRule: (id: string, p: Partial<PackagingRule>) => void;
  deletePackagingRule: (id: string) => void;

  discounts: Discount[];
  addDiscount: (d: Discount) => void;
  updateDiscount: (id: string, d: Partial<Discount>) => void;
  deleteDiscount: (id: string) => void;

  loyaltyRewards: LoyaltyReward[];
  addLoyaltyReward: (r: LoyaltyReward) => void;
  updateLoyaltyReward: (id: string, r: Partial<LoyaltyReward>) => void;
  deleteLoyaltyReward: (id: string) => void;

  customers: Customer[];
  addCustomer: (c: Customer) => void;

  reservations: Reservation[];
  addReservation: (r: Reservation) => void;
  updateReservation: (id: string, data: Partial<Reservation>) => void;

  purchases: Purchase[];
  addPurchase: (p: Purchase) => Promise<void>;

  suppliers: Supplier[];
  addSupplier: (s: Supplier) => void;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  expenses: Expense[];
  addExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  expenseCategories: string[];
  addExpenseCategory: (c: string) => void;
  removeExpenseCategory: (c: string) => void;

  cashSessions: CashRegisterSession[];
  openRegister: (amount: number, notes: string) => void;
  closeRegister: (amount: number, notes: string) => void;
  getCurrentSession: () => CashRegisterSession | undefined;
  getLastSession: () => CashRegisterSession | undefined;
  printShiftReport: (sessionId: string) => void;

  timeLogs: TimeLog[];
  registerAttendance: (pin: string, type: 'IN' | 'OUT') => { success: boolean, message: string };

  transfers: Transfer[];
  addTransfer: (t: Transfer) => void;
  receiveTransfer: (id: string) => Promise<void>;
  cancelTransfer: (id: string) => void;
  printTransferTicket: (t: Transfer) => void;

  initializeDatabase: () => Promise<void>;
  testConnection: () => void;
  createBackup: () => void;
  restoreBackup: (file: File) => void;
  clearTestData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- STATE DECLARATIONS ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [printers, setPrinters] = useState<PrinterDefinition[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [packagingRules, setPackagingRules] = useState<PackagingRule[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyReward[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashSessions, setCashSessions] = useState<CashRegisterSession[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  
  const [currentBranchId, setCurrentBranchId] = useState('b1');
  const [printQueue, setPrintQueue] = useState<PrintJob[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Alimentos', 'Servicios', 'Mantenimiento', 'Nómina', 'Mermas / Ajuste Inventario']);

  const productCategories = Array.from(new Set(['Pizzas', 'Pastas', 'Bebidas', 'Postres', 'Entradas', ...products.map(p => p.category)]));

  // --- FIRESTORE LISTENERS ---
  useEffect(() => {
      if (!db) return;
      const unsubSettings = onSnapshot(doc(db, 'config', 'main'), (doc) => { if (doc.exists()) setSettings(doc.data() as AppSettings); });
      const unsubBranches = onSnapshot(collection(db, 'branches'), (snap) => setBranches(snap.docs.map(d => ({ ...d.data(), id: d.id } as Branch))));
      const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User))));
      const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => setProducts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Product))));
      const unsubTables = onSnapshot(collection(db, 'tables'), (snap) => setTables(snap.docs.map(d => ({ ...d.data(), id: d.id } as Table))));
      const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snap) => setIngredients(snap.docs.map(d => ({ ...d.data(), id: d.id } as Ingredient))));
      const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => setOrders(snap.docs.map(d => { const data = d.data(); return { ...data, id: d.id, openedAt: safeDate(data.openedAt), closedAt: safeDateOpt(data.closedAt) } as Order; })));
      const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => setCustomers(snap.docs.map(d => ({ ...d.data(), id: d.id, lastVisit: safeDateOpt(d.data().lastVisit) } as Customer))));
      const unsubReservations = onSnapshot(collection(db, 'reservations'), (snap) => setReservations(snap.docs.map(d => ({ ...d.data(), id: d.id, date: safeDate(d.data().date) } as Reservation))));
      const unsubPurchases = onSnapshot(collection(db, 'purchases'), (snap) => setPurchases(snap.docs.map(d => ({ ...d.data(), id: d.id, date: safeDate(d.data().date) } as Purchase))));
      const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snap) => setSuppliers(snap.docs.map(d => ({ ...d.data(), id: d.id } as Supplier))));
      const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => setExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id, date: safeDate(d.data().date) } as Expense))));
      const unsubLogs = onSnapshot(collection(db, 'timeLogs'), (snap) => setTimeLogs(snap.docs.map(d => ({ ...d.data(), id: d.id, timestamp: safeDate(d.data().timestamp) } as TimeLog))));
      const unsubSessions = onSnapshot(collection(db, 'cashSessions'), (snap) => setCashSessions(snap.docs.map(d => ({ ...d.data(), id: d.id, openedAt: safeDate(d.data().openedAt), closedAt: safeDateOpt(d.data().closedAt) } as CashRegisterSession))));
      const unsubPrinters = onSnapshot(collection(db, 'printers'), (snap) => setPrinters(snap.docs.map(d => ({ ...d.data(), id: d.id } as PrinterDefinition))));
      const unsubMods = onSnapshot(collection(db, 'modifiers'), (snap) => setModifierGroups(snap.docs.map(d => ({ ...d.data(), id: d.id } as ModifierGroup))));
      const unsubPkg = onSnapshot(collection(db, 'packaging'), (snap) => setPackagingRules(snap.docs.map(d => ({ ...d.data(), id: d.id } as PackagingRule))));
      const unsubDisc = onSnapshot(collection(db, 'discounts'), (snap) => setDiscounts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Discount))));
      const unsubRewards = onSnapshot(collection(db, 'loyaltyRewards'), (snap) => setLoyaltyRewards(snap.docs.map(d => ({ ...d.data(), id: d.id } as LoyaltyReward))));
      const unsubTransfers = onSnapshot(collection(db, 'transfers'), (snap) => setTransfers(snap.docs.map(d => ({ ...d.data(), id: d.id, createdAt: safeDate(d.data().createdAt), receivedAt: safeDateOpt(d.data().receivedAt) } as Transfer))));

      return () => {
          unsubSettings(); unsubBranches(); unsubUsers(); unsubProducts(); unsubTables(); unsubOrders();
          unsubIngredients(); unsubCustomers(); unsubReservations(); unsubPurchases(); unsubSuppliers(); 
          unsubExpenses(); unsubLogs(); unsubSessions(); unsubPrinters(); unsubMods(); unsubPkg(); unsubDisc(); unsubRewards();
          unsubTransfers();
      };
  }, []);

  // --- ACTIONS ---
  const dbAdd = (col: string, data: any) => { if(db) { const ref = doc(collection(db, col)); setDoc(ref, { ...sanitizeForFirestore(data), id: ref.id }); } };
  const dbSet = (col: string, id: string, data: any) => { if(db) setDoc(doc(db, col, id), sanitizeForFirestore(data)); };
  const dbUpdate = (col: string, id: string, data: any) => { if(db) updateDoc(doc(db, col, id), sanitizeForFirestore(data)); };
  const dbDelete = (col: string, id: string) => { if(db) deleteDoc(doc(db, col, id)); };

  // --- ENTITY CRUD ---
  const addUser = (u: User) => dbAdd('users', u);
  const updateUser = (id: string, u: Partial<User>) => dbUpdate('users', id, u);
  const deleteUser = (id: string) => dbDelete('users', id);

  const addBranch = (b: Branch) => dbAdd('branches', b);
  const updateBranch = (id: string, b: Partial<Branch>) => dbUpdate('branches', id, b);
  const deleteBranch = (id: string) => dbDelete('branches', id);

  const addProduct = (p: Product) => dbAdd('products', p);
  const updateProduct = (id: string, p: Partial<Product>) => dbUpdate('products', id, p);
  const deleteProduct = (id: string) => dbDelete('products', id);
  const updateProductBatch = async (updates: {id: string, data: Partial<Product>}[]) => {
      if(!db) return;
      const batch = writeBatch(db);
      updates.forEach(u => {
          const ref = doc(db, 'products', u.id);
          batch.update(ref, sanitizeForFirestore(u.data));
      });
      await batch.commit();
  };

  const addTable = (t: Table) => dbAdd('tables', t);
  const updateTable = (id: string, t: Partial<Table>) => dbUpdate('tables', id, t);
  const deleteTable = (id: string) => dbDelete('tables', id);

  // --- AUTH ---
  const login = (pin: string) => {
    if(!db && pin === '1111') { setCurrentUser({ id: 'temp-admin', name: 'Dueño Admin', role: Role.ADMIN, pin: '1111' }); return true; }
    const user = users.find(u => u.pin === pin); if (user) { setCurrentUser(user); return true; } return false;
  };
  const logout = () => setCurrentUser(null);

  // --- ORDER LOGIC ---
  const createOrder = (type: OrderType, tableId?: string) => {
      const newOrder: Order = { id: `ord-${Date.now()}`, branchId: currentBranchId, type, status: OrderStatus.OPEN, items: [], subtotal: 0, discount: 0, serviceCharge: 0, tip: 0, total: 0, peopleCount: 1, openedAt: new Date(), waiterId: currentUser?.id || '' };
      if (tableId) newOrder.tableId = tableId;
      if(db) { const batch = writeBatch(db); const orderRef = doc(collection(db, 'orders')); newOrder.id = orderRef.id; batch.set(orderRef, sanitizeForFirestore(newOrder)); if(tableId) { const table = tables.find(t => t.id === tableId); if(table) { batch.update(doc(db, 'tables', tableId), { isOccupied: true, currentOrderIds: [...table.currentOrderIds, newOrder.id] }); } } batch.commit(); }
      return newOrder;
  };
  const updateOrder = (id: string, data: Partial<Order>) => dbUpdate('orders', id, data);
  
  // BOGO Logic integrated into Totals Calculation
  const calculateOrderTotals = (order: Order, items: any[]) => { 
      const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0); 
      let discountAmount = 0; 
      
      if (order.appliedDiscount) { 
          if (order.appliedDiscount.type === 'PERCENTAGE') { 
              discountAmount = subtotal * (order.appliedDiscount.value / 100); 
          } else if (order.appliedDiscount.type === 'FIXED') { 
              discountAmount = order.appliedDiscount.value; 
          } else if (order.appliedDiscount.type === 'BOGO') {
              // 2x1 Logic
              const targetCats = order.appliedDiscount.applyToCategories || [];
              items.forEach(item => {
                  const prod = products.find(p => p.id === item.productId);
                  if (prod && (targetCats.length === 0 || targetCats.includes(prod.category))) {
                      const freeItems = Math.floor(item.quantity / 2);
                      discountAmount += freeItems * item.price;
                  }
              });
          }
      } 
      
      if (order.isCourtesy) return { items, subtotal, discountAmount, total: 0 }; 
      const afterDiscount = Math.max(0, subtotal - discountAmount); 
      const total = afterDiscount + order.serviceCharge; 
      return { items, subtotal, discountAmount, total }; 
  };

  const addItemToOrder = (orderId: string, product: Product, modifiers: any[] = [], excludedIds: string[] = []) => { const order = orders.find(o => o.id === orderId); if(!order) return; let itemCost = 0; product.ingredients.forEach(pi => { if (!excludedIds.includes(pi.ingredientId)) { const ing = ingredients.find(i => i.id === pi.ingredientId); if (ing) itemCost += ing.cost * pi.quantity; } }); modifiers.forEach(mod => { mod.recipe?.forEach((pi: ProductIngredient) => { const ing = ingredients.find(i => i.id === pi.ingredientId); if (ing) itemCost += ing.cost * pi.quantity; }); }); const newItem = { id: `item-${Date.now()}`, productId: product.id, name: product.name, quantity: 1, price: product.prices[order.type] + modifiers.reduce((acc: number, m: any) => acc + m.price, 0), modifiers, excludedIngredientIds: excludedIds, printed: false, costSnapshot: itemCost }; const newItems = [...order.items, newItem]; const totals = calculateOrderTotals(order, newItems); updateOrder(orderId, totals); };
  const updateOrderItemQuantity = (orderId: string, itemId: string, delta: number) => { const order = orders.find(o => o.id === orderId); if(!order) return; const newItems = order.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0); const totals = calculateOrderTotals(order, newItems); updateOrder(orderId, totals); };
  const addCustomItemToOrder = (orderId: string, name: string, price: number) => { const order = orders.find(o => o.id === orderId); if(!order) return; const newItem = { id: `cust-${Date.now()}`, name, quantity: 1, price, isCustom: true, printed: false }; const newItems = [...order.items, newItem]; const totals = calculateOrderTotals(order, newItems); updateOrder(orderId, totals); };
  const moveOrder = (orderId: string, targetTableId: string) => { if(!db) return; const order = orders.find(o => o.id === orderId); if(!order) return; const batch = writeBatch(db); if(order.tableId) { const oldTable = tables.find(t => t.id === order.tableId); if(oldTable) { const newIds = oldTable.currentOrderIds.filter(id => id !== orderId); batch.update(doc(db, 'tables', oldTable.id), { currentOrderIds: newIds, isOccupied: newIds.length > 0 }); } } const newTable = tables.find(t => t.id === targetTableId); if(newTable) { batch.update(doc(db, 'tables', targetTableId), { currentOrderIds: [...newTable.currentOrderIds, orderId], isOccupied: true }); } batch.update(doc(db, 'orders', orderId), { tableId: targetTableId }); batch.commit(); };
  const mergeOrders = (sourceId: string, targetId: string) => { if(!db) return; const source = orders.find(o => o.id === sourceId); const target = orders.find(o => o.id === targetId); if(!source || !target) return; const newItems = [...target.items, ...source.items]; const subtotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0); const total = subtotal; const batch = writeBatch(db); batch.update(doc(db, 'orders', targetId), { items: newItems, subtotal, total }); batch.update(doc(db, 'orders', sourceId), { status: OrderStatus.VOID }); if(source.tableId) { const table = tables.find(t => t.id === source.tableId); if(table) { const newIds = table.currentOrderIds.filter(id => id !== sourceId); batch.update(doc(db, 'tables', source.tableId), { currentOrderIds: newIds, isOccupied: newIds.length > 0 }); } } batch.commit(); };
  const splitOrder = async (orderId: string, quantities: {[itemId: string]: number}) => { if (!db) return; const originalOrder = orders.find(o => o.id === orderId); if (!originalOrder) return; const batch = writeBatch(db); const newOrderRef = doc(collection(db, 'orders')); const newOrderItems: any[] = []; const originalOrderItems: any[] = []; originalOrder.items.forEach(item => { const qtyToMove = quantities[item.id] || 0; const qtyRemaining = item.quantity - qtyToMove; if (qtyToMove > 0) newOrderItems.push({ ...item, quantity: qtyToMove }); if (qtyRemaining > 0) originalOrderItems.push({ ...item, quantity: qtyRemaining }); }); if (newOrderItems.length === 0) return; const newSubtotal = newOrderItems.reduce((acc, i) => acc + i.price * i.quantity, 0); const newOrder: Order = { ...originalOrder, id: newOrderRef.id, items: newOrderItems, subtotal: newSubtotal, total: newSubtotal, status: OrderStatus.OPEN, discount: 0, discountAmount: 0, appliedDiscount: null, isCourtesy: false, paymentMethods: [] }; batch.set(newOrderRef, sanitizeForFirestore(newOrder)); const origSubtotal = originalOrderItems.reduce((acc, i) => acc + i.price * i.quantity, 0); batch.update(doc(db, 'orders', orderId), { items: originalOrderItems, subtotal: origSubtotal, total: origSubtotal }); if (originalOrder.tableId) { const table = tables.find(t => t.id === originalOrder.tableId); if (table) batch.update(doc(db, 'tables', table.id), { currentOrderIds: [...table.currentOrderIds, newOrder.id] }); } await batch.commit(); };
  const applyDiscountToOrder = (id: string, d: Discount | null) => { const order = orders.find(o => o.id === id); if(!order) return; let updatedOrder = { ...order, appliedDiscount: d }; if (d === null) updatedOrder = { ...order, appliedDiscount: null } as any; const totals = calculateOrderTotals(updatedOrder, updatedOrder.items); updateOrder(id, { ...totals, appliedDiscount: d }); };
  const applyCourtesyToOrder = (id: string, reason: string) => { if(db) { const batch = writeBatch(db); batch.update(doc(db, 'orders', id), { isCourtesy: true, courtesyReason: reason, total: 0, appliedDiscount: null, discountAmount: 0 }); batch.commit(); } };
  const voidOrder = (id: string) => { const order = orders.find(o => o.id === id); if(!order || !db) return; const batch = writeBatch(db); batch.update(doc(db, 'orders', id), { status: OrderStatus.VOID }); if(order.tableId) { const table = tables.find(t => t.id === order.tableId); if(table) { const newIds = table.currentOrderIds.filter(oid => oid !== id); batch.update(doc(db, 'tables', table.id), { currentOrderIds: newIds, isOccupied: newIds.length > 0 }); } } batch.commit(); };
  const sendOrderToKitchen = (id: string) => { const order = orders.find(o => o.id === id); if(!order) return; const itemsToPrint = order.items.filter(i => !i.printed); if(itemsToPrint.length === 0) { alert("No hay ítems nuevos."); return; } const updatedItems = order.items.map(i => ({ ...i, printed: true })); updateOrder(id, { items: updatedItems, status: OrderStatus.COOKING }); printers.filter(p => !p.isCashier).forEach(printer => { const relevantItems = itemsToPrint.filter(item => { const product = products.find(p => p.id === item.productId); return product && printer.categories.includes(product.category); }); if (relevantItems.length > 0) { setPrintQueue(prev => [...prev, { id: `job-${Date.now()}-${printer.id}`, type: 'COMMAND', printerName: printer.name, printerDescription: printer.description, order, itemsToPrint: relevantItems, timestamp: new Date() }]); } }); };
  const printPreBill = (id: string) => { const order = orders.find(o => o.id === id); const cashierPrinter = printers.find(p => p.isCashier); if(order) setPrintQueue(prev => [...prev, { id: `job-${Date.now()}`, type: 'BILL', printerName: cashierPrinter?.name || 'Caja', printerDescription: cashierPrinter?.description, order, timestamp: new Date() }]); };
  const reprintOrder = (id: string) => { const order = orders.find(o => o.id === id); const cashierPrinter = printers.find(p => p.isCashier); if(order) { const type = order.status === OrderStatus.PAID ? 'RECEIPT' : 'BILL'; setPrintQueue(prev => [...prev, { id: `job-${Date.now()}`, type, printerName: cashierPrinter?.name || 'Caja', order, timestamp: new Date() }]); } };
  
  const closeOrder = async (id: string, methods: any[], tip: number) => { 
      if(!db) return; 
      const order = orders.find(o => o.id === id); 
      if(!order) return; 
      const batch = writeBatch(db); 
      
      batch.update(doc(db, 'orders', id), { status: OrderStatus.PAID, paymentMethods: methods, tip, closedAt: new Date() }); 
      if(order.tableId) { 
          const t = tables.find(tbl => tbl.id === order.tableId); 
          if(t) { 
              const newIds = t.currentOrderIds.filter(oid => oid !== id); 
              batch.update(doc(db, 'tables', t.id), { currentOrderIds: newIds, isOccupied: newIds.length > 0 }); 
          } 
      } 
      
      const deductions: { [ingId: string]: number } = {}; 
      let packagingCostTotal = 0; 
      
      order.items.forEach(item => { 
          const product = products.find(p => p.id === item.productId); 
          if (!product) return; 
          
          product.ingredients.forEach(pi => { 
              if (!item.excludedIngredientIds?.includes(pi.ingredientId)) {
                  // Resolve Ingredient ID by Name for Current Branch (Smart Deduction)
                  const recipeIng = ingredients.find(i => i.id === pi.ingredientId);
                  let targetIngId = pi.ingredientId;
                  
                  if (recipeIng) {
                      const localIng = ingredients.find(i => i.branchId === currentBranchId && i.name.trim().toLowerCase() === recipeIng.name.trim().toLowerCase());
                      if (localIng) targetIngId = localIng.id;
                  }
                  
                  deductions[targetIngId] = (deductions[targetIngId] || 0) + (pi.quantity * item.quantity); 
              }
          }); 
          
          item.modifiers?.forEach(mod => { 
              mod.recipe.forEach(mi => {
                  const recipeIng = ingredients.find(i => i.id === mi.ingredientId);
                  let targetIngId = mi.ingredientId;
                  if (recipeIng) {
                      const localIng = ingredients.find(i => i.branchId === currentBranchId && i.name.trim().toLowerCase() === recipeIng.name.trim().toLowerCase());
                      if (localIng) targetIngId = localIng.id;
                  }
                  deductions[targetIngId] = (deductions[targetIngId] || 0) + (mi.quantity * item.quantity);
              }); 
          }); 
          
          packagingRules.forEach(rule => { 
              if (!rule.applyToOrderTypes.includes(order.type)) return; 
              let applies = false; 
              if (rule.applyToProductIds && rule.applyToProductIds.length > 0) { 
                  if (rule.applyToProductIds.includes(product.id)) applies = true; 
              } else if (rule.applyToCategories.length > 0) { 
                  if (rule.applyToCategories.includes(product.category)) applies = true; 
              } else { applies = true; } 
              
              if (applies && rule.applyPer === 'ITEM') { 
                  rule.ingredients.forEach(ri => { 
                      // Resolve Packaging Ingredient Locally
                      const recipeIng = ingredients.find(i => i.id === ri.ingredientId);
                      let targetIngId = ri.ingredientId;
                      if (recipeIng) {
                          const localIng = ingredients.find(i => i.branchId === currentBranchId && i.name.trim().toLowerCase() === recipeIng.name.trim().toLowerCase());
                          if (localIng) targetIngId = localIng.id;
                      }

                      deductions[targetIngId] = (deductions[targetIngId] || 0) + (ri.quantity * item.quantity); 
                      const ing = ingredients.find(i => i.id === targetIngId); 
                      if(ing) packagingCostTotal += ing.cost * ri.quantity * item.quantity; 
                  }); 
              } 
          }); 
      }); 
      
      packagingRules.forEach(rule => { 
          if (!rule.applyToOrderTypes.includes(order.type)) return; 
          if (rule.applyPer === 'ORDER') { 
              let applies = true; 
              if (rule.applyToCategories.length > 0) { 
                  const hasCategory = order.items.some(i => { const p = products.find(prod => prod.id === i.productId); return p && rule.applyToCategories.includes(p.category); }); 
                  if (!hasCategory) applies = false; 
              } 
              if (applies) { 
                  rule.ingredients.forEach(ri => { 
                      const recipeIng = ingredients.find(i => i.id === ri.ingredientId);
                      let targetIngId = ri.ingredientId;
                      if (recipeIng) {
                          const localIng = ingredients.find(i => i.branchId === currentBranchId && i.name.trim().toLowerCase() === recipeIng.name.trim().toLowerCase());
                          if (localIng) targetIngId = localIng.id;
                      }

                      deductions[targetIngId] = (deductions[targetIngId] || 0) + (ri.quantity); 
                      const ing = ingredients.find(i => i.id === targetIngId); 
                      if(ing) packagingCostTotal += ing.cost * ri.quantity; 
                  }); 
              } 
          } 
      }); 
      
      batch.update(doc(db, 'orders', id), { packagingCostSnapshot: packagingCostTotal }); 
      Object.entries(deductions).forEach(([ingId, qty]) => { 
          const currentStock = ingredients.find(i => i.id === ingId)?.stock || 0; 
          batch.update(doc(db, 'ingredients', ingId), { stock: currentStock - qty }); 
      }); 
      
      if (order.customerId) { 
          const customer = customers.find(c => c.id === order.customerId); 
          if (customer) { 
              const rate = settings.spendingPerPoint || 10; 
              let earned = Math.floor(order.total / rate); 
              const todayIndex = new Date().getDay(); 
              if (settings.doublePointsDays?.includes(todayIndex)) earned *= 2; 
              const newPoints = customer.points + earned; 
              let newTier = customer.currentTier; 
              settings.loyaltyTiers.forEach(tier => { if (newPoints >= tier.minPoints) { if (!newTier || tier.minPoints > (settings.loyaltyTiers.find(t => t.name === newTier)?.minPoints || 0)) newTier = tier.name; } }); 
              batch.update(doc(db, 'customers', order.customerId), { points: newPoints, visitCount: customer.visitCount + 1, lastVisit: new Date(), currentTier: newTier }); 
          } 
      } 
      await batch.commit(); 
      const cashierPrinter = printers.find(p => p.isCashier); 
      setPrintQueue(prev => [...prev, { id: `job-${Date.now()}`, type: 'RECEIPT', printerName: cashierPrinter?.name || 'Caja', order: { ...order, status: OrderStatus.PAID, paymentMethods: methods, tip, closedAt: new Date() }, timestamp: new Date() }]); 
  };

  // --- INVENTORY & PRODUCTION ---
  const addIngredient = (i: Ingredient) => dbAdd('ingredients', i);
  const updateIngredient = (id: string, i: Partial<Ingredient>) => dbUpdate('ingredients', id, i);
  const updateStock = (id: string, delta: number) => { const ing = ingredients.find(i => i.id === id); if(ing) updateIngredient(id, { stock: ing.stock + delta }); };
  const adjustInventory = async (adjustments: any[]) => { if(!db) return; const batch = writeBatch(db); let totalLoss = 0; adjustments.forEach(adj => { batch.update(doc(db, 'ingredients', adj.ingredientId), { stock: adj.newStock }); const diff = adj.newStock - adj.systemStock; if (diff < 0) totalLoss += Math.abs(diff) * adj.cost; }); if (totalLoss > 0) { const expenseRef = doc(collection(db, 'expenses')); batch.set(expenseRef, { id: expenseRef.id, branchId: currentBranchId, description: 'Ajuste Inventario (Mermas/Pérdidas)', amount: totalLoss, category: 'Mermas / Ajuste Inventario', date: new Date() }); } await batch.commit(); };
  
  const produceBatch = (id: string, batches: number, actualOutput: number) => {
      if (!db) return false;
      
      // 1. Resolve Product by ID (The one being produced)
      const product = ingredients.find(i => i.id === id);
      if (!product || !product.isSubRecipe) return false;
      
      const composition = product.composition || [];
      if (composition.length === 0) return false;

      const batch = writeBatch(db);

      // 2. Consume Ingredients (Resolve by Name + Branch for robust deduction)
      composition.forEach(comp => {
          const raw = ingredients.find(i => i.id === comp.ingredientId);
          let searchName = '';
          if (raw) {
              searchName = raw.name;
          }
          
          // Find the actual ingredient in the CURRENT branch to deduct from
          const targetRaw = ingredients.find(i => i.branchId === currentBranchId && i.name.trim().toLowerCase() === searchName.trim().toLowerCase());
          
          if (targetRaw) {
              // Logic: Recipe Quantity * Number of Batches
              const amountToDeduct = comp.quantity * batches;
              batch.update(doc(db, 'ingredients', targetRaw.id), { stock: targetRaw.stock - amountToDeduct });
          }
      });

      // 3. Add Produced Quantity to Stock
      // Calculate new weighted average cost based on actual inputs used
      let totalInputCost = 0;
      composition.forEach(comp => {
          const raw = ingredients.find(i => i.id === comp.ingredientId); // Look up reference for cost
          // Ideally use local cost
          const localRaw = ingredients.find(i => i.branchId === currentBranchId && i.name === raw?.name);
          if (localRaw) {
              totalInputCost += localRaw.cost * (comp.quantity * batches);
          }
      });
      
      const unitCost = actualOutput > 0 ? totalInputCost / actualOutput : product.cost;
      
      // Update Stock & Cost
      // Weighted Average for adding finished goods
      const currentTotalValue = product.stock * product.cost;
      const newTotalValue = currentTotalValue + totalInputCost;
      const newTotalStock = product.stock + actualOutput;
      const newWeightedCost = newTotalStock > 0 ? newTotalValue / newTotalStock : unitCost;

      batch.update(doc(db, 'ingredients', id), { 
          stock: newTotalStock,
          cost: newWeightedCost 
      });

      batch.commit();

      // 4. Print Ticket
      setPrintQueue(prev => [...prev, {
          id: `job-${Date.now()}`,
          type: 'PRODUCTION',
          printerName: 'Cocina', // Or configured kitchen printer
          productionData: {
              itemName: product.name,
              cycles: batches,
              batchSize: product.batchSize || 1,
              expectedQty: batches * (product.batchSize || 1),
              actualQty: actualOutput,
              unit: product.unit,
              ingredientsUsed: composition.map(c => {
                  const raw = ingredients.find(i => i.id === c.ingredientId);
                  return { 
                      name: raw ? raw.name : '', 
                      qty: c.quantity * batches,
                      unit: raw ? raw.unit : ''
                  };
              }),
              user: currentUser?.name || 'Admin'
          },
          timestamp: new Date()
      }]);

      return true;
  };

  const importIngredientsFromCSV = async (csv: string) => { if(!db) return; try { const lines = csv.split(/\r\n|\n/); if(lines.length < 2) return; const headerLine = lines[0]; const separator = headerLine.includes(';') ? ';' : ','; const batchLimit = 450; let batch = writeBatch(db); let count = 0; let batchCount = 0; for (let i = 1; i < lines.length; i++) { if (!lines[i].trim()) continue; const cols = lines[i].split(separator).map(c => c.replace(/"/g, '').trim()); if (cols.length >= 2) { const name = cols[0]; if(!name) continue; const parseNum = (val: string) => { if(!val) return 0; return parseFloat(val.replace(',', '.')); }; const newIng: Ingredient = { id: `ing-${Date.now()}-${i}`, branchId: currentBranchId, name: name, unit: cols[1] || 'g', purchaseUnit: cols[2] || 'Unidad', conversionRatio: parseNum(cols[3]) || 1, minStock: parseNum(cols[4]) || 0, cost: parseNum(cols[5]) || 0, stock: 0, isSubRecipe: false, priceHistory: [] }; const ref = doc(collection(db, 'ingredients')); newIng.id = ref.id; batch.set(ref, sanitizeForFirestore(newIng)); count++; batchCount++; if(batchCount >= batchLimit) { await batch.commit(); batch = writeBatch(db); batchCount = 0; } } } if(batchCount > 0) await batch.commit(); alert(`¡Importación Exitosa! Se cargaron ${count} ingredientes.`); } catch (e) { console.error(e); alert("Error al importar."); } };

  // Multi-Branch Ingredient Management
  const addMasterIngredient = async (baseIngredient: Ingredient, branchIds: string[]) => {
      if (!db) return;
      const batch = writeBatch(db);
      
      branchIds.forEach(bId => {
          const newRef = doc(collection(db, 'ingredients'));
          const ingClone = {
              ...baseIngredient,
              id: newRef.id,
              branchId: bId,
              stock: 0, // Init stock 0 for others
              cost: baseIngredient.cost || 0,
              // Ensure composition uses local IDs? Ideally yes, but complex. 
              // For now, composition copies IDs. produceBatch resolves by Name.
          };
          batch.set(newRef, sanitizeForFirestore(ingClone));
      });
      
      await batch.commit();
  };

  const updateMasterIngredient = async (id: string, updates: Partial<Ingredient>, sync: boolean) => {
      if (!db) return;
      const batch = writeBatch(db);
      const targetRef = doc(db, 'ingredients', id);
      batch.update(targetRef, sanitizeForFirestore(updates));

      if (sync) {
          // Find original to get name
          const original = ingredients.find(i => i.id === id);
          if (original) {
              const nameToSync = original.name.trim().toLowerCase();
              // Find matches in other branches
              const matches = ingredients.filter(i => i.id !== id && i.name.trim().toLowerCase() === nameToSync);
              
              matches.forEach(match => {
                  // Sync structural fields only
                  const syncData = {
                      unit: updates.unit,
                      purchaseUnit: updates.purchaseUnit,
                      conversionRatio: updates.conversionRatio,
                      minStock: updates.minStock,
                      batchSize: updates.batchSize,
                      // For composition, we should ideally map IDs, but produceBatch handles name resolution
                      composition: updates.composition 
                  };
                  batch.update(doc(db, 'ingredients', match.id), sanitizeForFirestore(syncData));
              });
          }
      }
      await batch.commit();
  };

  // --- TRANSFERS ---
  const printTransferTicket = (t: Transfer) => {
      const printer = printers.find(p => p.isCashier); 
      setPrintQueue(prev => [...prev, {
          id: `trf-print-${Date.now()}`,
          type: 'TRANSFER',
          printerName: printer?.name || 'Caja',
          transferData: t,
          timestamp: new Date()
      }]);
  };

  const addTransfer = async (t: Transfer) => {
      if (!db) return;
      const batch = writeBatch(db);
      const transferRef = doc(collection(db, 'transfers'));
      t.id = transferRef.id;
      
      batch.set(transferRef, sanitizeForFirestore(t));

      // Deduct from Source
      t.items.forEach(item => {
          const sourceIng = ingredients.find(i => i.id === item.ingredientId);
          if (sourceIng) {
              batch.update(doc(db, 'ingredients', sourceIng.id), {
                  stock: sourceIng.stock - item.quantity
              });
          }
      });

      await batch.commit();
  };

  const receiveTransfer = async (transferId: string) => {
      if (!db) { alert("No hay conexión a la base de datos."); return; }
      
      try {
          // 1. Fetch Transfer Fresh Data
          const tDoc = await getDocs(query(collection(db, 'transfers'), where('__name__', '==', transferId))); // Use __name__ for ID or just doc()
          // Actually better:
          // const tSnap = await getDoc(doc(db, 'transfers', transferId));
          // Reverting to list search for safety if getDoc import issues, but filtering list
          const t = transfers.find(tr => tr.id === transferId); // Use local state for Transfer object structure, assume valid if clicked
          
          if(!t || t.status !== TransferStatus.PENDING) {
              alert("El traslado no está pendiente o no existe.");
              return;
          }

          const batch = writeBatch(db);
          
          // 2. Fetch ALL ingredients to perform robust in-memory matching (Avoids composite index issues)
          const ingSnap = await getDocs(collection(db, 'ingredients'));
          const allIngs = ingSnap.docs.map(d => ({...d.data(), id: d.id} as Ingredient));

          // 3. Process Items
          const itemsToProcess = t.items as TransferItem[];
          
          itemsToProcess.forEach(item => {
              // Find match in Target Branch by Name
              const targetIng = allIngs.find(i => 
                  i.branchId === t.targetBranchId && 
                  i.name.trim().toLowerCase() === item.name.trim().toLowerCase()
              );

              if (targetIng) {
                  // Update Existing
                  const totalValue = (targetIng.stock * targetIng.cost) + (item.quantity * item.cost);
                  const newStock = targetIng.stock + item.quantity;
                  const newCost = newStock > 0 ? totalValue / newStock : targetIng.cost;
                  
                  batch.update(doc(db, 'ingredients', targetIng.id), {
                      stock: newStock,
                      cost: isNaN(newCost) ? targetIng.cost : newCost
                  });
              } else {
                  // Create New
                  const newIngRef = doc(collection(db, 'ingredients'));
                  const newIng: Ingredient = {
                      id: newIngRef.id,
                      branchId: t.targetBranchId,
                      name: item.name,
                      unit: item.unit,
                      purchaseUnit: item.unit, // Fallback
                      conversionRatio: 1,
                      stock: item.quantity,
                      cost: item.cost,
                      minStock: 0,
                      priceHistory: [],
                      isSubRecipe: false
                  };
                  batch.set(newIngRef, sanitizeForFirestore(newIng));
              }
          });

          // 4. Close Transfer
          batch.update(doc(db, 'transfers', transferId), {
              status: TransferStatus.COMPLETED,
              receivedAt: new Date()
          });

          await batch.commit();
          alert("Recepción confirmada exitosamente. Inventario actualizado.");

      } catch (error: any) {
          console.error("Error receiving transfer:", error);
          alert("Error al recibir traslado: " + error.message);
      }
  };

  const cancelTransfer = async (transferId: string) => {
      if (!db) return;
      const t = transfers.find(tr => tr.id === transferId);
      if(!t || t.status !== TransferStatus.PENDING) return;

      const batch = writeBatch(db);

      // Revert Stock
      t.items.forEach(item => {
          const sourceIng = ingredients.find(i => i.id === item.ingredientId);
          if (sourceIng) {
              batch.update(doc(db, 'ingredients', sourceIng.id), {
                  stock: sourceIng.stock + item.quantity
              });
          }
      });

      batch.update(doc(db, 'transfers', transferId), {
          status: TransferStatus.CANCELLED
      });

      await batch.commit();
  };

  const addPurchase = async (p: Purchase) => { 
      if(!db) return; 
      const batch = writeBatch(db); 
      const purRef = doc(collection(db, 'purchases')); 
      p.id = purRef.id; 
      batch.set(purRef, sanitizeForFirestore(p)); 

      // Aggregate items to prevent overwriting updates for same ingredient in same batch
      const updates = new Map<string, { 
          ing: Ingredient, 
          addStock: number, 
          addValue: number, 
          historyEntry: any,
          isNew: boolean
      }>();

      for (const item of p.items) {
          const refIng = ingredients.find(i => i.id === item.ingredientId);
          if(!refIng) continue;

          const normalizedName = refIng.name.trim().toLowerCase();
          
          // Find target in purchase branch
          let existingIng = ingredients.find(i => 
             i.branchId === p.branchId && i.name.trim().toLowerCase() === normalizedName
          );

          let targetId = existingIng ? existingIng.id : `NEW-${normalizedName}`; 
          
          let entry = updates.get(targetId);
          if (!entry) {
              entry = {
                  ing: existingIng || { ...refIng, branchId: p.branchId, stock: 0, priceHistory: [] }, // Base for calculation
                  addStock: 0,
                  addValue: 0,
                  historyEntry: null, 
                  isNew: !existingIng
              };
              updates.set(targetId, entry);
          }

          const qtyReceived = item.quantity * entry.ing.conversionRatio;
          entry.addStock += qtyReceived;
          entry.addValue += item.cost;
          
          const purchasePriceUnit = item.cost / item.quantity; 
          entry.historyEntry = { date: new Date(), price: purchasePriceUnit, provider: p.provider };
      }

      // Apply aggregated updates
      updates.forEach((data, key) => {
          const { ing, addStock, addValue, historyEntry, isNew } = data;
          
          const currentVal = Math.max(0, ing.stock) * ing.cost;
          const totalVal = currentVal + addValue;
          const totalStock = Math.max(0, ing.stock) + addStock;
          const newCost = totalStock > 0 ? totalVal / totalStock : ing.cost;

          if (isNew) {
              const newRef = doc(collection(db, 'ingredients'));
              const newIngData = {
                  ...ing,
                  id: newRef.id,
                  stock: totalStock,
                  cost: newCost,
                  lastPurchaseCost: historyEntry.price,
                  priceHistory: [historyEntry]
              };
              batch.set(newRef, sanitizeForFirestore(newIngData));
          } else {
              batch.update(doc(db, 'ingredients', ing.id), {
                  stock: totalStock,
                  cost: isNaN(newCost) ? ing.cost : newCost,
                  lastPurchaseCost: historyEntry.price,
                  priceHistory: [...(ing.priceHistory || []), historyEntry]
              });
          }
      });

      await batch.commit(); 
      // setPurchases(prev => [...prev, p]); // Snapshot handles update
  };

  // ... (Other helpers kept same)
  const addCustomer = (c: Customer) => dbAdd('customers', c);
  const addReservation = (r: Reservation) => dbAdd('reservations', r);
  const updateReservation = (id: string, d: Partial<Reservation>) => dbUpdate('reservations', id, d);
  const addSupplier = (s: Supplier) => dbAdd('suppliers', s);
  const updateSupplier = (id: string, s: Partial<Supplier>) => dbUpdate('suppliers', id, s);
  const deleteSupplier = (id: string) => dbDelete('suppliers', id);
  const addExpense = (e: Expense) => dbAdd('expenses', e);
  const deleteExpense = (id: string) => dbDelete('expenses', id);
  const addExpenseCategory = (c: string) => setExpenseCategories(prev => [...prev, c]);
  const removeExpenseCategory = (c: string) => setExpenseCategories(prev => prev.filter(x => x !== c));
  const registerAttendance = (pin: string, type: 'IN' | 'OUT') => { const user = users.find(u => u.pin === pin); if(!user) return { success: false, message: 'PIN inválido' }; const log: TimeLog = { id: `log-${Date.now()}`, userId: user.id, userName: user.name, type, timestamp: new Date() }; dbAdd('timeLogs', log); return { success: true, message: `Registro ${type === 'IN' ? 'Entrada' : 'Salida'} Exitoso` }; };
  const getCurrentSession = () => cashSessions.find(s => s.status === 'OPEN');
  const getLastSession = () => [...cashSessions].sort((a,b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime())[0];
  const openRegister = (amount: number, notes: string) => { if(!currentUser) return; const session: CashRegisterSession = { id: `ses-${Date.now()}`, branchId: currentBranchId, userId: currentUser.id, openedAt: new Date(), startingCashExpected: amount, startingCashActual: amount, startingNotes: notes, endingCashSystem: 0, status: 'OPEN' }; dbAdd('cashSessions', session); };
  const closeRegister = (amount: number, notes: string) => { const session = getCurrentSession(); if(session) dbUpdate('cashSessions', session.id, { status: 'CLOSED', closedAt: new Date(), endingCashActual: amount, endingNotes: notes }); };
  const printShiftReport = (id: string) => { const s = cashSessions.find(ses => ses.id === id); if(!s) return; const sessionOrders = orders.filter(o => o.branchId === s.branchId && o.status === OrderStatus.PAID && o.closedAt && new Date(o.closedAt) > new Date(s.openedAt) && (s.closedAt ? new Date(o.closedAt) <= new Date(s.closedAt) : true)); const stats = { cash: 0, card: 0, other: 0, total: 0, orders: sessionOrders.length, tips: 0 }; const byChannel: any = {}; sessionOrders.forEach(o => { stats.total += o.total; stats.tips += o.tip || 0; const channelName = o.type.replace('DELIVERY_', ''); byChannel[channelName] = (byChannel[channelName] || 0) + o.total; o.paymentMethods?.forEach(pm => { if (pm.method === PaymentMethod.CASH) stats.cash += pm.amount; else if (pm.method === PaymentMethod.CARD) stats.card += pm.amount; else stats.other += pm.amount; }); }); const printer = printers.find(p => p.isCashier); setPrintQueue(prev => [...prev, { id: `rep-${Date.now()}`, type: 'SHIFT_REPORT', printerName: printer?.name || 'Caja', shiftData: { session: s, stats, byChannel }, timestamp: new Date() }]); };
  const addPrinter = (p: PrinterDefinition) => dbAdd('printers', p);
  const updatePrinter = (id: string, p: Partial<PrinterDefinition>) => dbUpdate('printers', id, p);
  const deletePrinter = (id: string) => dbDelete('printers', id);
  const clearPrintJob = (id: string) => setPrintQueue(prev => prev.filter(j => j.id !== id));
  const addModifierGroup = (m: ModifierGroup) => dbAdd('modifiers', m);
  const updateModifierGroup = (id: string, m: Partial<ModifierGroup>) => dbUpdate('modifiers', id, m);
  const deleteModifierGroup = (id: string) => dbDelete('modifiers', id);
  const addPackagingRule = (p: PackagingRule) => dbAdd('packaging', p);
  const updatePackagingRule = (id: string, p: Partial<PackagingRule>) => dbUpdate('packaging', id, p);
  const deletePackagingRule = (id: string) => dbDelete('packaging', id);
  const addDiscount = (d: Discount) => dbAdd('discounts', d);
  const updateDiscount = (id: string, d: Partial<Discount>) => dbUpdate('discounts', id, d);
  const deleteDiscount = (id: string) => dbDelete('discounts', id);
  const addLoyaltyReward = (r: LoyaltyReward) => dbAdd('loyaltyRewards', r);
  const updateLoyaltyReward = (id: string, r: Partial<LoyaltyReward>) => dbUpdate('loyaltyRewards', id, r);
  const deleteLoyaltyReward = (id: string) => dbDelete('loyaltyRewards', id);
  const initializeDatabase = async () => { if(!db) { alert("Error: No hay conexión a Firebase."); return; } try { const batch = writeBatch(db); batch.set(doc(db, 'config', 'main'), DEFAULT_SETTINGS); batch.set(doc(db, 'users', 'u1'), { id: 'u1', name: 'Admin', role: Role.ADMIN, pin: '1111' }); batch.set(doc(db, 'branches', 'b1'), { id: 'b1', name: 'Sucursal Principal', address: 'Central', phone: '555-1234' }); await batch.commit(); alert("¡ÉXITO! Base de datos inicializada. Recargando..."); window.location.reload(); } catch (e: any) { alert("Error: " + e.message); } };
  const testConnection = async () => { if(!db) { alert("Configuración Inválida. db is null"); return; } try { await setDoc(doc(db, "test_connection", "ping"), { status: "ok", time: new Date() }); alert("¡Conexión EXITOSA!"); } catch (e: any) { alert("Error: " + e.message); } };
  const createBackup = async () => { if(!db) return; const backup: any = {}; const collections = ['products', 'ingredients', 'users', 'customers', 'tables', 'orders', 'expenses', 'config', 'modifiers', 'packaging', 'discounts', 'loyaltyRewards', 'suppliers', 'branches', 'printers', 'transfers']; for(const col of collections) { const snap = await getDocs(collection(db, col)); backup[col] = snap.docs.map(d => { const data = d.data(); Object.keys(data).forEach(k => { if(data[k] instanceof Timestamp) data[k] = data[k].toDate().toISOString(); }); return { ...data, id: d.id }; }); } const blob = new Blob([JSON.stringify(backup)], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `backup_forno_${new Date().toISOString().split('T')[0]}.json`; a.click(); };
  const restoreBackup = async (file: File) => { if(!db) return; const reader = new FileReader(); reader.onload = async (e) => { try { const backup: any = JSON.parse(e.target?.result as string); const batchLimit = 400; let batch = writeBatch(db); let opCount = 0; for(const col in backup) { const items = backup[col]; for(const item of items) { const ref = doc(db, col, item.id); const processedItem: any = { ...item }; ['openedAt', 'closedAt', 'date', 'timestamp', 'startDate', 'endDate', 'lastVisit', 'createdAt', 'receivedAt'].forEach(field => { if(processedItem[field]) processedItem[field] = new Date(processedItem[field]); }); batch.set(ref, processedItem); opCount++; if(opCount >= batchLimit) { await batch.commit(); batch = writeBatch(db); opCount = 0; } } } if(opCount > 0) await batch.commit(); alert("Restauración Completada."); window.location.reload(); } catch(err) { console.error(err); alert("Error al restaurar backup."); } }; reader.readAsText(file); };
  const clearTestData = async () => { if(!db) { alert("Error DB"); return; } try { const colsToWipe = ['orders', 'expenses', 'cashSessions', 'timeLogs', 'reservations', 'purchases', 'transfers']; for (const colName of colsToWipe) { const snapshot = await getDocs(collection(db, colName)); if (snapshot.empty) continue; const CHUNK_SIZE = 400; for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) { const batch = writeBatch(db); snapshot.docs.slice(i, i + CHUNK_SIZE).forEach(d => batch.delete(d.ref)); await batch.commit(); } } const tableSnap = await getDocs(collection(db, 'tables')); if (!tableSnap.empty) { const tableBatch = writeBatch(db); tableSnap.docs.forEach(t => tableBatch.update(t.ref, { isOccupied: false, currentOrderIds: [] })); await tableBatch.commit(); } alert("Datos eliminados."); window.location.reload(); } catch (e: any) { alert("Error: " + e.message); } };

  const value = {
    currentUser, login, logout, settings, updateSettings: setSettings,
    users, addUser, updateUser, deleteUser,
    branches, currentBranchId, setBranch: setCurrentBranchId, addBranch, updateBranch, deleteBranch,
    products, productCategories, addProduct, updateProduct, updateProductBatch, deleteProduct,
    ingredients, addIngredient, updateIngredient, addMasterIngredient, updateMasterIngredient, importIngredientsFromCSV, updateStock, adjustInventory, produceBatch,
    orders, createOrder, addItemToOrder, updateOrder, updateOrderItemQuantity, addCustomItemToOrder, moveOrder, mergeOrders, splitOrder, applyDiscountToOrder, applyCourtesyToOrder, voidOrder, closeOrder, sendOrderToKitchen, printPreBill, reprintOrder,
    tables, addTable, updateTable, deleteTable,
    printers, addPrinter, updatePrinter, deletePrinter, printQueue, clearPrintJob,
    modifierGroups, addModifierGroup, updateModifierGroup, deleteModifierGroup,
    packagingRules, addPackagingRule, updatePackagingRule, deletePackagingRule,
    discounts, addDiscount, updateDiscount, deleteDiscount,
    loyaltyRewards, addLoyaltyReward, updateLoyaltyReward, deleteLoyaltyReward,
    customers, addCustomer,
    reservations, addReservation, updateReservation,
    purchases, addPurchase,
    suppliers, addSupplier, updateSupplier, deleteSupplier,
    expenses, addExpense, deleteExpense, expenseCategories, addExpenseCategory, removeExpenseCategory,
    cashSessions, openRegister, closeRegister, getCurrentSession, getLastSession, printShiftReport,
    timeLogs, registerAttendance,
    transfers, addTransfer, receiveTransfer, cancelTransfer, printTransferTicket,
    initializeDatabase, testConnection, createBackup, restoreBackup, clearTestData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};
