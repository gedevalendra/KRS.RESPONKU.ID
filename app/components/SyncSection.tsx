'use client';

import { Link2, RefreshCw, Lock, Pencil, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
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
  lastCheckedAt: string | null;
  sheetTabs: string[];
  activeTabName: string;
  onSwitchTab: (tabName: string) => void;
}

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
  sheetTabs,
  activeTabName,
  onSwitchTab,
}: SyncSectionProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-blue-600" />
        <h2 className="font-bold text-base text-slate-900">Hubungkan Spreadsheet</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Tempel link Google Sheets berisi daftar mata kuliah. Setelah tersinkron, link ini disimpan otomatis agar tidak perlu ditempel ulang. Mata kuliah yang sudah Anda pilih juga akan tetap tersimpan walau disinkronkan ulang.
      </p>

      {isLinkLocked ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1 flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-md px-3 py-2.5 text-sm text-slate-500 min-w-0">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{sheetUrl}</span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={onSync}
                disabled={isLoading}
                className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Cek Pembaruan
              </button>
              <button
                onClick={onUnlock}
                className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-md text-sm flex items-center gap-2 cursor-pointer"
              >
                <Pencil className="w-4 h-4" /> Ubah
              </button>
            </div>
          </div>

          {sheetTabs.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap bg-blue-50/60 border border-blue-100 rounded-lg p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Pilih Tab Jurusan:
              </span>
              <select
                value={activeTabName}
                onChange={(e) => onSwitchTab(e.target.value)}
                disabled={isLoading}
                className="border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              >
                {sheetTabs.map((tab) => (
                  <option key={tab} value={tab}>
                    Tab: {tab}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            className="flex-1 border border-slate-200 rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={onSync}
            disabled={isLoading}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Menyinkronkan...' : 'Sinkronkan'}
          </button>
        </div>
      )}

      {updateBadge === 'first' && (
        <p className="mt-3 text-xs text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> {coursesCount} baris jadwal berhasil dimuat &amp; link disimpan.
        </p>
      )}
      {updateBadge === 'same' && (
        <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Jadwal terkini — tidak ada perubahan sejak terakhir dicek.
        </p>
      )}
      {updateBadge === 'changed' && (
        <p className="mt-3 inline-flex text-xs font-medium text-amber-800 bg-amber-50 border border-dashed border-amber-300 rounded-full px-3 py-1.5 items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Ada perubahan pada spreadsheet — lihat detail di bawah.
        </p>
      )}

      {lastCheckedAt && (
        <p className="mt-2 text-xs text-slate-400">
          Terakhir diperiksa pada: {new Date(lastCheckedAt).toLocaleString('id-ID')}
        </p>
      )}

      {droppedSelection.length > 0 && (
        <p className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
          {droppedSelection.length} mata kuliah yang sebelumnya Anda pilih sudah tidak ada di spreadsheet dan otomatis dihapus dari pilihan: {droppedSelection.join(', ')}.
        </p>
      )}
    </section>
  );
}