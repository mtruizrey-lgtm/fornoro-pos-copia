
import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { generateDailyInsight } from '../../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { BrainCircuit, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';

const COLORS = ['#C0392B', '#224C3B', '#D9CBB7', '#E67E22'];

export const Dashboard: React.FC = () => {
  const { orders, ingredients, settings } = useApp();
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Compute Metrics
  const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
  const orderCount = orders.length;
  
  // Sales by Type
  const salesByType = orders.reduce((acc: any, o) => {
    const key = o.type.replace('DELIVERY_', '');
    acc[key] = (acc[key] || 0) + o.total;
    return acc;
  }, {});
  const pieData = Object.keys(salesByType).map(key => ({ name: key, value: salesByType[key] }));

  // Mock Hourly Data (since orders mock creates dates at same time usually)
  // This ensures the chart looks good immediately
  const hourlyData = [
    { time: '12pm', sales: 120 }, { time: '1pm', sales: 300 },
    { time: '2pm', sales: 250 }, { time: '3pm', sales: 100 },
    { time: '6pm', sales: 150 }, { time: '7pm', sales: 400 },
    { time: '8pm', sales: 550 }, { time: '9pm', sales: 320 },
  ];

  // Low Stock
  const lowStock = ingredients.filter(i => i.stock <= i.minStock);

  const handleGetInsight = async () => {
    setLoadingInsight(true);
    const text = await generateDailyInsight(
      { totalSales, count: orderCount, byType: salesByType },
      lowStock.map(i => i.name)
    );
    setInsight(text);
    setLoadingInsight(false);
  };

  return (
    <div className="p-8 space-y-8 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[var(--fr-green)] font-serif">Dashboard Gerencial</h1>
          <p className="text-stone-500 font-sans">Resumen operativo en tiempo real</p>
        </div>
        <button 
          onClick={handleGetInsight}
          disabled={loadingInsight}
          className="bg-[var(--fr-red)] text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#a32a1e] shadow-lg transition uppercase tracking-wider text-sm"
        >
          {loadingInsight ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
          Consultar AI Chef
        </button>
      </header>

      {/* AI Insight Box */}
      {insight && (
        <div className="bg-[var(--fr-card)] border border-[var(--fr-line)] p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 shadow-sm">
          <h3 className="text-[var(--fr-red)] font-bold mb-2 flex items-center gap-2 font-serif text-lg">
            <BrainCircuit size={20} /> Análisis Inteligente
          </h3>
          <p className="text-stone-700 whitespace-pre-line leading-relaxed font-medium">{insight}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--fr-card)] p-6 rounded-2xl shadow-sm border border-[var(--fr-line)]">
          <div className="text-stone-500 text-xs font-bold uppercase mb-2 tracking-widest">Venta Total</div>
          <div className="text-4xl font-bold text-[var(--fr-green)] font-serif">{settings.currencySymbol}{totalSales.toFixed(2)}</div>
          <div className="text-green-700 text-sm font-medium flex items-center gap-1 mt-2">
            <TrendingUp size={16} /> +12% vs ayer
          </div>
        </div>
        
        <div className="bg-[var(--fr-card)] p-6 rounded-2xl shadow-sm border border-[var(--fr-line)]">
          <div className="text-stone-500 text-xs font-bold uppercase mb-2 tracking-widest">Pedidos</div>
          <div className="text-4xl font-bold text-[var(--fr-green)] font-serif">{orderCount}</div>
        </div>

        <div className="bg-[var(--fr-card)] p-6 rounded-2xl shadow-sm border border-[var(--fr-line)]">
          <div className="text-stone-500 text-xs font-bold uppercase mb-2 tracking-widest">Alertas Stock</div>
          <div className="text-4xl font-bold text-[var(--fr-red)] font-serif">{lowStock.length}</div>
          <div className="text-stone-400 text-xs mt-2 uppercase">Items por debajo del mínimo</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--fr-card)] p-6 rounded-2xl shadow-sm border border-[var(--fr-line)] h-80">
          <h3 className="font-bold text-[var(--fr-green)] mb-4 font-serif">Ventas por Hora</h3>
          <ResponsiveContainer width="100%" height="100%" minWidth={300}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="sales" stroke="#C0392B" strokeWidth={3} dot={{ r: 4, fill: '#C0392B' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--fr-card)] p-6 rounded-2xl shadow-sm border border-[var(--fr-line)] h-80">
          <h3 className="font-bold text-[var(--fr-green)] mb-4 font-serif">Ventas por Canal</h3>
          <ResponsiveContainer width="100%" height="100%" minWidth={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${settings.currencySymbol}${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs">
             {pieData.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1">
                   <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                   <span>{entry.name.replace('DELIVERY_', '')}</span>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Stock Alerts List */}
      <div className="bg-[var(--fr-card)] p-6 rounded-2xl shadow-sm border border-[var(--fr-line)]">
         <h3 className="font-bold text-[var(--fr-green)] mb-4 flex items-center gap-2 font-serif">
            <AlertTriangle className="text-amber-600" /> Stock Crítico
         </h3>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-[var(--fr-bg)] text-stone-500 font-serif uppercase text-xs">
                  <tr>
                     <th className="p-3 rounded-l-lg">Ingrediente</th>
                     <th className="p-3">Actual</th>
                     <th className="p-3">Mínimo</th>
                     <th className="p-3 rounded-r-lg">Estado</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[var(--fr-line)]">
                  {lowStock.map(item => (
                     <tr key={item.id}>
                        <td className="p-3 font-bold text-[var(--fr-text)]">{item.name}</td>
                        <td className="p-3 font-mono">{item.stock} {item.unit}</td>
                        <td className="p-3 font-mono">{item.minStock} {item.unit}</td>
                        <td className="p-3"><span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded border border-red-200">Reponer</span></td>
                     </tr>
                  ))}
                  {lowStock.length === 0 && (
                     <tr><td colSpan={4} className="p-4 text-center text-stone-400 italic">Todo en orden 👍</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
