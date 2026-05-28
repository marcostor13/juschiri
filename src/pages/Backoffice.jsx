import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  RefreshCw, Plus, Edit, Trash2, Search,
  SlidersHorizontal, Loader2, ArrowLeft, ArrowRight, LayoutDashboard,
  Package, ShoppingCart, LogOut, Settings,
  Tag, Database, Download, Layers
} from 'lucide-react';
import { ConfirmModal, Notification } from '../components/ui';

import Dashboard from './Dashboard';
import SalesList from './SalesList';
import CategoriesManager from './CategoriesManager';
import MastersManager from './MastersManager';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ProductRow = React.memo(({ p, onEdit, onDelete }) => (
  <tr className="hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0 group">
    <td className="px-6 py-4">
      <div className="w-12 h-12 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center p-1">
        <img src={p.imagen_url || 'https://via.placeholder.com/100'} className="max-w-full max-h-full object-contain mix-blend-multiply" alt="" />
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="text-sm font-bold text-gray-900 truncate max-w-[280px]">{p.nombre}</div>
      <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">{p.marca}</div>
    </td>
    <td className="px-6 py-4 font-mono font-semibold text-gray-900">S/. {p.precio_min?.toLocaleString()}</td>
    <td className="px-6 py-4">
      {p.tiene_oferta ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">OFERTA</span>
      ) : <span className="text-gray-300">—</span>}
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${p.stock_actual > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span className="text-sm font-mono font-semibold text-gray-900">{p.stock_actual}</span>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className="text-sm font-mono text-gray-500">{p.variantes?.length || 0} var.</span>
    </td>
    <td className="px-6 py-4 text-right">
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(p)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
          <Edit size={16} />
        </button>
        <button onClick={() => onDelete(p._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
    whatsapp_number: '', announcement_text: '', hero_slides: [], trending_gallery: []
  });

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(r => r.json())
      .then(data => setSettings(prev => ({ ...prev, ...data })))
      .catch(console.error);
  }, []);

  const handleSaveSetting = async (key, value) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        showNotification('Configuración guardada', 'success');
        setSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch { showNotification('Error al guardar', 'error'); }
  };

  const uploadPresigned = async (file) => {
    const res = await fetch(`${API_URL}/upload/presigned?fileName=${file.name}&fileType=${file.type}`);
    const { uploadUrl, publicUrl } = await res.json();
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    return publicUrl;
  };

  const handleHeroImageUpload = async (index, file) => {
    if (!file) return;
    try {
      const publicUrl = await uploadPresigned(file);
      const newSlides = [...(settings.hero_slides || [])];
      newSlides[index].img = publicUrl;
      setSettings(prev => ({ ...prev, hero_slides: newSlides }));
      showNotification('Imagen subida con éxito', 'success');
    } catch { showNotification('Error al subir imagen', 'error'); }
  };

  const handleTrendingImageUpload = async (index, file) => {
    if (!file) return;
    try {
      const publicUrl = await uploadPresigned(file);
      const newGallery = [...(settings.trending_gallery || [])];
      newGallery[index].img = publicUrl;
      setSettings(prev => ({ ...prev, trending_gallery: newGallery }));
      showNotification('Imagen subida con éxito', 'success');
    } catch { showNotification('Error al subir imagen', 'error'); }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token) navigate('/login');
    else setUser(JSON.parse(storedUser));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Inventory state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [allCategories, setAllCategories] = useState([]);

  // Backup & tools
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupHistory, setBackupHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('juschiri_backup_history') || '[]'); } catch { return []; }
  });
  const [showDeleteZeroConfirm, setShowDeleteZeroConfirm] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_URL}/products?limit=2500`),
        fetch(`${API_URL}/categories`),
      ]);
      const data = await prodRes.json();
      const catData = await catRes.json();
      setProducts(data.products || []);
      setAllCategories(catData || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const filteredProducts = useMemo(() => products.filter(p => {
    if (activeSection !== 'Todos' && p.category?._id !== activeSection) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return `${p.nombre || ''} ${p.marca || ''}`.toLowerCase().includes(q);
    }
    return true;
  }), [products, activeSection, searchQuery]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleEdit = (p) => navigate(`/admin/producto/${p._id}/editar`);
  const handleDelete = (id) => setItemToDelete(id);

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/products/${itemToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProducts(products.filter(p => p._id !== itemToDelete));
        showNotification('Producto eliminado', 'success');
      } else {
        showNotification('Error al eliminar producto', 'error');
      }
    } catch { showNotification('Error de conexión', 'error'); }
    setItemToDelete(null);
  };

  const createBackup = async () => {
    setBackupLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/backup`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { showNotification('Error al crear backup', 'error'); setBackupLoading(false); return; }
      const data = await res.json();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `juschiri-backup-${timestamp}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      const record = { id: Date.now(), filename, createdAt: new Date().toISOString(), counts: data.counts };
      const next = [record, ...backupHistory];
      setBackupHistory(next);
      localStorage.setItem('juschiri_backup_history', JSON.stringify(next));
      showNotification('Backup creado y descargado', 'success');
    } catch { showNotification('Error al crear backup', 'error'); }
    setBackupLoading(false);
  };

  const executeDeleteZeroStock = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/products/zero-stock`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { deleted } = await res.json();
        showNotification(`${deleted} productos eliminados`, 'success');
        await fetchProducts();
      } else {
        showNotification('Error al eliminar productos', 'error');
      }
    } catch { showNotification('Error de conexión', 'error'); }
    setShowDeleteZeroConfirm(false);
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

  const tabTitle = {
    inventory: 'Inventario',
    categories: 'Categorías',
    masters: 'Maestros',
    tools: 'Herramientas',
    dashboard: 'Vista General',
    sales: 'Ventas & Leads',
    settings: 'Configuración',
  };

  const tabSubtitle = {
    inventory: 'Gestiona tus productos, stock y precios.',
    categories: 'Administra diseñadores, categorías y subcategorías.',
    masters: 'Maestro de tallas y colores disponibles.',
    tools: 'Backups y mantenimiento de la base de datos.',
    dashboard: 'Resumen general de tu negocio.',
    sales: '',
    settings: 'Configura los parámetros del sitio.',
  };

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
          <SidebarItem id="categories" label="Categorías" icon={Tag} />
          <SidebarItem id="masters" label="Maestros" icon={Layers} />
          <div className="mt-10 mb-2 px-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sistema</span>
          </div>
          <SidebarItem id="settings" label="Configuración" icon={Settings} />
          <SidebarItem id="tools" label="Herramientas" icon={Database} />
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

      {/* Main */}
      <main className="flex-1 ml-72 p-10 lg:p-14 min-h-screen">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">{tabTitle[activeTab]}</h2>
            <p className="text-sm text-gray-500 mt-1.5 font-medium">{tabSubtitle[activeTab]}</p>
          </div>
          {activeTab === 'inventory' && (
            <div className="flex gap-3">
              <button onClick={fetchProducts} className="p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-900 hover:text-black text-gray-400 transition-all shadow-sm">
                <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
              </button>
              <button
                onClick={() => navigate('/admin/producto/nuevo')}
                className="bg-black text-white font-bold px-7 py-3 rounded-xl text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2"
              >
                <Plus size={18} /> Nuevo Producto
              </button>
            </div>
          )}
        </header>

        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'sales' && <SalesList />}
        {activeTab === 'categories' && <CategoriesManager showNotification={showNotification} />}
        {activeTab === 'masters' && <MastersManager showNotification={showNotification} />}

        {activeTab === 'tools' && (
          <div className="space-y-8 pb-20 animate-fade-in">
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Backup de Base de Datos</h3>
                  <p className="text-sm text-gray-400 mt-1">Descarga una copia completa de productos, categorías y ventas.</p>
                </div>
                <button onClick={createBackup} disabled={backupLoading} className="flex items-center gap-2 bg-black text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50">
                  {backupLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Crear Backup
                </button>
              </div>
              {backupHistory.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">No hay backups registrados en este dispositivo.</p>
              ) : (
                <div className="space-y-2">
                  {backupHistory.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl group">
                      <div>
                        <p className="text-sm font-bold text-gray-900 font-mono">{b.filename}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono uppercase tracking-wider">
                          {new Date(b.createdAt).toLocaleString('es-PE')}
                          {b.counts && ` · ${b.counts.products} productos`}
                        </p>
                      </div>
                      <button onClick={() => { const next = backupHistory.filter(x => x.id !== b.id); setBackupHistory(next); localStorage.setItem('juschiri_backup_history', JSON.stringify(next)); }} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Limpieza de Inventario</h3>
                  <p className="text-sm text-gray-400 mt-1">Elimina permanentemente todos los productos con stock 0.</p>
                  <p className="text-2xl font-black font-mono mt-4 text-gray-900">
                    {loading ? '...' : products.filter(p => p.stock_actual === 0).length}
                    <span className="text-sm font-normal text-gray-400 ml-2">productos con stock 0</span>
                  </p>
                </div>
                <button onClick={() => setShowDeleteZeroConfirm(true)} disabled={products.filter(p => p.stock_actual === 0).length === 0 || loading} className="flex items-center gap-2 bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-red-700 transition-all disabled:opacity-40">
                  <Trash2 size={16} /> Eliminar Sin Stock
                </button>
              </div>
              <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs text-red-500 font-medium">Esta acción es irreversible. Crea un backup antes de proceder.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 pb-20">
            {/* WhatsApp */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 max-w-2xl shadow-sm animate-fade-in">
              <h3 className="text-xl font-bold mb-6 text-gray-900">Ajustes Generales</h3>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">WhatsApp de Ventas</label>
                <div className="flex gap-3">
                  <input type="text" className="flex-1 p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none text-sm font-medium" placeholder="Ej: 51921385472" value={settings.whatsapp_number || ''} onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })} />
                  <button onClick={() => handleSaveSetting('whatsapp_number', settings.whatsapp_number)} className="bg-black text-white px-7 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all">Guardar</button>
                </div>
              </div>
            </div>

            {/* Announcement */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-fade-in">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Barra de Anuncios</h3>
                  <p className="text-sm text-gray-400 mt-1">Texto rotativo en la parte superior de la tienda.</p>
                </div>
                <button onClick={() => handleSaveSetting('announcement_text', settings.announcement_text)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all">Guardar Texto</button>
              </div>
              <input placeholder="• ENVÍOS GRATIS +S/.500 • SOLO ORIGINALES •" className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm focus:bg-white focus:border-black transition-all outline-none" value={settings.announcement_text || ''} onChange={e => setSettings({ ...settings, announcement_text: e.target.value })} />
            </div>

            {/* Hero Slider */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-fade-in">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Hero Slider</h3>
                  <p className="text-sm text-gray-400 mt-1">Banners principales del inicio.</p>
                </div>
                <button onClick={() => handleSaveSetting('hero_slides', settings.hero_slides)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all">Guardar Slides</button>
              </div>
              <div className="space-y-6">
                {(!settings.hero_slides || settings.hero_slides.length === 0) && (
                  <p className="text-sm text-gray-400 italic py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">No hay slides personalizados.</p>
                )}
                {(settings.hero_slides || []).map((slide, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-2xl p-6 bg-gray-50/50 flex flex-col md:flex-row gap-6 relative group">
                    <button onClick={() => { const ns = [...settings.hero_slides]; ns.splice(idx, 1); setSettings({ ...settings, hero_slides: ns }); }} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                    <div className="w-full md:w-1/3 aspect-video bg-white rounded-xl border border-gray-200 relative group/img overflow-hidden flex items-center justify-center shadow-sm">
                      {slide.img ? <img src={slide.img} className="w-full h-full object-cover" alt="" /> : <span className="text-gray-300 text-sm">Sin imagen</span>}
                      <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-bold uppercase tracking-widest">
                        Cambiar
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleHeroImageUpload(idx, e.target.files[0])} />
                      </label>
                    </div>
                    <div className="flex-1 space-y-3">
                      <input placeholder="Título" className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-black" value={slide.title} onChange={e => { const ns = [...settings.hero_slides]; ns[idx].title = e.target.value; setSettings({ ...settings, hero_slides: ns }); }} />
                      <input placeholder="Subtítulo" className="w-full p-3 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-500 uppercase tracking-widest outline-none focus:border-black" value={slide.subtitle} onChange={e => { const ns = [...settings.hero_slides]; ns[idx].subtitle = e.target.value; setSettings({ ...settings, hero_slides: ns }); }} />
                      <textarea placeholder="Descripción" className="w-full p-3 bg-white border border-gray-200 rounded-lg text-xs h-20 outline-none focus:border-black" value={slide.desc} onChange={e => { const ns = [...settings.hero_slides]; ns[idx].desc = e.target.value; setSettings({ ...settings, hero_slides: ns }); }} />
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Color Fondo</label>
                          <div className="flex items-center gap-2">
                            <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 p-0" value={slide.color?.startsWith('#') ? slide.color : '#000000'} onChange={e => { const ns = [...settings.hero_slides]; ns[idx].color = e.target.value; setSettings({ ...settings, hero_slides: ns }); }} />
                            <input placeholder="#000000" className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-[11px] font-mono outline-none focus:border-black" value={slide.color || ''} onChange={e => { const ns = [...settings.hero_slides]; ns[idx].color = e.target.value; setSettings({ ...settings, hero_slides: ns }); }} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Color Texto</label>
                          <div className="flex items-center gap-2">
                            <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 p-0" value={slide.textColor?.startsWith('#') ? slide.textColor : '#ffffff'} onChange={e => { const ns = [...settings.hero_slides]; ns[idx].textColor = e.target.value; setSettings({ ...settings, hero_slides: ns }); }} />
                            <input placeholder="#ffffff" className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-[11px] font-mono outline-none focus:border-black" value={slide.textColor || ''} onChange={e => { const ns = [...settings.hero_slides]; ns[idx].textColor = e.target.value; setSettings({ ...settings, hero_slides: ns }); }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setSettings({ ...settings, hero_slides: [...(settings.hero_slides || []), { title: '', subtitle: '', desc: '', img: '', color: '#0f4c3a', textColor: '#ffffff', buttonColor: 'bg-white text-black' }] })} className="w-full py-4 border border-dashed border-gray-300 rounded-2xl font-bold text-xs uppercase text-gray-400 hover:text-black hover:border-gray-900 transition-all flex items-center justify-center gap-2">
                  <Plus size={16} /> Añadir Diapositiva
                </button>
              </div>
            </div>

            {/* Trending Gallery */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-fade-in">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Populares Ahora</h3>
                  <p className="text-sm text-gray-400 mt-1">Tarjetas de la sección trending.</p>
                </div>
                <button onClick={() => handleSaveSetting('trending_gallery', settings.trending_gallery)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all">Guardar Galería</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(settings.trending_gallery || []).map((item, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 relative group">
                    <button onClick={() => { const ng = [...settings.trending_gallery]; ng.splice(idx, 1); setSettings({ ...settings, trending_gallery: ng }); }} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={18} />
                    </button>
                    <div className="aspect-[4/5] bg-white rounded-xl border border-gray-200 relative group/img overflow-hidden flex items-center justify-center mb-4 shadow-sm">
                      {item.img ? <img src={item.img} className="w-full h-full object-cover mix-blend-multiply p-4" alt="" /> : <span className="text-gray-300 text-xs">Sin imagen</span>}
                      <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-bold uppercase tracking-widest">
                        Subir
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleTrendingImageUpload(idx, e.target.files[0])} />
                      </label>
                    </div>
                    <div className="space-y-3">
                      <input placeholder="Marca (ej: JORDAN)" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none focus:border-black" value={item.brand} onChange={e => { const ng = [...settings.trending_gallery]; ng[idx].brand = e.target.value.toUpperCase(); setSettings({ ...settings, trending_gallery: ng }); }} />
                      <input placeholder="Nombre del Producto" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none focus:border-black" value={item.name} onChange={e => { const ng = [...settings.trending_gallery]; ng[idx].name = e.target.value; setSettings({ ...settings, trending_gallery: ng }); }} />
                      <div className="flex items-center gap-2">
                        <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 p-0" value={item.color?.startsWith('#') ? item.color : '#f3f4f6'} onChange={e => { const ng = [...settings.trending_gallery]; ng[idx].color = e.target.value; setSettings({ ...settings, trending_gallery: ng }); }} />
                        <input placeholder="Fondo (#f3f4f6)" className="flex-1 p-2.5 bg-white border border-gray-200 rounded-lg text-[10px] font-mono outline-none focus:border-black" value={item.color || ''} onChange={e => { const ng = [...settings.trending_gallery]; ng[idx].color = e.target.value; setSettings({ ...settings, trending_gallery: ng }); }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setSettings({ ...settings, trending_gallery: [...(settings.trending_gallery || []), { brand: '', name: '', img: '', color: '#f3f4f6' }] })} className="border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-white hover:border-gray-900 hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-3 min-h-[300px] text-gray-400 hover:text-black">
                  <Plus size={24} />
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
                  type="text" placeholder="Buscar por nombre o marca..."
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
                  TODOS
                </button>
                {allCategories.map(cat => (
                  <button
                    key={cat._id}
                    onClick={() => { setActiveSection(cat._id); setCurrentPage(1); }}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${activeSection === cat._id ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black hover:bg-gray-50'}`}
                  >
                    {cat.name.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Imagen</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Producto</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Precio</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Oferta</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Stock</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Variantes</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedProducts.map(p => (
                      <ProductRow key={p._id} p={p} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                    {loading && <tr><td colSpan="7" className="py-24 text-center"><Loader2 className="w-8 h-8 text-gray-200 animate-spin mx-auto" /></td></tr>}
                    {!loading && paginatedProducts.length === 0 && <tr><td colSpan="7" className="py-24 text-center text-gray-400 font-medium italic">No se encontraron productos.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="bg-white border-t border-gray-100 px-8 py-5 flex justify-between items-center">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-black disabled:opacity-30 transition-colors uppercase tracking-widest">
                  <ArrowLeft size={16} /> Anterior
                </button>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Pág. {currentPage} / {totalPages || 1}</div>
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-black disabled:opacity-30 transition-colors uppercase tracking-widest">
                  Siguiente <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={showDeleteZeroConfirm}
        title="Eliminar productos sin stock"
        message={`¿Eliminar ${products.filter(p => p.stock_actual === 0).length} productos con stock 0? Esta acción es irreversible.`}
        confirmText="Sí, Eliminar"
        onConfirm={executeDeleteZeroStock}
        onCancel={() => setShowDeleteZeroConfirm(false)}
      />
      <ConfirmModal
        isOpen={itemToDelete !== null}
        title="Eliminar Producto"
        message="¿Eliminar este producto? Esta acción es irreversible."
        confirmText="Sí, Eliminar"
        onConfirm={executeDelete}
        onCancel={() => setItemToDelete(null)}
      />
      {notification.show && (
        <Notification type={notification.type} message={notification.message} onClose={() => setNotification(n => ({ ...n, show: false }))} />
      )}
    </div>
  );
}
