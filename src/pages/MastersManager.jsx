import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Check, X, RefreshCw } from 'lucide-react';
import { ConfirmModal } from '../components/ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const token = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

export const tallaLabel = (t) => {
  if (!t) return '';
  const parts = [];
  if (t.talla_eur) parts.push(`EUR ${t.talla_eur}`);
  if (t.talla_us)  parts.push(`US ${t.talla_us}`);
  return parts.length > 0 ? parts.join(' / ') : t.nombre;
};

// ── Colores (panel genérico) ──────────────────────────────────────────────────

function EditableRow({ name, onSave, onCancel }) {
  const [value, setValue] = useState(name);
  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value.toUpperCase())}
        onKeyDown={e => { if (e.key === 'Enter') onSave(value); if (e.key === 'Escape') onCancel(); }}
        className="flex-1 px-3 py-1.5 bg-white border-2 border-black rounded-lg text-sm font-bold uppercase outline-none"
      />
      <button type="button" onClick={() => onSave(value)} className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800"><Check size={14} /></button>
      <button type="button" onClick={onCancel} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X size={14} /></button>
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
        onChange={e => setValue(e.target.value.toUpperCase())}
        onKeyDown={e => { if (e.key === 'Enter') onSave(value); if (e.key === 'Escape') onCancel(); }}
        className="flex-1 px-3 py-1.5 bg-white border-2 border-black rounded-lg text-sm font-bold uppercase outline-none placeholder:font-normal placeholder:normal-case placeholder:text-gray-400"
      />
      <button type="button" onClick={() => onSave(value)} disabled={!value.trim()} className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"><Check size={14} /></button>
      <button type="button" onClick={onCancel} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X size={14} /></button>
    </div>
  );
}

