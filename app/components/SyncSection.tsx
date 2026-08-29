'use client';

import { Link2, RefreshCw, Lock, Pencil, CheckCircle2, AlertTriangle } from 'lucide-react';
import { UpdateBadge } from '../lib/types';

interface SyncSectionProps {
  sheetUrl: string;
  setSheetUrl: (v: string) => void;
  isLoading: boolean;
  isLinkLocked: boolean;
  updateBadge: UpdateBadge;
  coursesCount: number;
  droppedSelection: string[];
  onSync: () => void;
  onUnlock: () => void;
  lastCheckedAt: string | null; // Tambahan prop untuk waktu terakhir dicek
}

// Step 1 — Sinkronisasi spreadsheet, terkunci setelah berhasil sinkron
export default function SyncSection({
  sheetUrl,
  setSheetUrl,
  isLoading,
  isLinkLocked,
  updateBadge,
  coursesCount,
  droppedSelection,
  onSync,
  onUnlock,
  lastCheckedAt,
}: SyncSectionProps) {
  return (
    <section className="bg-white border border-black/10 rounded-xl p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4" />
        <h2 className="font-bold text-base">1. Hubungkan Spreadsheet</h2>
      </div>
      <p className="text-sm text-black/50 mb-4">
        Tempel link Google Sheets berisi daftar mata kuliah. Setelah tersinkron, link ini disimpan otomatis agar tidak perlu ditempel ulang. Mata kuliah yang sudah Anda pilih juga akan tetap tersimpan walau disinkronkan ulang.
      </p>

      {isLinkLocked ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 flex items-center gap-2 border border-black/10 bg-black/[0.03] rounded-md px-3 py-2.5 text-sm text-black/60 min-w-0">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{sheetUrl}</span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onSync}
              disabled={isLoading}
              className="border border-black/15 hover:bg-black/5 px-3.5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Cek Pembaruan
            </button>
            <button
              onClick={onUnlock}
              className="border border-black/15 hover:bg-black/5 px-3 py-2.5 rounded-md text-sm flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="w-4 h-4" /> Ubah
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            className="flex-1 border border-black/15 rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
          <button
            onClick={onSync}
            disabled={isLoading}
            className="bg-black text-white px-5 py-2.5 rounded-md hover:bg-black/80 transition flex items-center justify-center gap-2 text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Menyinkronkan...' : 'Sinkronkan'}
          </button>
        </div>
      )}

      {/* Badge status pembaruan */}
      {updateBadge === 'first' && (
        <p className="mt-3 text-xs text-black/60 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> {coursesCount} baris jadwal berhasil dimuat &amp; link disimpan.
        </p>
      )}
      {updateBadge === 'same' && (
        <p className="mt-3 text-xs text-black/60 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Jadwal terkini — tidak ada perubahan sejak terakhir dicek.
        </p>
      )}
      {updateBadge === 'changed' && (
        <p className="mt-3 inline-flex text-xs font-medium text-black bg-black/5 border border-dashed border-black/30 rounded-full px-3 py-1.5 items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Ada perubahan pada spreadsheet — lihat detail di bawah.
        </p>
      )}

      {/* Informasi waktu terakhir dicek */}
      {lastCheckedAt && (
        <p className="mt-2 text-xs text-black/40">
          Terakhir diperiksa pada: {new Date(lastCheckedAt).toLocaleString('id-ID')}
        </p>
      )}

      {droppedSelection.length > 0 && (
        <p className="mt-2 text-xs text-black/70 bg-black/[0.03] border border-black/10 rounded-md px-3 py-2">
          {droppedSelection.length} mata kuliah yang sebelumnya Anda pilih sudah tidak ada di spreadsheet dan otomatis dihapus dari pilihan: {droppedSelection.join(', ')}.
        </p>
      )}
    </section>
  );
}