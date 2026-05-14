import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Check, X, Loader2, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { ConfirmModal } from '../components/ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const token = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

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

function AssignDesignerModal({ category, designers, onSave, onClose }) {
  const [selected, setSelected] = useState(category.designer?._id || category.designer || '');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-gray-200 p-6 w-80 shadow-2xl">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Asignar Diseñador</h3>
        <p className="text-xs text-gray-500 mb-4">Categoría: <span className="font-bold text-gray-900">{category.name}</span></p>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-colors mb-5"
        >
          <option value="">Sin diseñador</option>
          {designers.map(d => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-bold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={() => onSave(selected || null)} className="flex-1 py-2 text-sm font-bold bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesManager({ showNotification }) {
  const [designers, setDesigners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view] = useState('tree');

  const [expandedDesigners, setExpandedDesigners] = useState({});
  const [expandedCats, setExpandedCats] = useState({});

  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, desRes] = await Promise.all([
        fetch(`${API_URL}/categories`),
        fetch(`${API_URL}/categories/designers`),
      ]);
      setCategories(await catRes.json());
      setDesigners(await desRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const apiPost = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };
  const apiPut = async (url, body) => {
    const res = await fetch(url, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };
  const apiDelete = async (url) => {
    const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };

  const handleAdd = async (name) => {
    if (!name?.trim()) return;
    try {
      const { level, parentId, designerId } = adding;
      if (level === 'designer') {
        await apiPost(`${API_URL}/categories/designers`, { name });
      } else if (level === 'category') {
        await apiPost(`${API_URL}/categories`, { name, designer: designerId || null });
        if (designerId) setExpandedDesigners(p => ({ ...p, [designerId]: true }));
      } else if (level === 'subcategory') {
        await apiPost(`${API_URL}/categories/subcategories`, { name, category: parentId });
        setExpandedCats(p => ({ ...p, [parentId]: true }));
      }
      setAdding(null);
      showNotification('Creado correctamente', 'success');
      fetchAll();
    } catch (e) {
      showNotification(e.message, 'error');
    }
  };

  const handleEdit = async (name) => {
    if (!name?.trim()) return;
    try {
      const { id, level } = editing;
      const routes = {
        designer: `${API_URL}/categories/designers/${id}`,
        category: `${API_URL}/categories/${id}`,
        subcategory: `${API_URL}/categories/subcategories/${id}`,
      };
      await apiPut(routes[level], { name });
      setEditing(null);
      showNotification('Actualizado', 'success');
      fetchAll();
    } catch (e) {
      showNotification(e.message, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const { id, level } = deleteTarget;
      const routes = {
        designer: `${API_URL}/categories/designers/${id}`,
        category: `${API_URL}/categories/${id}`,
        subcategory: `${API_URL}/categories/subcategories/${id}`,
      };
      await apiDelete(routes[level]);
      showNotification('Eliminado', 'success');
      setDeleteTarget(null);
      fetchAll();
    } catch (e) {
      showNotification(e.message, 'error');
    }
  };

  const handleAssignDesigner = async (designerId) => {
    try {
      await apiPut(`${API_URL}/categories/${assignTarget._id}`, { name: assignTarget.name, designer: designerId });
      showNotification('Diseñador asignado', 'success');
      setAssignTarget(null);
      fetchAll();
    } catch (e) {
      showNotification(e.message, 'error');
    }
  };

  const ActionBtns = ({ id, level, name, extra }) => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      {extra}
      <button type="button" onClick={e => { e.stopPropagation(); setEditing({ id, level }); }}
        className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
        <Edit2 size={14} />
      </button>
      <button type="button" onClick={e => { e.stopPropagation(); setDeleteTarget({ id, level, name }); }}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );

  // ── Subcategory row ────────────────────────────────────────────────────────────

  const SubcatRow = ({ sub, indent }) => (
    <div className={`flex items-center gap-3 ${indent} pr-8 py-2.5 group hover:bg-gray-50 border-t border-gray-100/60`}>
      <span className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0" />
      {editing?.id === sub._id ? (
        <EditableRow name={sub.name} onSave={handleEdit} onCancel={() => setEditing(null)} />
      ) : (
        <>
          <span className="flex-1 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{sub.name}</span>
          <ActionBtns id={sub._id} level="subcategory" name={sub.name} />
        </>
      )}
    </div>
  );

  // ── Category row ───────────────────────────────────────────────────────────────

  const CategoryRow = ({ cat, catIndent, subIndent }) => {
    const catData = categories.find(c => c._id?.toString() === cat._id?.toString()) || cat;
    return (
      <div>
        <div
          className={`flex items-center gap-3 ${catIndent} pr-8 py-3.5 group hover:bg-gray-100/60 cursor-pointer border-t border-gray-100/80`}
          onClick={() => setExpandedCats(p => ({ ...p, [cat._id]: !p[cat._id] }))}
        >
          <span className="text-gray-300 flex-shrink-0">
            {expandedCats[cat._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {editing?.id === cat._id ? (
            <EditableRow name={cat.name} onSave={handleEdit} onCancel={() => setEditing(null)} />
          ) : (
            <>
              <span className="flex-1 text-xs font-bold uppercase tracking-wider text-gray-700">{cat.name}</span>
              <span className="text-[10px] font-mono text-gray-400 mr-2">{catData.subcategories?.length || 0} subcats</span>
              <ActionBtns
                id={cat._id}
                level="category"
                name={cat.name}
                extra={
                  <button type="button" onClick={e => { e.stopPropagation(); setAssignTarget(catData); }}
                    title="Asignar diseñador"
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <LinkIcon size={14} />
                  </button>
                }
              />
            </>
          )}
        </div>

        {expandedCats[cat._id] && (
          <div className="bg-white/60">
            {(catData.subcategories || []).map(sub => (
              <SubcatRow key={sub._id} sub={sub} indent={subIndent} />
            ))}

            {adding?.level === 'subcategory' && adding.parentId === cat._id ? (
              <div className={`${subIndent} pr-8 py-3 border-t border-gray-100/60`}>
                <AddRow placeholder="Nombre de subcategoría..." onSave={handleAdd} onCancel={() => setAdding(null)} />
              </div>
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setAdding({ level: 'subcategory', parentId: cat._id }); }}
                className={`flex items-center gap-1.5 ${subIndent} pr-8 py-2.5 w-full text-left text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors border-t border-gray-100/60 hover:bg-gray-50/60`}
              >
                <Plus size={12} /> Subcategoría
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Tree view (Diseñador → Categoría → Subcategoría) ─────────────────────────

  const TreeView = () => {
    const unassigned = categories.filter(c => !c.designer);
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center">
            <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
              {loading ? '...' : `${designers.length} diseñadores`}
            </p>
            <button onClick={() => setAdding({ level: 'designer' })}
              className="flex items-center gap-2 bg-black text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-gray-800 transition-all">
              <Plus size={15} /> Nuevo Diseñador
            </button>
          </div>

          {loading && <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={28} /></div>}
          {!loading && designers.length === 0 && !adding && (
            <p className="text-center text-sm text-gray-400 italic py-12">No hay diseñadores. Crea el primero.</p>
          )}

          <div className="divide-y divide-gray-50">
            {designers.map(designer => (
              <div key={designer._id}>
                <div
                  className="flex items-center gap-3 px-8 py-4 group hover:bg-gray-50/60 cursor-pointer"
                  onClick={() => setExpandedDesigners(p => ({ ...p, [designer._id]: !p[designer._id] }))}
                >
                  <span className="text-gray-400 flex-shrink-0">
                    {expandedDesigners[designer._id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  {editing?.id === designer._id ? (
                    <EditableRow name={designer.name} onSave={handleEdit} onCancel={() => setEditing(null)} />
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-black uppercase tracking-wide text-gray-900">{designer.name}</span>
                      <span className="text-[10px] font-mono text-gray-400 mr-2">{designer.categories?.length || 0} cats</span>
                      <ActionBtns id={designer._id} level="designer" name={designer.name} />
                    </>
                  )}
                </div>

                {expandedDesigners[designer._id] && (
                  <div className="bg-gray-50/40">
                    {(designer.categories || []).map(cat => (
                      <CategoryRow key={cat._id} cat={cat} catIndent="pl-14" subIndent="pl-20" />
                    ))}
                    {adding?.level === 'category' && adding.designerId === designer._id ? (
                      <div className="pl-14 pr-8 py-3 border-t border-gray-100/60">
                        <AddRow placeholder="Nombre de categoría..." onSave={handleAdd} onCancel={() => setAdding(null)} />
                      </div>
                    ) : (
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setAdding({ level: 'category', designerId: designer._id }); }}
                        className="flex items-center gap-1.5 pl-14 pr-8 py-2.5 w-full text-left text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors border-t border-gray-100/60 hover:bg-gray-50/60">
                        <Plus size={12} /> Categoría
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {adding?.level === 'designer' && (
            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/60">
              <AddRow placeholder="Nombre del diseñador..." onSave={handleAdd} onCancel={() => setAdding(null)} />
            </div>
          )}
        </div>

        {(unassigned.length > 0 || (adding?.level === 'category' && !adding.designerId)) && (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center">
              <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Sin diseñador · {unassigned.length} categorías</p>
              <button onClick={() => setAdding({ level: 'category' })}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider hover:border-black hover:text-black transition-all">
                <Plus size={13} /> Categoría
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {unassigned.map(cat => (
                <CategoryRow key={cat._id} cat={cat} catIndent="pl-8" subIndent="pl-14" />
              ))}
            </div>
            {adding?.level === 'category' && !adding.designerId && (
              <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/60">
                <AddRow placeholder="Nombre de categoría..." onSave={handleAdd} onCancel={() => setAdding(null)} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-end">
        <button onClick={fetchAll}
          className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-900 text-gray-400 hover:text-black transition-all"
          title="Actualizar">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <TreeView />

      {assignTarget && (
        <AssignDesignerModal category={assignTarget} designers={designers} onSave={handleAssignDesigner} onClose={() => setAssignTarget(null)} />
      )}

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
