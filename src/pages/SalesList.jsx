import React, { useState, useEffect } from 'react';
import { Search, Eye, Filter, Download, ArrowLeft, ArrowRight, Trash2, X } from 'lucide-react';
import { Notification, ConfirmModal } from '../components/ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function SalesList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Modals
  const [selectedSale, setSelectedSale] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

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

  useEffect(() => {
    fetchSales();
  }, []);

  const showNotif = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/sales/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        if(res.ok) {
            showNotif('Estado actualizado', 'success');
            fetchSales();
            if(selectedSale && selectedSale._id === id) {
                setSelectedSale(prev => ({...prev, status: newStatus}));
            }
        }
    } catch(err) { showNotif('Error', 'error'); }
  };

  const handleDelete = async () => {
    if(!deleteId) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/sales/${deleteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
            showNotif('Lead eliminado', 'success');
            fetchSales();
        }
    } catch(err) { showNotif('Error al eliminar', 'error'); }
    setDeleteId(null);
  };

  const filteredSales = sales.filter(s => {
      const matchesSearch = s.orderId.toLowerCase().includes(search.toLowerCase()) ||
                            s.cliente?.nombre?.toLowerCase().includes(search.toLowerCase());
      
      let matchesDate = true;
      if (startDate) {
          matchesDate = matchesDate && new Date(s.createdAt) >= new Date(startDate);
      }
      if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && new Date(s.createdAt) <= end;
      }
      return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6 animate-fade-in">
        {notification.show && <Notification message={notification.message} type={notification.type} />}
        
        <ConfirmModal 
            isOpen={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={handleDelete}
            title="¿ELIMINAR LEAD?"
            message="Esta acción no se puede deshacer. El registro se perderá para siempre."
        />

        {/* Modal de Detalle */}
        {selectedSale && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedSale(null)}></div>
                <div className="bg-white w-full max-w-3xl relative z-10 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b-4 border-black flex justify-between items-center bg-gray-50">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Detalle de Lead</h2>
                            <p className="font-mono text-sm text-gray-500">{selectedSale.orderId}</p>
                        </div>
                        <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-black hover:text-white transition-colors border-2 border-transparent">
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border-2 border-black p-4">
                                <h4 className="font-black uppercase text-xs text-gray-500 mb-2">Cliente</h4>
                                <p className="font-bold uppercase text-lg">{selectedSale.cliente?.nombre}</p>
                                <p className="font-mono text-sm mt-1">{selectedSale.cliente?.telefono}</p>
                                <p className="font-mono text-sm text-gray-500 mt-1">{selectedSale.cliente?.direccion}</p>
                            </div>
                            <div className="border-2 border-black p-4 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-black uppercase text-xs text-gray-500 mb-2">Estado del Pedido</h4>
                                    <select 
                                        className="w-full p-2 border-2 border-black font-bold uppercase cursor-pointer"
                                        value={selectedSale.status}
                                        onChange={e => handleUpdateStatus(selectedSale._id, e.target.value)}
                                    >
                                        <option value="pending">PENDIENTE</option>
                                        <option value="completed">COMPLETADO</option>
                                        <option value="cancelled">CANCELADO</option>
                                    </select>
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-black uppercase text-xs text-gray-500 mb-1">Fecha</h4>
                                    <p className="font-mono font-bold">{new Date(selectedSale.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-black uppercase border-b-2 border-black pb-2 mb-4">Productos Solicitados ({selectedSale.items?.length})</h3>
                            <div className="space-y-3">
                                {selectedSale.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-3">
                                        <div>
                                            <p className="font-bold uppercase">{item.nombre}</p>
                                            <p className="font-mono text-xs text-gray-500">COD: {item.codigo}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-bold">x{item.cantidad || 1}</p>
                                            <p className="font-bold">S/. {(item.precio * (item.cantidad || 1)).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-black text-white p-4 flex justify-between items-center">
                            <span className="font-black uppercase tracking-widest">Total Acumulado</span>
                            <span className="text-2xl font-black">S/. {selectedSale.total?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white border-2 border-black p-4 flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase text-gray-500">Buscar</label>
                <div className="flex items-center gap-2 border-2 border-gray-100 p-2 focus-within:border-black transition-colors w-full">
                    <Search className="text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="N° ORDEN O CLIENTE..." 
                        className="w-full outline-none font-mono text-sm uppercase"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="flex-1 space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase text-gray-500">Desde</label>
                <input 
                    type="date" 
                    className="w-full p-2 border-2 border-gray-100 focus:border-black outline-none font-mono text-sm"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
            </div>
            
            <div className="flex-1 space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase text-gray-500">Hasta</label>
                <input 
                    type="date" 
                    className="w-full p-2 border-2 border-gray-100 focus:border-black outline-none font-mono text-sm"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                />
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={() => {setSearch(''); setStartDate(''); setEndDate('');}}
                    className="h-[42px] px-4 font-mono text-[10px] font-black uppercase border-2 border-gray-200 hover:border-black transition-all"
                >
                    Limpiar
                </button>
            </div>
        </div>

        <div className="bg-white border-2 border-black overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-mono border-collapse">
                    <thead className="bg-black text-white uppercase text-xs tracking-widest">
                        <tr>
                            <th className="px-6 py-4 border-r border-white/10">ID / Fecha</th>
                            <th className="px-6 py-4 border-r border-white/10">Cliente</th>
                            <th className="px-6 py-4 border-r border-white/10">Items</th>
                            <th className="px-6 py-4 border-r border-white/10">Total</th>
                            <th className="px-6 py-4 border-r border-white/10">Estado</th>
                            <th className="px-6 py-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredSales.map(sale => (
                            <tr key={sale._id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 border-r border-gray-100">
                                    <div className="font-bold">{sale.orderId}</div>
                                    <div className="text-[10px] text-gray-400 mt-1">{new Date(sale.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4 border-r border-gray-100">
                                    <div className="text-xs font-bold uppercase">{sale.cliente?.nombre}</div>
                                    <div className="text-[10px] text-gray-500 truncate mt-1">{sale.cliente?.telefono}</div>
                                </td>
                                <td className="px-6 py-4 border-r border-gray-100">
                                    <span className="bg-gray-100 px-2 py-0.5 border border-gray-200 text-[10px] font-bold">
                                        {sale.items?.length || 0} ITEMS
                                    </span>
                                </td>
                                <td className="px-6 py-4 border-r border-gray-100 font-black">
                                    S/. {sale.total?.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 border-r border-gray-100">
                                    <select 
                                        className={`text-[9px] font-black uppercase px-2 py-1 outline-none cursor-pointer border ${
                                            sale.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                            sale.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                                            'bg-red-100 text-red-700 border-red-200'
                                        }`}
                                        value={sale.status}
                                        onChange={(e) => handleUpdateStatus(sale._id, e.target.value)}
                                    >
                                        <option value="pending">PENDIENTE</option>
                                        <option value="completed">COMPLETADO</option>
                                        <option value="cancelled">CANCELADO</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 flex justify-center gap-2">
                                    <button 
                                        onClick={() => setSelectedSale(sale)}
                                        className="p-2 border-2 border-transparent hover:border-black text-gray-500 hover:text-black transition-all"
                                        title="Ver detalles"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button 
                                        onClick={() => setDeleteId(sale._id)}
                                        className="p-2 border-2 border-transparent hover:border-red-500 text-gray-500 hover:text-red-500 transition-all"
                                        title="Eliminar Lead"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {loading && (
                            <tr><td colSpan="6" className="text-center py-20 font-mono text-gray-400 animate-pulse">CARGANDO HISTORIAL...</td></tr>
                        )}
                        {!loading && filteredSales.length === 0 && (
                            <tr><td colSpan="6" className="text-center py-20 font-mono text-gray-400 italic font-bold">NO SE ENCONTRARON LEADS EN ESTE RANGO.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
