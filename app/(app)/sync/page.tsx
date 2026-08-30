'use client';

import { useKrs } from '../../context/KrsPlannerContext';
import SyncSection from '../../components/SyncSection';
import ChangeReportPanel from '../../components/ChangeReportPanel';

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
    </div>
  );
}