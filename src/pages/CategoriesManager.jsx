import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { ConfirmModal } from '../components/ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const token = () => localStorage.getItem('token');

// ── Inline editable row ──────────────────────────────────────────────────────

function EditableRow({ name, onSave, onCancel }) {
  const [value, setValue] = useState(name);
  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(value); if (e.key === 'Escape') onCancel(); }}
        className="flex-1 px-3 py-1.5 bg-white border-2 border-black rounded-lg text-sm font-bold uppercase outline-none"
      />
      <button type="button" onClick={() => onSave(value)} className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800">
        <Check size={14} />
      </button>
      <button type="button" onClick={onCancel} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Inline add row ───────────────────────────────────────────────────────────

function AddRow({ placeholder, onSave, onCancel }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(value); if (e.key === 'Escape') onCancel(); }}
        className="flex-1 px-3 py-1.5 bg-white border-2 border-black rounded-lg text-sm font-bold uppercase outline-none placeholder:font-normal placeholder:normal-case placeholder:text-gray-400"
      />
      <button type="button" onClick={() => onSave(value)} disabled={!value.trim()} className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40">
        <Check size={14} />
      </button>
      <button type="button" onClick={onCancel} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CategoriesManager({ showNotification }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});

  // Editing state: { id, level: 'category'|'type'|'subcategory' }
  const [editing, setEditing] = useState(null);

  // Adding state: { level, parentId, categoryId? }
  const [adding, setAdding] = useState(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/categories`);
      setCategories(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };

  // ── API helpers ────────────────────────────────────────────────────────────

  const apiPost = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };

  const apiPut = async (url, body) => {
    const res = await fetch(url, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };

  const apiDelete = async (url) => {
    const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAdd = async (name) => {
    if (!name?.trim()) return;
    try {
      const { level, parentId, categoryId } = adding;
      if (level === 'category') {
        await apiPost(`${API_URL}/categories`, { name });
      } else if (level === 'type') {
        await apiPost(`${API_URL}/categories/types`, { name, category: parentId });
        setExpandedCats(p => ({ ...p, [parentId]: true }));
      } else {
        await apiPost(`${API_URL}/categories/subcategories`, { name, type: parentId, category: categoryId });
        setExpandedTypes(p => ({ ...p, [parentId]: true }));
      }
      setAdding(null);
      showNotification('Creado correctamente', 'success');
      fetchCategories();
    } catch (e) {
      showNotification(e.message, 'error');
    }
  };

  const handleEdit = async (name) => {
    if (!name?.trim()) return;
    try {
      const { id, level } = editing;
      if (level === 'category') await apiPut(`${API_URL}/categories/${id}`, { name });
      else if (level === 'type') await apiPut(`${API_URL}/categories/types/${id}`, { name });
      else await apiPut(`${API_URL}/categories/subcategories/${id}`, { name });
      setEditing(null);
      showNotification('Actualizado', 'success');
      fetchCategories();
    } catch (e) {
      showNotification(e.message, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const { id, level } = deleteTarget;
      if (level === 'category') await apiDelete(`${API_URL}/categories/${id}`);
      else if (level === 'type') await apiDelete(`${API_URL}/categories/types/${id}`);
      else await apiDelete(`${API_URL}/categories/subcategories/${id}`);
      showNotification('Eliminado', 'success');
      setDeleteTarget(null);
      fetchCategories();
    } catch (e) {
      showNotification(e.message, 'error');
    }
  };

  // ── Action buttons row ─────────────────────────────────────────────────────

  const ActionBtns = ({ id, level, name }) => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setEditing({ id, level }); }}
        className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Edit2 size={14} />
      </button>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setDeleteTarget({ id, level, name }); }}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
              {loading ? '...' : `${categories.length} categorías`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchCategories}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-900 text-gray-400 hover:text-black transition-all"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setAdding({ level: 'category' })}
              className="flex items-center gap-2 bg-black text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-gray-800 transition-all"
            >
              <Plus size={15} /> Nueva Categoría
            </button>
          </div>
        </div>

        {/* Tree */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-gray-300" size={32} />
          </div>
        )}

        {!loading && categories.length === 0 && !adding && (
          <p className="text-center text-sm text-gray-400 italic py-16">No hay categorías. Crea la primera.</p>
        )}

        <div className="divide-y divide-gray-50">
          {categories.map(cat => (
            <div key={cat._id}>
              {/* Category row */}
              <div
                className="flex items-center gap-3 px-8 py-4 group hover:bg-gray-50/60 cursor-pointer"
                onClick={() => setExpandedCats(p => ({ ...p, [cat._id]: !p[cat._id] }))}
              >
                <span className="text-gray-400 flex-shrink-0">
                  {expandedCats[cat._id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>

                {editing?.id === cat._id ? (
                  <EditableRow
                    name={cat.name}
                    onSave={handleEdit}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <span className="flex-1 text-sm font-bold uppercase tracking-wide text-gray-900">
                      {cat.name}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 mr-2">
                      {cat.types?.length || 0} tipos
                    </span>
                    <ActionBtns id={cat._id} level="category" name={cat.name} />
                  </>
                )}
              </div>

              {/* Types */}
              {expandedCats[cat._id] && (
                <div className="bg-gray-50/40">
                  {(cat.types || []).map(type => (
                    <div key={type._id}>
                      {/* Type row */}
                      <div
                        className="flex items-center gap-3 pl-14 pr-8 py-3 group hover:bg-gray-100/60 cursor-pointer border-t border-gray-100/80"
                        onClick={() => setExpandedTypes(p => ({ ...p, [type._id]: !p[type._id] }))}
                      >
                        <span className="text-gray-300 flex-shrink-0">
                          {expandedTypes[type._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>

                        {editing?.id === type._id ? (
                          <EditableRow
                            name={type.name}
                            onSave={handleEdit}
                            onCancel={() => setEditing(null)}
                          />
                        ) : (
                          <>
                            <span className="flex-1 text-xs font-bold uppercase tracking-wider text-gray-700">
                              {type.name}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 mr-2">
                              {type.subcategories?.length || 0} subcats
                            </span>
                            <ActionBtns id={type._id} level="type" name={type.name} />
                          </>
                        )}
                      </div>

                      {/* Subcategories */}
                      {expandedTypes[type._id] && (
                        <div className="bg-white/60">
                          {(type.subcategories || []).map(sub => (
                            <div
                              key={sub._id}
                              className="flex items-center gap-3 pl-24 pr-8 py-2.5 group hover:bg-gray-50 border-t border-gray-100/60"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />

                              {editing?.id === sub._id ? (
                                <EditableRow
                                  name={sub.name}
                                  onSave={handleEdit}
                                  onCancel={() => setEditing(null)}
                                />
                              ) : (
                                <>
                                  <span className="flex-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    {sub.name}
                                  </span>
                                  <ActionBtns id={sub._id} level="subcategory" name={sub.name} />
                                </>
                              )}
                            </div>
                          ))}

                          {/* Add subcategory form */}
                          {adding?.level === 'subcategory' && adding.parentId === type._id ? (
                            <div className="pl-24 pr-8 py-3 border-t border-gray-100/60">
                              <AddRow
                                placeholder="Nombre de subcategoría..."
                                onSave={handleAdd}
                                onCancel={() => setAdding(null)}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setAdding({ level: 'subcategory', parentId: type._id, categoryId: cat._id }); }}
                              className="flex items-center gap-1.5 pl-24 pr-8 py-2.5 w-full text-left text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors border-t border-gray-100/60 hover:bg-gray-50/60"
                            >
                              <Plus size={12} /> Subcategoría
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add type form */}
                  {adding?.level === 'type' && adding.parentId === cat._id ? (
                    <div className="pl-14 pr-8 py-3 border-t border-gray-100/60">
                      <AddRow
                        placeholder="Nombre del tipo..."
                        onSave={handleAdd}
                        onCancel={() => setAdding(null)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setAdding({ level: 'type', parentId: cat._id }); }}
                      className="flex items-center gap-1.5 pl-14 pr-8 py-3 w-full text-left text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors border-t border-gray-100/60 hover:bg-gray-50/60"
                    >
                      <Plus size={12} /> Tipo
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add category form at bottom */}
        {adding?.level === 'category' && (
          <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/60">
            <AddRow
              placeholder="Nombre de categoría..."
              onSave={handleAdd}
              onCancel={() => setAdding(null)}
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Eliminar elemento"
        message={`¿Eliminar "${deleteTarget?.name}"? Esta acción es irreversible.`}
        confirmText="Sí, Eliminar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
