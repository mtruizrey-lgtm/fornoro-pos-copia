
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { KeyRound, UtensilsCrossed, LogIn, LogOut } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, settings, registerAttendance } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = () => {
    if (login(pin)) {
      setError('');
    } else {
      setError('PIN inválido');
    }
  };

  const handleAttendance = (type: 'IN' | 'OUT') => {
      const result = registerAttendance(pin, type);
      if (result.success) {
          setSuccessMsg(result.message);
          setPin('');
          setError('');
          setTimeout(() => setSuccessMsg(''), 3000);
      } else {
          setError(result.message);
          setSuccessMsg('');
      }
  };

  const appendNum = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--fr-green)] text-[var(--fr-card)] relative overflow-hidden">
      <div className="max-w-md w-full p-10 bg-[var(--fr-card)] text-[var(--fr-text)] rounded-3xl shadow-2xl border-4 border-[var(--fr-line)] relative z-10">
        <div className="flex justify-center mb-6">
          <div className="p-5 bg-[var(--fr-bg)] rounded-full shadow-lg text-[var(--fr-red)] border border-[var(--fr-line)] w-32 h-32 flex items-center justify-center">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <UtensilsCrossed size={56} strokeWidth={1.5} />
            )}
          </div>
        </div>
        <h1 className="text-4xl font-bold text-center mb-1 tracking-tight font-serif">{settings.storeName}</h1>
        <p className="text-center text-stone-500 mb-8 font-medium font-sans uppercase tracking-widest text-xs">Sistema de Gestión</p>

        <div className="mb-8 flex justify-center">
          <div className="text-5xl tracking-[0.5em] font-mono bg-[var(--fr-bg)] px-8 py-4 rounded-xl border border-[var(--fr-line)] text-[var(--fr-red)] shadow-inner h-24 flex items-center justify-center w-full">
            {pin.padEnd(4, '•').replace(/./g, (char, i) => i < pin.length ? '*' : '•')}
          </div>
        </div>

        {error && <div className="text-[var(--fr-red)] text-center mb-6 font-bold animate-pulse bg-red-50 py-2 rounded-lg border border-red-100">{error}</div>}
        {successMsg && <div className="text-green-700 text-center mb-6 font-bold animate-in fade-in bg-green-100 py-2 rounded-lg border border-green-200">{successMsg}</div>}

        <div className="grid grid-cols-3 gap-3 mb-6 font-mono">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => appendNum(n.toString())}
              className="h-16 bg-white hover:bg-[var(--fr-bg)] rounded-xl text-2xl font-bold transition shadow-sm border border-[var(--fr-line)] text-[var(--fr-text)]"
            >
              {n}
            </button>
          ))}
          <button onClick={() => setPin('')} className="h-16 bg-red-50 hover:bg-red-100 text-[var(--fr-red)] rounded-xl font-bold border border-red-100">C</button>
          <button onClick={() => appendNum('0')} className="h-16 bg-white hover:bg-[var(--fr-bg)] rounded-xl text-2xl font-bold shadow-sm border border-[var(--fr-line)] text-[var(--fr-text)]">0</button>
          <button onClick={handleLogin} className="h-16 bg-[var(--fr-green)] hover:bg-[#1a3b2e] rounded-xl text-white flex items-center justify-center shadow-lg">
            <KeyRound size={28} />
          </button>
        </div>
        
        {/* Attendance Quick Actions */}
        <div className="pt-6 border-t border-[var(--fr-line)]">
            <p className="text-center text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Control de Asistencia</p>
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => handleAttendance('IN')}
                    disabled={pin.length < 4}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 disabled:opacity-50"
                >
                    <LogIn size={18} /> Entrada
                </button>
                <button 
                    onClick={() => handleAttendance('OUT')}
                    disabled={pin.length < 4}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-50 text-orange-700 font-bold hover:bg-orange-100 disabled:opacity-50"
                >
                    <LogOut size={18} /> Salida
                </button>
            </div>
        </div>

        <div className="text-xs text-center text-stone-400 font-mono mt-6">
          <p>DEMO: Admin 1111 | Mesero 2222</p>
        </div>
      </div>
    </div>
  );
};
