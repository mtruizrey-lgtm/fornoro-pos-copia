

export enum Role {
  ADMIN = 'ADMIN',
  WAITER = 'WAITER',
  CASHIER = 'CASHIER',
  KITCHEN = 'KITCHEN'
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT',
  DELIVERY_UBER = 'DELIVERY_UBER',
  DELIVERY_PEDIDOSYA = 'DELIVERY_PEDIDOSYA'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
  CREDIT_UBER = 'CREDIT_UBER',
  CREDIT_PEDIDOSYA = 'CREDIT_PEDIDOSYA'
}

export enum OrderStatus {
  OPEN = 'OPEN',
  COOKING = 'COOKING',
  PRE_BILLED = 'PRE_BILLED',
  PAID = 'PAID',
  VOID = 'VOID'
}

// --- NEW: TRANSFERS ---
export enum TransferStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface TransferItem {
  ingredientId: string; // ID in source branch
  name: string;
  quantity: number; // Usage units
  unit: string;
  cost: number; // Cost at moment of transfer
}

export interface Transfer {
  id: string;
  sourceBranchId: string;
  targetBranchId: string;
  items: TransferItem[];
  status: TransferStatus;
  createdAt: Date;
  receivedAt?: Date;
  createdBy: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  pin: string;
}

// --- NEW: ATTENDANCE ---
export interface TimeLog {
  id: string;
  userId: string;
  userName: string;
  type: 'IN' | 'OUT';
  timestamp: Date;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string; // Added phone specific to branch
}

export interface PrinterDefinition {
  id: string;
  branchId: string;
  name: string;
  description?: string; // e.g. "Epson TM-T88V on the Bar counter"
  categories: string[]; // List of categories this printer handles (e.g., ['Pizzas', 'Pastas'])
  isCashier?: boolean; // If true, prints bills/receipts
}

export interface ProductionData {
  itemName: string;
  cycles: number; // How many recipe runs (Batches)
  batchSize: number; // Size of 1 batch
  expectedQty: number;
  actualQty: number;
  unit: string;
  ingredientsUsed: { name: string; qty: number; unit: string }[];
  user: string;
}

export interface PrintJob {
  id: string;
  type: 'COMMAND' | 'BILL' | 'RECEIPT' | 'SHIFT_REPORT' | 'TRANSFER' | 'PRODUCTION';
  printerName: string;
  printerDescription?: string;
  order?: Order; // Optional now for Shift Reports
  itemsToPrint?: OrderItem[]; // Only specific items for this printer
  shiftData?: any; // For Shift Reports
  transferData?: Transfer; // For Transfer Tickets
  productionData?: ProductionData; // For Production Tickets
  timestamp: Date;
}

export interface PriceHistoryEntry {
  date: Date;
  price: number; // Price per PURCHASE unit
  provider: string;
}

export interface Ingredient {
  id: string;
  branchId: string; 
  name: string;
  
  // Unit Conversion Logic
  unit: string; // Usage Unit (e.g., 'g', 'ml', 'oz') - Used in recipes
  purchaseUnit: string; // Purchase Unit (e.g., 'Saco 25kg', 'Botella') - Used in buying
  conversionRatio: number; // How many 'units' are in one 'purchaseUnit'? (e.g., 25000 for 25kg sack to g)
  
  cost: number; // Cost per USAGE unit (Weighted Average)
  lastPurchaseCost?: number; // Cost per PURCHASE unit (for reference/alerts)
  priceHistory: PriceHistoryEntry[];

  stock: number; // Stored in USAGE units
  minStock: number; // Threshold in USAGE units
  
  isSubRecipe?: boolean; 
  batchSize?: number; // New: Standard Output Quantity per Recipe Batch
  composition?: ProductIngredient[];
}

export interface ProductIngredient {
  ingredientId: string;
  quantity: number; // Quantity in USAGE units
}

// --- MODIFIERS & EXTRAS ---
export interface ModifierOption {
  id: string;
  name: string;
  price: number; // Additional price
  recipe: ProductIngredient[]; // Ingredients used (e.g. Extra Cheese uses 50g Mozzarella)
}

export interface ModifierGroup {
  id: string;
  name: string; // e.g. "Bordes de Pizza", "Salsas Extra"
  categories: string[]; // Applicable Product Categories (e.g. ['Pizzas'])
  applyToProductIds?: string[]; // New: Specific products (e.g. Coke options only for Coke item)
  options: ModifierOption[];
  minSelection: number; // 0 for optional
  maxSelection: number; // 1 for single choice, >1 for multiple
}

// --- DISCOUNTS & OFFERS ---
export interface Discount {
  id: string;
  name: string; // e.g. "Empleado", "Promo Verano"
  type: 'PERCENTAGE' | 'FIXED' | 'BOGO'; // BOGO = Buy One Get One (2x1)
  value: number; // 10 for 10%, 50 for $50 off, 0 for BOGO
  
  // Scheduling & Targeting
  startDate?: Date; // Optional for temporary offers
  endDate?: Date;
  schedule?: {
      days: number[]; // 0=Sun, 1=Mon...
      startTime: string; // "15:00"
      endTime: string; // "18:00"
  };
  applyToCategories?: string[]; // e.g. ['Bebidas', 'Cocteles'] for Happy Hour
  
