'use client';

import { useKrs } from '../../context/KrsPlannerContext';
import SyncSection from '../../components/SyncSection';
import ChangeReportPanel from '../../components/ChangeReportPanel';
import { History } from 'lucide-react';

export default function SyncPage() {
  const krs = useKrs();

  return (
    <div className="space-y-6">
      <SyncSection
        sheetUrl={krs.sheetUrl}
        setSheetUrl={krs.setSheetUrl}
        isLoading={krs.isLoading}
        isLinkLocked={krs.isLinkLocked}
        updateBadge={krs.updateBadge}
        coursesCount={krs.courses.length}
        droppedSelection={krs.droppedSelection}
        onSync={() => krs.fetchSheetFromUrl()}
        onUnlock={krs.handleUnlockLink}
        lastCheckedAt={krs.lastCheckedAt}
        sheetTabs={krs.sheetTabs}
        activeTabName={krs.activeTabName}
        onSwitchTab={krs.handleSwitchTab}
      />

      {krs.changeReport && krs.changeReport.hasChanges && (
        <ChangeReportPanel changeReport={krs.changeReport} onClose={() => krs.setChangeReport(null)} />
      )}

      {/* Bagian Menampilkan Riwayat Histori Perubahan dari Supabase */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-base text-slate-900">Riwayat Perubahan Jadwal Tersimpan</h2>
        </div>

        {krs.historyList && krs.historyList.length > 0 ? (
          <div className="space-y-3">
            {krs.historyList.map((history: any, index: number) => (
              <div key={history.id || index} className="border border-slate-100 bg-slate-50 rounded-lg p-4 text-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Dideteksi pada: {new Date(history.detected_at).toLocaleString('id-ID')}</span>
                </div>
                <p className="text-xs text-slate-600 truncate">Link: {history.spreadsheet_url}</p>
                <div className="text-xs font-medium text-slate-700 mt-2">
                  <span>Ditambahkan: {history.change_details?.added?.length || 0} matkul</span> •{' '}
                  <span>Dihapus: {history.change_details?.removed?.length || 0} matkul</span> •{' '}
                  <span>Diubah: {history.change_details?.changed?.length || 0} matkul</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Belum ada riwayat perubahan jadwal yang tercatat di database.</p>
        )}
      </section>
    </div>
  );
}