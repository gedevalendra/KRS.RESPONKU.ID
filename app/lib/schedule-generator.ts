// ---------------------------------------------------------------------------
// Algoritma penyusunan jadwal (backtracking). Dipisah supaya kalau nanti
// mau ganti strategi algoritma (mis. tambah bobot lain selain dosen favorit,
// atau ganti jadi genetic algorithm), cukup edit file ini tanpa menyentuh
// komponen UI ataupun state management.
// ---------------------------------------------------------------------------

import { Course } from './types';
import { isOverlap, scheduleSignature } from './schedule-utils';
import { DAY_ORDER } from './constants';

function buildGroups(courses: Course[], selectedCourseCodes: string[], rotateOffset = 0): Record<string, Course[]> {
  const groups: Record<string, Course[]> = {};
  selectedCourseCodes.forEach((code) => {
    let options = courses.filter((c) => c['Kode Mata Kuliah']?.trim().toUpperCase() === code.toUpperCase());
    if (rotateOffset > 0 && options.length > 0) {
      const r = rotateOffset % options.length;
      options = [...options.slice(r), ...options.slice(0, r)];
    }
    groups[code] = options;
  });
  return groups;
}

function runBacktrack(groups: Record<string, Course[]>): Course[] | null {
  const codes = Object.keys(groups);
  let result: Course[] = [];
  let found = false;

  const backtrack = (index: number, current: Course[]) => {
    if (found) return;
    if (index === codes.length) {
      result = [...current];
      found = true;
      return;
    }
    for (const cls of groups[codes[index]]) {
      if (!current.some((selected) => isOverlap(selected, cls))) {
        current.push(cls);
        backtrack(index + 1, current);
        current.pop();
      }
    }
  };

  backtrack(0, []);
  return found ? result : null;
}

function fallbackSchedule(groups: Record<string, Course[]>): Course[] {
  return Object.keys(groups)
    .filter((c) => groups[c].length > 0)
    .map((c) => groups[c][0]);
}

// Sama seperti buildGroups, tapi membuang semua kelas yang jatuh di hari
// `excludeDay`. Kalau ada mata kuliah yang SEMUA kelasnya jatuh di hari itu,
// berarti hari itu tidak mungkin jadi hari libur penuh untuk kombinasi mata
// kuliah yang dipilih user → return null (infeasible).
function buildGroupsExcludingDay(
  courses: Course[],
  selectedCourseCodes: string[],
  excludeDay: string,
  rotateOffset = 0,
): Record<string, Course[]> | null {
  const groups: Record<string, Course[]> = {};
  for (const code of selectedCourseCodes) {
    let options = courses.filter(
      (c) =>
        c['Kode Mata Kuliah']?.trim().toUpperCase() === code.toUpperCase() &&
        (c['Hari'] || '').trim().toLowerCase() !== excludeDay,
    );
    if (options.length === 0) return null;
    if (rotateOffset > 0) {
      const r = rotateOffset % options.length;
      options = [...options.slice(r), ...options.slice(0, r)];
    }
    groups[code] = options;
  }
  return groups;
}

