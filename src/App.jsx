import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Storefront from './pages/Storefront';
import Backoffice from './pages/Backoffice';
import Login from './pages/Login';
import ProductDetail from './pages/ProductDetail';
import ProductForm from './pages/ProductForm';

export default function App() {
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
