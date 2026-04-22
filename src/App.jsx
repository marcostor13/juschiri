import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Storefront from './pages/Storefront';
import Backoffice from './pages/Backoffice';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/admin" element={<Backoffice />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
