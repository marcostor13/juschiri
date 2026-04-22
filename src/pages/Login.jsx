import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/admin');
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans selection:bg-neon-green">
        <div className="w-full max-w-md">
            <div className="bg-white border-4 border-white shadow-[10px_10px_0px_0px_rgba(204,255,0,1)] p-8 sm:p-12">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-2">LOGIN®</h1>
                    <p className="font-mono text-[10px] text-gray-400 uppercase tracking-[0.3em]">Acceso Restringido Backoffice</p>
                </div>

                {error && (
                    <div className="bg-red-50 border-2 border-red-500 text-red-600 p-4 mb-8 text-xs font-bold uppercase flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-1">
                        <label className="block font-mono text-[10px] font-bold uppercase text-gray-500 ml-1">E-mail</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
                            <input 
                                required
                                type="email"
                                placeholder="tu@email.com"
                                className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 outline-none font-mono text-sm focus:border-black transition-all bg-gray-50 focus:bg-white"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block font-mono text-[10px] font-bold uppercase text-gray-500 ml-1">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
                            <input 
                                required
                                type="password"
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 outline-none font-mono text-sm focus:border-black transition-all bg-gray-50 focus:bg-white"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        disabled={loading}
                        className="w-full bg-black text-white py-5 font-black uppercase tracking-widest text-sm hover:bg-neon-green hover:text-black transition-all flex justify-center items-center gap-3 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Entrar al Sistema'}
                        {!loading && <ArrowRight size={20} />}
                    </button>
                </form>

                <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                    <p className="font-mono text-[9px] text-gray-300 uppercase tracking-widest">
                        Jus Chiri v2.0 • 2026<br/>
                        Protected by JusChiri-Guard
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}
