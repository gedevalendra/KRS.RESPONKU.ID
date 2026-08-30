'use client';

import { createContext, useContext } from 'react';
import { useKrsPlanner } from '../hooks/useKrsPlanner';

// Tipe diambil otomatis dari hook aslinya — kalau hook-nya berubah,
// tipe di sini ikut menyesuaikan tanpa perlu diketik ulang manual.
export type KrsPlannerValue = ReturnType<typeof useKrsPlanner>;

const KrsPlannerContext = createContext<KrsPlannerValue | null>(null);

// Provider ini dipasang SATU KALI di app/(app)/layout.tsx, membungkus semua
// halaman (sync, pilih, manual, jadwal, pengaturan). Karena layout tidak
// remount saat pindah halaman, seluruh state (SKS terpilih, dosen favorit,
// jadwal tersimpan, dll) otomatis tetap ada walau pindah menu.
export function KrsPlannerProvider({ children }: { children: React.ReactNode }) {
  const krs = useKrsPlanner();
  return <KrsPlannerContext.Provider value={krs}>{children}</KrsPlannerContext.Provider>;
}

export function useKrs(): KrsPlannerValue {
  const ctx = useContext(KrsPlannerContext);
  if (!ctx) {
    throw new Error('useKrs() harus dipakai di dalam <KrsPlannerProvider> (lihat app/(app)/layout.tsx)');
  }
  return ctx;
}