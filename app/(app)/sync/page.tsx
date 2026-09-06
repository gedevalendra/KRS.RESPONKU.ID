'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useKrs } from '../../context/KrsPlannerContext';
import SyncSection from '../../components/SyncSection';
import ChangeReportPanel from '../../components/ChangeReportPanel';
import { History, Mail } from 'lucide-react';

export default function SyncPage() {
  const krs = useKrs();
  const { data: session } = useSession();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

const handleSendReportEmail = async (historyItem: any) => {
    const userEmail = session?.user?.email;
    if (!userEmail) {
      alert('Email pengguna tidak ditemukan dari sesi aktif. Silakan login ulang.');
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      // Pastikan objek details yang dikirim tidak mentah atau kosong
      const rawDetails = historyItem.change_details;
      const parsedDetails = typeof rawDetails === 'string' ? JSON.parse(rawDetails) : rawDetails;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          subject: 'Laporan Perubahan Jadwal KRS Terbaru',
          details: parsedDetails, // Kirim objek terstruktur
          detectedAt: historyItem.detected_at,
          spreadsheetUrl: historyItem.spreadsheet_url,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setEmailStatus('Berhasil mengirim laporan perubahan ke email Anda!');
      } else {
        setEmailStatus(`Gagal mengirim email: ${result.error || 'Terjadi kesalahan'}`);
      }
    } catch (err: any) {
      setEmailStatus(`Gagal mengirim email: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

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

      {/* Bagian Menampilkan Riwayat Histori Perubahan & Tombol Kirim Email */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-base text-slate-900">Riwayat Perubahan Jadwal Tersimpan</h2>
          </div>
          {session?.user?.email && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Email aktif: {session.user.email}
            </span>
          )}
        </div>

        {emailStatus && (
          <div className="mb-4 p-3 text-xs rounded-lg bg-blue-50 border border-blue-100 text-blue-700">
            {emailStatus}
          </div>
        )}

        {krs.historyList && krs.historyList.length > 0 ? (
          <div className="space-y-3">
            {krs.historyList.map((history: any, index: number) => {
              // Mengambil jumlah perubahan secara aman untuk ditampilkan di card UI
              const detailsObj = typeof history.change_details === 'string' 
                ? JSON.parse(history.change_details) 
                : history.change_details;

              const addedLen = detailsObj?.added?.length || 0;
              const removedLen = detailsObj?.removed?.length || 0;
              const changedLen = detailsObj?.changed?.length || 0;

              return (
                <div key={history.id || index} className="border border-slate-100 bg-slate-50 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Dideteksi pada: {new Date(history.detected_at).toLocaleString('id-ID')}</span>
                    <button
                      onClick={() => handleSendReportEmail(history)}
                      disabled={isSendingEmail}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50 text-xs shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {isSendingEmail ? 'Mengirim...' : 'Kirim ke Email'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 truncate">Link: {history.spreadsheet_url}</p>
                  <div className="text-xs font-medium text-slate-700 mt-2">
                    <span>Ditambahkan: {addedLen} matkul</span> •{' '}
                    <span>Dihapus: {removedLen} matkul</span> •{' '}
                    <span>Diubah: {changedLen} matkul</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Belum ada riwayat perubahan jadwal yang tercatat di database.</p>
        )}
      </section>
    </div>
  );
}