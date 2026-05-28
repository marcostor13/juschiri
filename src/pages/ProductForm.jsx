import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, ImagePlus, RefreshCw, Loader2, X, Star
} from 'lucide-react';
import { Notification } from '../components/ui';
import { tallaLabel } from './MastersManager';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const isVideo = (url) => url && /\.(mp4|webm|ogg|mov)$/i.test(url);

const EMPTY_PRODUCT = {
  nombre: '', marca: '',
  category: '', subcategory: '', designer: '',
  galeria: [], variantes: [],
};

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  const [tallas, setTallas] = useState([]);
  const [colores, setColores] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allDesigners, setAllDesigners] = useState([]);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3500);
  }, []);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [tallasRes, coloresRes, catRes, desRes] = await Promise.all([
          fetch(`${API_URL}/tallas`),
          fetch(`${API_URL}/colores`),
          fetch(`${API_URL}/categories`),
          fetch(`${API_URL}/categories/designers`),
        ]);
        setTallas(await tallasRes.json());
        setColores(await coloresRes.json());
        setAllCategories(await catRes.json());
        setAllDesigners(await desRes.json());
      } catch (err) {
        showNotification('Error cargando maestros', 'error');
      }
    };
    fetchMasters();
  }, [showNotification]);

  useEffect(() => {
    if (!isEditing) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/products/${id}`);
        if (!res.ok) throw new Error('Not found');
        const p = await res.json();
        const catId = p.category?._id || p.category || '';
        const subcatId = p.subcategory?._id || p.subcategory || '';
        const designerId = p.designer?._id || p.designer || '';
        setForm({
          nombre: p.nombre || '',
          marca: p.marca || '',
          category: catId,
          subcategory: subcatId,
          designer: designerId,
          galeria: p.galeria || [],
          variantes: (p.variantes || []).map(v => ({
            sku: v.sku || '',
            talla: v.talla || '',
            color: v.color || '',
            imagen: v.imagen || null,
            stock: v.stock || 0,
            precio: v.precio || 0,
            descuento: v.descuento || 0,
            esPrincipal: v.esPrincipal || false,
          })),
        });
      } catch (err) {
        showNotification('No se pudo cargar el producto', 'error');
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id, isEditing, showNotification]);

  // ── upload helpers ──────────────────────────────────────────────────────────

  const uploadFile = async (file) => {
    const res = await fetch(`${API_URL}/upload/presigned?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`);
    const { uploadUrl, publicUrl } = await res.json();
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    return publicUrl;
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setSaving(true);
    try {
      const urls = await Promise.all(files.map(uploadFile));
      setForm(prev => ({ ...prev, galeria: [...prev.galeria, ...urls] }));
      showNotification(`${files.length} imagen(es) añadida(s)`, 'success');
    } catch {
      showNotification('Error subiendo imágenes', 'error');
    }
    setSaving(false);
  };

  const removeGalleryImage = (idx) => {
    setForm(prev => {
      const next = [...prev.galeria];
      next.splice(idx, 1);
      return { ...prev, galeria: next };
    });
  };

  const handleVariantImageUpload = async (varIdx, file) => {
    if (!file) return;
    setSaving(true);
    try {
      const url = await uploadFile(file);
      updateVariant(varIdx, 'imagen', url);
      showNotification('Imagen subida', 'success');
    } catch {
      showNotification('Error subiendo imagen', 'error');
    }
    setSaving(false);
  };

  // ── variantes ───────────────────────────────────────────────────────────────

  const suggestSku = (nombre, talla, color) => {
    const parts = [nombre, talla, color].filter(Boolean).map(s =>
      s.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    );
    return parts.filter(Boolean).join('-');
  };

  const addVariant = () => {
    setForm(prev => ({
      ...prev,
      variantes: [...prev.variantes, { sku: '', talla: '', color: '', imagen: null, stock: 0, precio: 0, descuento: 0, esPrincipal: false }],
    }));
  };

  const updateVariant = (idx, field, value) => {
    setForm(prev => {
      const next = prev.variantes.map((v, i) => {
        if (i !== idx) return v;
        const numericFields = ['stock', 'precio', 'descuento'];
        const updated = { ...v, [field]: numericFields.includes(field) ? Number(value) : value };
        // auto-suggest SKU on talla/color change if SKU is still the auto value or empty
        if ((field === 'talla' || field === 'color') && !v._skuManual) {
          updated.sku = suggestSku(prev.nombre, field === 'talla' ? value : v.talla, field === 'color' ? value : v.color);
        }
        return updated;
      });
      return { ...prev, variantes: next };
    });
  };

  const setSkuManual = (idx, value) => {
    setForm(prev => {
      const next = prev.variantes.map((v, i) =>
        i === idx ? { ...v, sku: value, _skuManual: true } : v
      );
      return { ...prev, variantes: next };
    });
  };

  const setPrincipal = (idx) => {
    setForm(prev => ({
      ...prev,
      variantes: prev.variantes.map((v, i) => ({ ...v, esPrincipal: i === idx })),
    }));
  };

  const removeVariant = (idx) => {
    setForm(prev => {
      const next = prev.variantes.filter((_, i) => i !== idx);
      if (prev.variantes[idx]?.esPrincipal && next.length) next[0].esPrincipal = true;
      return { ...prev, variantes: next };
    });
  };

  // ── categoría encadenada ────────────────────────────────────────────────────

  const designerMap = {};
  for (const cat of allCategories) {
    if (cat.designer) {
      const did = cat.designer._id || cat.designer;
      if (!designerMap[did]) designerMap[did] = { _id: did, name: cat.designer.name || cat.designer };
    }
  }
  const designerOptions = Object.values(designerMap).sort((a, b) => a.name.localeCompare(b.name));
  const categoriesForDesigner = allCategories.filter(c => {
    const did = (c.designer?._id || c.designer || '').toString();
    return did === form.designer;
  });
  const subcatsForCategory = allCategories.find(c => c._id === form.category)?.subcategories || [];

  // ── submit ──────────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombre?.trim()) return showNotification('El nombre es requerido', 'error');
    if (form.variantes.some(v => !v.sku?.trim())) return showNotification('Todas las variantes deben tener SKU', 'error');
    if (form.variantes.some(v => !v.precio || v.precio <= 0)) return showNotification('Todas las variantes deben tener precio', 'error');

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        nombre: form.nombre.toUpperCase(),
        marca: (form.marca || '').toUpperCase(),
        category: form.category || null,
        subcategory: form.subcategory || null,
        galeria: form.galeria,
        variantes: form.variantes.map(v => ({
          sku: v.sku.toUpperCase(),
          talla: v.talla,
          color: v.color,
          imagen: v.imagen || null,
          stock: Number(v.stock) || 0,
          precio: Number(v.precio) || 0,
          descuento: Number(v.descuento) || 0,
          esPrincipal: v.esPrincipal || false,
        })),
      };

      const url = isEditing ? `${API_URL}/products/${id}` : `${API_URL}/products`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotification(isEditing ? 'Producto actualizado' : 'Producto creado', 'success');
        setTimeout(() => navigate('/admin'), 800);
      } else {
        const err = await res.json();
        showNotification(`Error: ${err.error}`, 'error');
      }
    } catch {
      showNotification('Error al guardar', 'error');
    }
    setSaving(false);
  };

  // ── UI ──────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 selection:bg-black selection:text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight">
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            </h1>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">
              {isEditing ? `ID: ${id}` : 'Completa todos los campos requeridos'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-black text-white font-bold px-8 py-3 rounded-xl text-sm uppercase tracking-wider hover:bg-gray-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isEditing ? 'Actualizar' : 'Publicar'}
        </button>
      </header>

      <form onSubmit={handleSave} className="max-w-6xl mx-auto p-8 lg:p-12 space-y-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Columna izquierda: datos básicos + clasificación ──────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Datos básicos */}
            <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-4">Datos del Producto</h2>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Nombre</label>
                <input
                  required
                  className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value.toUpperCase() }))}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Marca</label>
                <input
                  className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none"
                  value={form.marca}
                  onChange={e => setForm(f => ({ ...f, marca: e.target.value.toUpperCase() }))}
                />
              </div>

            </section>

            {/* Clasificación */}
            <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-4">Clasificación</h2>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Diseñador</label>
                <select
                  className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none"
                  value={form.designer}
                  onChange={e => setForm(f => ({ ...f, designer: e.target.value, category: '', subcategory: '' }))}
                >
                  <option value="">SELECCIONAR...</option>
                  {designerOptions.map(d => (
                    <option key={d._id} value={d._id}>{d.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Categoría</label>
                  <select
                    className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none disabled:opacity-40"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}
                    disabled={!form.designer}
                  >
                    <option value="">SELECCIONAR...</option>
                    {categoriesForDesigner.map(c => (
                      <option key={c._id} value={c._id}>{c.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Subcategoría</label>
                  <select
                    className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none disabled:opacity-40"
                    value={form.subcategory}
                    onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                    disabled={!form.category}
                  >
                    <option value="">SELECCIONAR...</option>
                    {subcatsForCategory.map(s => (
                      <option key={s._id} value={s._id}>{s.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Variantes */}
            <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Variantes</h2>
                <button
                  type="button" onClick={addVariant}
                  className="flex items-center gap-2 bg-black text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider hover:bg-gray-800 transition-all"
                >
                  <Plus size={14} /> Añadir Variante
                </button>
              </div>

              {form.variantes.length === 0 && (
                <p className="text-center text-sm text-gray-400 italic py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  Sin variantes. Cada combinación de talla/color es una variante con su propio SKU y stock.
                </p>
              )}

              <div className="space-y-3">
                {form.variantes.map((v, idx) => (
                  <div key={idx} className="border-2 border-gray-100 rounded-2xl p-4 space-y-3 hover:border-gray-200 transition-colors">
                    {/* Fila 1: imagen + principal + eliminar */}
                    <div className="flex items-center gap-3">
                      <label className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-xl border-2 border-gray-100 flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-gray-300 transition-colors">
                        {v.imagen ? (
                          <img src={v.imagen} className="w-full h-full object-cover mix-blend-multiply" alt="" />
                        ) : (
                          <ImagePlus size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                        )}
                        <input
                          type="file" className="hidden" accept="image/*"
                          onChange={e => handleVariantImageUpload(idx, e.target.files[0])}
                          disabled={saving}
                        />
                      </label>

                      <div className="flex-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPrincipal(idx)}
                          title={v.esPrincipal ? 'Imagen principal' : 'Marcar como imagen principal'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex-shrink-0 ${v.esPrincipal ? 'bg-[#CCFF00] border-[#CCFF00] text-black' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'}`}
                        >
                          <Star size={12} fill={v.esPrincipal ? 'currentColor' : 'none'} />
                          {v.esPrincipal ? 'PRINCIPAL' : 'PORTADA'}
                        </button>
                      </div>

                      <button
                        type="button" onClick={() => removeVariant(idx)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Fila 2: talla + color */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Talla</label>
                        <select
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-black transition-colors"
                          value={v.talla}
                          onChange={e => updateVariant(idx, 'talla', e.target.value)}
                        >
                          <option value="">SIN TALLA</option>
                          {tallas.map(t => {
                            const label = tallaLabel(t);
                            return <option key={t._id} value={label}>{label.toUpperCase()}</option>;
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Color</label>
                        <select
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-black transition-colors"
                          value={v.color}
                          onChange={e => updateVariant(idx, 'color', e.target.value)}
                        >
                          <option value="">SIN COLOR</option>
                          {colores.map(c => (
                            <option key={c._id} value={c.nombre}>{c.nombre.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Fila 3: precio + descuento */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Precio S/.</label>
                        <input
                          type="number" min="0" step="0.01" required
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-black focus:bg-white transition-colors"
                          value={v.precio}
                          onChange={e => updateVariant(idx, 'precio', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1.5">Descuento %</label>
                        <input
                          type="number" min="0" max="100"
                          className="w-full p-2.5 bg-red-50/30 border border-gray-200 rounded-xl font-mono font-bold text-xs text-red-600 outline-none focus:border-red-300 focus:bg-white transition-colors"
                          value={v.descuento}
                          onChange={e => updateVariant(idx, 'descuento', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Fila 4: SKU + stock */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">SKU</label>
                        <input
                          type="text" required
                          placeholder="Auto-generado, editable"
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-xs uppercase outline-none focus:border-black focus:bg-white transition-colors"
                          value={v.sku}
                          onChange={e => setSkuManual(idx, e.target.value.toUpperCase())}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Stock</label>
                        <input
                          type="number" min="0"
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-black focus:bg-white transition-colors"
                          value={v.stock}
                          onChange={e => updateVariant(idx, 'stock', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {form.variantes.length > 0 && (
                <div className="pt-2 border-t border-gray-100 flex justify-between text-xs font-mono text-gray-500">
                  <span>{form.variantes.length} variante(s)</span>
                  <span>Stock total: <strong>{form.variantes.reduce((s, v) => s + (Number(v.stock) || 0), 0)}</strong></span>
                </div>
              )}
            </section>
          </div>

          {/* ── Columna derecha: galería ──────────────────────────────────────── */}
          <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-4">Galería Adicional</h2>
              <p className="text-[11px] text-gray-400">Estas fotos aparecen en la galería del producto en la tienda.</p>

              <div className="grid grid-cols-2 gap-3">
                {form.galeria.map((img, i) => (
                  <div key={i} className="aspect-square rounded-2xl border border-gray-100 relative group bg-gray-50 overflow-hidden">
                    {isVideo(img) ? (
                      <video src={img} autoPlay loop muted playsInline className="w-full h-full object-cover p-1" />
                    ) : (
                      <img src={img} className="w-full h-full object-cover mix-blend-multiply p-1" alt="" />
                    )}
                    <button
                      type="button" onClick={() => removeGalleryImage(i)}
                      className="absolute top-2 right-2 bg-black/80 text-white w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-black transition-all group">
                  <Plus className="text-gray-300 group-hover:text-black transition-colors" size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 group-hover:text-black mt-2 transition-colors">Añadir</span>
                  <input type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleGalleryUpload} disabled={saving} />
                </label>
              </div>

              {form.galeria.length > 0 && (
                <p className="text-[10px] font-mono text-gray-400 text-right">{form.galeria.length} foto(s)</p>
              )}
            </section>

            {/* Resumen stock */}
            <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Resumen</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Variantes</span>
                  <span className="font-mono font-bold">{form.variantes.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stock total</span>
                  <span className="font-mono font-bold">{form.variantes.reduce((s, v) => s + (Number(v.stock) || 0), 0)}</span>
                </div>
                {(() => {
                  const precios = form.variantes
                    .filter(v => Number(v.precio) > 0)
                    .map(v => {
                      const p = Number(v.precio);
                      const d = Number(v.descuento) || 0;
                      return d > 0 ? p * (1 - d / 100) : p;
                    });
                  const minP = precios.length ? Math.min(...precios) : null;
                  const maxP = precios.length ? Math.max(...precios) : null;
                  return minP !== null ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Precio{minP !== maxP ? ' desde' : ''}</span>
                      <span className="font-mono font-bold">S/. {minP.toLocaleString()}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            </section>
          </div>
        </div>

        {/* Footer save */}
        <div className="flex gap-4 pt-4">
          <Link
            to="/admin"
            className="flex-1 py-4 text-center rounded-2xl font-bold text-sm text-gray-500 hover:bg-white hover:text-black transition-all border border-transparent hover:border-gray-200"
          >
            Cancelar
          </Link>
          <button
            type="submit" disabled={saving}
            className="flex-[3] py-4 bg-black text-white rounded-2xl font-bold text-sm uppercase tracking-[0.1em] hover:bg-gray-800 transition-all shadow-xl shadow-black/20 flex justify-center items-center gap-3 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isEditing ? 'Actualizar Producto' : 'Publicar Producto'}
          </button>
        </div>
      </form>

      {notification.show && (
        <Notification type={notification.type} message={notification.message} onClose={() => setNotification(n => ({ ...n, show: false }))} />
      )}
    </div>
  );
}
