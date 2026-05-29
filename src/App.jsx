import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Storefront from './pages/Storefront';
import Backoffice from './pages/Backoffice';
import Login from './pages/Login';
import ProductDetail from './pages/ProductDetail';
import ProductForm from './pages/ProductForm';

// ── Mantenimiento ─────────────────────────────────────────────────────────────
// Cambiar a false para volver al sitio normal
const MAINTENANCE = true;

const isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const MaintenancePage = () => (
  <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 font-sans selection:bg-[#CCFF00] selection:text-black">
    <div className="max-w-lg w-full text-center space-y-8">
      <div>
        <img src="/logo juschiri.jpeg" alt="JUS CHIRI" className="h-10 object-contain mx-auto invert mb-8" />
        <div className="inline-block bg-[#CCFF00] text-black text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-1.5 mb-6">
          SITIO EN MANTENIMIENTO
        </div>
        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
          VOLVEMOS<br />PRONTO
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
          Estamos trabajando para traerte una experiencia mejorada. Vuelve en unos momentos.
        </p>
      </div>

      <div className="border-t border-white/10 pt-8">
        <p className="text-[11px] text-gray-600 uppercase tracking-widest font-bold">
          JUS CHIRI® — LIMA, PERU
        </p>
      </div>
    </div>
  </div>
);

export default function App() {
  if (MAINTENANCE && !isLocal) return <MaintenancePage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/producto/:id" element={<ProductDetail />} />
        <Route path="/admin" element={<Backoffice />} />
        <Route path="/admin/producto/nuevo" element={<ProductForm />} />
        <Route path="/admin/producto/:id/editar" element={<ProductForm />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
