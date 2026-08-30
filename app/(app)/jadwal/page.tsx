'use client';

import { CalendarRange } from 'lucide-react';
import { useKrs } from '../../context/KrsPlannerContext';
import ChosenSchedulePanel from '../../components/ChosenSchedulePanel';
import ScheduleResultSection from '../../components/ScheduleResultSection';
import ConflictAlert from '../../components/ConflictAlert';

export default function JadwalPage() {
  const krs = useKrs();
  const hasNothing = !krs.chosenSchedule && krs.scheduleOptions.length === 0;

  return (
    <div className="space-y-6">
      {krs.chosenSchedule && (
        <ChosenSchedulePanel
          chosenSchedule={krs.chosenSchedule}
          chosenValidation={krs.chosenValidation}
          chosenScheduleResolved={krs.chosenScheduleResolved}
          onClear={krs.handleClearChosenSchedule}
        />
      )}

      <ConflictAlert message={krs.conflictAlert} />

      {krs.scheduleOptions.length > 0 && (
        <ScheduleResultSection
          scheduleOptions={krs.scheduleOptions}
          activeOption={krs.activeOption}
          setActiveOption={krs.setActiveOption}
          currentSchedule={krs.currentSchedule}
          chosenSignature={krs.chosenSignature}
          chosenScheduleResolved={krs.chosenScheduleResolved}
          copyStatus={krs.copyStatus}
          onUseSchedule={krs.handleUseSchedule}
          onCopyText={krs.handleCopyText}
        />
      )}

      {hasNothing && (
        <div className="text-center py-16 text-slate-400">
          <CalendarRange className="w-8 h-8 mx-auto mb-3" />
          <p className="text-sm">
            Belum ada jadwal. Buat lewat halaman &quot;Pilih Mata Kuliah&quot; (otomatis) atau &quot;Susun Manual&quot;.
          </p>
        </div>
      )}
    </div>
  );
}