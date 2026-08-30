'use client';

import { useRouter } from 'next/navigation';
import { PenSquare } from 'lucide-react';
import { useKrs } from '../../context/KrsPlannerContext';
import CustomScheduleBuilder from '../../components/CustomScheduleBuilder';

export default function ManualPage() {
  const krs = useKrs();
  const router = useRouter();

  if (krs.selectedCourseCodes.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <PenSquare className="w-8 h-8 mx-auto mb-3" />
        <p className="text-sm">Pilih dulu mata kuliah di halaman &quot;Pilih Mata Kuliah&quot; sebelum menyusun manual.</p>
      </div>
    );
  }

  return (
    <CustomScheduleBuilder
      uniqueCourseList={krs.uniqueCourseList}
      selectedCourseCodes={krs.selectedCourseCodes}
      classOptionsByCode={krs.classOptionsByCode}
      customPicks={krs.customPicks}
      onPick={krs.setCustomPick}
      onReset={krs.clearCustomPicks}
      customScheduleResolved={krs.customScheduleResolved}
      customConflicts={krs.customConflicts}
      customTotalSks={krs.customTotalSks}
      customIsComplete={krs.customIsComplete}
      onUseCustomSchedule={() => {
        krs.useCustomScheduleAsChosen();
        router.push('/jadwal');
      }}
    />
  );
}