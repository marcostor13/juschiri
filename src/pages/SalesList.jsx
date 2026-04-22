import React, { useState, useEffect } from 'react';
import { Search, Eye, Filter, Download, ArrowLeft, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function SalesList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/sales`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setSales(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchSales();
  }, []);

  const filteredSales = sales.filter(s => 
    s.orderId.toLowerCase().includes(search.toLowerCase()) ||
    s.cliente?.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white border-2 border-black p-4 flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 border-2 border-gray-100 p-2 w-full lg:w-96 focus-within:border-black transition-colors">
                <Search className="text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="BUSCAR N° ORDEN O CLIENTE..." 
                    className="w-full outline-none font-mono text-sm uppercase"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            <div className="ml-auto flex gap-3">
                <button className="flex items-center gap-2 font-mono text-[10px] font-black uppercase px-4 py-2 border-2 border-gray-100 hover:border-black transition-all">
                    <Filter size={14} /> Filtrar Fechas
                </button>
                <button className="flex items-center gap-2 font-mono text-[10px] font-black uppercase px-4 py-2 bg-black text-white hover:bg-neon-green hover:text-black transition-all border-2 border-black">
                    <Download size={14} /> Exportar CSV
                </button>
            </div>
        </div>

        <div className="bg-white border-2 border-black overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-mono border-collapse">
                    <thead className="bg-black text-white uppercase text-xs tracking-widest">
                        <tr>
                            <th className="px-6 py-4 border-r border-white/10">ID Orden</th>
                            <th className="px-6 py-4 border-r border-white/10">Fecha</th>
                            <th className="px-6 py-4 border-r border-white/10">Cliente</th>
                            <th className="px-6 py-4 border-r border-white/10">Items</th>
                            <th className="px-6 py-4 border-r border-white/10">Total</th>
                            <th className="px-6 py-4 border-r border-white/10">Estado</th>
                            <th className="px-6 py-4">Ver</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredSales.map(sale => (
                            <tr key={sale._id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 border-r border-gray-100 font-bold">{sale.orderId}</td>
                                <td className="px-6 py-4 border-r border-gray-100 text-xs text-gray-500">
                                    {new Date(sale.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 border-r border-gray-100">
                                    <div className="text-xs font-bold uppercase">{sale.cliente?.nombre}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{sale.cliente?.direccion}</div>
                                </td>
                                <td className="px-6 py-4 border-r border-gray-100">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold">
                                        {sale.items?.length || 0} ITEMS
                                    </span>
                                </td>
                                <td className="px-6 py-4 border-r border-gray-100 font-black">
                                    S/. {sale.total?.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 border-r border-gray-100">
                                    <span className="text-[9px] font-black uppercase px-2 py-1 bg-green-100 text-green-700 border border-green-200">
                                        {sale.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button className="p-2 border-2 border-transparent hover:border-black transition-all">
                                        <Eye size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {loading && (
                            <tr><td colSpan="7" className="text-center py-20 font-mono text-gray-400 animate-pulse">CARGANDO HISTORIAL...</td></tr>
                        )}
                        {!loading && filteredSales.length === 0 && (
                            <tr><td colSpan="7" className="text-center py-20 font-mono text-gray-400 italic font-bold">NO SE ENCONTRARON VENTAS.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

             <div className="bg-gray-50 border-t-2 border-black p-4 flex justify-between items-center font-mono">
                <button className="p-2 border-2 border-black opacity-30 cursor-not-allowed"><ArrowLeft size={18} /></button>
                <div className="text-xs font-bold uppercase">PÁGINA 1 DE 1</div>
                <button className="p-2 border-2 border-black opacity-30 cursor-not-allowed"><ArrowRight size={18} /></button>
            </div>
        </div>
    </div>
  );
}