function sortByGoldlist(groups: Record<string, Course[]>, goldlistTags: string[]) {
  Object.keys(groups).forEach((code) => {
    groups[code].sort((a, b) => {
      const aMatch = goldlistTags.some((d) => (a['Dosen'] || '').toLowerCase().includes(d.toLowerCase()));
      const bMatch = goldlistTags.some((d) => (b['Dosen'] || '').toLowerCase().includes(d.toLowerCase()));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  });
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export interface GenerateScheduleResult {
  options: Course[][];
  message: string;
  isWarning: boolean;
  dayOffAchieved?: string;
}

// Fitur opsional "Hari Libur": user boleh minta 1 hari kosong penuh dalam
// seminggu, tumpuk mata kuliah di hari lain sepanjang tidak bentrok.
// - Kalau `preferredDay` diisi: coba hari itu saja.
// - Kalau kosong: coba semua hari satu-satu (Senin..Minggu), pakai hari
//   pertama yang berhasil.
// - Kalau tidak ada satupun hari yang bisa dijadikan libur penuh tanpa
//   bentrok, fallback ke penyusunan biasa (tanpa hari libur) + peringatan.
export function generateSchedulesWithDayOff(
  courses: Course[],
  selectedCourseCodes: string[],
  goldlistTags: string[],
  preferredDay?: string,
): GenerateScheduleResult {
  const daysToTry = preferredDay ? [preferredDay.trim().toLowerCase()] : DAY_ORDER;

  for (const day of daysToTry) {
    const groups = buildGroupsExcludingDay(courses, selectedCourseCodes, day);
    if (!groups) continue; // hari ini mustahil jadi libur penuh untuk pilihan mata kuliah saat ini

    if (goldlistTags.length > 0) sortByGoldlist(groups, goldlistTags);

    const best = runBacktrack(groups);
    if (best) {
      return {
        options: [best],
        message: `Sukses: Jadwal disusun dengan hari ${capitalize(day)} libur penuh, tanpa ada jam yang bertabrakan.`,
        isWarning: false,
        dayOffAchieved: day,
      };
    }
  }

  // Tidak ada hari yang bisa dijadikan libur penuh — fallback ke mode biasa
  const fallback = generateSchedules(courses, selectedCourseCodes, goldlistTags);
  const scopeText = preferredDay ? `hari ${capitalize(preferredDay)}` : 'satupun hari';
  return {
    ...fallback,
    message: `Peringatan: Tidak ditemukan susunan yang menyisakan ${scopeText} libur penuh dengan mata kuliah yang dipilih. Menampilkan jadwal terbaik tanpa syarat hari libur. ${fallback.message}`,
    isWarning: true,
  };
}

// Fungsi utama: susun jadwal berdasarkan mata kuliah yang dipilih.
// - Kalau ada dosen favorit (goldlistTags): satu jadwal terbaik yang
//   memprioritaskan dosen favorit.
// - Kalau tidak: sampai 3 opsi jadwal berbeda yang tidak bentrok.
export function generateSchedules(
  courses: Course[],
  selectedCourseCodes: string[],
  goldlistTags: string[],
): GenerateScheduleResult {
  if (goldlistTags.length > 0) {
    const groups = buildGroups(courses, selectedCourseCodes);
    Object.keys(groups).forEach((code) => {
      groups[code].sort((a, b) => {
        const aMatch = goldlistTags.some((d) => (a['Dosen'] || '').toLowerCase().includes(d.toLowerCase()));
        const bMatch = goldlistTags.some((d) => (b['Dosen'] || '').toLowerCase().includes(d.toLowerCase()));
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    });

    const best = runBacktrack(groups);
    if (best) {
      return {
        options: [best],
        message: 'Sukses: Jadwal optimal berhasil disusun tanpa ada waktu yang bertabrakan.',
        isWarning: false,
      };
    }
    return {
      options: [fallbackSchedule(groups)],
      message: 'Peringatan: Tidak ditemukan kombinasi bersih tanpa bentrok total. Menampilkan opsi terbaik yang tersedia.',
      isWarning: true,
    };
  }

  const seen = new Set<string>();
  const options: Course[][] = [];
  for (let attempt = 0; attempt < 8 && options.length < 3; attempt++) {
    const groups = buildGroups(courses, selectedCourseCodes, attempt);
    const combo = runBacktrack(groups);
    if (combo) {
      const signature = scheduleSignature(combo);
      if (!seen.has(signature)) {
        seen.add(signature);
        options.push(combo);
      }
    }
  }

  if (options.length > 0) {
    return {
      options,
      message: `Sukses: ditemukan ${options.length} opsi jadwal tanpa bentrok. Isi "Dosen favorit" di sidebar bila ingin satu rekomendasi terbaik.`,
      isWarning: false,
    };
  }

  const groups = buildGroups(courses, selectedCourseCodes);
  return {
    options: [fallbackSchedule(groups)],
    message: 'Peringatan: Tidak ditemukan kombinasi bersih tanpa bentrok total. Menampilkan opsi terbaik yang tersedia.',
    isWarning: true,
  };
}
