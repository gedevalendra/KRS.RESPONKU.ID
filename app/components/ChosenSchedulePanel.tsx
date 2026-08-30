'use client';

import { ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { ChosenScheduleRecord, ChosenValidation } from '../lib/types';

interface ChosenSchedulePanelProps {
  chosenSchedule: ChosenScheduleRecord;
  chosenValidation: ChosenValidation | null;
  chosenScheduleResolved: any[];
  onClear: () => void;
}

export default function ChosenSchedulePanel({
  chosenSchedule,
  chosenValidation,
  chosenScheduleResolved,
  onClear,
}: ChosenSchedulePanelProps) {
  const hasIssue = chosenValidation && !chosenValidation.ok;

  return (
    <section className={`rounded-xl p-5 sm:p-6 border ${hasIssue ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          {hasIssue ? <ShieldAlert className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
          <h2 className="font-bold text-base text-slate-900">Jadwal yang Sedang Digunakan</h2>
        </div>
        <button
          onClick={onClear}
          className="text-xs border border-rose-200 text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> Batalkan Pilihan
        </button>
      </div>

      {chosenValidation && (
        <ul className="space-y-1.5 mb-4">
          {chosenValidation.messages.map((m, i) => (
            <li key={i} className="text-sm bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              {m}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-500 mb-3">
        {chosenScheduleResolved.length} mata kuliah · {chosenValidation ? chosenValidation.totalSksAfter : chosenSchedule.totalSks} SKS
        {chosenValidation && chosenValidation.totalSksBefore !== chosenValidation.totalSksAfter
          ? ` (sebelumnya ${chosenValidation.totalSksBefore} SKS)`
          : ''}
      </p>

      <div className="space-y-2">
        {chosenScheduleResolved.map((item: any, idx) => {
          // Normalisasi field agar aman dibaca dari berbagai variasi key spreadsheet
          const namaMatkul = item['Nama Mata Kuliah'] || item.namaMatkul || item.matkul || 'Mata Kuliah';
          const kodeMatkul = item['Kode Mata Kuliah'] || item.kodeMatkul || '-';
          const kelas = item['Kelas'] || item.kelas || '-';
          const hari = item['Hari'] || item.hari || '-';
          const jamMulai = item['Jam Mulai (Ex : 07:00)'] || item.jamMulai || item.jam_mulai || '-';
          const jamSelesai = item['Jam Berakhir (Ex: 10:00)'] || item.jamSelesai || item.jam_selesai || '-';

          return (
            <div
              key={idx}
              className={`border rounded-lg p-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 ${
                item.__missing ? 'border-rose-300 border-dashed bg-rose-50' : 'border-slate-200'
              }`}
            >
              <div>
                <span className="font-semibold">{namaMatkul}</span>{' '}
                <span className="text-slate-500 text-xs">({kodeMatkul} · Kelas {kelas})</span>
                {item.__missing && <span className="ml-2 text-xs font-medium text-rose-600">— sudah tidak tersedia</span>}
              </div>
              {!item.__missing && (
                <span className="text-xs text-blue-700 font-mono">
                  {hari} · {jamMulai}–{jamSelesai}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}