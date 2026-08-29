'use client';

import { useState } from 'react';
import { PenSquare, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Bookmark, RotateCcw } from 'lucide-react';
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

// Alternatif dari "Susun Jadwal Otomatis" — di sini user pilih sendiri kelas
// (RA/RB/dst) untuk tiap mata kuliah yang sudah dicentang di atas, lalu
// bentroknya dicek otomatis begitu semua/​sebagian kelas sudah dipilih.
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
  const [isOpen, setIsOpen] = useState(false);

  if (selectedCourseCodes.length === 0) return null;

  const conflictedKeys = new Set<string>();
  customConflicts.forEach(({ a, b }) => {
    conflictedKeys.add(`${a['Kode Mata Kuliah']}::${a['Kelas']}`);
    conflictedKeys.add(`${b['Kode Mata Kuliah']}::${b['Kelas']}`);
  });

  return (
    <section className="bg-white border border-black/10 rounded-xl p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <PenSquare className="w-4 h-4" />
          <h2 className="font-bold text-base text-left">Atau, Susun KRS Manual</h2>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <p className="text-sm text-black/50 mt-1 text-left">
        Pilih sendiri kelas (mis. RA / RB) untuk tiap mata kuliah. Bentrok jam akan otomatis dicek di bagian bawah.
      </p>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {selectedCourseCodes.map((code) => {
              const course = uniqueCourseList.find((c) => c.code === code);
              const options = classOptionsByCode[code] || [];
              const pickedKelas = customPicks[code] || '';
              const isConflicted = pickedKelas && conflictedKeys.has(`${code}::${pickedKelas}`);
              return (
                <div
                  key={code}
                  className={`border rounded-lg p-3.5 ${isConflicted ? 'border-black bg-black/[0.03]' : 'border-black/15'}`}
                >
                  <p className="font-mono text-xs font-semibold text-black/50">{code}</p>
                  <p className="font-semibold text-sm mt-0.5">{course?.name || code}</p>
                  <select
                    value={pickedKelas}
                    onChange={(e) => onPick(code, e.target.value)}
                    className="w-full mt-2 border border-black/15 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
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
                    <p className="text-xs mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Bentrok dengan kelas lain yang dipilih
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-black/10 pt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="text-sm">
              {customConflicts.length > 0 ? (
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4" /> Ditemukan {customConflicts.length} bentrok jam. Ganti kelas yang ditandai di atas.
                </p>
              ) : customScheduleResolved.length > 0 ? (
                <p className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Tidak ada bentrok
                  {customIsComplete ? '' : ` (baru ${customScheduleResolved.length}/${selectedCourseCodes.length} mata kuliah dipilih kelasnya)`}
                  .
                </p>
              ) : (
                <p className="text-black/50">Pilih kelas untuk mulai pengecekan.</p>
              )}
              {customScheduleResolved.length > 0 && (
                <p className="text-xs text-black/50 mt-0.5">
                  {customScheduleResolved.length} mata kuliah dipilih · {customTotalSks} SKS
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={onReset}
                className="border border-black/15 hover:bg-black/5 px-3 py-2 rounded-md text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                onClick={onUseCustomSchedule}
                disabled={customScheduleResolved.length === 0 || customConflicts.length > 0}
                className="bg-black text-white px-4 py-2 rounded-md hover:bg-black/80 transition text-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Bookmark className="w-3.5 h-3.5" /> Gunakan Susunan Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
