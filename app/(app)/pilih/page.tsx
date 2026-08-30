'use client';

import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { useKrs } from '../../context/KrsPlannerContext';
import CourseSelectionSection from '../../components/CourseSelectionSection';
import ConflictAlert from '../../components/ConflictAlert';

export default function PilihPage() {
  const krs = useKrs();
  const router = useRouter();

  if (krs.uniqueCourseList.length === 0 && krs.courses.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <BookOpen className="w-8 h-8 mx-auto mb-3" />
        <p className="text-sm">Belum ada data. Sinkronkan spreadsheet dulu di halaman Sinkronisasi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CourseSelectionSection
        uniqueCourseList={krs.uniqueCourseList}
        selectedCourseCodes={krs.selectedCourseCodes}
        totalSelectedSks={krs.totalSelectedSks}
        isOverLimit={krs.isOverLimit}
        onToggleCourse={krs.toggleCourseSelection}
        onGenerate={() => {
          krs.generateBestSchedule();
          router.push('/jadwal');
        }}
        dayOffSettings={krs.dayOffSettings}
        onToggleDayOff={krs.setDayOffEnabled}
        onChangePreferredOffDay={krs.setPreferredOffDay}
      />

      <ConflictAlert message={krs.conflictAlert} />
    </div>
  );
}