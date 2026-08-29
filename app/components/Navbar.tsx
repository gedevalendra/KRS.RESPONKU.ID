'use client';

import { signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, Menu } from 'lucide-react';

interface NavbarProps {
  session: any;
  onOpenSidebar: () => void;
}

export default function Navbar({ session, onOpenSidebar }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-black/5 cursor-pointer"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="leading-tight">
              <p className="font-bold text-[15px] sm:text-lg tracking-tight">RESPONKU KRS</p>
              <p className="hidden sm:block text-[11px] text-black/50 -mt-0.5">Susun KRS tanpa bentrok</p>
            </div>
          </div>
        </div>

        <div>
          {!session ? (
            <button
              onClick={() => signIn('google')}
              className="bg-black hover:bg-black/80 text-white px-3.5 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> <span className="hidden xs:inline">Masuk Google</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline text-sm font-medium text-black/70 max-w-[160px] truncate">{session.user?.name}</span>
              <button
                onClick={() => signOut()}
                className="border border-black/15 hover:bg-black/5 text-black px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition cursor-pointer"
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
