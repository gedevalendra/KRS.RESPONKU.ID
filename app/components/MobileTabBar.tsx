'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Link2, ListChecks, CalendarCheck, Settings } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/sync', label: 'Sync', icon: Link2 },
  { href: '/pilih', label: 'Pilih', icon: ListChecks },
  { href: '/jadwal', label: 'Jadwal', icon: CalendarCheck },
  { href: '/pengaturan', label: 'Setelan', icon: Settings },
];

// Navigasi cepat khusus mobile — menggantikan kebiasaan scroll panjang.
// Menu "Susun Manual" tetap bisa diakses lewat kartu di Beranda / sidebar drawer.
export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname?.startsWith(`${tab.href}/`));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}