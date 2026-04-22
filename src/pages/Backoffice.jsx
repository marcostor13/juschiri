import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, Plus, Edit, Trash2, Search, X, Save, ImagePlus, Check, 
  SlidersHorizontal, Loader2, ArrowLeft, ArrowRight, LayoutDashboard, 
  Package, ShoppingCart, LogOut, Menu, User as UserIcon, Settings
} from 'lucide-react';

// Components
import Dashboard from './Dashboard';
import SalesList from './SalesList';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// --- UTILS ---
const SUPER_SECTIONS = ['Todos', 'Zapatillas', 'Ropa', 'Accesorios', 'Cuidado', 'Otros'];
const getSectionForProduct = (categorias) => {
  if (!categorias || categorias.length === 0) return 'Otros';
  const text = categorias.join(' ').toUpperCase();
  if (/(LIMPIEZA|REPELENTE|ACONDICIONADOR|PAñOS)/.test(text)) return 'Cuidado';
  if (/(HOODIE|SHIRT|PANTALON|JEANS|CASACA|CAMISA|SHORT|POLERA|SWEATER|SUETER|JACKET|CONJUNTO|BUZO|PANTS|BOXER|CAFARENA|TOP|JERSEY|MEDIAS|LONG SLEEVE)/.test(text)) return 'Ropa';
  if (/(BILLETERA|WALLET|CARTERA|CORREA|GORRA|MOCHILA|MORRAL|PELUCHE|TAZAS|TOALLA|LENTES|GLASSES|MUñECO|TARJETERO|ENCENDEDOR)/.test(text)) return 'Accesorios';
  if (/(JORDAN|YEEZY|AF1|AIR FORCE|DUNK|AIR MAX|350|700|BAPE|TRAINER|SLIDE|OODSY|CLASSIC|CAMPUS|GAZELLE|SHOX|RESPONSE|CONVERSE|VANS|VULC|SNEAKER|LOW|HIGH|MID|BOOT|PORTOFINO|SANDALIA|SKEL)/.test(text)) return 'Zapatillas';
  return 'Otros';
};

// --- PRODUCT CARD COMPONENT (INTERNAL) ---
const ProductRow = React.memo(({ p, onEdit, onDelete }) => (
    <tr className="hover:bg-gray-50 transition-colors group">
        <td className="px-6 py-3 border-r border-gray-100">
            <div className="w-12 h-12 bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center p-1">
                <img src={p.imagen_url || 'https://via.placeholder.com/100'} className="max-w-full max-h-full object-contain mix-blend-multiply" alt="" />
            </div>
        </td>
        <td className="px-6 py-3 border-r border-gray-100 font-bold">{p.codigo}</td>
        <td className="px-6 py-3 border-r border-gray-100 text-xs font-bold uppercase truncate max-w-[250px]">{p.nombre}</td>
        <td className="px-6 py-3 border-r border-gray-100 italic">{p.marca}</td>
        <td className="px-6 py-3 border-r border-gray-100 font-bold">S/. {p.precio}</td>
        <td className="px-6 py-3 border-r border-gray-100">
            <span className={`font-bold ${p.stock_actual > 0 ? 'text-green-600' : 'text-red-500'}`}>{p.stock_actual}</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-gray-400">{p.stock_anterior}</span>
        </td>
        <td className="px-6 py-3">
            <div className="flex gap-2">
                <button onClick={() => onEdit(p)} className="p-2 border-2 border-transparent hover:border-black group-hover:bg-black group-hover:text-white transition-all">
                    <Edit size={16} />
                </button>
                <button onClick={() => onDelete(p.codigo)} className="p-2 border-2 border-transparent hover:border-red-500 group-hover:text-red-500 transition-all">
                    <Trash2 size={16} />
                </button>
            </div>
        </td>
    </tr>
));

