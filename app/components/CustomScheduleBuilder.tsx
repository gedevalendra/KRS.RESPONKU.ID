'use client';

import { PenSquare, AlertTriangle, CheckCircle2, Bookmark, RotateCcw } from 'lucide-react';
import { Course, UniqueCourseOption, CustomPicks, ScheduleConflictPair } from '../lib/types';

interface CustomScheduleBuilderProps {
  uniqueCourseList: UniqueCourseOption[];
  selectedCourseCodes: string[];
  classOptionsByCode: Record<string, Course[]>;
  customPicks: CustomPicks;
  onPick: (code: string, kelas: string) => void;
  onReset: () => void;
  customScheduleResolved: Course[];
  customConflicts: ScheduleConflictPair[];
  customTotalSks: number;
  customIsComplete: boolean;
  onUseCustomSchedule: () => void;
}

// Sekarang ini halaman tersendiri ("/manual"), jadi tidak perlu lagi
// accordion buka/tutup seperti sebelumnya — langsung tampil penuh.
export default function CustomScheduleBuilder({
  uniqueCourseList,
  selectedCourseCodes,
  classOptionsByCode,
  customPicks,
  onPick,
  onReset,
  customScheduleResolved,
  customConflicts,
  customTotalSks,
  customIsComplete,
  onUseCustomSchedule,
}: CustomScheduleBuilderProps) {
  const conflictedKeys = new Set<string>();
  customConflicts.forEach(({ a, b }) => {
    conflictedKeys.add(`${a['Kode Mata Kuliah']}::${a['Kelas']}`);
    conflictedKeys.add(`${b['Kode Mata Kuliah']}::${b['Kelas']}`);
  });

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <PenSquare className="w-4 h-4 text-blue-600" />
        <h2 className="font-bold text-base text-slate-900">Susun KRS Manual</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Pilih sendiri kelas (mis. RA / RB) untuk tiap mata kuliah. Bentrok jam akan otomatis dicek di bagian bawah.
      </p>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {selectedCourseCodes.map((code) => {
            const course = uniqueCourseList.find((c) => c.code === code);
            const options = classOptionsByCode[code] || [];
            const pickedKelas = customPicks[code] || '';
            const isConflicted = pickedKelas && conflictedKeys.has(`${code}::${pickedKelas}`);
            return (
              <div
                key={code}
                className={`border rounded-lg p-3.5 ${isConflicted ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}
              >
                <p className="font-mono text-xs font-semibold text-slate-400">{code}</p>
                <p className="font-semibold text-sm mt-0.5 text-slate-900">{course?.name || code}</p>
                <select
                  value={pickedKelas}
                  onChange={(e) => onPick(code, e.target.value)}
                  className="w-full mt-2 border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
                >
                  <option value="">— Pilih kelas —</option>
                  {options.map((opt) => (
                    <option key={opt['Kelas'] || '-'} value={(opt['Kelas'] || '-').trim().toUpperCase()}>
                      Kelas {opt['Kelas'] || '-'} · {opt['Hari']}, {opt['Jam Mulai (Ex : 07:00)']}–{opt['Jam Berakhir (Ex: 10:00)']}
                      {opt['Dosen'] ? ` · ${opt['Dosen']}` : ''}
                    </option>
                  ))}
                </select>
                {isConflicted && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-rose-600">
                    <AlertTriangle className="w-3 h-3" /> Bentrok dengan kelas lain yang dipilih
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="text-sm">
            {customConflicts.length > 0 ? (
              <p className="flex items-center gap-1.5 font-medium text-rose-600">
                <AlertTriangle className="w-4 h-4" /> Ditemukan {customConflicts.length} bentrok jam. Ganti kelas yang ditandai di atas.
              </p>
            ) : customScheduleResolved.length > 0 ? (
              <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Tidak ada bentrok
                {customIsComplete ? '' : ` (baru ${customScheduleResolved.length}/${selectedCourseCodes.length} mata kuliah dipilih kelasnya)`}
                .
              </p>
            ) : (
              <p className="text-slate-400">Pilih kelas untuk mulai pengecekan.</p>
            )}
            {customScheduleResolved.length > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                {customScheduleResolved.length} mata kuliah dipilih · {customTotalSks} SKS
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onReset}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-md text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={onUseCustomSchedule}
              disabled={customScheduleResolved.length === 0 || customConflicts.length > 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Bookmark className="w-3.5 h-3.5" /> Gunakan Susunan Ini
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}