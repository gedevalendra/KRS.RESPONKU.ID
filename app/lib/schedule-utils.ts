// ---------------------------------------------------------------------------
// Fungsi murni (tanpa state React) seputar data mata kuliah & jadwal.
// Semua fungsi di sini gampang di-unit-test karena tidak menyentuh
// localStorage, network, atau React state.
// ---------------------------------------------------------------------------

import { Course } from './types';
import { DAY_ORDER } from './constants';

export function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.toString().trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export function isOverlap(c1: Course, c2: Course): boolean {
  if (c1['Hari']?.trim().toLowerCase() !== c2['Hari']?.trim().toLowerCase()) return false;
  const start1 = timeToMinutes(c1['Jam Mulai (Ex : 07:00)']);
  const end1 = timeToMinutes(c1['Jam Berakhir (Ex: 10:00)']);
  const start2 = timeToMinutes(c2['Jam Mulai (Ex : 07:00)']);
  const end2 = timeToMinutes(c2['Jam Berakhir (Ex: 10:00)']);
  return start1 < end2 && start2 < end1;
}

export function scheduleSks(schedule: Course[]): number {
  return schedule.reduce((sum, item) => sum + (parseInt(String(item['SKS'] || '3'), 10) || 3), 0);
}

export function buildScheduleText(schedule: Course[]): string {
  const byDay: Record<string, Course[]> = {};
  schedule.forEach((c) => {
    const day = (c['Hari'] || 'Lainnya').trim();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(c);
  });

  const sortedDays = Object.keys(byDay).sort((a, b) => {
    const ia = DAY_ORDER.indexOf(a.toLowerCase());
    const ib = DAY_ORDER.indexOf(b.toLowerCase());
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  let text = 'JADWAL KULIAH\n—————————————————';
  sortedDays.forEach((day) => {
    const items = [...byDay[day]].sort(
      (a, b) => timeToMinutes(a['Jam Mulai (Ex : 07:00)']) - timeToMinutes(b['Jam Mulai (Ex : 07:00)']),
    );
    text += `\n\n${day.toUpperCase()}`;
    items.forEach((item) => {
      text += `\n${item['Jam Mulai (Ex : 07:00)']}–${item['Jam Berakhir (Ex: 10:00)']}  ${item['Nama Mata Kuliah']} (${item['Kelas'] || '-'})`;
      text += `\n   ${item['Dosen'] || 'Dosen belum ditentukan'}`;
    });
  });
  text += `\n\n—————————————————\n${schedule.length} mata kuliah · ${scheduleSks(schedule)} SKS`;
  return text;
}

// Kunci unik satu baris jadwal — dipakai untuk deteksi perubahan & pencocokan
// jadwal yang sudah dipilih terhadap data terbaru.
export function courseKey(c: Course): string {
  const code = (c['Kode Mata Kuliah'] || '').toString().trim().toUpperCase();
  const kelas = (c['Kelas'] || '').toString().trim().toUpperCase();
  return `${code}::${kelas}`;
}

export function scheduleSignature(schedule: Course[]): string {
  return schedule
    .map((c) => courseKey(c))
    .sort()
    .join('|');
}

// Cari semua pasangan mata kuliah yang jamnya bentrok di satu susunan jadwal.
// Dipakai baik oleh validasi otomatis maupun fitur "susun KRS manual".
export function findConflicts(schedule: Course[]): { a: Course; b: Course }[] {
  const conflicts: { a: Course; b: Course }[] = [];
  for (let i = 0; i < schedule.length; i++) {
    for (let j = i + 1; j < schedule.length; j++) {
      if (isOverlap(schedule[i], schedule[j])) {
        conflicts.push({ a: schedule[i], b: schedule[j] });
      }
    }
  }
  return conflicts;
}

// Daftar kelas unik (RA/RB/dst) yang tersedia untuk satu kode mata kuliah —
// dipakai fitur "susun KRS manual" supaya user bisa pilih kelas sendiri.
export function classOptionsForCode(courses: Course[], code: string): Course[] {
  const seen = new Set<string>();
  const options: Course[] = [];
  courses.forEach((c) => {
    if ((c['Kode Mata Kuliah'] || '').trim().toUpperCase() !== code.toUpperCase()) return;
    const kelas = (c['Kelas'] || '-').trim().toUpperCase();
    if (seen.has(kelas)) return;
    seen.add(kelas);
    options.push(c);
  });
  return options;
}

export function loadJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Ubah link Google Sheets biasa menjadi link ekspor CSV.
export function convertToCsvUrl(url: string): string {
  if (url.includes('docs.google.com/spreadsheets')) {
    const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      return `https://docs.google.com/spreadsheets/d/${matches[1]}/export?format=csv`;
    }
  }
  return url;
}
