// ---------------------------------------------------------------------------
// Fungsi murni (tanpa state React) seputar data mata kuliah & jadwal.
// Semua fungsi di sini gampang di-unit-test karena tidak menyentuh
// localStorage, network, atau React state.
// ---------------------------------------------------------------------------

import { Course } from './types';
import { DAY_ORDER } from './constants';

// PENTING: nilai jam dari spreadsheet bisa datang dalam dua bentuk —
// 1. String rapi seperti "07:00" (kalau sel diformat sebagai teks), atau
// 2. Angka pecahan hari ala Excel, mis. 0.041666666666666664 = 01:00,
//    0.4166666666666667 = 10:00 (kalau sel diformat sebagai jam/waktu).
// Sebelumnya fungsi ini cuma menangani bentuk (1) — kalau dapat bentuk (2),
// split(':') gagal dan selalu mengembalikan 0 untuk SEMUA jam, yang bikin
// deteksi bentrok (isOverlap) jadi tidak berfungsi sama sekali. Sekarang
// menangani keduanya.
export function timeToMinutes(time?: string | number): number {
  if (time === undefined || time === null || time === '') return 0;

  // Bentuk (1): string "HH:mm"
  if (typeof time === 'string' && time.includes(':')) {
    const parts = time.trim().split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }

  // Bentuk (2): angka Excel (number), atau string angka murni seperti
  // "0.4166666666666667"
  let num: number | null = null;
  if (typeof time === 'number') {
    num = time;
  } else if (typeof time === 'string' && /^[0-9]*\.?[0-9]+$/.test(time.trim())) {
    num = Number(time.trim());
  }

  if (num !== null && !Number.isNaN(num)) {
    const frac = num - Math.floor(num); // ambil bagian jamnya saja
    return Math.round(frac * 24 * 60);
  }

  return 0;
}

// Ubah nilai jam (string "HH:mm" ataupun angka pecahan hari ala Excel)
// menjadi format tampilan "HH:mm" yang enak dibaca. Dipakai di semua tempat
// yang menampilkan/menyalin teks jam ke user.
export function formatJam(value: any): string {
  if (value === undefined || value === null || value === '') return '-';

  if (typeof value === 'string' && value.includes(':')) {
    return value; // sudah format jam yang rapi, tidak perlu diubah
  }

  let num: number | null = null;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string' && /^[0-9]*\.?[0-9]+$/.test(value.trim())) {
    num = Number(value.trim());
  }

  if (num !== null && !Number.isNaN(num)) {
    const totalMinutes = timeToMinutes(num);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}`;
  }

  return String(value);
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
      text += `\n${formatJam(item['Jam Mulai (Ex : 07:00)'])}–${formatJam(item['Jam Berakhir (Ex: 10:00)'])}  ${item['Nama Mata Kuliah']} (${item['Kelas'] || '-'})`;
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

// Ubah link Google Sheets biasa menjadi link ekspor format XLSX agar multi-tab terbaca.
export function convertToCsvUrl(url: string): string {
  if (url.includes('docs.google.com/spreadsheets')) {
    const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      return `https://docs.google.com/spreadsheets/d/${matches[1]}/export?format=xlsx`;
    }
  }
  return url;
}