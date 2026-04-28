import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, Plus, Edit, Trash2, Search, X, Save, ImagePlus, Check, 
  SlidersHorizontal, Loader2, ArrowLeft, ArrowRight, LayoutDashboard, 
  Package, ShoppingCart, LogOut, Menu, User as UserIcon, Settings
} from 'lucide-react';
import { ConfirmModal, Notification } from '../components/ui';

// Components
import Dashboard from './Dashboard';
import SalesList from './SalesList';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Componentes y Utilidades cargados


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
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [itemToDelete, setItemToDelete] = useState(null);

  const showNotification = useCallback((message, type = 'info') => {
      setNotification({ show: true, message, type });
      setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  }, []);

  const [settings, setSettings] = useState({ whatsapp_number: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      } catch (err) { console.error(err); }
    };
    fetchSettings();
  }, []);

  const handleSaveSetting = async (key, value) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        showNotification('Configuración guardada', 'success');
        setSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (err) { showNotification('Error al guardar', 'error'); }
  };
  
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

  const [allCategories, setAllCategories] = useState([]);
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_URL}/products?limit=2500`),
        fetch(`${API_URL}/categories`)
      ]);
      const data = await prodRes.json();
      const catData = await catRes.json();
      setProducts(data.products || []);
      setAllCategories(catData || []);
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
      if (activeSection !== 'Todos' && p.category?._id !== activeSection) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return `${p.nombre || ''} ${p.marca || ''} ${p.codigo || ''}`.toLowerCase().includes(q);
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
      stock_actual: 0, stock_anterior: 0, imagen_url: '', 
      galeria: [], variantes: [],
      category: '', type: '', subcategory: ''
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
      const payload = { ...currentProduct };
      if (typeof payload.category === 'object' && payload.category?._id) payload.category = payload.category._id;
      if (typeof payload.type === 'object' && payload.type?._id) payload.type = payload.type._id;
      if (typeof payload.subcategory === 'object' && payload.subcategory?._id) payload.subcategory = payload.subcategory._id;
      
      const url = initialProductRef.current 
        ? `${API_URL}/products/${initialProductRef.current}` 
        : `${API_URL}/products`;

      const res = await fetch(url, {
        method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchProducts();
        setIsModalOpen(false);
        showNotification(initialProductRef.current ? 'Producto actualizado' : 'Producto creado', 'success');
      } else {
        const err = await res.json();
        showNotification(`Error: ${err.error}`, 'error');
      }
    } catch (e) {
      showNotification("Error al guardar", 'error');
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
      showNotification('Imagen subida', 'success');
    } catch (err) {
      showNotification("Error al subir imagen", 'error');
    }
    setFormLoading(false);
  };

  const handleGalleryUpload = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      setFormLoading(true);
      try {
          const newImages = [];
          for(const file of files) {
              const res = await fetch(`${API_URL}/upload/presigned?fileName=${file.name}&fileType=${file.type}`);
              const { uploadUrl, publicUrl } = await res.json();
              await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
              newImages.push(publicUrl);
          }
          setCurrentProduct(prev => ({
              ...prev, 
              galeria: [...(prev.galeria || []), ...newImages]
          }));
          showNotification(`${files.length} imágenes subidas a la galería`, 'success');
      } catch(err) {
          showNotification('Error al subir imágenes', 'error');
      }
      setFormLoading(false);
  };

  const removeGalleryImage = (index) => {
      setCurrentProduct(prev => {
          const newGaleria = [...prev.galeria];
          newGaleria.splice(index, 1);
          return { ...prev, galeria: newGaleria };
      });
  };

  const addVariant = () => {
      setCurrentProduct(prev => ({
          ...prev,
          variantes: [...(prev.variantes || []), { talla: '', color: '', stock: 0 }]
      }));
  };

  const updateVariant = (index, field, value) => {
      setCurrentProduct(prev => {
          const newVar = [...prev.variantes];
          newVar[index][field] = value;
          return { ...prev, variantes: newVar };
      });
  };

  const removeVariant = (index) => {
      setCurrentProduct(prev => {
          const newVar = [...prev.variantes];
          newVar.splice(index, 1);
          return { ...prev, variantes: newVar };
      });
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/products/${itemToDelete}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
          setProducts(products.filter(p => p.codigo !== itemToDelete));
          showNotification('Producto eliminado', 'success');
      } else {
          showNotification('Error al eliminar producto', 'error');
      }
    } catch (e) {
      showNotification('Error de conexión', 'error');
    }
    setItemToDelete(null);
  };

  const handleDelete = (codigo) => {
    setItemToDelete(codigo);
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
                    <SidebarItem id="settings" label="Configuración" icon={Settings} />
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

            {activeTab === 'settings' && (
                <div className="bg-white border-2 border-black p-8 max-w-xl animate-fade-in">
                    <h3 className="text-xl font-black uppercase italic mb-6 border-b-2 border-black pb-4">Ajustes del Sistema</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Número de WhatsApp (Compras)</label>
                            <div className="flex gap-4">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 border-2 border-gray-200 focus:border-black outline-none font-mono text-sm"
                                    placeholder="Ej: 51921385472"
                                    value={settings.whatsapp_number || ''}
                                    onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
                                />
                                <button 
                                    onClick={() => handleSaveSetting('whatsapp_number', settings.whatsapp_number)}
                                    className="bg-black text-white px-6 font-black uppercase text-xs hover:bg-neon-green hover:text-black transition-colors border-2 border-black"
                                >
                                    Guardar
                                </button>
                            </div>
                            <p className="mt-2 font-mono text-[9px] text-gray-400">Incluye código de país sin el signo + (ej. 51 para Perú).</p>
                        </div>
                    </div>
                </div>
            )}

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
                            <button 
                                onClick={() => { setActiveSection('Todos'); setCurrentPage(1); }}
                                className={`font-mono text-[10px] uppercase font-bold px-4 py-2 border-2 transition-all flex-shrink-0 ${activeSection === 'Todos' ? 'bg-black text-neon-green border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'}`}
                            >
                                Todos
                            </button>
                            {allCategories.map(cat => (
                                <button 
                                    key={cat._id}
                                    onClick={() => { setActiveSection(cat._id); setCurrentPage(1); }}
                                    className={`font-mono text-[10px] uppercase font-bold px-4 py-2 border-2 transition-all flex-shrink-0 ${activeSection === cat._id ? 'bg-black text-neon-green border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'}`}
                                >
                                    {cat.name}
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
                                <label className="block font-mono text-[10px] font-bold uppercase text-gray-500">Imagen Principal</label>
                                <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group mb-4">
                                    {currentProduct.imagen_url ? (
                                        <img src={currentProduct.imagen_url} className="w-full h-full object-contain mix-blend-multiply p-4" alt="" />
                                    ) : (
                                        <ImagePlus className="text-gray-300" size={48} />
                                    )}
                                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center text-white font-bold text-xs uppercase text-center p-4">
                                        <RefreshCw size={24} className="mb-2" />
                                        Subir / Cambiar Principal
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={formLoading} />
                                    </label>
                                </div>

                                {/* Galería */}
                                <label className="block font-mono text-[10px] font-bold uppercase text-gray-500 mb-2">Galería de Imágenes</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(currentProduct.galeria || []).map((img, i) => (
                                        <div key={i} className="aspect-square border border-gray-200 relative group bg-gray-50">
                                            <img src={img} className="w-full h-full object-cover mix-blend-multiply" alt=""/>
                                            <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X size={12}/>
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                        <Plus className="text-gray-400" />
                                        <input type="file" multiple className="hidden" accept="image/*" onChange={handleGalleryUpload} disabled={formLoading} />
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
                                        <input className="w-full p-3 border-2 border-black font-mono text-sm uppercase" value={currentProduct.marca || ''} onChange={e => setCurrentProduct({...currentProduct, marca: e.target.value.toUpperCase()})} />
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
                                        <label className="block font-mono text-[10px] font-bold uppercase mb-1">Stock Global</label>
                                        <input type="number" required className="w-full p-3 border-2 border-black font-mono text-sm disabled:opacity-50" value={currentProduct.stock_actual} disabled={(currentProduct.variantes && currentProduct.variantes.length > 0)} onChange={e => setCurrentProduct({...currentProduct, stock_actual: Number(e.target.value)})} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block font-mono text-[10px] font-bold uppercase mb-1">Categoría</label>
                                        <select 
                                            className="w-full p-3 border-2 border-black font-mono text-xs uppercase"
                                            value={typeof currentProduct.category === 'object' ? currentProduct.category?._id : currentProduct.category || ""}
                                            onChange={e => setCurrentProduct({...currentProduct, category: e.target.value, type: '', subcategory: ''})}
                                        >
                                            <option value="">SELECC...</option>
                                            {allCategories.map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-mono text-[10px] font-bold uppercase mb-1">Tipo</label>
                                        <select 
                                            className="w-full p-3 border-2 border-black font-mono text-xs uppercase"
                                            value={typeof currentProduct.type === 'object' ? currentProduct.type?._id : currentProduct.type || ""}
                                            onChange={e => setCurrentProduct({...currentProduct, type: e.target.value, subcategory: ''})}
                                            disabled={!currentProduct.category}
                                        >
                                            <option value="">SELECC...</option>
                                            {(allCategories.find(c => c._id === (typeof currentProduct.category === 'object' ? currentProduct.category._id : currentProduct.category))?.types || []).map(t => (
                                                <option key={t._id} value={t._id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-mono text-[10px] font-bold uppercase mb-1">Subcat</label>
                                        <select 
                                            className="w-full p-3 border-2 border-black font-mono text-xs uppercase"
                                            value={typeof currentProduct.subcategory === 'object' ? currentProduct.subcategory?._id : currentProduct.subcategory || ""}
                                            onChange={e => setCurrentProduct({...currentProduct, subcategory: e.target.value})}
                                            disabled={!currentProduct.type}
                                        >
                                            <option value="">SELECC...</option>
                                            {(allCategories.find(c => c._id === (typeof currentProduct.category === 'object' ? currentProduct.category._id : currentProduct.category))
                                              ?.types?.find(t => t._id === (typeof currentProduct.type === 'object' ? currentProduct.type._id : currentProduct.type))
                                              ?.subcategories || []).map(sub => (
                                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* VARIANTES */}
                                <div className="mt-6 border-t-2 border-black pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-black uppercase text-sm tracking-tighter">Variantes (Tallas/Colores)</h3>
                                        <button type="button" onClick={addVariant} className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-3 py-1 bg-black text-white hover:bg-neon-green hover:text-black transition-colors">
                                            <Plus size={12} /> Añadir Variante
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                        {(currentProduct.variantes || []).length === 0 && (
                                            <p className="text-xs font-mono text-gray-500 italic">No hay variantes. Se usará el Stock Global.</p>
                                        )}
                                        {(currentProduct.variantes || []).map((v, i) => (
                                            <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 border border-gray-200">
                                                <input type="text" placeholder="Talla (ej: M)" className="w-1/3 p-2 font-mono text-xs uppercase border border-gray-300" value={v.talla || ''} onChange={e => updateVariant(i, 'talla', e.target.value)} />
                                                <input type="text" placeholder="Color (ej: Rojo)" className="w-1/3 p-2 font-mono text-xs uppercase border border-gray-300" value={v.color || ''} onChange={e => updateVariant(i, 'color', e.target.value)} />
                                                <input type="number" placeholder="Stock" className="w-1/4 p-2 font-mono text-xs border border-gray-300" value={v.stock} onChange={e => updateVariant(i, 'stock', Number(e.target.value))} />
                                                <button type="button" onClick={() => removeVariant(i)} className="p-2 text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
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

        <ConfirmModal 
            isOpen={itemToDelete !== null}
            title="Eliminar Producto"
            message={`¿Estás seguro de eliminar el producto ${itemToDelete}? Esta acción es irreversible.`}
            confirmText="Sí, Eliminar"
            onConfirm={executeDelete}
            onCancel={() => setItemToDelete(null)}
        />
        
        {notification.show && (
            <Notification 
                type={notification.type} 
                message={notification.message} 
                onClose={() => setNotification({ ...notification, show: false })} 
            />
        )}
    </div>
  );
}
