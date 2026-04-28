import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    <tr className="hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0 group">
        <td className="px-6 py-4">
            <div className="w-12 h-12 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center p-1">
                <img src={p.imagen_url || 'https://via.placeholder.com/100'} className="max-w-full max-h-full object-contain mix-blend-multiply" alt="" />
            </div>
        </td>
        <td className="px-6 py-4 text-xs font-semibold text-gray-500 tracking-wider uppercase">{p.codigo}</td>
        <td className="px-6 py-4">
            <div className="text-sm font-bold text-gray-900 truncate max-w-[250px]">{p.nombre}</div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">{p.marca}</div>
        </td>
        <td className="px-6 py-4 font-semibold text-gray-900">S/. {p.precio}</td>
        <td className="px-6 py-4">
            {p.descuento ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                    -{p.descuento}%
                </span>
            ) : <span className="text-gray-300">-</span>}
        </td>
        <td className="px-6 py-4">
            <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${p.stock_actual > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm font-semibold text-gray-900">{p.stock_actual}</span>
                <span className="text-xs text-gray-400">/ {p.stock_anterior}</span>
            </div>
        </td>
        <td className="px-6 py-4 text-right">
            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(p)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit size={16} />
                </button>
                <button onClick={() => onDelete(p.codigo)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

  const [settings, setSettings] = useState({ 
    whatsapp_number: '',
    hero_slides: [],
    trending_gallery: []
  });

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

  const handleHeroImageUpload = async (index, file) => {
      if (!file) return;
      try {
          const res = await fetch(`${API_URL}/upload/presigned?fileName=${file.name}&fileType=${file.type}`);
          const { uploadUrl, publicUrl } = await res.json();
          await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          
          const newSlides = [...(settings.hero_slides || [])];
          newSlides[index].img = publicUrl;
          setSettings(prev => ({ ...prev, hero_slides: newSlides }));
          showNotification('Imagen subida con éxito', 'success');
      } catch(err) {
          showNotification('Error al subir imagen', 'error');
      }
  };

  const handleTrendingImageUpload = async (index, file) => {
      if (!file) return;
      try {
          const res = await fetch(`${API_URL}/upload/presigned?fileName=${file.name}&fileType=${file.type}`);
          const { uploadUrl, publicUrl } = await res.json();
          await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          
          const newGallery = [...(settings.trending_gallery || [])];
          newGallery[index].img = publicUrl;
          setSettings(prev => ({ ...prev, trending_gallery: newGallery }));
          showNotification('Imagen subida con éxito', 'success');
      } catch(err) {
          showNotification('Error al subir imagen', 'error');
      }
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
      codigo: '', nombre: '', marca: '', precio: 0, descuento: 0,
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
        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === id ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}
    >
        <Icon size={20} strokeWidth={activeTab === id ? 2 : 1.5} />
        {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-gray-900 selection:bg-black selection:text-white">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col fixed h-full z-20">
            <div className="p-8">
                <Link to="/" className="flex items-center gap-2.5">
                    <img src="/logo juschiri.jpeg" className="h-6" alt="Jus Chiri" />
                    <span className="text-xs font-bold tracking-[0.3em] uppercase opacity-40">Hub</span>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-1.5">
                <SidebarItem id="dashboard" label="Vista General" icon={LayoutDashboard} />
                <SidebarItem id="inventory" label="Inventario" icon={Package} />
                <SidebarItem id="sales" label="Ventas & Leads" icon={ShoppingCart} />
                
                <div className="mt-10 mb-2 px-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sistema</span>
                </div>
                <SidebarItem id="settings" label="Configuración" icon={Settings} />
            </nav>

            <div className="p-4 border-t border-gray-100">
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-700 shadow-sm">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-900 truncate">{user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{user?.role}</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-500 font-bold text-xs hover:bg-red-50 hover:text-red-600 transition-all group"
                >
                    <LogOut size={16} className="group-hover:scale-110 transition-transform" /> 
                    Cerrar Sesión
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-72 p-10 lg:p-14 min-h-screen">
            <header className="mb-12 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 capitalize">{activeTab === 'inventory' ? 'Inventario' : activeTab}</h2>
                    <p className="text-sm text-gray-500 mt-1.5 font-medium">
                        {activeTab === 'inventory' ? 'Gestiona tus productos, stock y precios.' : activeTab === 'dashboard' ? 'Resumen general de tu negocio.' : 'Configura los parámetros del sitio.'}
                    </p>
                </div>
                {activeTab === 'inventory' && (
                    <div className="flex gap-3">
                         <button onClick={fetchProducts} className="p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-900 hover:text-black text-gray-400 transition-all shadow-sm">
                            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
                        </button>
                        <button onClick={() => openModal()} className="bg-black text-white font-bold px-7 py-3 rounded-xl text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2">
                            <Plus size={18} /> Nuevo Producto
                        </button>
                    </div>
                )}
            </header>

            {/* TAB CONTENT */}
            {activeTab === 'dashboard' && <Dashboard />}
            
            {activeTab === 'sales' && <SalesList />}

            {activeTab === 'settings' && (
                <div className="space-y-8 pb-20">
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 max-w-2xl shadow-sm animate-fade-in">
                        <h3 className="text-xl font-bold mb-6 text-gray-900">Ajustes Generales</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">WhatsApp de Ventas</label>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        className="flex-1 p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none text-sm font-medium"
                                        placeholder="Ej: 51921385472"
                                        value={settings.whatsapp_number || ''}
                                        onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
                                    />
                                    <button 
                                        onClick={() => handleSaveSetting('whatsapp_number', settings.whatsapp_number)}
                                        className="bg-black text-white px-7 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/5"
                                    >
                                        Guardar
                                    </button>
                                </div>
                                <p className="mt-3 text-[11px] text-gray-400 font-medium">Incluye código de país sin el símbolo + (ej. 51 para Perú).</p>
                            </div>
                        </div>
                    </div>

                    {/* Hero Slider Editor */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-fade-in">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Hero Slider</h3>
                                <p className="text-sm text-gray-400 mt-1">Banners principales del inicio.</p>
                            </div>
                            <button 
                                onClick={() => handleSaveSetting('hero_slides', settings.hero_slides)}
                                className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/5"
                            >
                                Guardar Slides
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            {(!settings.hero_slides || settings.hero_slides.length === 0) && (
                                <p className="text-sm text-gray-400 italic py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">No hay slides personalizados configurados.</p>
                            )}
                            {(settings.hero_slides || []).map((slide, idx) => (
                                <div key={idx} className="border border-gray-100 rounded-2xl p-6 bg-gray-50/50 flex flex-col md:flex-row gap-6 relative group">
                                    <button 
                                        onClick={() => {
                                            const ns = [...settings.hero_slides];
                                            ns.splice(idx, 1);
                                            setSettings({...settings, hero_slides: ns});
                                        }}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                    
                                    <div className="w-full md:w-1/3 aspect-video bg-white rounded-xl border border-gray-200 relative group/img overflow-hidden flex items-center justify-center shadow-sm">
                                        {slide.img ? (
                                            <img src={slide.img} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <ImagePlus className="text-gray-300" size={32} />
                                        )}
                                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-bold uppercase tracking-widest">
                                            Cambiar Imagen
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleHeroImageUpload(idx, e.target.files[0])} />
                                        </label>
                                    </div>
                                    
                                    <div className="flex-1 space-y-3">
                                        <input placeholder="Título del Slide" className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-black transition-colors" value={slide.title} onChange={e => {
                                            const ns = [...settings.hero_slides]; ns[idx].title = e.target.value; setSettings({...settings, hero_slides: ns});
                                        }} />
                                        <input placeholder="Subtítulo / Categoría" className="w-full p-3 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-500 uppercase tracking-widest outline-none focus:border-black transition-colors" value={slide.subtitle} onChange={e => {
                                            const ns = [...settings.hero_slides]; ns[idx].subtitle = e.target.value; setSettings({...settings, hero_slides: ns});
                                        }} />
                                        <textarea placeholder="Descripción" className="w-full p-3 bg-white border border-gray-200 rounded-lg text-xs h-20 outline-none focus:border-black transition-colors" value={slide.desc} onChange={e => {
                                            const ns = [...settings.hero_slides]; ns[idx].desc = e.target.value; setSettings({...settings, hero_slides: ns});
                                        }} />
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Color Fondo</label>
                                                <input placeholder="bg-[#000000]" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-[11px] font-mono outline-none focus:border-black transition-colors" value={slide.color || ''} onChange={e => {
                                                    const ns = [...settings.hero_slides]; ns[idx].color = e.target.value; setSettings({...settings, hero_slides: ns});
                                                }} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Color Texto</label>
                                                <input placeholder="text-white" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-[11px] font-mono outline-none focus:border-black transition-colors" value={slide.textColor || ''} onChange={e => {
                                                    const ns = [...settings.hero_slides]; ns[idx].textColor = e.target.value; setSettings({...settings, hero_slides: ns});
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={() => {
                                    setSettings({
                                        ...settings, 
                                        hero_slides: [...(settings.hero_slides||[]), { title: '', subtitle: '', desc: '', img: '', color: 'bg-[#0f4c3a]', textColor: 'text-white', buttonColor: 'bg-white text-black' }]
                                    });
                                }}
                                className="w-full py-4 border border-dashed border-gray-300 rounded-2xl font-bold text-xs uppercase text-gray-400 hover:text-black hover:border-gray-900 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16}/> Añadir Nueva Diapositiva
                            </button>
                        </div>
                    </div>

                    {/* Trending Gallery Editor */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-fade-in">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Populares Ahora</h3>
                                <p className="text-sm text-gray-400 mt-1">Tarjetas de la sección trending.</p>
                            </div>
                            <button 
                                onClick={() => handleSaveSetting('trending_gallery', settings.trending_gallery)}
                                className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/5"
                            >
                                Guardar Galería
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(settings.trending_gallery || []).map((item, idx) => (
                                <div key={idx} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 relative group">
                                    <button 
                                        onClick={() => {
                                            const ng = [...settings.trending_gallery];
                                            ng.splice(idx, 1);
                                            setSettings({...settings, trending_gallery: ng});
                                        }}
                                        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={18}/>
                                    </button>
                                    
                                    <div className="aspect-[4/5] bg-white rounded-xl border border-gray-200 relative group/img overflow-hidden flex items-center justify-center mb-4 shadow-sm">
                                        {item.img ? (
                                            <img src={item.img} className="w-full h-full object-cover mix-blend-multiply p-4" alt="" />
                                        ) : (
                                            <ImagePlus className="text-gray-300" size={24} />
                                        )}
                                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-bold uppercase tracking-widest">
                                            Subir
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleTrendingImageUpload(idx, e.target.files[0])} />
                                        </label>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <input placeholder="Marca (ej: JORDAN)" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none focus:border-black" value={item.brand} onChange={e => {
                                            const ng = [...settings.trending_gallery]; ng[idx].brand = e.target.value.toUpperCase(); setSettings({...settings, trending_gallery: ng});
                                        }} />
                                        <input placeholder="Nombre del Producto" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none focus:border-black" value={item.name} onChange={e => {
                                            const ng = [...settings.trending_gallery]; ng[idx].name = e.target.value; setSettings({...settings, trending_gallery: ng});
                                        }} />
                                        <input placeholder="Color Fondo (bg-gray-100)" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-[10px] font-mono outline-none focus:border-black" value={item.color || ''} onChange={e => {
                                            const ng = [...settings.trending_gallery]; ng[idx].color = e.target.value; setSettings({...settings, trending_gallery: ng});
                                        }} />
                                    </div>
                                </div>
                            ))}
                            
                            <button 
                                onClick={() => {
                                    setSettings({
                                        ...settings, 
                                        trending_gallery: [...(settings.trending_gallery||[]), { brand: '', name: '', img: '', color: 'bg-gray-100' }]
                                    });
                                }}
                                className="border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-white hover:border-gray-900 hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-3 min-h-[300px] text-gray-400 hover:text-black"
                            >
                                <Plus size={24}/>
                                <span className="font-bold text-xs uppercase tracking-widest">Añadir Tarjeta</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-3.5 flex flex-col lg:flex-row gap-4 items-center shadow-sm">
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl w-full lg:w-96 border border-transparent focus-within:border-gray-200 focus-within:bg-white transition-all">
                            <Search className="text-gray-400" size={18} />
                            <input 
                                type="text" placeholder="Buscar por SKU o nombre..." 
                                className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-gray-400"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar w-full py-1">
                            <button 
                                onClick={() => { setActiveSection('Todos'); setCurrentPage(1); }}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${activeSection === 'Todos' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black hover:bg-gray-50'}`}
                            >
                                Todos
                            </button>
                            {allCategories.map(cat => (
                                <button 
                                    key={cat._id}
                                    onClick={() => { setActiveSection(cat._id); setCurrentPage(1); }}
                                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${activeSection === cat._id ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black hover:bg-gray-50'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Producto</th>
                                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">SKU</th>
                                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Detalle</th>
                                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Precio</th>
                                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Descuento</th>
                                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Stock</th>
                                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedProducts.map(p => (
                                        <ProductRow key={p._id} p={p} onEdit={openModal} onDelete={handleDelete} />
                                    ))}
                                    {loading && <tr><td colSpan="7" className="py-24 text-center"><Loader2 className="w-8 h-8 text-gray-200 animate-spin mx-auto" /></td></tr>}
                                    {!loading && paginatedProducts.length === 0 && <tr><td colSpan="7" className="py-24 text-center text-gray-400 font-medium italic">No se encontraron productos.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-white border-t border-gray-100 px-8 py-5 flex justify-between items-center">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-black disabled:opacity-30 transition-colors uppercase tracking-widest">
                                <ArrowLeft size={16} /> Anterior
                            </button>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Pág. {currentPage} / {totalPages || 1}</div>
                            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-black disabled:opacity-30 transition-colors uppercase tracking-widest">
                                Siguiente <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>

        {/* PRODUCT MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => !formLoading && setIsModalOpen(false)}></div>
                <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-scale-in border border-white/20">
                    {/* Header */}
                    <div className="px-10 py-7 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{currentProduct._id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-[0.15em] mt-1">Completa los detalles técnicos del item</p>
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(false)} 
                            disabled={formLoading} 
                            className="w-12 h-12 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all disabled:opacity-50"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Left Column: Media */}
                            <div className="lg:col-span-5 space-y-8">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4 ml-1">Imagen Principal</label>
                                    <div className="aspect-square bg-gray-50 rounded-3xl border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
                                        {currentProduct.imagen_url ? (
                                            <img src={currentProduct.imagen_url} className="w-full h-full object-contain mix-blend-multiply p-8 group-hover:scale-105 transition-transform duration-500" alt="" />
                                        ) : (
                                            <ImagePlus className="text-gray-200" size={64} />
                                        )}
                                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex flex-col items-center justify-center text-white p-6 text-center">
                                            <RefreshCw size={28} className="mb-3" />
                                            <span className="font-bold text-[10px] uppercase tracking-[0.2em]">Subir Foto</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={formLoading} />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4 ml-1">Galería Auxiliar</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(currentProduct.galeria || []).map((img, i) => (
                                            <div key={i} className="aspect-square rounded-2xl border border-gray-100 relative group bg-gray-50 overflow-hidden">
                                                <img src={img} className="w-full h-full object-cover mix-blend-multiply p-1" alt=""/>
                                                <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-2 right-2 bg-black/80 text-white w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={12}/>
                                                </button>
                                            </div>
                                        ))}
                                        <label className="aspect-square rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-black transition-all group/add">
                                            <Plus className="text-gray-300 group-hover/add:text-black" />
                                            <input type="file" multiple className="hidden" accept="image/*" onChange={handleGalleryUpload} disabled={formLoading} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Info */}
                            <div className="lg:col-span-7 space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">SKU</label>
                                        <input required className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none" value={currentProduct.codigo} onChange={e => setCurrentProduct({...currentProduct, codigo: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Marca</label>
                                        <input className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none" value={currentProduct.marca || ''} onChange={e => setCurrentProduct({...currentProduct, marca: e.target.value.toUpperCase()})} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Nombre</label>
                                    <input required className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none" value={currentProduct.nombre} onChange={e => setCurrentProduct({...currentProduct, nombre: e.target.value.toUpperCase()})} />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Precio</label>
                                        <input type="number" required className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm focus:bg-white focus:border-black transition-all outline-none" value={currentProduct.precio} onChange={e => setCurrentProduct({...currentProduct, precio: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1 text-red-500">Dscto %</label>
                                        <input type="number" min="0" max="100" className="w-full p-4 bg-red-50/30 border border-transparent rounded-2xl font-bold text-sm text-red-600 focus:bg-white focus:border-red-600 transition-all outline-none" value={currentProduct.descuento || 0} onChange={e => setCurrentProduct({...currentProduct, descuento: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Stock</label>
                                        <input type="number" required className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm focus:bg-white focus:border-black transition-all outline-none disabled:opacity-30" value={currentProduct.stock_actual} disabled={(currentProduct.variantes && currentProduct.variantes.length > 0)} onChange={e => setCurrentProduct({...currentProduct, stock_actual: Number(e.target.value)})} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2 ml-1">Categoría</label>
                                        <select 
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-[10px] uppercase outline-none focus:border-black"
                                            value={typeof currentProduct.category === 'object' ? currentProduct.category?._id : currentProduct.category || ""}
                                            onChange={e => setCurrentProduct({...currentProduct, category: e.target.value, type: '', subcategory: ''})}
                                        >
                                            <option value="">ELEGIR...</option>
                                            {allCategories.map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2 ml-1">Tipo</label>
                                        <select 
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-[10px] uppercase outline-none focus:border-black disabled:opacity-40"
                                            value={typeof currentProduct.type === 'object' ? currentProduct.type?._id : currentProduct.type || ""}
                                            onChange={e => setCurrentProduct({...currentProduct, type: e.target.value, subcategory: ''})}
                                            disabled={!currentProduct.category}
                                        >
                                            <option value="">ELEGIR...</option>
                                            {(allCategories.find(c => c._id === (typeof currentProduct.category === 'object' ? currentProduct.category._id : currentProduct.category))?.types || []).map(t => (
                                                <option key={t._id} value={t._id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2 ml-1">Subcat</label>
                                        <select 
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-[10px] uppercase outline-none focus:border-black disabled:opacity-40"
                                            value={typeof currentProduct.subcategory === 'object' ? currentProduct.subcategory?._id : currentProduct.subcategory || ""}
                                            onChange={e => setCurrentProduct({...currentProduct, subcategory: e.target.value})}
                                            disabled={!currentProduct.type}
                                        >
                                            <option value="">ELEGIR...</option>
                                            {(allCategories.find(c => c._id === (typeof currentProduct.category === 'object' ? currentProduct.category._id : currentProduct.category))
                                              ?.types?.find(t => t._id === (typeof currentProduct.type === 'object' ? currentProduct.type._id : currentProduct.type))
                                              ?.subcategories || []).map(sub => (
                                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* VARIANTES */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <h3 className="font-bold text-gray-900">Variantes</h3>
                                        <button type="button" onClick={addVariant} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-black hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                                            <Plus size={14} /> Añadir Variante
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {(currentProduct.variantes || []).map((v, i) => (
                                            <div key={i} className="flex gap-2 items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm animate-fade-in-up">
                                                <input type="text" placeholder="Talla" className="w-1/3 p-3 bg-gray-50 rounded-xl font-bold text-xs uppercase outline-none" value={v.talla || ''} onChange={e => updateVariant(i, 'talla', e.target.value)} />
                                                <input type="text" placeholder="Color" className="w-1/3 p-3 bg-gray-50 rounded-xl font-bold text-xs uppercase outline-none" value={v.color || ''} onChange={e => updateVariant(i, 'color', e.target.value)} />
                                                <input type="number" placeholder="Stock" className="w-1/4 p-3 bg-gray-50 rounded-xl font-bold text-xs outline-none" value={v.stock} onChange={e => updateVariant(i, 'stock', Number(e.target.value))} />
                                                <button type="button" onClick={() => removeVariant(i)} className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="px-10 py-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4.5 rounded-2xl font-bold text-sm text-gray-500 hover:bg-white hover:text-black transition-all border border-transparent hover:border-gray-200">Cancelar</button>
                        <button onClick={handleSave} disabled={formLoading} className="flex-[2.5] py-4.5 bg-black text-white rounded-[1.25rem] font-bold text-sm tracking-[0.1em] uppercase hover:bg-gray-800 transition-all shadow-xl shadow-black/20 flex justify-center items-center gap-3 disabled:opacity-50">
                            {formLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
                            {currentProduct._id ? 'Actualizar Producto' : 'Publicar Producto'}
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