  isActive: boolean;
}

// --- LOYALTY PROGRAM ---
export interface LoyaltyTier {
  name: string; // e.g. "Silver", "Gold"
  minPoints: number; // e.g. 0, 500, 1000
  color: string; // Hex code for UI
}

export interface LoyaltyReward {
  id: string;
  name: string; // e.g. "Pizza Gratis"
  costPoints: number; // e.g. 100
  requiredTierName?: string; // New: Restrict reward to specific tier (and above)
  description?: string;
  isActive: boolean;
}

// --- PACKAGING RULES ---
export interface PackagingRule {
  id: string;
  name: string; // e.g. "Caja Pizza Grande"
  applyToOrderTypes: OrderType[]; // e.g. [TAKEOUT, DELIVERY_UBER]
  applyToCategories: string[]; // e.g. ['Pizzas']. Empty = Apply to Whole Order conditions
  applyToProductIds?: string[]; // New: Specific products (e.g. Pizza Large vs Pizza Small)
  applyPer: 'ORDER' | 'ITEM'; // 1 per Order vs 1 per Item
  ingredients: ProductIngredient[]; // The disposable items (Boxes, bags)
}

export interface Product {
  id: string;
  name: string;
  category: string;
  prices: {
    [key in OrderType]: number;
  };
  ingredients: ProductIngredient[];
  image?: string;
}

export interface OrderItem {
  id: string;
  productId?: string; // Optional for custom items
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  isCustom?: boolean;
  printed?: boolean; // New: Track kitchen printing status
  
  // Customization
  modifiers?: ModifierOption[];
  excludedIngredientIds?: string[]; // IDs of base ingredients removed
  costSnapshot?: number; // Calculated total cost (Base - Excluded + Modifiers) at moment of sale for P&L
}

export interface Order {
  id: string;
  branchId: string;
  tableId?: string; 
  customerId?: string; 
  type: OrderType;
  platformOrderId?: string; // For Uber/PedidosYa IDs
  status: OrderStatus;
  items: OrderItem[];
  
  // Financials
  subtotal: number;
  
  discount: number; // Legacy field, kept for compatibility
  discountAmount?: number; // Total amount discounted
  appliedDiscount?: Discount | null; // The specific discount rule applied. Null allowed for Firestore clear.
  isCourtesy?: boolean; // If true, total is 0.
  courtesyReason?: string;

  serviceCharge: number; 
  tip: number;
  total: number;
  
  peopleCount: number;
  openedAt: Date;
  closedAt?: Date;
  waiterId: string;
  paymentMethods?: { method: PaymentMethod; amount: number }[];
  packagingCostSnapshot?: number; // For P&L: Cost of packaging used
}

export interface Table {
  id: string;
  branchId: string;
  name: string;
  capacity: number;
  isOccupied: boolean;
  currentOrderIds: string[]; // Changed to array for multi-account support
  x: number; 
  y: number;
}

export interface PurchaseItem {
  ingredientId: string;
  quantity: number; // In PURCHASE units
  cost: number; // Total cost for this line item
}

export interface Purchase {
  id: string;
  branchId: string;
  provider: string;
  invoiceNumber: string;
  invoiceImageUrl?: string; // New: Photo of the physical invoice
  date: Date;
  items: PurchaseItem[];
  total: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  visitDays?: string; // "Lunes y Jueves"
}

export interface Expense {
  id: string;
  branchId: string;
  description: string;
  amount: number;
  category: string; // Changed to string for dynamic categories
  date: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  currentTier?: string; // e.g. "Gold"
  visitCount: number;
  lastVisit?: Date;
}

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  SEATED = 'SEATED',
  CANCELLED = 'CANCELLED'
}

export interface Reservation {
  id: string;
  branchId: string;
  customerName: string;
  phone: string;
  date: Date; 
  pax: number;
  tableId?: string;
  status: ReservationStatus;
  notes?: string;
}

export interface CashRegisterSession {
  id: string;
  branchId: string;
  userId: string; // Who opened it
  openedAt: Date;
  closedAt?: Date;
  
  startingCashExpected: number; // From previous session close
  startingCashActual: number; // Physical count
  startingNotes?: string; // If discrepancy
  
  endingCashSystem: number; // Calculated (Start + Sales - Withdrawals)
  endingCashActual?: number; // Physical count at close
  endingNotes?: string;
  
  status: 'OPEN' | 'CLOSED';
}

export interface AppSettings {
  storeName: string;
  logoUrl?: string; 
  primaryColor?: string; 
  address: string;
  phone: string;
  taxRate: number; 
  currencySymbol: string;
  suggestedTips: number[]; 
  ticketHeader: string;
  ticketFooter: string;
  indirectCostRate: number; // New: Indirect Cost Percentage
  uberCommissionRate?: number; // New: Platform Commission %
  pedidosYaCommissionRate?: number; // New: Platform Commission %
  
  // Loyalty Config
  loyaltyTiers: LoyaltyTier[];
  spendingPerPoint: number; // Amount to spend to earn 1 point (default 10)
  doublePointsDays: number[]; // Array of day indexes (0=Sun, 1=Mon...) for 2x points
}