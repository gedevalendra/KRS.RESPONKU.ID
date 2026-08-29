// ---------------------------------------------------------------------------
// Logika "apa yang berubah" — dipisah dari schedule-utils.ts karena ini
// adalah fitur tersendiri (deteksi perubahan spreadsheet & validasi jadwal
// yang sedang dipakai) yang kemungkinan besar akan berkembang sendiri
// terpisah dari fungsi jadwal dasar.
// ---------------------------------------------------------------------------

import { Course, ChangeReport, ChangeReportItem, ChosenValidation } from './types';
import { courseKey, isOverlap, scheduleSks } from './schedule-utils';

// Bandingkan data lama vs baru: apa yang ditambahkan, dihapus, dan diubah.
export function diffCourses(oldList: Course[], newList: Course[]): ChangeReport {
  const oldMap = new Map<string, Course>();
  oldList.forEach((c) => oldMap.set(courseKey(c), c));
  const newMap = new Map<string, Course>();
  newList.forEach((c) => newMap.set(courseKey(c), c));

  const added: ChangeReportItem[] = [];
  const removed: ChangeReportItem[] = [];
  const changed: ChangeReportItem[] = [];

  newMap.forEach((c, key) => {
    if (!oldMap.has(key)) {
      added.push({ key, code: c['Kode Mata Kuliah'] || '', name: c['Nama Mata Kuliah'] || '', kelas: c['Kelas'] || '', after: c });
    }
  });

  oldMap.forEach((c, key) => {
    if (!newMap.has(key)) {
      removed.push({ key, code: c['Kode Mata Kuliah'] || '', name: c['Nama Mata Kuliah'] || '', kelas: c['Kelas'] || '', before: c });
    }
  });

  oldMap.forEach((oldC, key) => {
    const newC = newMap.get(key);
    if (!newC) return;
    const detail: string[] = [];

    if ((oldC['Hari'] || '').trim().toLowerCase() !== (newC['Hari'] || '').trim().toLowerCase()) {
      detail.push(`Hari berubah dari ${oldC['Hari'] || '-'} menjadi ${newC['Hari'] || '-'}`);
    }
    const oldStart = oldC['Jam Mulai (Ex : 07:00)'] || '-';
    const newStart = newC['Jam Mulai (Ex : 07:00)'] || '-';
    const oldEnd = oldC['Jam Berakhir (Ex: 10:00)'] || '-';
    const newEnd = newC['Jam Berakhir (Ex: 10:00)'] || '-';
    if (oldStart !== newStart || oldEnd !== newEnd) {
      detail.push(`Jam berubah dari ${oldStart}–${oldEnd} menjadi ${newStart}–${newEnd}`);
    }
    if ((oldC['Dosen'] || '').trim() !== (newC['Dosen'] || '').trim()) {
      detail.push(`Dosen berubah dari ${oldC['Dosen'] || 'belum ditentukan'} menjadi ${newC['Dosen'] || 'belum ditentukan'}`);
    }
    const oldRoom = oldC['Ruangan \n(Diisi Fakultas)'] || '-';
    const newRoom = newC['Ruangan \n(Diisi Fakultas)'] || '-';
    if (oldRoom !== newRoom) {
      detail.push(`Ruangan berubah dari ${oldRoom} menjadi ${newRoom}`);
    }
    const oldSks = parseInt(String(oldC['SKS'] || '3'), 10) || 3;
    const newSks = parseInt(String(newC['SKS'] || '3'), 10) || 3;
    if (oldSks !== newSks) {
      detail.push(`SKS berubah dari ${oldSks} menjadi ${newSks}`);
    }

    if (detail.length > 0) {
      changed.push({
        key,
        code: newC['Kode Mata Kuliah'] || '',
        name: newC['Nama Mata Kuliah'] || '',
        kelas: newC['Kelas'] || '',
        before: oldC,
        after: newC,
        detail,
      });
    }
  });

  return { hasChanges: added.length > 0 || removed.length > 0 || changed.length > 0, added, removed, changed };
}

// Cek apakah jadwal yang sudah "dipilih untuk digunakan" masih valid setelah
// ada data baru: apakah masih ada, apakah jamnya berubah, apakah jadi bentrok,
// dan apakah total SKS-nya berubah.
export function validateChosenSchedule(chosen: Course[], newCourses: Course[], prevTotalSks: number): ChosenValidation {
  const newMap = new Map<string, Course>();
  newCourses.forEach((c) => newMap.set(courseKey(c), c));

  const messages: string[] = [];
  const resolved: Course[] = [];
  let missingCount = 0;

  chosen.forEach((item) => {
    const match = newMap.get(courseKey(item));
    if (!match) {
      missingCount++;
      messages.push(`"${item['Nama Mata Kuliah']}" (Kelas ${item['Kelas'] || '-'}) sudah tidak tersedia di jadwal terbaru.`);
      return;
    }
    resolved.push(match);

    const oldStart = item['Jam Mulai (Ex : 07:00)'];
    const newStart = match['Jam Mulai (Ex : 07:00)'];
    const oldEnd = item['Jam Berakhir (Ex: 10:00)'];
    const newEnd = match['Jam Berakhir (Ex: 10:00)'];
    const oldDay = (item['Hari'] || '').trim().toLowerCase();
    const newDay = (match['Hari'] || '').trim().toLowerCase();
    if (oldStart !== newStart || oldEnd !== newEnd || oldDay !== newDay) {
      messages.push(`Jadwal "${item['Nama Mata Kuliah']}" berubah menjadi ${match['Hari']}, ${newStart}–${newEnd}.`);
    }
  });

  let conflictCount = 0;
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      if (isOverlap(resolved[i], resolved[j])) {
        conflictCount++;
        messages.push(
          `Bentrok baru: "${resolved[i]['Nama Mata Kuliah']}" dengan "${resolved[j]['Nama Mata Kuliah']}" pada hari ${resolved[i]['Hari']}.`,
        );
      }
    }
  }

  const totalSksAfter = scheduleSks(resolved) + missingCount * 0; // SKS mk yang hilang tidak dihitung
  if (totalSksAfter !== prevTotalSks) {
    messages.push(`Total SKS jadwal ini berubah dari ${prevTotalSks} menjadi ${totalSksAfter}.`);
  }

  const ok = missingCount === 0 && conflictCount === 0;
  if (ok && messages.length === 0) {
    messages.push('Jadwal yang sedang Anda gunakan masih aman — tidak ada perubahan maupun bentrok.');
  }

  return { ok, messages, totalSksBefore: prevTotalSks, totalSksAfter, missingCount, conflictCount };
}
