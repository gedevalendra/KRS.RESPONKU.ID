'use client';

import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, Menu, CalendarRange } from 'lucide-react';

interface NavbarProps {
  session: any;
  onOpenSidebar: () => void;
}

export default function Navbar({ session, onOpenSidebar }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-slate-100 cursor-pointer"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="leading-tight">
              <p className="font-bold text-[15px] sm:text-lg tracking-tight text-slate-900">RESPONKU KRS</p>
              <p className="hidden sm:block text-[11px] text-slate-400 -mt-0.5">Susun KRS tanpa bentrok</p>
            </div>
          </Link>
        </div>

        <div>
          {!session ? (
            <button
              onClick={() => signIn('google')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> <span className="hidden xs:inline">Masuk Google</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline text-sm font-medium text-slate-600 max-w-[160px] truncate">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}