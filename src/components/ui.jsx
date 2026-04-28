import React from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const Notification = ({ type = 'info', message, onClose }) => {
    const bgColors = {
        success: 'bg-neon-green text-black border-black',
        error: 'bg-red-500 text-white border-black',
        warning: 'bg-yellow-400 text-black border-black',
        info: 'bg-black text-white border-neon-green'
    };

    const icons = {
        success: <CheckCircle size={20} />,
        error: <AlertTriangle size={20} />,
        warning: <AlertTriangle size={20} />,
        info: <Info size={20} />
    };

    return (
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[150] px-6 py-3 font-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 border-2 animate-fade-in-up ${bgColors[type]}`}>
            {icons[type]}
            <span className="text-sm">{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-50 transition-opacity">
                <X size={16} />
            </button>
        </div>
    );
};

export const ConfirmModal = ({ isOpen, title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', onConfirm, onCancel, type = 'danger' }) => {
    if (!isOpen) return null;

    const confirmBg = type === 'danger' ? 'bg-red-500 hover:bg-red-600 border-red-500' : 'bg-black hover:bg-neon-green hover:text-black hover:border-black border-black';
    const confirmTextClass = type === 'danger' ? 'text-white' : 'text-white hover:text-black';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel}></div>
            <div className="bg-white w-full max-w-md relative flex flex-col border-4 border-black shadow-[15px_15px_0px_0px_rgba(204,255,0,1)] animate-fade-in-up">
                <div className="p-5 border-b-4 border-black bg-black text-white flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                        {type === 'danger' ? <AlertTriangle className="text-red-500" /> : <Info className="text-neon-green" />}
                        {title}
                    </h2>
                    <button onClick={onCancel} className="hover:text-neon-green transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6">
                    <p className="font-mono text-sm uppercase leading-relaxed font-bold text-gray-700">
                        {message}
                    </p>
                </div>
                <div className="p-6 border-t-4 border-black bg-gray-50 flex gap-4">
                    <button 
                        onClick={onCancel} 
                        className="flex-1 py-3 font-bold border-2 border-black uppercase text-sm hover:bg-gray-200 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className={`flex-1 py-3 border-2 font-bold uppercase text-sm tracking-widest transition-all ${confirmBg} ${confirmTextClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
