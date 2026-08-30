'use client';

import { History, X, Plus, Minus, Pencil } from 'lucide-react';
import { ChangeReport } from '../lib/types';

interface ChangeReportPanelProps {
  changeReport: ChangeReport;
  onClose: () => void;
}

export default function ChangeReportPanel({ changeReport, onClose }: ChangeReportPanelProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-base text-slate-900">Perubahan Sejak Sinkron Terakhir</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-slate-100 cursor-pointer flex-shrink-0"
          aria-label="Tutup panel perubahan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {changeReport.added.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Ditambahkan ({changeReport.added.length})
            </p>
            <ul className="space-y-1.5">
              {changeReport.added.map((item) => (
                <li key={item.key} className="text-sm bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
                  <span className="font-semibold">{item.name}</span>{' '}
                  <span className="text-slate-500 text-xs">
                    ({item.code} · Kelas {item.kelas || '-'} · {item.after?.['Hari']}, {item.after?.['Jam Mulai (Ex : 07:00)']}–{item.after?.['Jam Berakhir (Ex: 10:00)']})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {changeReport.removed.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 mb-2 flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5" /> Dihapus ({changeReport.removed.length})
            </p>
            <ul className="space-y-1.5">
              {changeReport.removed.map((item) => (
                <li key={item.key} className="text-sm bg-rose-50 border border-rose-100 rounded-md px-3 py-2">
                  <span className="font-semibold">{item.name}</span>{' '}
                  <span className="text-slate-500 text-xs">
                    ({item.code} · Kelas {item.kelas || '-'} · dulunya {item.before?.['Hari']}, {item.before?.['Jam Mulai (Ex : 07:00)']}–{item.before?.['Jam Berakhir (Ex: 10:00)']})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {changeReport.changed.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2 flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Diubah ({changeReport.changed.length})
            </p>
            <ul className="space-y-1.5">
              {changeReport.changed.map((item) => (
                <li key={item.key} className="text-sm bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                  <span className="font-semibold">{item.name}</span>{' '}
                  <span className="text-slate-500 text-xs">
                    ({item.code} · Kelas {item.kelas || '-'})
                  </span>
                  <ul className="mt-1 ml-4 list-disc text-xs text-slate-600 space-y-0.5">
                    {item.detail?.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}