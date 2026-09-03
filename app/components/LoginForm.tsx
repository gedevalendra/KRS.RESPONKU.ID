'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi client Supabase (Pastikan env sudah terpasang)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isLogin) {
      // Proses Login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErrorMsg(error.message);
      else window.location.reload();
    } else {
      // Proses Register (Daftar Akun + Simpan Username ke users_profile)
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setErrorMsg(authError.message);
      } else if (authData.user) {
        const { error: profileError } = await supabase.from('users_profile').insert([
          { id: authData.user.id, username, email }
        ]);
        if (profileError) setErrorMsg(profileError.message);
        else alert('Registrasi berhasil! Silakan masuk.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-4">
        {isLogin ? 'Masuk ke Akun Anda' : 'Daftar Akun Baru'}
      </h2>

      {errorMsg && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded mb-3">{errorMsg}</p>}

      <form onSubmit={handleAuth} className="space-y-3">
        {!isLogin && (
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="usernameanda"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="nama@email.com"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 rounded text-sm font-medium hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Memproses...' : isLogin ? 'Masuk' : 'Daftar'}
        </button>
      </form>

      <p className="text-xs text-center text-slate-500 mt-4">
        {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-blue-600 font-medium hover:underline cursor-pointer"
        >
          {isLogin ? 'Daftar sekarang' : 'Masuk di sini'}
        </button>
      </p>
    </div>
  );
}