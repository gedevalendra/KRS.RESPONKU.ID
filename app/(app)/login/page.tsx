'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push('/');
        router.refresh();
      }
    } else {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setErrorMsg(authError.message);
      } else if (authData.user) {
        const { error: profileError } = await supabase.from('users_profile').insert([
          { id: authData.user.id, username, email }
        ]);
        if (profileError) {
          setErrorMsg(profileError.message);
        } else {
          alert('Registrasi berhasil! Silakan masuk.');
          setIsLogin(true);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="font-bold text-xl tracking-tight text-slate-900">
            RESPONKU KRS
          </Link>
          <p className="text-sm text-slate-500 mt-1">
            {isLogin ? 'Masuk ke akun Anda' : 'Buat akun baru untuk mulai menyusun jadwal'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-slate-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="usernameanda"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md text-sm font-medium transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Memproses...' : isLogin ? 'Masuk' : 'Daftar'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-500">
          {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-medium hover:underline cursor-pointer ml-1"
          >
            {isLogin ? 'Daftar sekarang' : 'Masuk di sini'}
          </button>
        </div>
      </div>
    </div>
  );
}