'use client';

// ---------------------------------------------------------------------------
// Halaman ini murni "menyusun tampilan": semua state & logika bisnis ada di
// hooks/useKrsPlanner.ts, semua bagian UI ada di folder components/.
//
// Kalau nanti mau MENAMBAH fitur baru → biasanya cukup:
//   1. Tambah state/logika di hooks/useKrsPlanner.ts (atau file lib/ baru)
//   2. Buat komponen baru di components/
//   3. Panggil komponennya di sini
//
// Kalau mau MENGHAPUS fitur → tinggal hapus baris pemanggilan komponennya
// di sini, lalu hapus komponen & state terkait. Bagian lain tidak perlu
// disentuh sama sekali.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import ScheduleChatbot from './ScheduleChatbot';
import { useKrsPlanner } from './hooks/useKrsPlanner';

import Navbar from './components/Navbar';
import SidebarContent from './components/SidebarContent';
import SyncSection from './components/SyncSection';
import ChangeReportPanel from './components/ChangeReportPanel';
import CourseSelectionSection from './components/CourseSelectionSection';
import ConflictAlert from './components/ConflictAlert';
import ScheduleResultSection from './components/ScheduleResultSection';
import ChosenSchedulePanel from './components/ChosenSchedulePanel';
import CustomScheduleBuilder from './components/CustomScheduleBuilder';
import RealtimeSyncPanel from './components/RealtimeSyncPanel';
import Footer from './components/Footer';

export default function AdvancedScheduleApp() {
  const krs = useKrsPlanner();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
if (!krs.isMounted) {
    return null; // Bisa diganti dengan <div>Loading...</div> jika mau
  }
  const sidebarProps = {
    step: krs.step,
    totalSelectedSks: krs.totalSelectedSks,
    isOverLimit: krs.isOverLimit,
    sksPct: krs.sksPct,
    selectedCount: krs.selectedCourseCodes.length,
    goldlistTags: krs.goldlistTags,
    goldlistInput: krs.goldlistInput,
    setGoldlistInput: krs.setGoldlistInput,
    lecturerSuggestions: krs.lecturerSuggestions,
    addLecturerTag: krs.addLecturerTag,
    removeLecturerTag: krs.removeLecturerTag,
  };

  return (
    <div className="min-h-screen bg-white text-black" style={{ fontFamily: "'Poppins', ui-sans-serif, system-ui" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
      `}</style>

      <Navbar session={krs.session} onOpenSidebar={() => setIsSidebarOpen(true)} />

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-black/10 px-5 py-8 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <SidebarContent {...sidebarProps} />
        </aside>

        {/* Sidebar drawer mobile */}
        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
            <div className="relative w-72 max-w-[85%] bg-white h-full px-5 py-6 overflow-y-auto shadow-xl">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-black/5 cursor-pointer"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="mt-8">
                <SidebarContent {...sidebarProps} />
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-8 space-y-6">
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

          {krs.chosenSchedule && (
            <ChosenSchedulePanel
              chosenSchedule={krs.chosenSchedule}
              chosenValidation={krs.chosenValidation}
              chosenScheduleResolved={krs.chosenScheduleResolved}
              onClear={krs.handleClearChosenSchedule}
            />
          )}

          {krs.uniqueCourseList.length > 0 && (
            <CourseSelectionSection
              uniqueCourseList={krs.uniqueCourseList}
              selectedCourseCodes={krs.selectedCourseCodes}
              totalSelectedSks={krs.totalSelectedSks}
              isOverLimit={krs.isOverLimit}
              onToggleCourse={krs.toggleCourseSelection}
              onGenerate={krs.generateBestSchedule}
              dayOffSettings={krs.dayOffSettings}
              onToggleDayOff={krs.setDayOffEnabled}
              onChangePreferredOffDay={krs.setPreferredOffDay}
            />
          )}

          {krs.uniqueCourseList.length > 0 && (
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
              onUseCustomSchedule={krs.useCustomScheduleAsChosen}
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
              copyStatus={krs.copyStatus}
              onUseSchedule={krs.handleUseSchedule}
              onCopyText={krs.handleCopyText}
            />
          )}

          {krs.uniqueCourseList.length === 0 && krs.courses.length === 0 && (
            <div className="text-center py-16 text-black/40">
              <BookOpen className="w-8 h-8 mx-auto mb-3" />
              <p className="text-sm">Belum ada data. Tempel link spreadsheet di atas untuk memulai.</p>
            </div>
          )}

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
        </main>
      </div>

      <Footer />

      <ScheduleChatbot context={krs.chatContext} />
    </div>
  );
}
