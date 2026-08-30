'use client';

import { MAX_SKS } from '../lib/constants';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 mt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} RESPONKU KRS by Nivalesha</p>
        <p className="font-mono">Batas maksimum: {MAX_SKS} SKS / semester</p>
      </div>
    </footer>
  );
}