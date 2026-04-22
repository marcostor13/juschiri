import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign, Package, TrendingDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const KpiCard = ({ title, value, icon: Icon, trend, trendValue }) => (
  <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-gray-50 border border-gray-100">
        <Icon size={24} className="text-black" />
      </div>
      {trend && (
        <div className={`flex items-center text-[10px] font-bold uppercase ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
          {trend === 'up' ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
          {trendValue}
        </div>
      )}
    </div>
    <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-1">{title}</p>
    <h3 className="text-3xl font-black italic uppercase tracking-tighter">{value}</h3>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/sales/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="h-96 flex items-center justify-center font-mono text-gray-400 uppercase tracking-widest animate-pulse">
        Calculando Métricas...
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard 
                title="Ventas Totales" 
                value={`S/. ${stats?.revenue?.toLocaleString() || 0}`} 
                icon={DollarSign} 
                trend="up" 
                trendValue="+12% vs ayer"
            />
            <KpiCard 
                title="Órdenes Recibidas" 
                value={stats?.count || 0} 
                icon={ShoppingCart}
                trend="up"
                trendValue="+5% este mes"
            />
            <KpiCard 
                title="Clientes Únicos" 
                value="248" 
                icon={Users}
            />
            <KpiCard 
                title="Stock en Peligro" 
                value="12" 
                icon={Package}
                trend="down"
                trendValue="Cerca de agotar"
            />
        </div>

        {/* Charts Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(204,255,0,1)]">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="font-black uppercase italic text-xl tracking-tighter">Ventas Diarias (30d)</h3>
                    <div className="w-3 h-3 bg-neon-green border border-black"></div>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.daily || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis 
                                dataKey="_id" 
                                stroke="#9CA3AF" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(val) => val.split('-').slice(1).join('/')}
                            />
                            <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{fill: '#F3F4F6'}}
                                contentStyle={{ borderRadius: '0px', border: '2px solid black', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '10px' }}
                            />
                            <Bar dataKey="amount" fill="#000" radius={[0, 0, 0, 0]}>
                                {(stats?.daily || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#000' : '#CCFF00'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="font-black uppercase italic text-xl tracking-tighter">Tendencia de Órdenes</h3>
                    <div className="w-3 h-3 bg-black border border-gray-100"></div>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats?.daily || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis 
                                dataKey="_id" 
                                stroke="#9CA3AF" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(val) => val.split('-').slice(1).join('/')}
                            />
                            <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '0px', border: '2px solid black', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '10px' }} />
                            <Line type="stepAfter" dataKey="count" stroke="#000" strokeWidth={3} dot={{ stroke: '#CCFF00', strokeWidth: 4, r: 4, fill: '#000' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
}
