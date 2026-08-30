'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Star, X, Users, Home, Link2, ListChecks, PenSquare, CalendarCheck, Settings } from 'lucide-react';
import type { KrsPlannerValue } from '../context/KrsPlannerContext';

interface SidebarContentProps {
  krs: KrsPlannerValue;
  onNavigate?: () => void;
}

const NAV_ITEMS = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/sync', label: 'Sinkronisasi', icon: Link2 },
  { href: '/pilih', label: 'Pilih Mata Kuliah', icon: ListChecks },
  { href: '/manual', label: 'Susun Manual', icon: PenSquare },
  { href: '/jadwal', label: 'Jadwal Saya', icon: CalendarCheck },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
];

// Sidebar sekarang dua fungsi: (1) menu navigasi ke tiap halaman, dan
// (2) widget ringkas (SKS, dosen favorit, pengunjung) yang tetap relevan
// di halaman manapun — jadi tidak perlu diulang di tiap page.
export default function SidebarContent({ krs, onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const {
    totalSelectedSks,
    isOverLimit,
    sksPct,
    selectedCourseCodes,
    goldlistTags,
    goldlistInput,
    setGoldlistInput,
    lecturerSuggestions,
    addLecturerTag,
    removeLecturerTag,
  } = krs;

  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [visitorError, setVisitorError] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function pingPresence(isNewVisit: boolean) {
      try {
        const res = await fetch(`/api/presence${isNewVisit ? '?newVisit=1' : ''}`, { method: 'POST' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.online === 'number') setOnlineCount(data.online);
        if (typeof data.total === 'number') setVisitorCount(data.total);
        setVisitorError(false);
      } catch (err) {
        console.warn('Gagal memuat data pengunjung:', err);
        if (!cancelled) setVisitorError(true);
      }
    }

    pingPresence(true);
    intervalId = setInterval(() => pingPresence(false), 25000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="space-y-8">
      <nav>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Menu</p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Ringkasan SKS</p>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-rose-500' : 'bg-blue-600'}`}
            style={{ width: `${sksPct}%` }}
          />
        </div>
        <p className="font-mono text-sm mt-2 text-slate-700">{totalSelectedSks} / 24 SKS</p>
        <p className="text-xs text-slate-400 mt-0.5">{selectedCourseCodes.length} mata kuliah dipilih</p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-blue-600" /> Dosen favorit
        </label>

        {goldlistTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {goldlistTags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full">
                {tag}
                <button onClick={() => removeLecturerTag(tag)} className="hover:opacity-70 cursor-pointer" aria-label={`Hapus ${tag}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            placeholder="Pilih dari daftar atau ketik nama"
            value={goldlistInput}
            onChange={(e) => setGoldlistInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLecturerTag(goldlistInput);
              }
            }}
            className="w-full border border-slate-200 bg-white rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {goldlistInput && lecturerSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
              {lecturerSuggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => addLecturerTag(name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Ketik lalu tekan Enter untuk menambah manual, atau pilih dari daftar dosen yang ada di spreadsheet. Kosongkan bila ingin melihat beberapa opsi jadwal sekaligus.
        </p>
      </div>

      <div className="pt-4 border-t border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
            </span>
            Online Sekarang
          </span>
          <span className="font-mono font-bold text-blue-700">
            {onlineCount !== null ? onlineCount.toLocaleString('id-ID') : visitorError ? '-' : '...'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-600 bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5">
          <span className="flex items-center gap-1.5 font-medium">
            <Users className="w-4 h-4 text-blue-600" /> Total Pengunjung
          </span>
          <span className="font-mono font-bold text-blue-700">
            {visitorCount !== null ? visitorCount.toLocaleString('id-ID') : visitorError ? '-' : '...'}
          </span>
        </div>
      </div>
    </div>
  );
}