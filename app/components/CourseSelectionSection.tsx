'use client';

import { ListChecks, Layers, CheckSquare, Square, Info, Wand2 } from 'lucide-react';
import { UniqueCourseOption, DayOffSettings } from '../lib/types';
import { MAX_SKS } from '../lib/constants';
import DayOffOption from './DayOffOption';

interface CourseSelectionSectionProps {
  uniqueCourseList: UniqueCourseOption[];
  selectedCourseCodes: string[];
  totalSelectedSks: number;
  isOverLimit: boolean;
  onToggleCourse: (code: string) => void;
  onGenerate: () => void;
  dayOffSettings: DayOffSettings;
  onToggleDayOff: (enabled: boolean) => void;
  onChangePreferredOffDay: (day: string) => void;
}

// Step 2 — Pilih mata kuliah
export default function CourseSelectionSection({
  uniqueCourseList,
  selectedCourseCodes,
  totalSelectedSks,
  isOverLimit,
  onToggleCourse,
  onGenerate,
  dayOffSettings,
  onToggleDayOff,
  onChangePreferredOffDay,
}: CourseSelectionSectionProps) {
  return (
    <section className="bg-white border border-black/10 rounded-xl p-5 sm:p-6">
      <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-4 h-4" />
            <h2 className="font-bold text-base">2. Pilih Mata Kuliah</h2>
          </div>
          <p className="text-sm text-black/50">Centang mata kuliah yang ingin diambil. Maksimal {MAX_SKS} SKS.</p>
        </div>
        <div
          className={`px-3.5 py-2 rounded-md text-sm font-semibold flex items-center gap-2 border ${
            isOverLimit ? 'border-black bg-black text-white' : 'border-black/15 bg-black/[0.03]'
          }`}
        >
          <Layers className="w-4 h-4" /> {totalSelectedSks}/{MAX_SKS} SKS
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[26rem] overflow-y-auto p-1">
        {uniqueCourseList.map((course) => {
          const isChecked = selectedCourseCodes.includes(course.code);
          const hasNoLecturer = course.lecturers.length === 0;
          return (
            <button
              type="button"
              key={course.code}
              onClick={() => onToggleCourse(course.code)}
              className={`relative text-left p-3.5 rounded-lg border transition cursor-pointer ${
                isChecked ? 'bg-black border-black text-white' : 'bg-white border-black/15 hover:border-black/40'
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="font-mono text-xs font-semibold">{course.code}</span>
                <span className={`flex items-center gap-1 text-[11px] ${isChecked ? 'text-white/80' : 'text-black/50'}`}>
                  {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {course.sks} SKS
                </span>
              </div>
              <p className="font-semibold text-sm mt-1.5 leading-snug">{course.name}</p>
              {hasNoLecturer ? (
                <p className={`text-xs mt-1 flex items-center gap-1 ${isChecked ? 'text-white/70' : 'text-black/40'}`}>
                  <Info className="w-3 h-3" /> Dosen belum tersedia
                </p>
              ) : (
                <p className={`text-xs mt-1 line-clamp-2 ${isChecked ? 'text-white/75' : 'text-black/50'}`}>
                  {course.lecturers.join(', ')}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-black/10 pt-4">
        <DayOffOption dayOffSettings={dayOffSettings} onToggle={onToggleDayOff} onChangePreferredDay={onChangePreferredOffDay} />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <p className="text-xs text-black/50">
          {selectedCourseCodes.length} mata kuliah dipilih. Atur dosen favorit di sidebar untuk satu rekomendasi terbaik.
        </p>
        <button
          onClick={onGenerate}
          className="bg-black text-white font-medium py-2.5 px-5 rounded-md hover:bg-black/80 transition text-sm flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
        >
          <Wand2 className="w-4 h-4" /> Susun Jadwal Otomatis
        </button>
      </div>
    </section>
  );
}
