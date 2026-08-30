// ---------------------------------------------------------------------------
// Konstanta global. Kalau nanti mau ubah batas SKS atau key localStorage,
// cukup ubah di file ini saja.
// ---------------------------------------------------------------------------

export const MAX_SKS = 24;
export const STORAGE_SHEET_TAB_KEY = 'papan-jadwal:selected-tab';
export const STORAGE_URL_KEY = 'papan-jadwal:sheet-url';
export const STORAGE_COURSES_KEY = 'papan-jadwal:courses-data';
export const STORAGE_SELECTED_KEY = 'papan-jadwal:selected-codes';
export const STORAGE_GOLDLIST_KEY = 'papan-jadwal:goldlist-tags';
export const STORAGE_CHOSEN_KEY = 'papan-jadwal:chosen-schedule';
export const STORAGE_DAYOFF_KEY = 'papan-jadwal:dayoff-settings';
export const STORAGE_CUSTOM_PICKS_KEY = 'papan-jadwal:custom-picks';
export const STORAGE_REALTIME_KEY = 'papan-jadwal:realtime-settings';
export const STORAGE_EMAIL_KEY = 'papan-jadwal:email-reminder';
export const STORAGE_SCHEDULE_STATE_KEY = 'papan-jadwal:schedule-state';

export const DAY_ORDER = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

// Default & batas pengecekan realtime. Default 10 menit untuk pemakaian
// normal; batas minimum sengaja dibuat rendah (5 detik) supaya bisa dipakai
// untuk keperluan testing sesuai permintaan.
export const DEFAULT_REALTIME_INTERVAL_MS = 10 * 60 * 1000; // 10 menit
export const MIN_REALTIME_INTERVAL_MS = 1 * 1000; // 5 detik (mode testing)