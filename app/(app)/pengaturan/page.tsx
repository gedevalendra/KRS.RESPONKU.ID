'use client';

import { Settings } from 'lucide-react';
import { useKrs } from '../../context/KrsPlannerContext';
import RealtimeSyncPanel from '../../components/RealtimeSyncPanel';

export default function PengaturanPage() {
  const krs = useKrs();

  if (!krs.isLinkLocked) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Settings className="w-8 h-8 mx-auto mb-3" />
        <p className="text-sm">Sinkronkan spreadsheet dulu di halaman Sinkronisasi untuk mengakses pengaturan ini.</p>
      </div>
    );
  }

  return (
    <RealtimeSyncPanel
      isLinkLocked={krs.isLinkLocked}
      realtimeSettings={krs.realtimeSettings}
      onToggleRealtime={krs.setRealtimeEnabled}
      onChangeIntervalMs={krs.setRealtimeIntervalMs}
      emailReminder={krs.emailReminder}
      onToggleEmailReminder={krs.setEmailReminderEnabled}
      onChangeEmail={krs.setReminderEmail}
      lastCheckedAt={krs.lastCheckedAt}
      isCheckingRealtime={krs.isCheckingRealtime}
    />
  );
}