export default function Backoffice() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inventory');
  const [user, setUser] = useState(null);
  
  // Auth Check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token) {
        navigate('/login');
    } else {
        setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Inventory State (Extracted from old Backoffice)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/products?limit=2500`);
      const data = await res.json();
      const mapped = (data.products || []).map(p => ({
        ...p,
        superSection: getSectionForProduct(p.categorias)
      }));
      setProducts(mapped);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (activeSection !== 'Todos' && p.superSection !== activeSection) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return `${p.nombre} ${p.marca} ${p.codigo}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, activeSection, searchQuery]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const openModal = (product = null) => {
    setCurrentProduct(product || {
      codigo: '', nombre: '', marca: '', precio: 0, 
      stock_actual: 0, stock_anterior: 0, imagen_url: '', categorias: []
    });
    setIsModalOpen(true);
  };

  const initialProductRef = useRef(null);
  useEffect(() => {
    if (isModalOpen && currentProduct && currentProduct.codigo) {
        initialProductRef.current = currentProduct.codigo;
    } else if (isModalOpen) {
        initialProductRef.current = null;
    }
  }, [isModalOpen]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const token = localStorage.getItem('token');
      const method = initialProductRef.current ? 'PUT' : 'POST';
      const url = initialProductRef.current 
        ? `${API_URL}/products/${initialProductRef.current}` 
        : `${API_URL}/products`;

      const res = await fetch(url, {
        method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(currentProduct)
      });

      if (res.ok) {
        await fetchProducts();
        setIsModalOpen(false);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e) {
      alert("Error al guardar");
    }
    setFormLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormLoading(true);
    try {
      const res = await fetch(`${API_URL}/upload/presigned?fileName=${file.name}&fileType=${file.type}`);
      const { uploadUrl, publicUrl } = await res.json();
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setCurrentProduct({ ...currentProduct, imagen_url: publicUrl });
    } catch (err) {
      alert("Error al subir imagen");
    }
    setFormLoading(false);
  };

  const handleDelete = async (codigo) => {
    if (!window.confirm(`¿Estás seguro de eliminar el producto ${codigo}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/products/${codigo}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setProducts(products.filter(p => p.codigo !== codigo));
    } catch (e) {
      console.error(e);
    }
  };

  const SidebarItem = ({ id, label, icon: Icon }) => (
    <button 
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-4 px-6 py-4 font-black uppercase italic tracking-tighter text-sm transition-all border-l-4 ${activeTab === id ? 'bg-neon-green text-black border-black' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'}`}
    >
        <Icon size={18} />
        {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans selection:bg-neon-green text-gray-900">
        {/* Sidebar */}
        <aside className="w-64 bg-black flex flex-col fixed h-full z-20">
            <div className="p-8 mb-10">
                <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white flex items-center gap-2">
                    <span className="bg-neon-green text-black px-1 rounded">JC</span> HUB®
                </h1>
                <p className="font-mono text-[9px] text-gray-400 uppercase mt-2 tracking-[0.2em]">Management Suite v2.0</p>
            </div>

            <nav className="flex-1 space-y-1">
                <SidebarItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
                <SidebarItem id="inventory" label="Inventario" icon={Package} />
                <SidebarItem id="sales" label="Ventas" icon={ShoppingCart} />
                <div className="pt-10">
                    <p className="px-8 font-mono text-[9px] text-gray-600 uppercase mb-4">Administración</p>
                    <button className="w-full flex items-center gap-4 px-6 py-4 text-gray-400 font-bold uppercase text-xs hover:text-white transition-colors">
                        <Settings size={18} /> Configuración
                    </button>
                </div>
            </nav>

            <div className="p-6 border-t border-white/5">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="w-8 h-8 rounded-full bg-neon-green text-black flex items-center justify-center font-black">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[10px] font-black uppercase text-white truncate">{user?.email}</p>
                        <p className="text-[9px] font-bold text-neon-green uppercase truncate">{user?.role}</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-3 bg-red-500/10 text-red-500 font-black uppercase italic tracking-tighter text-xs hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                >
                    <LogOut size={16} /> Cerrar Sesión
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8 lg:p-12 min-h-screen">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic">{activeTab}</h2>
                    <p className="font-mono text-[10px] text-gray-400 mt-1 uppercase tracking-widest">
                        {activeTab === 'inventory' ? 'Control de Existencias y Stock' : activeTab === 'dashboard' ? 'Métricas de Rendimiento' : 'Historial de Transacciones'}
                    </p>
                </div>
                {activeTab === 'inventory' && (
                    <div className="flex gap-3">
                         <button onClick={fetchProducts} className="p-3 border-2 border-black hover:bg-black hover:text-neon-green bg-white transition-all">
                            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
                        </button>
                        <button onClick={() => openModal()} className="bg-neon-green text-black font-black px-6 py-3 border-2 border-black uppercase tracking-tighter hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            + Nuevo Item
                        </button>
                    </div>
                )}
            </header>

            {/* TAB CONTENT */}
            {activeTab === 'dashboard' && <Dashboard />}
            
            {activeTab === 'sales' && <SalesList />}

            {activeTab === 'inventory' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Filters */}
                    <div className="bg-white border-2 border-black p-4 flex flex-col lg:flex-row gap-6 items-center">
                        <div className="flex items-center gap-2 border-2 border-gray-100 p-2 w-full lg:w-96 focus-within:border-black transition-colors">
                            <Search className="text-gray-400" size={18} />
                            <input 
                                type="text" placeholder="BUSCAR SKU, NOMBRE..." 
                                className="w-full outline-none font-mono text-sm uppercase"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar w-full pb-2 lg:pb-0">
                            {SUPER_SECTIONS.map(sec => (
                                <button 
                                    key={sec}
                                    onClick={() => { setActiveSection(sec); setCurrentPage(1); }}
                                    className={`font-mono text-[10px] uppercase font-bold px-4 py-2 border-2 transition-all flex-shrink-0 ${activeSection === sec ? 'bg-black text-neon-green border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'}`}
                                >
                                    {sec}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border-2 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm font-mono border-collapse">
                                <thead className="bg-black text-white uppercase text-xs tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4 border-r border-white/10">Imagen</th>
                                        <th className="px-6 py-4 border-r border-white/10">SKU</th>
                                        <th className="px-6 py-4 border-r border-white/10">Nombre</th>
                                        <th className="px-6 py-4 border-r border-white/10">Marca</th>
                                        <th className="px-6 py-4 border-r border-white/10">Precio</th>
                                        <th className="px-6 py-4 border-r border-white/10">Stock</th>
                                        <th className="px-6 py-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedProducts.map(p => (
                                        <ProductRow key={p._id} p={p} onEdit={openModal} onDelete={handleDelete} />
                                    ))}
                                    {loading && <tr><td colSpan="7" className="py-20 text-center text-gray-400 animate-pulse uppercase tracking-widest">Cargando existencias...</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-gray-50 border-t-2 border-black p-4 flex justify-between items-center font-mono">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border-2 border-black hover:bg-black hover:text-white disabled:opacity-30"><ArrowLeft size={18} /></button>
                            <div className="text-xs font-bold">PÁGINA {currentPage} DE {totalPages || 1}</div>
                            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border-2 border-black hover:bg-black hover:text-white disabled:opacity-30"><ArrowRight size={18} /></button>
                        </div>
                    </div>
                </div>
            )}
        </main>

        {/* MODAL EDITOR (Re-included for scope) */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => !formLoading && setIsModalOpen(false)}></div>
                <div className="bg-white w-full max-w-4xl max-h-[90vh] relative flex flex-col border-4 border-black shadow-[15px_15px_0px_0px_rgba(204,255,0,1)] overflow-hidden">
                    <div className="p-6 border-b-4 border-black flex justify-between items-center bg-black text-white">
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic">
                            {initialProductRef.current ? `EDITAR: ${initialProductRef.current}` : 'NUEVO PRODUCTO'}
                        </h2>
                        <button onClick={() => setIsModalOpen(false)} disabled={formLoading} className="p-2 border-2 border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="block font-mono text-[10px] font-bold uppercase text-gray-500">Imagen del Producto</label>
                                <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group">
                                    {currentProduct.imagen_url ? (
                                        <img src={currentProduct.imagen_url} className="w-full h-full object-contain mix-blend-multiply p-4" alt="" />
                                    ) : (
                                        <ImagePlus className="text-gray-300" size={48} />
                                    )}
                                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center text-white font-bold text-xs uppercase text-center p-4">
                                        <RefreshCw size={24} className="mb-2" />
                                        Subir / Cambiar
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={formLoading} />
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block font-mono text-[10px] font-bold uppercase mb-1">SKU</label>
                                        <input required className="w-full p-3 border-2 border-black font-mono text-sm uppercase" value={currentProduct.codigo} onChange={e => setCurrentProduct({...currentProduct, codigo: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block font-mono text-[10px] font-bold uppercase mb-1">Marca</label>
                                        <input required className="w-full p-3 border-2 border-black font-mono text-sm uppercase" value={currentProduct.marca} onChange={e => setCurrentProduct({...currentProduct, marca: e.target.value.toUpperCase()})} />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block font-mono text-[10px] font-bold uppercase mb-1">Nombre</label>
                                    <input required className="w-full p-3 border-2 border-black font-mono text-sm uppercase" value={currentProduct.nombre} onChange={e => setCurrentProduct({...currentProduct, nombre: e.target.value.toUpperCase()})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-mono text-[10px] font-bold uppercase mb-1 focus:bg-neon-green">Precio</label>
                                        <input type="number" required className="w-full p-3 border-2 border-black font-mono text-sm" value={currentProduct.precio} onChange={e => setCurrentProduct({...currentProduct, precio: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block font-mono text-[10px] font-bold uppercase mb-1">Stock Actual</label>
                                        <input type="number" required className="w-full p-3 border-2 border-black font-mono text-sm" value={currentProduct.stock_actual} onChange={e => setCurrentProduct({...currentProduct, stock_actual: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block font-mono text-[10px] font-bold uppercase mb-1">Categorías</label>
                                    <input placeholder="SEPARADAS POR COMAS" className="w-full p-3 border-2 border-black font-mono text-sm uppercase" value={currentProduct.categorias.join(', ')} onChange={e => setCurrentProduct({...currentProduct, categorias: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} />
                                </div>
                            </div>
                        </div>
                    </form>

                    <div className="p-6 border-t-4 border-black bg-gray-50 flex gap-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold border-2 border-black uppercase text-sm hover:bg-gray-200">Cancelar</button>
                        <button onClick={handleSave} disabled={formLoading} className="flex-[2] py-4 bg-black text-white font-bold uppercase text-sm tracking-widest hover:bg-neon-green hover:text-black border-2 border-black disabled:opacity-50 flex justify-center items-center gap-3">
                            {formLoading ? <Loader2 className="animate-spin" /> : <Save />} Guardar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
