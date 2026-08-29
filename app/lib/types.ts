// ---------------------------------------------------------------------------
// Tipe data bersama untuk seluruh modul KRS planner.
// Ditaruh di satu tempat supaya kalau ada field baru di spreadsheet,
// cukup ubah di sini dan semua modul lain otomatis ikut ke-update.
// ---------------------------------------------------------------------------

export interface Course {
  'Hari'?: string;
  'Jam Mulai (Ex : 07:00)'?: string;
  'Jam Berakhir (Ex: 10:00)'?: string;
  'Kode Mata Kuliah'?: string;
  'Nama Mata Kuliah'?: string;
  'SKS'?: number | string;
  'Kelas'?: string;
  'Semester'?: string;
  'Ruangan \n(Diisi Fakultas)'?: string;
  'Dosen'?: string;
  [key: string]: any;
}

export interface UniqueCourseOption {
  code: string;
  name: string;
  sks: number;
  lecturers: string[];
}

export interface ChangeReportItem {
  key: string;
  code: string;
  name: string;
  kelas: string;
  before?: Course;
  after?: Course;
  detail?: string[];
}

export interface ChangeReport {
  hasChanges: boolean;
  added: ChangeReportItem[];
  removed: ChangeReportItem[];
  changed: ChangeReportItem[];
}

export interface ChosenScheduleRecord {
  items: Course[];
  totalSks: number;
  savedAt: string;
}

export interface ChosenValidation {
  ok: boolean;
  messages: string[];
  totalSksBefore: number;
  totalSksAfter: number;
  missingCount: number;
  conflictCount: number;
}

export type UpdateBadge = 'none' | 'first' | 'same' | 'changed';

// --- Fitur: hari libur opsional saat susun jadwal otomatis -----------------
export interface DayOffSettings {
  enabled: boolean;
  // Nama hari (lowercase, mis. 'jumat') yang diinginkan user sebagai hari
  // libur. Kosong berarti "bebas, cari hari apapun yang bisa libur penuh".
  preferredDay: string;
}

// --- Fitur: susun KRS manual (pilih kelas sendiri per mata kuliah) ---------
// Map: kode mata kuliah -> kelas yang dipilih (mis. { "IF101": "RA" })
export type CustomPicks = Record<string, string>;

export interface ScheduleConflictPair {
  a: Course;
  b: Course;
}

// --- Fitur: pengecekan realtime & notifikasi email --------------------------
export interface RealtimeSettings {
  enabled: boolean;
  intervalMs: number;
}

export interface EmailReminderSettings {
  enabled: boolean;
  email: string;
}

// --- Fitur: simpan hasil "Susun Jadwal Otomatis" yang sedang ditampilkan --
// supaya tidak hilang saat halaman di-refresh (sebelum sempat "digunakan").
export interface ScheduleState {
  options: Course[][];
  activeOption: number;
}