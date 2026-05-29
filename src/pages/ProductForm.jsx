import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, ImagePlus, Loader2, X, Star
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

const emptyTalla = () => ({ talla: '', sku: '', stock: 0, precio: 0, descuento: 0 });
const emptyColorGroup = (esPrincipal = false) => ({ color: '', imagenes: [], esPrincipal, tallas: [emptyTalla()] });

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

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3500);
  }, []);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [tallasRes, coloresRes, catRes] = await Promise.all([
          fetch(`${API_URL}/tallas`),
          fetch(`${API_URL}/colores`),
          fetch(`${API_URL}/categories`),
        ]);
        setTallas(await tallasRes.json());
        setColores(await coloresRes.json());
        setAllCategories(await catRes.json());
      } catch {
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
        setForm({
          nombre: p.nombre || '',
          marca: p.marca || '',
          category: p.category?._id || p.category || '',
          subcategory: p.subcategory?._id || p.subcategory || '',
          designer: p.designer?._id || p.designer || '',
          galeria: p.galeria || [],
          variantes: (p.variantes || []).map(v => ({
            color: v.color || '',
            imagenes: v.imagenes || [],
            esPrincipal: v.esPrincipal || false,
            tallas: (v.tallas || []).map(t => ({
              talla: t.talla || '',
              sku: t.sku || '',
              stock: t.stock || 0,
              precio: t.precio || 0,
              descuento: t.descuento || 0,
            })),
          })),
        });
      } catch {
        showNotification('No se pudo cargar el producto', 'error');
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id, isEditing, showNotification]);

  // ── upload helpers ────────────────────────────────────────────────────────────

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
    setForm(prev => { const next = [...prev.galeria]; next.splice(idx, 1); return { ...prev, galeria: next }; });
  };

  const handleColorImagesUpload = async (varIdx, files) => {
    const fileArr = Array.from(files || []);
    if (!fileArr.length) return;
    setSaving(true);
    try {
      const urls = await Promise.all(fileArr.map(uploadFile));
      setForm(prev => ({
        ...prev,
        variantes: prev.variantes.map((v, i) =>
          i !== varIdx ? v : { ...v, imagenes: [...v.imagenes, ...urls] }
        ),
      }));
      showNotification(`${urls.length} imagen(es) subida(s)`, 'success');
    } catch {
      showNotification('Error subiendo imagen', 'error');
    }
    setSaving(false);
  };

  const removeColorImage = (varIdx, imgIdx) => {
    setForm(prev => ({
      ...prev,
      variantes: prev.variantes.map((v, i) => {
        if (i !== varIdx) return v;
        const next = [...v.imagenes];
        next.splice(imgIdx, 1);
        return { ...v, imagenes: next };
      }),
    }));
  };

  // ── SKU auto-suggest ─────────────────────────────────────────────────────────

  const suggestSku = (nombre, talla, color) => {
    const parts = [nombre, talla, color].filter(Boolean).map(s =>
      s.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    );
    return parts.filter(Boolean).join('-');
  };

  // ── color group helpers ──────────────────────────────────────────────────────

  const addColorGroup = () => {
    setForm(prev => ({
      ...prev,
      variantes: [...prev.variantes, emptyColorGroup(prev.variantes.length === 0)],
    }));
  };

  const removeColorGroup = (varIdx) => {
    setForm(prev => {
      const next = prev.variantes.filter((_, i) => i !== varIdx);
      if (prev.variantes[varIdx]?.esPrincipal && next.length) next[0].esPrincipal = true;
      return { ...prev, variantes: next };
    });
  };

  const setPrincipalColor = (varIdx) => {
    setForm(prev => ({
      ...prev,
      variantes: prev.variantes.map((v, i) => ({ ...v, esPrincipal: i === varIdx })),
    }));
  };

  const updateColorGroup = (varIdx, field, value) => {
    setForm(prev => ({
      ...prev,
      variantes: prev.variantes.map((v, i) => {
        if (i !== varIdx) return v;
        const updated = { ...v, [field]: value };
        if (field === 'color') {
          updated.tallas = v.tallas.map(t =>
            t._skuManual ? t : { ...t, sku: suggestSku(prev.nombre, t.talla, value) }
          );
        }
        return updated;
      }),
    }));
  };

  // ── talla helpers ────────────────────────────────────────────────────────────

  const addTalla = (varIdx) => {
    setForm(prev => ({
      ...prev,
      variantes: prev.variantes.map((v, i) =>
        i !== varIdx ? v : { ...v, tallas: [...v.tallas, emptyTalla()] }
      ),
    }));
  };

  const removeTalla = (varIdx, tallaIdx) => {
    setForm(prev => ({
      ...prev,
      variantes: prev.variantes.map((v, i) =>
        i !== varIdx ? v : { ...v, tallas: v.tallas.filter((_, j) => j !== tallaIdx) }
      ),
    }));
  };

  const updateTalla = (varIdx, tallaIdx, field, value) => {
    setForm(prev => ({
      ...prev,
      variantes: prev.variantes.map((v, i) => {
        if (i !== varIdx) return v;
        return {
          ...v,
          tallas: v.tallas.map((t, j) => {
            if (j !== tallaIdx) return t;
            const numericFields = ['stock', 'precio', 'descuento'];
            const updated = { ...t, [field]: numericFields.includes(field) ? Number(value) : value };
            if (field === 'talla' && !t._skuManual) updated.sku = suggestSku(prev.nombre, value, v.color);
            return updated;
          }),
        };
      }),
    }));
  };

  const setTallaSkuManual = (varIdx, tallaIdx, value) => {
    setForm(prev => ({
      ...prev,
      variantes: prev.variantes.map((v, i) => {
        if (i !== varIdx) return v;
        return {
          ...v,
          tallas: v.tallas.map((t, j) =>
            j === tallaIdx ? { ...t, sku: value, _skuManual: true } : t
          ),
        };
      }),
    }));
  };

  // ── categoría encadenada ─────────────────────────────────────────────────────

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

  // ── submit ───────────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombre?.trim()) return showNotification('El nombre es requerido', 'error');
    if (form.variantes.some(v => !v.tallas.length))
      return showNotification('Cada color debe tener al menos una talla', 'error');
    if (form.variantes.some(v => v.tallas.some(t => !t.sku?.trim())))
      return showNotification('Todas las tallas deben tener SKU', 'error');
    if (form.variantes.some(v => v.tallas.some(t => !t.precio || t.precio <= 0)))
      return showNotification('Todas las tallas deben tener precio válido', 'error');

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      // auto-derive marca from designer if not set
      const designerName = designerOptions.find(d => d._id === form.designer)?.name || '';
      const payload = {
        nombre: form.nombre.toUpperCase(),
        marca: (form.marca || designerName).toUpperCase(),
        category: form.category || null,
        subcategory: form.subcategory || null,
        galeria: form.galeria,
        variantes: form.variantes.map(v => ({
          color: v.color,
          imagenes: v.imagenes || [],
          esPrincipal: v.esPrincipal || false,
          tallas: v.tallas.map(t => ({
            talla: t.talla,
            sku: t.sku.toUpperCase(),
            stock: Number(t.stock) || 0,
            precio: Number(t.precio) || 0,
            descuento: Number(t.descuento) || 0,
          })),
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

  // ── resumen calcs ─────────────────────────────────────────────────────────────

  const totalTallas = form.variantes.reduce((s, v) => s + v.tallas.length, 0);
  const totalStock = form.variantes.reduce((s, v) =>
    s + v.tallas.reduce((ss, t) => ss + (Number(t.stock) || 0), 0), 0);
  const allPrices = form.variantes.flatMap(v => v.tallas)
    .filter(t => Number(t.precio) > 0)
    .map(t => { const p = Number(t.precio); const d = Number(t.descuento) || 0; return d > 0 ? p * (1 - d / 100) : p; });
  const precioMin = allPrices.length ? Math.min(...allPrices) : null;
  const precioMax = allPrices.length ? Math.max(...allPrices) : null;

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
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight">
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            </h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5 hidden sm:block">
              {isEditing ? `ID: ${id}` : 'Completa todos los campos requeridos'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-black text-white font-bold px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm uppercase tracking-wider hover:bg-gray-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isEditing ? 'Actualizar' : 'Publicar'}
        </button>
      </header>

      <form onSubmit={handleSave} className="max-w-6xl mx-auto p-4 sm:p-8 lg:p-12 space-y-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Columna izquierda ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Datos básicos */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-7 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-3">Datos del Producto</h2>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Nombre</label>
                <input
                  required
                  className="w-full p-3.5 bg-gray-50 border border-transparent rounded-xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value.toUpperCase() }))}
                />
              </div>
            </section>

            {/* Clasificación */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-7 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-3">Clasificación</h2>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Diseñador</label>
                <select
                  className="w-full p-3 bg-gray-50 border border-transparent rounded-xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none"
                  value={form.designer}
                  onChange={e => {
                    const did = e.target.value;
                    const d = designerOptions.find(o => o._id === did);
                    setForm(f => ({
                      ...f,
                      designer: did,
                      category: '',
                      subcategory: '',
                      marca: d ? d.name.toUpperCase() : f.marca,
                    }));
                  }}
                >
                  <option value="">SELECCIONAR...</option>
                  {designerOptions.map(d => (
                    <option key={d._id} value={d._id}>{d.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Categoría</label>
                  <select
                    className="w-full p-3 bg-gray-50 border border-transparent rounded-xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none disabled:opacity-40"
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
                    className="w-full p-3 bg-gray-50 border border-transparent rounded-xl font-bold text-sm uppercase focus:bg-white focus:border-black transition-all outline-none disabled:opacity-40"
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
            <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-7 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Variantes por Color</h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">Cada color puede tener múltiples tallas y fotos</p>
                </div>
                <button
                  type="button" onClick={addColorGroup}
                  className="flex items-center gap-1.5 bg-black text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider hover:bg-gray-800 transition-all flex-shrink-0"
                >
                  <Plus size={13} /> Color
                </button>
              </div>

              {form.variantes.length === 0 && (
                <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Sin colores</p>
                  <p className="text-xs text-gray-400 mt-1">Añade un color y luego sus tallas</p>
                </div>
              )}

              <div className="space-y-4">
                {form.variantes.map((v, varIdx) => (
                  <div key={varIdx} className="border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">

                    {/* ── Header del color ── */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50/60 border-b border-gray-100">
                      {/* Imágenes del color */}
                      <div className="flex gap-1.5 items-center flex-shrink-0">
                        {v.imagenes.map((img, imgIdx) => (
                          <div key={imgIdx} className="relative w-11 h-11 rounded-lg border border-gray-200 overflow-hidden group/img flex-shrink-0">
                            <img src={img} className="w-full h-full object-cover mix-blend-multiply" alt="" />
                            <button
                              type="button"
                              onClick={() => removeColorImage(varIdx, imgIdx)}
                              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                            >
                              <X size={9} className="text-white" />
                            </button>
                          </div>
                        ))}
                        <label className="w-11 h-11 flex-shrink-0 bg-white rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-black transition-colors">
                          {v.imagenes.length === 0
                            ? <ImagePlus size={13} className="text-gray-300" />
                            : <Plus size={11} className="text-gray-300" />
                          }
                          <input
                            type="file" className="hidden" accept="image/*" multiple
                            onChange={e => handleColorImagesUpload(varIdx, e.target.files)}
                            disabled={saving}
                          />
                        </label>
                      </div>

                      {/* Color select */}
                      <div className="flex-1 min-w-0">
                        <select
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold text-xs uppercase outline-none focus:border-black transition-colors"
                          value={v.color}
                          onChange={e => updateColorGroup(varIdx, 'color', e.target.value)}
                        >
                          <option value="">SIN COLOR</option>
                          {colores.map(c => (
                            <option key={c._id} value={c.nombre}>{c.nombre.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      {/* Portada */}
                      <button
                        type="button"
                        onClick={() => setPrincipalColor(varIdx)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all flex-shrink-0 ${
                          v.esPrincipal
                            ? 'bg-[#CCFF00] border-[#CCFF00] text-black'
                            : 'bg-white border-gray-200 text-gray-400 hover:border-black hover:text-black'
                        }`}
                      >
                        <Star size={9} fill={v.esPrincipal ? 'currentColor' : 'none'} />
                        <span className="hidden sm:inline">PORTADA</span>
                      </button>

                      {/* Eliminar */}
                      <button
                        type="button" onClick={() => removeColorGroup(varIdx)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* ── Tallas ── */}
                    <div className="p-3 space-y-2">

                      {/* Header de columnas — solo desktop */}
                      {v.tallas.length > 0 && (
                        <div className="hidden sm:grid gap-2 px-0.5" style={{ gridTemplateColumns: '1.6fr 2.8fr 1.8fr 1.2fr 1.2fr 26px' }}>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Talla</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">SKU</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Precio S/.</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Desc.</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Stock</span>
                          <span />
                        </div>
                      )}

                      {v.tallas.map((t, tallaIdx) => (
                        <div key={tallaIdx}>
                          {/* Desktop: fila grid */}
                          <div className="hidden sm:grid gap-2 items-center" style={{ gridTemplateColumns: '1.6fr 2.8fr 1.8fr 1.2fr 1.2fr 26px' }}>
                            <select
                              className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs uppercase outline-none focus:border-black transition-colors"
                              value={t.talla}
                              onChange={e => updateTalla(varIdx, tallaIdx, 'talla', e.target.value)}
                            >
                              <option value="">—</option>
                              {tallas.map(tl => { const label = tallaLabel(tl); return <option key={tl._id} value={label}>{label.toUpperCase()}</option>; })}
                            </select>
                            <input
                              type="text" required placeholder="SKU"
                              className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-xs uppercase outline-none focus:border-black focus:bg-white transition-colors"
                              value={t.sku}
                              onChange={e => setTallaSkuManual(varIdx, tallaIdx, e.target.value.toUpperCase())}
                            />
                            <input
                              type="number" min="0" step="0.01" required placeholder="0.00"
                              className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-xs outline-none focus:border-black focus:bg-white transition-colors"
                              value={t.precio || ''}
                              onChange={e => updateTalla(varIdx, tallaIdx, 'precio', e.target.value)}
                            />
                            <input
                              type="number" min="0" max="100" placeholder="0"
                              className="p-1.5 bg-red-50/40 border border-gray-200 rounded-lg font-mono font-bold text-xs text-red-600 outline-none focus:border-red-300 focus:bg-white transition-colors"
                              value={t.descuento || ''}
                              onChange={e => updateTalla(varIdx, tallaIdx, 'descuento', e.target.value)}
                            />
                            <input
                              type="number" min="0" placeholder="0"
                              className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-xs outline-none focus:border-black focus:bg-white transition-colors"
                              value={t.stock || ''}
                              onChange={e => updateTalla(varIdx, tallaIdx, 'stock', e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => removeTalla(varIdx, tallaIdx)}
                              disabled={v.tallas.length === 1}
                              className="w-[26px] h-[26px] flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all disabled:opacity-20 disabled:pointer-events-none"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {/* Mobile: tarjeta apilada */}
                          <div className="sm:hidden bg-gray-50/60 rounded-xl p-2.5 border border-gray-100 space-y-2">
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="block text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Talla</label>
                                <select
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold text-xs uppercase outline-none focus:border-black"
                                  value={t.talla}
                                  onChange={e => updateTalla(varIdx, tallaIdx, 'talla', e.target.value)}
                                >
                                  <option value="">—</option>
                                  {tallas.map(tl => { const label = tallaLabel(tl); return <option key={tl._id} value={label}>{label.toUpperCase()}</option>; })}
                                </select>
                              </div>
                              <div className="w-16">
                                <label className="block text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Stock</label>
                                <input
                                  type="number" min="0" placeholder="0"
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs outline-none focus:border-black"
                                  value={t.stock || ''}
                                  onChange={e => updateTalla(varIdx, tallaIdx, 'stock', e.target.value)}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTalla(varIdx, tallaIdx)}
                                disabled={v.tallas.length === 1}
                                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-20 disabled:pointer-events-none mb-0.5"
                              >
                                <X size={13} />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="block text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Precio S/.</label>
                                <input
                                  type="number" min="0" step="0.01" required placeholder="0.00"
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs outline-none focus:border-black"
                                  value={t.precio || ''}
                                  onChange={e => updateTalla(varIdx, tallaIdx, 'precio', e.target.value)}
                                />
                              </div>
                              <div className="w-16">
                                <label className="block text-[8px] font-bold uppercase tracking-widest text-red-400 mb-1">Desc. %</label>
                                <input
                                  type="number" min="0" max="100" placeholder="0"
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs text-red-600 outline-none focus:border-red-300"
                                  value={t.descuento || ''}
                                  onChange={e => updateTalla(varIdx, tallaIdx, 'descuento', e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">SKU</label>
                              <input
                                type="text" required placeholder="SKU"
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs uppercase outline-none focus:border-black"
                                value={t.sku}
                                onChange={e => setTallaSkuManual(varIdx, tallaIdx, e.target.value.toUpperCase())}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button" onClick={() => addTalla(varIdx)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:border-black hover:text-black hover:bg-gray-50 transition-all"
                      >
                        <Plus size={11} /> Agregar Talla
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {form.variantes.length > 0 && (
                <div className="pt-2 border-t border-gray-100 flex justify-between text-xs font-mono text-gray-500">
                  <span>{form.variantes.length} color(es) · {totalTallas} talla(s)</span>
                  <span>Stock total: <strong>{totalStock}</strong></span>
                </div>
              )}
            </section>
          </div>

          {/* ── Columna derecha ──────────────────────────────────────────────── */}
          <div className="space-y-5">
            <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-7 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-3">Galería Adicional</h2>
              <p className="text-[11px] text-gray-400">Fotos adicionales en la tienda (además de las imágenes de cada color).</p>

              <div className="grid grid-cols-3 gap-2">
                {form.galeria.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl border border-gray-100 relative group bg-gray-50 overflow-hidden">
                    {isVideo(img)
                      ? <video src={img} autoPlay loop muted playsInline className="w-full h-full object-cover p-1" />
                      : <img src={img} className="w-full h-full object-cover mix-blend-multiply p-1" alt="" />
                    }
                    <button
                      type="button" onClick={() => removeGalleryImage(i)}
                      className="absolute top-1.5 right-1.5 bg-black/80 text-white w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-black transition-all group">
                  <Plus className="text-gray-300 group-hover:text-black transition-colors" size={20} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300 group-hover:text-black mt-1 transition-colors">Añadir</span>
                  <input type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleGalleryUpload} disabled={saving} />
                </label>
              </div>

              {form.galeria.length > 0 && (
                <p className="text-[10px] font-mono text-gray-400 text-right">{form.galeria.length} foto(s)</p>
              )}
            </section>

            {/* Resumen */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Resumen</h2>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Colores</span>
                  <span className="font-mono font-bold">{form.variantes.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tallas (total)</span>
                  <span className="font-mono font-bold">{totalTallas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stock total</span>
                  <span className="font-mono font-bold">{totalStock}</span>
                </div>
                {precioMin !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Precio{precioMin !== precioMax ? ' desde' : ''}</span>
                    <span className="font-mono font-bold">S/. {precioMin.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-2">
          <Link
            to="/admin"
            className="flex-1 py-3.5 text-center rounded-xl font-bold text-sm text-gray-500 hover:bg-white hover:text-black transition-all border border-transparent hover:border-gray-200"
          >
            Cancelar
          </Link>
          <button
            type="submit" disabled={saving}
            className="flex-[3] py-3.5 bg-black text-white rounded-xl font-bold text-sm uppercase tracking-[0.1em] hover:bg-gray-800 transition-all shadow-xl shadow-black/20 flex justify-center items-center gap-2.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
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