function MasterPanel({ title, endpoint, items, onRefresh, showNotification }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const apiPost = async (body) => {
    const res = await fetch(`${API_URL}/${endpoint}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };
  const apiPut = async (id, body) => {
    const res = await fetch(`${API_URL}/${endpoint}/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };
  const apiDelete = async (id) => {
    const res = await fetch(`${API_URL}/${endpoint}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };

  const handleAdd = async (name) => {
    if (!name?.trim()) return;
    try { await apiPost({ nombre: name }); setAdding(false); showNotification('Creado', 'success'); onRefresh(); }
    catch (e) { showNotification(e.message, 'error'); }
  };
  const handleEdit = async (name) => {
    if (!name?.trim() || !editing) return;
    try { await apiPut(editing._id, { nombre: name }); setEditing(null); showNotification('Actualizado', 'success'); onRefresh(); }
    catch (e) { showNotification(e.message, 'error'); }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await apiDelete(deleteTarget._id); showNotification('Eliminado', 'success'); setDeleteTarget(null); onRefresh(); }
    catch (e) { showNotification(e.message, 'error'); }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="font-black uppercase tracking-wide text-gray-900">{title}</h3>
          <p className="text-[10px] font-mono text-gray-400 mt-0.5">{items.length} elemento(s)</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 bg-black text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-gray-800 transition-all">
          <Plus size={14} /> Nuevo
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map(item => (
          <div key={item._id} className="flex items-center gap-3 px-8 py-3.5 group hover:bg-gray-50/60 transition-colors">
            {editing?._id === item._id ? (
              <EditableRow name={item.nombre} onSave={handleEdit} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <span className="flex-1 text-sm font-bold uppercase tracking-wider text-gray-900">{item.nombre}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing(item)} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>
              </>
            )}
          </div>
        ))}
        {adding && (
          <div className="px-8 py-4 bg-gray-50/60">
            <AddRow placeholder={`Nombre de ${title.toLowerCase()}...`} onSave={handleAdd} onCancel={() => setAdding(false)} />
          </div>
        )}
        {items.length === 0 && !adding && (
          <p className="text-center text-sm text-gray-400 italic py-10">Sin elementos. Crea el primero.</p>
        )}
      </div>
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={`Eliminar ${title.slice(0, -1)}`}
        message={`¿Eliminar "${deleteTarget?.nombre}"? Esta acción es irreversible.`}
        confirmText="Sí, Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Tallas (panel especializado con EUR/US) ───────────────────────────────────

function TallaAddRow({ onSave, onCancel }) {
  const [nombre, setNombre] = useState('');
  const [eur, setEur] = useState('');
  const [us, setUs] = useState('');

  const handleSave = () => {
    if (!nombre.trim()) return;
    onSave({ nombre: nombre.trim(), talla_eur: eur.trim() || null, talla_us: us.trim() || null });
  };

  return (
    <div className="space-y-2">
      <input
        autoFocus
        value={nombre}
        placeholder="Nombre (ej: S, M, 41)"
        onChange={e => setNombre(e.target.value.toUpperCase())}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
        className="w-full px-3 py-1.5 bg-white border-2 border-black rounded-lg text-sm font-bold uppercase outline-none placeholder:font-normal placeholder:normal-case placeholder:text-gray-400"
      />
      <div className="flex gap-2 items-center">
        <input
          value={eur}
          placeholder="EUR (ej: 41)"
          onChange={e => setEur(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-mono outline-none placeholder:text-gray-400 focus:border-gray-600"
        />
        <input
          value={us}
          placeholder="US (ej: 8.5)"
          onChange={e => setUs(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-mono outline-none placeholder:text-gray-400 focus:border-gray-600"
        />
        <button type="button" onClick={handleSave} disabled={!nombre.trim()} className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"><Check size={14} /></button>
        <button type="button" onClick={onCancel} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X size={14} /></button>
      </div>
    </div>
  );
}

function TallaEditRow({ item, onSave, onCancel }) {
  const [nombre, setNombre] = useState(item.nombre);
  const [eur, setEur] = useState(item.talla_eur || '');
  const [us, setUs] = useState(item.talla_us || '');

  const handleSave = () => {
    if (!nombre.trim()) return;
    onSave({ nombre: nombre.trim(), talla_eur: eur.trim() || null, talla_us: us.trim() || null });
  };

  return (
    <div className="flex-1 space-y-2">
      <input
        autoFocus
        value={nombre}
        onChange={e => setNombre(e.target.value.toUpperCase())}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
        className="w-full px-3 py-1.5 bg-white border-2 border-black rounded-lg text-sm font-bold uppercase outline-none"
      />
      <div className="flex gap-2 items-center">
        <input
          value={eur}
          placeholder="EUR"
          onChange={e => setEur(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-mono outline-none placeholder:text-gray-400 focus:border-gray-600"
        />
        <input
          value={us}
          placeholder="US"
          onChange={e => setUs(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-mono outline-none placeholder:text-gray-400 focus:border-gray-600"
        />
        <button type="button" onClick={handleSave} className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800"><Check size={14} /></button>
        <button type="button" onClick={onCancel} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X size={14} /></button>
      </div>
    </div>
  );
}

function TallaPanel({ items, onRefresh, showNotification }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const apiPost = async (body) => {
    const res = await fetch(`${API_URL}/tallas`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };
  const apiPut = async (id, body) => {
    const res = await fetch(`${API_URL}/tallas/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };
  const apiDelete = async (id) => {
    const res = await fetch(`${API_URL}/tallas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
    return res.json();
  };

  const handleAdd = async (data) => {
    try { await apiPost(data); setAdding(false); showNotification('Creado', 'success'); onRefresh(); }
    catch (e) { showNotification(e.message, 'error'); }
  };
  const handleEdit = async (data) => {
    if (!editing) return;
    try { await apiPut(editing._id, data); setEditing(null); showNotification('Actualizado', 'success'); onRefresh(); }
    catch (e) { showNotification(e.message, 'error'); }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await apiDelete(deleteTarget._id); showNotification('Eliminado', 'success'); setDeleteTarget(null); onRefresh(); }
    catch (e) { showNotification(e.message, 'error'); }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="font-black uppercase tracking-wide text-gray-900">Tallas</h3>
          <p className="text-[10px] font-mono text-gray-400 mt-0.5">{items.length} elemento(s) · nombre · EUR · US</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 bg-black text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-gray-800 transition-all">
          <Plus size={14} /> Nuevo
        </button>
      </div>

      <div className="divide-y divide-gray-50">
        {items.map(item => (
          <div key={item._id} className="flex items-center gap-3 px-8 py-3.5 group hover:bg-gray-50/60 transition-colors">
            {editing?._id === item._id ? (
              <TallaEditRow item={item} onSave={handleEdit} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-900">{tallaLabel(item)}</span>
                  {(item.talla_eur || item.talla_us) && (
                    <span className="ml-2 text-[10px] font-mono text-gray-400">({item.nombre})</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing(item)} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>
              </>
            )}
          </div>
        ))}

        {adding && (
          <div className="px-8 py-4 bg-gray-50/60">
            <TallaAddRow onSave={handleAdd} onCancel={() => setAdding(false)} />
          </div>
        )}

        {items.length === 0 && !adding && (
          <p className="text-center text-sm text-gray-400 italic py-10">Sin tallas. Crea la primera.</p>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Eliminar Talla"
        message={`¿Eliminar "${tallaLabel(deleteTarget)}"? Esta acción es irreversible.`}
        confirmText="Sí, Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MastersManager({ showNotification }) {
  const [tallas, setTallas] = useState([]);
  const [colores, setColores] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tallasRes, coloresRes] = await Promise.all([
        fetch(`${API_URL}/tallas`),
        fetch(`${API_URL}/colores`),
      ]);
      setTallas(await tallasRes.json());
      setColores(await coloresRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={fetchAll} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-900 text-gray-400 hover:text-black transition-all">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TallaPanel items={tallas} onRefresh={fetchAll} showNotification={showNotification} />
        <MasterPanel title="Colores" endpoint="colores" items={colores} onRefresh={fetchAll} showNotification={showNotification} />
      </div>
    </div>
  );
}
