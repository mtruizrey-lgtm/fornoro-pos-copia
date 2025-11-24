









import React, { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { AlertTriangle, TrendingUp, DollarSign, ArrowDown, ArrowUp, Search, PieChart, Clock, Banknote, Calendar, Filter, ChevronDown, Award, Zap, HelpCircle, Frown, Globe, Download, Package, RefreshCw, Save, FileSpreadsheet, Coins } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, Pie, ScatterChart, Scatter, ZAxis, ReferenceLine } from 'recharts';
import { PaymentMethod, OrderType } from '../../types';

const COLORS = ['#C0392B', '#224C3B', '#E67E22', '#8E44AD', '#34495E', '#95A5A6', '#D35400', '#27AE60'];

// --- DATE HELPERS ---
const getRange = (type: string) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (type) {
        case 'today':
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
            break;
        case 'thisMonth':
            start.setDate(1);
            break;
        case 'lastMonth':
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            end.setDate(0); // Last day of prev month
            break;
        case 'last6Months':
            start.setMonth(start.getMonth() - 6);
            start.setDate(1);
            break;
        default:
            break;
    }
    return { start, end };
};

const formatMinutesToTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    if (hours === 0 && minutes === 0) return "-";
    return `${hours}h ${minutes}m`;
};

const downloadCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;
    const separator = ';';
    const keys = Object.keys(data[0]);
    const csvContent = [
        keys.join(separator),
        ...data.map(row => keys.map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
            return cell;
        }).join(separator))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const Reports: React.FC = () => {
  const { purchases, ingredients, settings, orders, expenses, timeLogs, users, products, updateIngredient, packagingRules } = useApp();
  
  // Filter State
  const [rangeType, setRangeType] = useState('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'pnl' | 'purchases' | 'tips' | 'attendance' | 'reconciliation' | 'forecast' | 'menu_profitability'>('sales');
  
  // Forecast Settings
  const [daysToCover, setDaysToCover] = useState(7); // Default safety stock days

  // Compute Date Range
  const { startDate, endDate } = useMemo(() => {
      if (rangeType === 'custom' && customStart && customEnd) {
          const s = new Date(customStart); s.setHours(0,0,0,0);
          const e = new Date(customEnd); e.setHours(23,59,59,999);
          return { startDate: s, endDate: e };
      }
      const r = getRange(rangeType);
      return { startDate: r.start, endDate: r.end };
  }, [rangeType, customStart, customEnd]);

  // GLOBAL FILTERING
  const filteredOrders = useMemo(() => 
      orders.filter(o => o.status === 'PAID' && o.closedAt && o.closedAt >= startDate && o.closedAt <= endDate),
  [orders, startDate, endDate]);

  const filteredExpenses = useMemo(() => 
      expenses.filter(e => e.date >= startDate && e.date <= endDate),
  [expenses, startDate, endDate]);

  // --- SALES & CHANNELS DASHBOARD DATA ---
  const salesData = useMemo(() => {
      const revenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);
      const orderCount = filteredOrders.length;
      const avgTicket = orderCount > 0 ? revenue / orderCount : 0;

      // By Channel
      const byChannelRaw: {[key: string]: number} = {};
      filteredOrders.forEach(o => {
          const label = o.type.replace('DELIVERY_', '');
          byChannelRaw[label] = (byChannelRaw[label] || 0) + o.total;
      });
      const byChannel = Object.entries(byChannelRaw).map(([name, value]) => ({ name, value }));

      // By Payment Method
      const byMethodRaw: {[key: string]: number} = {};
      filteredOrders.forEach(o => {
          o.paymentMethods?.forEach(pm => {
              byMethodRaw[pm.method] = (byMethodRaw[pm.method] || 0) + pm.amount;
          });
      });
      const byMethod = Object.entries(byMethodRaw).map(([name, value]) => ({ name, value }));

      return { revenue, orderCount, avgTicket, byChannel, byMethod };
  }, [filteredOrders]);

  // --- PRODUCT & MENU ENGINEERING DATA ---
  const productStats = useMemo(() => {
      const stats: {[pid: string]: { name: string, qty: number, revenue: number, cost: number, margin: number }} = {};
      
      filteredOrders.forEach(o => {
          o.items.forEach(item => {
              if (item.isCustom || !item.productId) return;
              if (!stats[item.productId]) {
                  stats[item.productId] = { name: item.name, qty: 0, revenue: 0, cost: 0, margin: 0 };
              }
              
              // Use snapshot if available, else calculate current
              let unitCost = 0;
              if (item.costSnapshot !== undefined) {
                  unitCost = item.costSnapshot / item.quantity;
              } else {
                  // Fallback cost calc
                  const prod = products.find(p => p.id === item.productId);
                  if(prod) {
                      const direct = prod.ingredients.reduce((acc, pi) => {
                         const ing = ingredients.find(i => i.id === pi.ingredientId);
                         return acc + (ing ? ing.cost * pi.quantity : 0);
                      }, 0);
                      unitCost = direct * (1 + settings.indirectCostRate/100);
                  }
              }

              // Platform Commission deduction for true margin
              let commissionRate = 0;
              if (o.type === OrderType.DELIVERY_UBER) commissionRate = (settings.uberCommissionRate || 0) / 100;
              if (o.type === OrderType.DELIVERY_PEDIDOSYA) commissionRate = (settings.pedidosYaCommissionRate || 0) / 100;

              const effectivePrice = item.price * (1 - commissionRate);
              const margin = effectivePrice - unitCost;

              stats[item.productId].qty += item.quantity;
              stats[item.productId].revenue += item.quantity * effectivePrice;
              stats[item.productId].cost += item.quantity * unitCost;
              stats[item.productId].margin += item.quantity * margin;
          });
      });
      
      const list = Object.values(stats);
      
      // Menu Engineering Classification
      const totalSold = list.reduce((acc, i) => acc + i.qty, 0);
      const totalMargin = list.reduce((acc, i) => acc + i.margin, 0);
      const avgPopularity = totalSold / (list.length || 1);
      const avgMargin = totalMargin / (totalSold || 1); // Weighted average margin

      const matrix = list.map(item => {
          const itemAvgMargin = item.margin / item.qty;
          let category = 'Dog'; // Low Pop, Low Margin
          if (item.qty >= avgPopularity && itemAvgMargin >= avgMargin) category = 'Star';
          else if (item.qty >= avgPopularity && itemAvgMargin < avgMargin) category = 'Plowhorse';
          else if (item.qty < avgPopularity && itemAvgMargin >= avgMargin) category = 'Puzzle';
          
          return { ...item, itemAvgMargin, category };
      });

      return { topSelling: list.sort((a,b) => b.qty - a.qty).slice(0, 10), matrix, avgPopularity, avgMargin };
  }, [filteredOrders, products, ingredients, settings]);

  // --- MENU PROFITABILITY DATA ---
  const menuProfitabilityData = useMemo(() => {
      return products.map(p => {
          // 1. Base Recipe Cost (Food)
          const foodCost = p.ingredients.reduce((sum, pi) => {
              const ing = ingredients.find(i => i.id === pi.ingredientId);
              return sum + (ing ? ing.cost * pi.quantity : 0);
          }, 0);

          // 2. Indirect Cost (Overhead)
          const indirectCost = foodCost * (settings.indirectCostRate / 100);

          // Calculate Metrics per Channel
          const channels = [OrderType.DINE_IN, OrderType.TAKEOUT, OrderType.DELIVERY_UBER, OrderType.DELIVERY_PEDIDOSYA].map(type => {
              // 3. Calculate Packaging Cost for this Channel/Product
              let packagingCost = 0;
              packagingRules.forEach(rule => {
                  // Does rule apply to this channel?
                  if (!rule.applyToOrderTypes.includes(type)) return;
                  
                  // Does rule apply to this product? (Category match OR Product ID match OR Global if both empty)
                  // Logic: If specific IDs are set, check those. If not, check categories. If categories empty, assume global unless logic implies otherwise.
                  // Actually typical logic: If ProductIDs set -> match ID. Else If Categories set -> match Category. Else -> Global.
                  
                  let applies = false;
                  if (rule.applyToProductIds && rule.applyToProductIds.length > 0) {
                      if (rule.applyToProductIds.includes(p.id)) applies = true;
                  } else if (rule.applyToCategories.length > 0) {
                      if (rule.applyToCategories.includes(p.category)) applies = true;
                  } else {
                      applies = true; // Global rule
                  }

                  if (applies && rule.applyPer === 'ITEM') {
                      rule.ingredients.forEach(ri => {
                          const ing = ingredients.find(i => i.id === ri.ingredientId);
                          if(ing) packagingCost += ing.cost * ri.quantity;
                      });
                  }
              });

              const totalChannelCost = foodCost + indirectCost + packagingCost;

              const price = p.prices[type] || 0;
              let commRate = 0;
              if (type === OrderType.DELIVERY_UBER) commRate = settings.uberCommissionRate || 0;
              if (type === OrderType.DELIVERY_PEDIDOSYA) commRate = settings.pedidosYaCommissionRate || 0;
              
              const netPrice = price * (1 - commRate / 100);
              const profit = netPrice - totalChannelCost;
              const margin = price > 0 ? (profit / price) * 100 : 0;
              
              return { type, price, netPrice, profit, margin, packagingCost, totalChannelCost };
          });

          return {
              name: p.name,
              category: p.category,
              baseCost: foodCost + indirectCost,
              channels
          };
      });
  }, [products, ingredients, settings, packagingRules]);

  // --- P&L DATA ---
  const pnlData = useMemo(() => {
      const totalRevenue = salesData.revenue;
      let totalFoodCost = 0, totalPackagingCost = 0;

      filteredOrders.forEach(order => {
          if (order.packagingCostSnapshot) totalPackagingCost += order.packagingCostSnapshot;
          order.items.forEach(item => { if (item.costSnapshot) totalFoodCost += item.costSnapshot; });
      });

      const totalOpEx = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
      const grossProfit = totalRevenue - totalFoodCost - totalPackagingCost;
      const netProfit = grossProfit - totalOpEx;

      return { revenue: totalRevenue, cogs: { food: totalFoodCost, packaging: totalPackagingCost }, opex: totalOpEx, grossProfit, netProfit };
  }, [salesData, filteredOrders, filteredExpenses]);

  // --- INVENTORY FORECAST DATA ---
  const inventoryForecast = useMemo(() => {
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay));
      const usage: Record<string, number> = {};

      filteredOrders.forEach(order => {
          order.items.forEach(item => {
              // 1. Base Ingredients
              const product = products.find(p => p.id === item.productId);
              if (product) {
                  product.ingredients.forEach(pi => {
                      if (!item.excludedIngredientIds?.includes(pi.ingredientId)) {
                          usage[pi.ingredientId] = (usage[pi.ingredientId] || 0) + (pi.quantity * item.quantity);
                      }
                  });
              }
              // 2. Modifiers Ingredients
              if (item.modifiers) {
                  item.modifiers.forEach(mod => {
                      mod.recipe.forEach(mr => {
                          usage[mr.ingredientId] = (usage[mr.ingredientId] || 0) + (mr.quantity * item.quantity);
                      });
                  });
              }
          });
      });

      return ingredients.map(ing => {
          const totalUsed = usage[ing.id] || 0;
          const dailyAvg = totalUsed / daysDiff;
          const suggestedMin = Math.ceil(dailyAvg * daysToCover);
          const diff = suggestedMin - ing.minStock;
          
          return { ...ing, totalUsed, dailyAvg, suggestedMin, diff };
      }).filter(i => i.totalUsed > 0).sort((a,b) => b.totalUsed - a.totalUsed);

  }, [filteredOrders, products, ingredients, startDate, endDate, daysToCover]);

  // --- PURCHASE ALERTS DATA ---
  const analysisData = useMemo(() => {
     const reportItems: any[] = [];
     let totalOverCost = 0;
     
     const filteredPurchases = purchases.filter(p => p.date >= startDate && p.date <= endDate);
     filteredPurchases.forEach(purchase => {
        purchase.items.forEach(item => {
           const ingredient = ingredients.find(i => i.id === item.ingredientId);
           if (!ingredient) return;
           const paidUnitPrice = item.cost / item.quantity;
           const history = ingredient.priceHistory || [];
           if (history.length === 0) return;
           const avgPrice = history.reduce((sum, h) => sum + h.price, 0) / history.length;
           const variation = paidUnitPrice - avgPrice;
           const variationPercent = avgPrice > 0 ? (variation / avgPrice) * 100 : 0;
           if (variationPercent > 10) {
              totalOverCost += variation * item.quantity;
              reportItems.push({
                 id: `rep-${purchase.id}-${item.ingredientId}`,
                 date: purchase.date,
                 provider: purchase.provider,
                 ingredientName: ingredient.name,
                 paidUnitPrice,
                 avgPrice,
                 variationPercent,
                 extraCost: variation * item.quantity
              });
           }
        });
     });
     return { reportItems, totalOverCost };
  }, [purchases, ingredients, startDate, endDate]);

  // --- TIPS DATA ---
  const tipsData = useMemo(() => {
      let totalTips = 0;
      const tipsByWaiter: { [key: string]: number } = {};
      const tipsByMethod: { [key: string]: number } = {};

      filteredOrders.forEach(o => {
          if(o.tip > 0) {
              totalTips += o.tip;
              const waiterName = users.find(u => u.id === o.waiterId)?.name || 'Desconocido';
              tipsByWaiter[waiterName] = (tipsByWaiter[waiterName] || 0) + o.tip;
              const mainMethod = o.paymentMethods?.[0]?.method || PaymentMethod.CASH;
              tipsByMethod[mainMethod] = (tipsByMethod[mainMethod] || 0) + o.tip;
          }
      });
      return { totalTips, tipsByWaiter, tipsByMethod };
  }, [filteredOrders, users]);

  // --- ATTENDANCE DATA ---
  const attendanceData = useMemo(() => {
      const filteredLogs = timeLogs.filter(l => l.timestamp >= startDate && l.timestamp <= endDate);
      const userWorkHours: { [userId: string]: { name: string, totalHours: number, totalOvertimeMins: number, shifts: number } } = {};
      const sortedLogs = [...filteredLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const tempIn: { [userId: string]: Date } = {};
      
      const STANDARD_SHIFT_HOURS = 9; // 8 hours work + 1 hour lunch
      const STANDARD_SHIFT_MINS = STANDARD_SHIFT_HOURS * 60;

      sortedLogs.forEach(log => {
          if (!userWorkHours[log.userId]) {
              userWorkHours[log.userId] = { name: log.userName, totalHours: 0, totalOvertimeMins: 0, shifts: 0 };
          }
          if (log.type === 'IN') {
              tempIn[log.userId] = new Date(log.timestamp);
          } else if (log.type === 'OUT' && tempIn[log.userId]) {
              const durationMs = new Date(log.timestamp).getTime() - tempIn[log.userId].getTime();
              const durationMins = durationMs / (1000 * 60);
              
              // Overtime Logic: Anything over 9 hours (540 mins)
              const overtime = Math.max(0, durationMins - STANDARD_SHIFT_MINS);
              
              userWorkHours[log.userId].totalHours += durationMs / (1000 * 60 * 60);
              userWorkHours[log.userId].totalOvertimeMins += overtime;
              userWorkHours[log.userId].shifts += 1;
              delete tempIn[log.userId];
          }
      });
      return Object.values(userWorkHours);
  }, [timeLogs, startDate, endDate]);

  // --- RECONCILIATION DATA ---
  const reconciliationData = useMemo(() => {
     const platformOrders = filteredOrders.filter(o => o.type === OrderType.DELIVERY_UBER || o.type === OrderType.DELIVERY_PEDIDOSYA);
     
     const byPlatform: Record<string, { count: number, total: number }> = {
         [OrderType.DELIVERY_UBER]: { count: 0, total: 0 },
         [OrderType.DELIVERY_PEDIDOSYA]: { count: 0, total: 0 }
     };
     
     platformOrders.forEach(o => {
         if (byPlatform[o.type]) {
             byPlatform[o.type].count += 1;
             byPlatform[o.type].total += o.total;
         }
     });
     
     return { orders: platformOrders, summary: byPlatform };
  }, [filteredOrders]);


  const waterfallData = [
      { name: 'Ventas', uv: pnlData.revenue, fill: '#224C3B' },
      { name: 'Costo Comida', uv: -pnlData.cogs.food, fill: '#C0392B' },
      { name: 'Empaque', uv: -pnlData.cogs.packaging, fill: '#E67E22' },
      { name: 'Margen Bruto', uv: pnlData.grossProfit, fill: '#27ae60', isSummary: true },
      { name: 'Gastos Op', uv: -pnlData.opex, fill: '#7f8c8d' },
      { name: 'Utilidad Neta', uv: pnlData.netProfit, fill: pnlData.netProfit >= 0 ? '#27ae60' : '#c0392b', isSummary: true },
  ];

  const handleExportReconciliation = () => {
      const data = reconciliationData.orders.map(o => ({
          Fecha: new Date(o.closedAt!).toLocaleDateString(),
          Hora: new Date(o.closedAt!).toLocaleTimeString(),
          Plataforma: o.type.replace('DELIVERY_', ''),
          ID_Referencia: o.platformOrderId || '',
          Total: o.total
      }));
      downloadCSV(data, `Conciliacion_${startDate.toISOString().split('T')[0]}.csv`);
  };

  const handleExportMenuProfitability = () => {
      const data = menuProfitabilityData.map(item => {
          const row: any = {
              Plato: item.name,
              Categoria: item.category,
              Costo_Base: item.baseCost.toFixed(2),
          };
          item.channels.forEach(ch => {
              const label = ch.type.replace('DELIVERY_', '').replace('DINE_IN', 'Mesa').replace('TAKEOUT', 'Llevar');
              row[`${label}_Precio`] = ch.price.toFixed(2);
              row[`${label}_CostoEmpaque`] = ch.packagingCost.toFixed(2);
              row[`${label}_Ganancia`] = ch.profit.toFixed(2);
              row[`${label}_Margen%`] = ch.margin.toFixed(1) + '%';
          });
          return row;
      });
      downloadCSV(data, `Rentabilidad_Menu_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleApplySuggestion = (id: string, newMin: number) => {
      if (confirm(`¿Actualizar el Stock Mínimo a ${newMin}?`)) {
          updateIngredient(id, { minStock: newMin });
      }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
       {/* HEADER & DATE FILTER */}
       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Inteligencia de Negocios</h1>
          <p className="text-stone-500">Análisis estratégico y financiero</p>
        </div>
        
        <div className="bg-white p-1 rounded-xl border border-[var(--fr-line)] shadow-sm flex flex-wrap gap-2 items-center">
            <select 
                value={rangeType} 
                onChange={e => setRangeType(e.target.value)}
                className="p-2 bg-transparent font-bold text-stone-700 text-sm outline-none cursor-pointer"
            >
                <option value="today">Hoy</option>
                <option value="yesterday">Ayer</option>
                <option value="thisMonth">Este Mes</option>
                <option value="lastMonth">Mes Pasado</option>
                <option value="last6Months">Últimos 6 Meses</option>
                <option value="custom">Rango Personalizado</option>
            </select>
            
            {rangeType === 'custom' && (
                <div className="flex items-center gap-2 px-2 border-l border-stone-200">
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-xs p-1 border rounded bg-transparent"/>
                    <span className="text-stone-400">-</span>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-xs p-1 border rounded bg-transparent"/>
                </div>
            )}
            <div className="px-3 py-1 bg-[var(--fr-bg)] rounded-lg text-xs font-mono text-stone-500 border border-[var(--fr-line)]">
                {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-8 border-b border-[var(--fr-line)] overflow-x-auto scrollbar-hide">
          {[
              {id: 'sales', label: 'Ventas & Canales'},
              {id: 'reconciliation', label: 'Conciliación Plataformas'},
              {id: 'menu_profitability', label: 'Rentabilidad del Menú'},
              {id: 'products', label: 'Análisis BCG'},
              {id: 'forecast', label: 'Inv. Sugerido'},
              {id: 'pnl', label: 'Estado Resultados'},
              {id: 'purchases', label: 'Alertas Compras'},
              {id: 'tips', label: 'Propinas'},
              {id: 'attendance', label: 'Asistencia'}
          ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`pb-3 px-4 font-bold whitespace-nowrap transition ${activeTab === tab.id ? 'text-[var(--fr-green)] border-b-4 border-[var(--fr-green)]' : 'text-stone-400 hover:text-stone-600'}`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      {/* === MENU PROFITABILITY === */}
      {activeTab === 'menu_profitability' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                  <div className="bg-green-50 text-green-800 px-4 py-2 rounded-xl border border-green-100 text-sm">
                      <p className="font-bold flex items-center gap-2"><Coins size={16}/> Análisis Financiero de Platos</p>
                      <p className="text-xs opacity-80 mt-1">Incluye: Costo Receta + {settings.indirectCostRate}% Indirectos + Empaque específico por canal.</p>
                  </div>
                  <button onClick={handleExportMenuProfitability} className="bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-[#1a3b2e] shadow-lg">
                      <FileSpreadsheet size={16} /> Exportar Excel
                  </button>
              </div>

              <div className="bg-white rounded-2xl border border-[var(--fr-line)] overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--fr-bg)] text-stone-600 font-bold border-b border-[var(--fr-line)]">
                          <tr>
                              <th className="p-3 sticky left-0 bg-[var(--fr-bg)] z-10">Producto</th>
                              <th className="p-3 text-right border-r border-stone-200">Costo Base</th>
                              <th colSpan={2} className="p-3 text-center border-r border-stone-200 bg-blue-50/50">Mesa</th>
                              <th colSpan={2} className="p-3 text-center border-r border-stone-200 bg-orange-50/50">Llevar</th>
                              <th colSpan={3} className="p-3 text-center border-r border-stone-200 bg-green-50/50">Uber Eats</th>
                              <th colSpan={3} className="p-3 text-center bg-red-50/50">PedidosYa</th>
                          </tr>
                          <tr className="text-[10px] text-stone-500 uppercase">
                              <th className="p-2 sticky left-0 bg-[var(--fr-bg)] z-10"></th>
                              <th className="p-2 text-right border-r border-stone-200">(Alim+Indir)</th>
                              
                              {/* Mesa */}
                              <th className="p-2 text-right bg-blue-50/50">Precio</th>
                              <th className="p-2 text-right border-r border-stone-200 bg-blue-50/50">Mg %</th>
                              
                              {/* Takeout */}
                              <th className="p-2 text-right bg-orange-50/50">Precio</th>
                              <th className="p-2 text-right border-r border-stone-200 bg-orange-50/50">Mg %</th>

                              {/* Uber */}
                              <th className="p-2 text-right bg-green-50/50">Precio</th>
                              <th className="p-2 text-right bg-green-50/50">Neto</th>
                              <th className="p-2 text-right border-r border-stone-200 bg-green-50/50">Mg %</th>
                              
                              {/* PYa */}
                              <th className="p-2 text-right bg-red-50/50">Precio</th>
                              <th className="p-2 text-right bg-red-50/50">Neto</th>
                              <th className="p-2 text-right bg-red-50/50">Mg %</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--fr-line)]">
                          {menuProfitabilityData.map((item, idx) => {
                              const dineIn = item.channels.find(c => c.type === OrderType.DINE_IN)!;
                              const takeout = item.channels.find(c => c.type === OrderType.TAKEOUT)!;
                              const uber = item.channels.find(c => c.type === OrderType.DELIVERY_UBER)!;
                              const pYa = item.channels.find(c => c.type === OrderType.DELIVERY_PEDIDOSYA)!;

                              return (
                                  <tr key={idx} className="hover:bg-stone-50">
                                      <td className="p-3 font-bold text-stone-700 sticky left-0 bg-white border-r border-stone-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                          {item.name}
                                          <div className="text-[9px] text-stone-400 font-normal">{item.category}</div>
                                      </td>
                                      <td className="p-3 text-right font-mono font-bold text-stone-600 border-r border-stone-200">{settings.currencySymbol}{item.baseCost.toFixed(2)}</td>
                                      
                                      {/* Dine In */}
                                      <td className="p-3 text-right font-mono bg-blue-50/20">{settings.currencySymbol}{dineIn.price.toFixed(2)}</td>
                                      <td className={`p-3 text-right font-bold border-r border-stone-200 bg-blue-50/20 ${dineIn.margin < 30 ? 'text-red-500' : 'text-green-600'}`}>{dineIn.margin.toFixed(0)}%</td>
                                      
                                      {/* Takeout */}
                                      <td className="p-3 text-right font-mono bg-orange-50/20">{settings.currencySymbol}{takeout.price.toFixed(2)}</td>
                                      <td className={`p-3 text-right font-bold border-r border-stone-200 bg-orange-50/20 ${takeout.margin < 30 ? 'text-red-500' : 'text-green-600'}`} title={`Empaque: ${takeout.packagingCost}`}>{takeout.margin.toFixed(0)}%</td>

                                      {/* Uber */}
                                      <td className="p-3 text-right font-mono bg-green-50/20">{settings.currencySymbol}{uber.price.toFixed(2)}</td>
                                      <td className="p-3 text-right font-mono text-stone-500 text-[10px] bg-green-50/20">{settings.currencySymbol}{uber.netPrice.toFixed(2)}</td>
                                      <td className={`p-3 text-right font-bold border-r border-stone-200 bg-green-50/20 ${uber.margin < 20 ? 'text-red-500' : 'text-green-600'}`} title={`Empaque: ${uber.packagingCost}`}>{uber.margin.toFixed(0)}%</td>
                                      
                                      {/* PedidosYa */}
                                      <td className="p-3 text-right font-mono bg-red-50/20">{settings.currencySymbol}{pYa.price.toFixed(2)}</td>
                                      <td className="p-3 text-right font-mono text-stone-500 text-[10px] bg-red-50/20">{settings.currencySymbol}{pYa.netPrice.toFixed(2)}</td>
                                      <td className={`p-3 text-right font-bold bg-red-50/20 ${pYa.margin < 20 ? 'text-red-500' : 'text-green-600'}`} title={`Empaque: ${pYa.packagingCost}`}>{pYa.margin.toFixed(0)}%</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* === SALES DASHBOARD === */}
      {activeTab === 'sales' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm">
                      <div className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Venta Total</div>
                      <div className="text-3xl font-bold text-[var(--fr-text)] font-serif">{settings.currencySymbol}{salesData.revenue.toFixed(2)}</div>
                  </div>
                  <div className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm">
                      <div className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Ticket Promedio</div>
                      <div className="text-3xl font-bold text-[var(--fr-green)] font-serif">{settings.currencySymbol}{salesData.avgTicket.toFixed(2)}</div>
                  </div>
                  <div className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm">
                      <div className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Total Órdenes</div>
                      <div className="text-3xl font-bold text-blue-600 font-serif">{salesData.orderCount}</div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Channel Mix */}
                  <div className="bg-white p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm min-h-[400px]">
                      <h3 className="font-bold text-stone-700 mb-6 font-serif text-lg border-b pb-2">Ventas por Canal</h3>
                      <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                              <Pie
                                  data={salesData.byChannel}
                                  cx="50%" cy="50%"
                                  innerRadius={60} outerRadius={100}
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  {salesData.byChannel.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(value: number) => `${settings.currencySymbol}${value.toFixed(2)}`} />
                              <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                      </ResponsiveContainer>
                  </div>

                  {/* Payment Mix */}
                  <div className="bg-white p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm min-h-[400px]">
                      <h3 className="font-bold text-stone-700 mb-6 font-serif text-lg border-b pb-2">Medios de Pago</h3>
                      <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                              <Pie
                                  data={salesData.byMethod}
                                  cx="50%" cy="50%"
                                  innerRadius={60} outerRadius={100}
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  {salesData.byMethod.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(value: number) => `${settings.currencySymbol}${value.toFixed(2)}`} />
                              <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      )}

      {/* === INVENTORY FORECAST === */}
      {activeTab === 'forecast' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm"><Package size={24}/></div>
                      <div>
                          <h2 className="text-lg font-bold text-blue-900 font-serif">Cálculo de Stock Mínimo Sugerido</h2>
                          <p className="text-sm text-blue-700 max-w-xl">
                              Basado en el consumo real del periodo seleccionado ({startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}).
                              El sistema calcula el promedio diario y lo proyecta a los días de cobertura deseados.
                          </p>
                      </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                      <label className="block text-xs font-bold text-blue-500 uppercase mb-1">Días de Cobertura (Seguridad)</label>
                      <div className="flex items-center gap-2">
                          <input 
                              type="number" 
                              min="1" 
                              max="30"
                              value={daysToCover} 
                              onChange={e => setDaysToCover(Number(e.target.value))} 
                              className="w-20 p-2 border border-blue-200 rounded-lg font-bold text-center text-lg text-blue-900 outline-none focus:ring-2 focus:ring-blue-300"
                          />
                          <span className="text-xs text-blue-400 font-bold">Días</span>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl border border-[var(--fr-line)] overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--fr-bg)] text-stone-600 font-bold border-b border-[var(--fr-line)]">
                          <tr>
                              <th className="p-4">Ingrediente</th>
                              <th className="p-4 text-center">Consumo Total (Periodo)</th>
                              <th className="p-4 text-center">Prom. Diario</th>
                              <th className="p-4 text-center bg-stone-50 border-l border-stone-100">Min Actual</th>
                              <th className="p-4 text-center bg-stone-50">Min Sugerido ({daysToCover}d)</th>
                              <th className="p-4 text-right bg-stone-50 border-r border-stone-100">Diferencia</th>
                              <th className="p-4 text-center">Acción</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--fr-line)]">
                          {inventoryForecast.map(item => (
                              <tr key={item.id} className="hover:bg-stone-50">
                                  <td className="p-4">
                                      <div className="font-bold text-stone-800">{item.name}</div>
                                      <div className="text-xs text-stone-400 font-mono">{item.unit}</div>
                                  </td>
                                  <td className="p-4 text-center font-mono text-stone-600">{item.totalUsed.toFixed(2)}</td>
                                  <td className="p-4 text-center font-mono font-bold text-stone-800">{item.dailyAvg.toFixed(2)}</td>
                                  <td className="p-4 text-center font-mono bg-stone-50 border-l border-stone-100">{item.minStock}</td>
                                  <td className="p-4 text-center font-mono bg-stone-50 font-bold text-blue-700 text-lg">{item.suggestedMin}</td>
                                  <td className="p-4 text-right font-mono bg-stone-50 border-r border-stone-100">
                                      {item.diff > 0 ? (
                                          <span className="text-red-500 flex items-center justify-end gap-1 font-bold"><ArrowUp size={14}/> +{item.diff}</span>
                                      ) : item.diff < 0 ? (
                                          <span className="text-green-600 flex items-center justify-end gap-1 font-bold"><ArrowDown size={14}/> {item.diff}</span>
                                      ) : (
                                          <span className="text-stone-300">-</span>
                                      )}
                                  </td>
                                  <td className="p-4 text-center">
                                      {item.diff !== 0 && (
                                          <button 
                                              onClick={() => handleApplySuggestion(item.id, item.suggestedMin)}
                                              className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 border border-blue-200 flex items-center gap-1 mx-auto shadow-sm"
                                          >
                                              <RefreshCw size={12}/> Actualizar
                                          </button>
                                      )}
                                  </td>
                              </tr>
                          ))}
                          {inventoryForecast.length === 0 && (
                              <tr><td colSpan={7} className="p-12 text-center text-stone-400 italic">No hay datos de consumo suficientes en este periodo.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* === RECONCILIATION === */}
      {activeTab === 'reconciliation' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="flex justify-end">
                  <button onClick={handleExportReconciliation} className="flex items-center gap-2 bg-[var(--fr-green)] text-white px-4 py-2 rounded-xl font-bold text-sm shadow hover:bg-[#1a3b2e]">
                      <Download size={16}/> Exportar Excel/CSV
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 p-6 rounded-2xl">
                      <div className="flex items-center gap-2 text-green-800 font-bold mb-2"><Globe size={20}/> Ventas Uber Eats</div>
                      <div className="text-3xl font-serif text-green-900">{settings.currencySymbol}{reconciliationData.summary[OrderType.DELIVERY_UBER].total.toFixed(2)}</div>
                      <div className="text-xs text-green-600">{reconciliationData.summary[OrderType.DELIVERY_UBER].count} órdenes</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 p-6 rounded-2xl">
                      <div className="flex items-center gap-2 text-red-800 font-bold mb-2"><Globe size={20}/> Ventas PedidosYa</div>
                      <div className="text-3xl font-serif text-red-900">{settings.currencySymbol}{reconciliationData.summary[OrderType.DELIVERY_PEDIDOSYA].total.toFixed(2)}</div>
                      <div className="text-xs text-red-600">{reconciliationData.summary[OrderType.DELIVERY_PEDIDOSYA].count} órdenes</div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl border border-[var(--fr-line)] overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--fr-bg)] text-stone-600 font-bold border-b border-[var(--fr-line)]">
                          <tr>
                              <th className="p-4">Fecha</th>
                              <th className="p-4">Plataforma</th>
                              <th className="p-4">ID Orden (Ref)</th>
                              <th className="p-4 text-right">Total</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--fr-line)]">
                          {reconciliationData.orders.map(o => (
                              <tr key={o.id} className="hover:bg-stone-50">
                                  <td className="p-4 font-mono text-stone-500">{new Date(o.closedAt!).toLocaleString()}</td>
                                  <td className="p-4 font-bold text-stone-800">{o.type.replace('DELIVERY_', '')}</td>
                                  <td className="p-4 font-mono font-bold">{o.platformOrderId || '-'}</td>
                                  <td className="p-4 text-right font-bold text-[var(--fr-green)]">{settings.currencySymbol}{o.total.toFixed(2)}</td>
                              </tr>
                          ))}
                          {reconciliationData.orders.length === 0 && (
                              <tr><td colSpan={4} className="p-8 text-center text-stone-400 italic">No hay órdenes de delivery en este periodo</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* === PRODUCTS & MENU === */}
      {activeTab === 'products' && (
          <div className="space-y-8 animate-in fade-in">
              {/* Top Products */}
              <div className="bg-white p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm">
                  <h3 className="font-bold text-stone-700 mb-4 font-serif text-lg">Top 10 Productos Más Vendidos</h3>
                  <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={productStats.topSelling} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 11}} />
                              <Tooltip cursor={{fill: 'transparent'}} />
                              <Bar dataKey="qty" fill="#224C3B" radius={[0, 4, 4, 0]} barSize={20} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Menu Engineering Matrix */}
              <div className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)] shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h3 className="font-bold text-[var(--fr-green)] font-serif text-lg">Ingeniería de Menú (Matriz BCG)</h3>
                          <p className="text-sm text-stone-500">Clasificación basada en Popularidad vs. Rentabilidad</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="h-96 bg-white p-4 rounded-xl border border-[var(--fr-line)]">
                          <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                  <CartesianGrid />
                                  <XAxis type="number" dataKey="qty" name="Popularidad (Ventas)" />
                                  <YAxis type="number" dataKey="itemAvgMargin" name="Rentabilidad (Margen Unit)" />
                                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                                      if (payload && payload[0] && payload[0].payload) {
                                          const d = payload[0].payload;
                                          return (
                                              <div className="bg-white p-2 border shadow-lg rounded text-xs">
                                                  <p className="font-bold">{d.name}</p>
                                                  <p>Ventas: {d.qty}</p>
                                                  <p>Margen: {settings.currencySymbol}{d.itemAvgMargin.toFixed(2)}</p>
                                                  <p className="uppercase font-bold mt-1">{d.category}</p>
                                              </div>
                                          );
                                      }
                                      return null;
                                  }}/>
                                  <ReferenceLine x={productStats.avgPopularity} stroke="red" strokeDasharray="3 3" />
                                  <ReferenceLine y={productStats.avgMargin} stroke="red" strokeDasharray="3 3" />
                                  <Scatter name="Productos" data={productStats.matrix} fill="#8884d8">
                                      {productStats.matrix.map((entry, index) => {
                                          let color = '#95A5A6'; // Dog
                                          if (entry.category === 'Star') color = '#F1C40F'; // Star
                                          else if (entry.category === 'Plowhorse') color = '#3498DB'; // Horse
                                          else if (entry.category === 'Puzzle') color = '#E74C3C'; // Puzzle
                                          return <Cell key={`cell-${index}`} fill={color} />;
                                      })}
                                  </Scatter>
                              </ScatterChart>
                          </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-2 font-bold text-yellow-800"><Award size={18}/> ESTRELLAS</div>
                              <p className="text-xs text-stone-600 mb-3">Alta Popularidad, Alta Ganancia. ¡Promocionar y Mantener!</p>
                              <ul className="text-xs list-disc pl-4 space-y-1">
                                  {productStats.matrix.filter(i => i.category === 'Star').slice(0,5).map(i => <li key={i.name}>{i.name}</li>)}
                              </ul>
                          </div>
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-2 font-bold text-blue-800"><TrendingUp size={18}/> CABALLITOS</div>
                              <p className="text-xs text-stone-600 mb-3">Alta Popularidad, Baja Ganancia. ¡Subir precio o bajar costo!</p>
                              <ul className="text-xs list-disc pl-4 space-y-1">
                                  {productStats.matrix.filter(i => i.category === 'Plowhorse').slice(0,5).map(i => <li key={i.name}>{i.name}</li>)}
                              </ul>
                          </div>
                          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-2 font-bold text-red-800"><HelpCircle size={18}/> ROMPECABEZAS</div>
                              <p className="text-xs text-stone-600 mb-3">Baja Popularidad, Alta Ganancia. ¡Impulsar ventas (Marketing)!</p>
                              <ul className="text-xs list-disc pl-4 space-y-1">
                                  {productStats.matrix.filter(i => i.category === 'Puzzle').slice(0,5).map(i => <li key={i.name}>{i.name}</li>)}
                              </ul>
                          </div>
                          <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-2 font-bold text-stone-600"><Frown size={18}/> PERROS</div>
                              <p className="text-xs text-stone-500 mb-3">Baja Popularidad, Baja Ganancia. ¡Considerar retirar!</p>
                              <ul className="text-xs list-disc pl-4 space-y-1 text-stone-400">
                                  {productStats.matrix.filter(i => i.category === 'Dog').slice(0,5).map(i => <li key={i.name}>{i.name}</li>)}
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- P&L --- */}
      {activeTab === 'pnl' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)] h-96">
                  <h3 className="font-bold text-stone-700 mb-4 font-serif">Cascada de Rentabilidad</h3>
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterfallData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                          <YAxis axisLine={false} tickLine={false} fontSize={12} />
                          <Tooltip cursor={{fill: 'transparent'}} formatter={(val: any) => `${settings.currencySymbol}${Number(val).toFixed(2)}`} />
                          <Bar dataKey="uv">
                              {waterfallData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
              
               <div className="bg-white rounded-xl border border-[var(--fr-line)] overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-[var(--fr-bg)] text-stone-600 font-bold border-b border-[var(--fr-line)]">
                          <tr><th className="p-4">Concepto</th><th className="p-4 text-right">Monto</th><th className="p-4 text-right">%</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--fr-line)]">
                          <tr><td className="p-4 font-bold">Ventas Brutas</td><td className="p-4 text-right">{settings.currencySymbol}{pnlData.revenue.toFixed(2)}</td><td className="p-4 text-right">100%</td></tr>
                          <tr className="text-red-600"><td className="p-4 pl-8">- Costo Alimentos</td><td className="p-4 text-right">{settings.currencySymbol}{Number(pnlData.cogs.food).toFixed(2)}</td><td className="p-4 text-right">{((Number(pnlData.cogs.food)/Number(pnlData.revenue)||0)*100).toFixed(1)}%</td></tr>
                          <tr className="text-amber-600"><td className="p-4 pl-8">- Costo Empaque</td><td className="p-4 text-right">{settings.currencySymbol}{Number(pnlData.cogs.packaging).toFixed(2)}</td><td className="p-4 text-right">{((Number(pnlData.cogs.packaging)/Number(pnlData.revenue)||0)*100).toFixed(1)}%</td></tr>
                          <tr className="font-bold bg-stone-50"><td className="p-4">Margen Bruto</td><td className="p-4 text-right">{settings.currencySymbol}{pnlData.grossProfit.toFixed(2)}</td><td className="p-4 text-right">{((pnlData.grossProfit/pnlData.revenue||0)*100).toFixed(1)}%</td></tr>
                          <tr className="text-stone-500"><td className="p-4 pl-8">- Gastos Op</td><td className="p-4 text-right">{settings.currencySymbol}{pnlData.opex.toFixed(2)}</td><td className="p-4 text-right">{((pnlData.opex/pnlData.revenue||0)*100).toFixed(1)}%</td></tr>
                          <tr className={`font-bold text-lg ${pnlData.netProfit>=0?'bg-green-50 text-green-800':'bg-red-50 text-red-800'}`}><td className="p-4">UTILIDAD NETA</td><td className="p-4 text-right">{settings.currencySymbol}{pnlData.netProfit.toFixed(2)}</td><td className="p-4 text-right">{((pnlData.netProfit/pnlData.revenue||0)*100).toFixed(1)}%</td></tr>
                      </tbody>
                  </table>
               </div>
          </div>
      )}

      {/* --- TIPS --- */}
      {activeTab === 'tips' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl flex items-center gap-6">
                 <div className="p-4 bg-yellow-100 rounded-full text-yellow-700"><DollarSign size={32}/></div>
                 <div>
                     <div className="text-sm font-bold text-yellow-800 uppercase tracking-widest">Total Propinas</div>
                     <div className="text-4xl font-bold text-yellow-900 font-serif">{settings.currencySymbol}{tipsData.totalTips.toFixed(2)}</div>
                 </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)]">
                   <h3 className="font-bold text-stone-700 mb-4 font-serif">Por Mesero</h3>
                   <table className="w-full text-sm">
                      <tbody className="divide-y divide-[var(--fr-line)]">
                         {Object.entries(tipsData.tipsByWaiter).map(([name, amount]) => (
                            <tr key={name}><td className="py-3">{name}</td><td className="py-3 text-right font-mono text-yellow-900 font-bold">{settings.currencySymbol}{(amount as number).toFixed(2)}</td></tr>
                         ))}
                      </tbody>
                   </table>
                </div>
                <div className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)]">
                   <h3 className="font-bold text-stone-700 mb-4 font-serif">Por Método</h3>
                   <table className="w-full text-sm">
                      <tbody className="divide-y divide-[var(--fr-line)]">
                         {Object.entries(tipsData.tipsByMethod).map(([method, amount]) => (
                            <tr key={method}><td className="py-3">{method}</td><td className="py-3 text-right font-mono text-yellow-900 font-bold">{settings.currencySymbol}{(amount as number).toFixed(2)}</td></tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
      )}

      {/* --- ATTENDANCE --- */}
      {activeTab === 'attendance' && (
          <div className="animate-in fade-in">
             <div className="bg-[var(--fr-card)] p-6 rounded-2xl border border-[var(--fr-line)]">
                <h2 className="text-xl font-bold mb-4 text-[var(--fr-green)] font-serif flex items-center gap-2"><Clock /> Reporte de Horas & Extras</h2>
                <p className="text-xs text-stone-500 mb-4">Jornada Estándar: 9 Horas (8 Trabajo + 1 Almuerzo)</p>
                <table className="w-full text-left text-sm">
                   <thead className="bg-[var(--fr-bg)] text-stone-600 font-bold border-b border-[var(--fr-line)]">
                      <tr>
                          <th className="p-4">Empleado</th>
                          <th className="p-4 text-center">Turnos</th>
                          <th className="p-4 text-center">Permanencia Total</th>
                          <th className="p-4 text-right text-amber-700">Tiempo Extra</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[var(--fr-line)]">
                      {attendanceData.map((data, idx) => (
                         <tr key={idx} className="hover:bg-stone-50">
                            <td className="p-4 font-bold text-stone-800">{data.name}</td>
                            <td className="p-4 text-center">{data.shifts}</td>
                            <td className="p-4 text-center font-mono">{data.totalHours.toFixed(2)} hrs</td>
                            <td className="p-4 text-right font-mono font-bold text-amber-700">
                                {formatMinutesToTime(data.totalOvertimeMins)}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
      )}

      {/* --- PURCHASES --- */}
      {activeTab === 'purchases' && (
          <div className="bg-[var(--fr-card)] border border-[var(--fr-line)] rounded-2xl p-6 shadow-sm animate-in fade-in">
             <h2 className="text-xl font-bold text-[var(--fr-red)] font-serif mb-4 flex items-center gap-2"><AlertTriangle /> Sobrecostos Detectados</h2>
             <div className="overflow-hidden rounded-xl border border-[var(--fr-line)]">
                <table className="w-full text-left text-sm">
                   <thead className="bg-[var(--fr-bg)] text-stone-600 font-bold border-b border-[var(--fr-line)]">
                      <tr>
                         <th className="p-4">Fecha</th><th className="p-4">Ingrediente</th><th className="p-4">Proveedor</th><th className="p-4 text-right">Pagado</th><th className="p-4 text-right">Prom.</th><th className="p-4 text-center">Var.</th><th className="p-4 text-right">Impacto</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[var(--fr-line)] bg-white">
                      {analysisData.reportItems.map(item => (
                         <tr key={item.id} className="hover:bg-stone-50">
                            <td className="p-4 font-mono text-xs text-stone-500">{new Date(item.date).toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-stone-800">{item.ingredientName}</td>
                            <td className="p-4 text-stone-600">{item.provider}</td>
                            <td className="p-4 text-right font-mono">{settings.currencySymbol}{item.paidUnitPrice.toFixed(2)}</td>
                            <td className="p-4 text-right font-mono text-stone-400">{settings.currencySymbol}{item.avgPrice.toFixed(2)}</td>
                            <td className="p-4 text-center"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">+{item.variationPercent.toFixed(0)}%</span></td>
                            <td className="p-4 text-right font-bold text-red-600 font-mono">{settings.currencySymbol}{item.extraCost.toFixed(2)}</td>
                         </tr>
                      ))}
                      {analysisData.reportItems.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-stone-400 italic">No se detectaron sobrecostos en este periodo</td></tr>}
                   </tbody>
                </table>
             </div>
          </div>
      )}
    </div>
  );
};