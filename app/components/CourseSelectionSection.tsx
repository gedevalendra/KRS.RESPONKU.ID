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
    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
      <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-base text-slate-900">Pilih Mata Kuliah</h2>
          </div>
          <p className="text-sm text-slate-500">Centang mata kuliah yang ingin diambil. Maksimal {MAX_SKS} SKS.</p>
        </div>
        <div
          className={`px-3.5 py-2 rounded-md text-sm font-semibold flex items-center gap-2 border ${
            isOverLimit ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-blue-100 bg-blue-50 text-blue-700'
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
                isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="font-mono text-xs font-semibold">{course.code}</span>
                <span className={`flex items-center gap-1 text-[11px] ${isChecked ? 'text-white/80' : 'text-slate-500'}`}>
                  {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {course.sks} SKS
                </span>
              </div>
              <p className="font-semibold text-sm mt-1.5 leading-snug">{course.name}</p>
              {hasNoLecturer ? (
                <p className={`text-xs mt-1 flex items-center gap-1 ${isChecked ? 'text-white/70' : 'text-amber-600'}`}>
                  <Info className="w-3 h-3" /> Dosen belum tersedia
                </p>
              ) : (
                <p className={`text-xs mt-1 line-clamp-2 ${isChecked ? 'text-white/75' : 'text-slate-500'}`}>
                  {course.lecturers.join(', ')}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <DayOffOption dayOffSettings={dayOffSettings} onToggle={onToggleDayOff} onChangePreferredDay={onChangePreferredOffDay} />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <p className="text-xs text-slate-500">
          {selectedCourseCodes.length} mata kuliah dipilih. Atur dosen favorit di sidebar untuk satu rekomendasi terbaik.
        </p>
        <button
          onClick={onGenerate}
          className="bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md hover:bg-blue-700 transition text-sm flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
        >
          <Wand2 className="w-4 h-4" /> Susun Jadwal Otomatis
        </button>
      </div>
    </section>
  );
}