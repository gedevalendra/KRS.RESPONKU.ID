'use client';

// ---------------------------------------------------------------------------
// Hook ini menyimpan SEMUA state & logika bisnis halaman KRS planner:
// sinkronisasi spreadsheet, pilihan mata kuliah, dosen favorit, algoritma
// penyusunan jadwal, dan jadwal yang "dipakai".
//
// Kenapa digabung jadi satu hook (bukan dipecah per-state) dan bukan
// ditaruh di page.tsx?
// - Banyak bagian saling bergantung (mis. sinkron ulang spreadsheet perlu
//   tahu pilihan mata kuliah sebelumnya & jadwal yang sedang dipakai untuk
//   divalidasi ulang). Memecahnya jadi 3-4 hook terpisah malah menambah
//   kerumitan "siapa passing state ke siapa".
// - page.tsx jadi murni presentasi: tinggal `const krs = useKrsPlanner()`
//   lalu oper ke komponen-komponen kecil. Kalau mau menambah/menghapus
//   fitur (mis. hapus fitur "dosen favorit"), cukup edit hook ini —
//   file lain (komponen UI) tidak perlu disentuh kecuali tampilannya.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import {
  Course,
  ChangeReport,
  ChosenScheduleRecord,
  ChosenValidation,
  UpdateBadge,
  DayOffSettings,
  CustomPicks,
  RealtimeSettings,
  EmailReminderSettings,
  ScheduleState,
} from '../lib/types';
import {
  MAX_SKS,
  STORAGE_URL_KEY,
  STORAGE_COURSES_KEY,
  STORAGE_SELECTED_KEY,
  STORAGE_GOLDLIST_KEY,
  STORAGE_CHOSEN_KEY,
  STORAGE_DAYOFF_KEY,
  STORAGE_CUSTOM_PICKS_KEY,
  STORAGE_REALTIME_KEY,
  STORAGE_EMAIL_KEY,
  STORAGE_SCHEDULE_STATE_KEY,
  DEFAULT_REALTIME_INTERVAL_MS,
  MIN_REALTIME_INTERVAL_MS,
} from '../lib/constants';
import {
  buildScheduleText,
  convertToCsvUrl,
  courseKey,
  loadJSON,
  saveJSON,
  scheduleSks,
  scheduleSignature,
  findConflicts,
  classOptionsForCode,
} from '../lib/schedule-utils';
import { diffCourses, validateChosenSchedule } from '../lib/schedule-diff';
import { generateSchedules, generateSchedulesWithDayOff } from '../lib/schedule-generator';

// ---------------------------------------------------------------------------
// Helper: sama seperti useEffect biasa, tapi SENGAJA tidak dijalankan pada
// render pertama (mount).
//
// Kenapa perlu ini? Semua state yang "auto-save ke localStorage tiap kali
// berubah" (selectedCourseCodes, dayOffSettings, dst) mulai dari nilai
// default ([]/false/dst) saat komponen pertama kali dirender — data asli
// dari localStorage baru diterapkan lewat setState di efek load (yang
// jalan di render yang sama, tapi hasilnya baru terlihat di render
// BERIKUTNYA). Tanpa guard ini, efek "auto-save" versi pertama akan sempat
// menimpa localStorage dengan nilai default kosong sebelum data hasil
// load benar-benar tersimpan ulang — inilah yang menyebabkan
// checkbox mata kuliah, pengaturan realtime, dsb hilang saat halaman
// di-refresh. Dengan melewati render pertama, auto-save baru aktif
// setelah data dari localStorage sudah diterapkan ke state.
// ---------------------------------------------------------------------------
function useSkipMountEffect(effect: () => void, deps: unknown[]) {
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useKrsPlanner() {
  const { data: session } = useSession();
  const [isMounted, setIsMounted] = useState(false);
// --- Sinkronisasi spreadsheet -------------------------------------------
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_URL_KEY) || '';
  });
  
  const [courses, setCourses] = useState<Course[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadJSON<Course[]>(STORAGE_COURSES_KEY) || [];
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLinkLocked, setIsLinkLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(STORAGE_URL_KEY);
  });
  const [updateBadge, setUpdateBadge] = useState<UpdateBadge>('none');
  const [changeReport, setChangeReport] = useState<ChangeReport | null>(null);
  const [droppedSelection, setDroppedSelection] = useState<string[]>([]);

  // --- Pilihan mata kuliah & dosen favorit --------------------------------
  const [selectedCourseCodes, setSelectedCourseCodes] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadJSON<string[]>(STORAGE_SELECTED_KEY) || [];
  });
  const [goldlistTags, setGoldlistTags] = useState<string[]>([]);
  const [goldlistInput, setGoldlistInput] = useState<string>('');

  // --- Hasil penyusunan jadwal ---------------------------------------------
  const [scheduleOptions, setScheduleOptions] = useState<Course[][]>([]);
  const [activeOption, setActiveOption] = useState<number>(0);
  const [conflictAlert, setConflictAlert] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<boolean>(false);

  // --- Jadwal yang "dikunci" untuk dipakai ---------------------------------
  const [chosenSchedule, setChosenSchedule] = useState<ChosenScheduleRecord | null>(null);
  const [chosenValidation, setChosenValidation] = useState<ChosenValidation | null>(null);

  // --- Fitur: hari libur opsional saat susun otomatis ----------------------
  const [dayOffSettings, setDayOffSettings] = useState<DayOffSettings>({ enabled: false, preferredDay: '' });

  // --- Fitur: susun KRS manual (pilih kelas sendiri per mata kuliah) -------
  const [customPicks, setCustomPicks] = useState<CustomPicks>({});

  // --- Fitur: pengecekan realtime & notifikasi email -----------------------
  const [realtimeSettings, setRealtimeSettings] = useState<RealtimeSettings>({
    enabled: false,
    intervalMs: DEFAULT_REALTIME_INTERVAL_MS,
  });
  const [emailReminder, setEmailReminder] = useState<EmailReminderSettings>({ enabled: false, email: '' });
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [isCheckingRealtime, setIsCheckingRealtime] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // Muat semua state tersimpan saat pertama kali dibuka, lalu sinkron ulang
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedUrl = localStorage.getItem(STORAGE_URL_KEY);
    const savedCourses = loadJSON<Course[]>(STORAGE_COURSES_KEY) || [];
    const savedSelected = loadJSON<string[]>(STORAGE_SELECTED_KEY) || [];
    const savedGoldlist = loadJSON<string[]>(STORAGE_GOLDLIST_KEY) || [];
    const savedChosen = loadJSON<ChosenScheduleRecord>(STORAGE_CHOSEN_KEY);
    const savedDayOff = loadJSON<DayOffSettings>(STORAGE_DAYOFF_KEY);
    const savedCustomPicks = loadJSON<CustomPicks>(STORAGE_CUSTOM_PICKS_KEY);
    const savedRealtime = loadJSON<RealtimeSettings>(STORAGE_REALTIME_KEY);
    const savedEmail = loadJSON<EmailReminderSettings>(STORAGE_EMAIL_KEY);
    const savedScheduleState = loadJSON<ScheduleState>(STORAGE_SCHEDULE_STATE_KEY);

    if (savedCourses.length > 0) setCourses(savedCourses);
    if (savedSelected.length > 0) setSelectedCourseCodes(savedSelected);
    if (savedGoldlist.length > 0) setGoldlistTags(savedGoldlist);
    if (savedChosen) setChosenSchedule(savedChosen);
    if (savedDayOff) setDayOffSettings(savedDayOff);
    if (savedCustomPicks) setCustomPicks(savedCustomPicks);
    if (savedRealtime) {
      // Jaga-jaga: pastikan interval tidak pernah di bawah batas minimum testing
      setRealtimeSettings({ ...savedRealtime, intervalMs: Math.max(savedRealtime.intervalMs, MIN_REALTIME_INTERVAL_MS) });
    }
    if (savedEmail) setEmailReminder(savedEmail);
    if (savedScheduleState && savedScheduleState.options.length > 0) {
      setScheduleOptions(savedScheduleState.options);
      setActiveOption(savedScheduleState.activeOption || 0);
    }

    if (savedUrl) {
      setSheetUrl(savedUrl);
      setIsLinkLocked(true);
      // Kirim data lama secara eksplisit supaya proses diff akurat sejak awal
      fetchSheetFromUrl(savedUrl, savedCourses, savedSelected, savedChosen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simpan pilihan mata kuliah, dosen favorit, dan pengaturan-pengaturan
  // fitur lain setiap kali berubah, supaya tidak hilang walau halaman
  // di-refresh (tanpa perlu sinkron ulang). Pakai useSkipMountEffect (bukan
  // useEffect biasa) supaya render pertama TIDAK ikut menimpa localStorage
  // dengan nilai default sebelum data hasil load di atas benar-benar aktif.
  useSkipMountEffect(() => {
    saveJSON(STORAGE_SELECTED_KEY, selectedCourseCodes);
  }, [selectedCourseCodes]);

  useSkipMountEffect(() => {
    saveJSON(STORAGE_GOLDLIST_KEY, goldlistTags);
  }, [goldlistTags]);

  useSkipMountEffect(() => {
    saveJSON(STORAGE_DAYOFF_KEY, dayOffSettings);
  }, [dayOffSettings]);

  useSkipMountEffect(() => {
    saveJSON(STORAGE_CUSTOM_PICKS_KEY, customPicks);
  }, [customPicks]);

  useSkipMountEffect(() => {
    saveJSON(STORAGE_REALTIME_KEY, realtimeSettings);
  }, [realtimeSettings]);

  useSkipMountEffect(() => {
    saveJSON(STORAGE_EMAIL_KEY, emailReminder);
  }, [emailReminder]);

  // Simpan hasil "Susun Jadwal Otomatis" yang sedang ditampilkan, supaya
  // kalau halaman di-refresh sebelum sempat diklik "Gunakan Jadwal Ini",
  // jadwal yang tadi sudah disusun tidak hilang begitu saja.
  useSkipMountEffect(() => {
    if (scheduleOptions.length > 0) {
      saveJSON(STORAGE_SCHEDULE_STATE_KEY, { options: scheduleOptions, activeOption });
    } else {
      if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_SCHEDULE_STATE_KEY);
    }
  }, [scheduleOptions, activeOption]);

  // -------------------------------------------------------------------------
  // Sinkronisasi spreadsheet
  // -------------------------------------------------------------------------
  const fetchSheetFromUrl = async (
    urlOverride?: string,
    prevCoursesOverride?: Course[],
    prevSelectedOverride?: string[],
    prevChosenOverride?: ChosenScheduleRecord | null,
    silent = false,
  ) => {
    const urlToUse = urlOverride ?? sheetUrl;
    if (!urlToUse) return;
    if (silent) setIsCheckingRealtime(true);
    else setIsLoading(true);
    try {
      const targetUrl = convertToCsvUrl(urlToUse);
      let response;

      if (session && (session as any).accessToken) {
        response = await fetch(targetUrl, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
      } else {
        response = await fetch(targetUrl);
      }

      if (!response.ok) throw new Error('Gagal mengunduh spreadsheet.');

      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json<any>(ws, { range: 12 });
      const cleanedData: Course[] = rawData.filter((item) => item['Nama Mata Kuliah'] && item['Hari']);

      // Data & pilihan sebelumnya, dipakai sebagai basis perbandingan
      const prevCourses = prevCoursesOverride ?? courses;
      const prevSelected = prevSelectedOverride ?? selectedCourseCodes;
      const prevChosen = prevChosenOverride !== undefined ? prevChosenOverride : chosenSchedule;

      const isFirstSync = prevCourses.length === 0;
      const diff = diffCourses(prevCourses, cleanedData);

      if (isFirstSync) {
        setUpdateBadge('first');
        setChangeReport(null);
      } else if (!diff.hasChanges) {
        setUpdateBadge('same');
        setChangeReport(null);
      } else {
        setUpdateBadge('changed');
        setChangeReport(diff);
        // Bukan sinkron pertama & memang ada perubahan → ini yang perlu
        // dinotifikasi ke email pengguna (kalau fitur pengingat diaktifkan).
        notifyScheduleChangeByEmail(diff);
      }

      // Mata kuliah yang sudah dipilih tapi sekarang tidak ada lagi di spreadsheet
      const newCodesSet = new Set(cleanedData.map((c) => (c['Kode Mata Kuliah'] || '').toString().trim().toUpperCase()));
      const stillValidSelected = prevSelected.filter((code) => newCodesSet.has(code.toUpperCase()));
      const dropped = prevSelected.filter((code) => !newCodesSet.has(code.toUpperCase()));
      setSelectedCourseCodes(stillValidSelected);
      setDroppedSelection(dropped);

      // Validasi ulang jadwal yang sedang "dipakai" terhadap data terbaru
      if (prevChosen) {
        setChosenValidation(validateChosenSchedule(prevChosen.items, cleanedData, prevChosen.totalSks));
      } else {
        setChosenValidation(null);
      }

      setCourses(cleanedData);
      setIsLinkLocked(true);

      localStorage.setItem(STORAGE_URL_KEY, urlToUse);
      saveJSON(STORAGE_COURSES_KEY, cleanedData);
      saveJSON(STORAGE_SELECTED_KEY, stillValidSelected);

      setLastCheckedAt(new Date().toISOString());
      if (silent) setIsCheckingRealtime(false);
      else setIsLoading(false);
    } catch (error) {
      // Saat pengecekan realtime di latar belakang gagal (mis. koneksi putus
      // sesaat), jangan ganggu pengguna dengan alert — cukup catat di console
      // dan coba lagi di siklus interval berikutnya.
      if (silent) {
        console.warn('Pengecekan realtime gagal:', error);
        setIsCheckingRealtime(false);
      } else {
        alert('Gagal mengambil data dari link. Pastikan link Google Sheets publik atau Anda sudah login dengan akun berizin.');
        setIsLoading(false);
      }
    }
  };

  // Dipanggil oleh interval realtime (lihat useEffect di bawah) — sinkron
  // ulang tanpa mengganggu UI dengan alert kalau gagal.
  const checkForUpdatesNow = () => {
    if (!isLinkLocked || !sheetUrl) return;
    fetchSheetFromUrl(sheetUrl, courses, selectedCourseCodes, chosenSchedule, true);
  };

  const handleUnlockLink = () => {
    setIsLinkLocked(false);
    setUpdateBadge('none');
  };

  // -------------------------------------------------------------------------
  // Fitur: pengecekan realtime (polling berkala) + notifikasi email
  // -------------------------------------------------------------------------
  // Kirim notifikasi ke API route saat ada perubahan terdeteksi. Endpoint
  // pengirim email ada di app/api/notify-schedule-change/route.ts.
  const notifyScheduleChangeByEmail = async (diff: ChangeReport) => {
    if (!emailReminder.enabled || !emailReminder.email) return;
    try {
      await fetch('/api/notify-schedule-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailReminder.email, diff }),
      });
    } catch (err) {
      console.warn('Gagal mengirim notifikasi perubahan jadwal ke email:', err);
    }
  };

  const setRealtimeEnabled = (enabled: boolean) => {
    setRealtimeSettings((prev) => ({ ...prev, enabled }));
  };

  const setRealtimeIntervalMs = (ms: number) => {
    setRealtimeSettings((prev) => ({ ...prev, intervalMs: Math.max(ms, MIN_REALTIME_INTERVAL_MS) }));
  };

  const setEmailReminderEnabled = (enabled: boolean) => {
    setEmailReminder((prev) => ({ ...prev, enabled }));
  };

  const setReminderEmail = (email: string) => {
    setEmailReminder((prev) => ({ ...prev, email }));
  };


  useEffect(() => {
  // Menandakan bahwa komponen sudah sukses di-mount di browser klien
  setIsMounted(true);
}, []);
  
  
  // Jalankan interval polling selama fitur diaktifkan & link sudah terkunci.
  // Interval dibuat ulang setiap kali `intervalMs` berubah, jadi saat nanti
  // diubah ke 5 detik untuk testing, siklus baru langsung mengikuti nilai itu.
  const checkForUpdatesRef = useRef(checkForUpdatesNow);
  checkForUpdatesRef.current = checkForUpdatesNow;

  useEffect(() => {
    if (!realtimeSettings.enabled || !isLinkLocked || !sheetUrl) return undefined;
    const id = setInterval(() => {
      checkForUpdatesRef.current();
    }, realtimeSettings.intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeSettings.enabled, realtimeSettings.intervalMs, isLinkLocked, sheetUrl]);

  // -------------------------------------------------------------------------
  // Turunan data mata kuliah
  // -------------------------------------------------------------------------
  const uniqueCourseList = useMemo(() => {
    const map = new Map<string, { name: string; sks: number; lecturers: Set<string> }>();
    courses.forEach((c) => {
      const code = c['Kode Mata Kuliah']?.trim();
      const name = c['Nama Mata Kuliah']?.trim();
      const sksVal = parseInt(String(c['SKS'] || '3'), 10) || 3;
      const lecturer = c['Dosen']?.trim();
      if (code && name) {
        if (!map.has(code)) map.set(code, { name, sks: sksVal, lecturers: new Set() });
        if (lecturer) map.get(code)?.lecturers.add(lecturer);
      }
    });
    const list: { code: string; name: string; sks: number; lecturers: string[] }[] = [];
    map.forEach((val, code) => list.push({ code, name: val.name, sks: val.sks, lecturers: Array.from(val.lecturers) }));
    return list;
  }, [courses]);

  // Daftar seluruh dosen unik dari spreadsheet, untuk kombobox "dosen favorit"
  const allLecturers = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      const dosen = c['Dosen']?.trim();
      if (dosen) set.add(dosen);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const lecturerSuggestions = useMemo(() => {
    const query = goldlistInput.trim().toLowerCase();
    return allLecturers
      .filter((l) => !goldlistTags.some((t) => t.toLowerCase() === l.toLowerCase()))
      .filter((l) => (query ? l.toLowerCase().includes(query) : true))
      .slice(0, 6);
  }, [allLecturers, goldlistInput, goldlistTags]);

  const totalSelectedSks = useMemo(() => {
    let total = 0;
    selectedCourseCodes.forEach((code) => {
      const found = uniqueCourseList.find((c) => c.code === code);
      if (found) total += found.sks;
    });
    return total;
  }, [selectedCourseCodes, uniqueCourseList]);

  const toggleCourseSelection = (code: string) => {
    const courseObj = uniqueCourseList.find((c) => c.code === code);
    if (!courseObj) return;
    if (selectedCourseCodes.includes(code)) {
      setSelectedCourseCodes(selectedCourseCodes.filter((c) => c !== code));
    } else {
      if (totalSelectedSks + courseObj.sks > MAX_SKS) {
        alert(`Batas maksimal SKS adalah ${MAX_SKS}! Menambahkan mata kuliah ini akan membuat total SKS menjadi ${totalSelectedSks + courseObj.sks}.`);
        return;
      }
      setSelectedCourseCodes([...selectedCourseCodes, code]);
    }
  };

  // -------------------------------------------------------------------------
  // Fitur: susun KRS manual — user pilih sendiri kelas (RA/RB/dst) per mata
  // kuliah yang sudah dicentang di Step 2, lalu dicek bentroknya di akhir.
  // -------------------------------------------------------------------------
  const classOptionsByCode = useMemo(() => {
    const map: Record<string, Course[]> = {};
    selectedCourseCodes.forEach((code) => {
      map[code] = classOptionsForCode(courses, code);
    });
    return map;
  }, [courses, selectedCourseCodes]);

  const setCustomPick = (code: string, kelas: string) => {
    setCustomPicks((prev) => ({ ...prev, [code]: kelas }));
  };

  const clearCustomPicks = () => setCustomPicks({});

  // Susunan mata kuliah nyata (Course penuh) hasil dari pilihan manual —
  // hanya berisi mata kuliah yang sudah dipilih kelasnya.
  const customScheduleResolved = useMemo(() => {
    const resolved: Course[] = [];
    selectedCourseCodes.forEach((code) => {
      const kelas = customPicks[code];
      if (!kelas) return;
      const match = (classOptionsByCode[code] || []).find((c) => (c['Kelas'] || '-').trim().toUpperCase() === kelas);
      if (match) resolved.push(match);
    });
    return resolved;
  }, [selectedCourseCodes, customPicks, classOptionsByCode]);

  const customConflicts = useMemo(() => findConflicts(customScheduleResolved), [customScheduleResolved]);
  const customTotalSks = useMemo(() => scheduleSks(customScheduleResolved), [customScheduleResolved]);
  const customIsComplete = selectedCourseCodes.length > 0 && customScheduleResolved.length === selectedCourseCodes.length;

  // Pakai susunan manual sebagai "jadwal yang digunakan" — sama seperti
  // handleUseSchedule, cukup lewatkan hasil resolusi manualnya.
  const useCustomScheduleAsChosen = () => {
    if (customScheduleResolved.length === 0) {
      alert('Pilih kelas untuk setidaknya satu mata kuliah terlebih dahulu.');
      return;
    }
    handleUseSchedule(customScheduleResolved);
  };

  const addLecturerTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (goldlistTags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setGoldlistInput('');
      return;
    }
    setGoldlistTags([...goldlistTags, tag]);
    setGoldlistInput('');
  };

  const removeLecturerTag = (tag: string) => {
    setGoldlistTags(goldlistTags.filter((t) => t !== tag));
  };

  // -------------------------------------------------------------------------
  // Penyusunan jadwal (algoritmanya sendiri ada di lib/schedule-generator.ts)
  // -------------------------------------------------------------------------
  const generateBestSchedule = () => {
    setConflictAlert('');
    if (selectedCourseCodes.length === 0) {
      alert('Pilih setidaknya satu mata kuliah terlebih dahulu!');
      return;
    }
    const result = dayOffSettings.enabled
      ? generateSchedulesWithDayOff(courses, selectedCourseCodes, goldlistTags, dayOffSettings.preferredDay || undefined)
      : generateSchedules(courses, selectedCourseCodes, goldlistTags);
    setScheduleOptions(result.options);
    setActiveOption(0);
    setConflictAlert(result.message);
  };

  const setDayOffEnabled = (enabled: boolean) => {
    setDayOffSettings((prev) => ({ ...prev, enabled }));
  };

  const setPreferredOffDay = (day: string) => {
    setDayOffSettings((prev) => ({ ...prev, preferredDay: day }));
  };

  const currentSchedule = scheduleOptions[activeOption] || [];

  const handleCopyText = async (schedule: Course[]) => {
    if (schedule.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildScheduleText(schedule));
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    } catch {
      alert('Gagal menyalin teks. Salin manual dari hasil di bawah.');
    }
  };

  // Tandai satu opsi jadwal sebagai "jadwal yang dipakai" — tersimpan permanen
  // sampai diganti atau dibatalkan secara manual.
  const handleUseSchedule = (schedule: Course[]) => {
    const record: ChosenScheduleRecord = {
      items: schedule,
      totalSks: scheduleSks(schedule),
      savedAt: new Date().toISOString(),
    };
    setChosenSchedule(record);
    setChosenValidation({
      ok: true,
      messages: ['Jadwal ini baru saja dipilih sebagai jadwal yang digunakan.'],
      totalSksBefore: record.totalSks,
      totalSksAfter: record.totalSks,
      missingCount: 0,
      conflictCount: 0,
    });
    saveJSON(STORAGE_CHOSEN_KEY, record);
  };

  const handleClearChosenSchedule = () => {
    setChosenSchedule(null);
    setChosenValidation(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_CHOSEN_KEY);
    }
  };

  const chosenSignature = chosenSchedule ? scheduleSignature(chosenSchedule.items) : null;

  // Tampilan jadwal terpakai memakai data TERBARU (kalau masih ada), supaya
  // jam/dosen/ruangan yang ditampilkan selalu mengikuti spreadsheet terkini.
  const chosenScheduleResolved = useMemo(() => {
    if (!chosenSchedule) return [];
    const courseMap = new Map<string, Course>();
    courses.forEach((c) => courseMap.set(courseKey(c), c));
    return chosenSchedule.items.map((item) => {
      const match = courseMap.get(courseKey(item));
      return match ? { ...match, __missing: false } : { ...item, __missing: true };
    });
  }, [chosenSchedule, courses]);

  // -------------------------------------------------------------------------
  // Turunan kecil untuk tampilan
  // -------------------------------------------------------------------------
  const step =
    sheetUrl === '' && courses.length === 0
      ? 1
      : uniqueCourseList.length > 0 && scheduleOptions.length === 0
      ? 2
      : scheduleOptions.length > 0
      ? 3
      : 1;
  const sksPct = Math.min(100, Math.round((totalSelectedSks / MAX_SKS) * 100));
  const isOverLimit = totalSelectedSks > MAX_SKS;

  // Konteks ringkas untuk chatbot (ScheduleChatbot)
  const chatContext = useMemo(
    () => ({
      totalMataKuliahTersedia: uniqueCourseList.length,
      mataKuliahDipilih: uniqueCourseList.filter((c) => selectedCourseCodes.includes(c.code)),
      totalSksDipilih: totalSelectedSks,
      dosenFavorit: goldlistTags,
      opsiJadwal: scheduleOptions.map((opt, i) => ({
        opsi: String.fromCharCode(65 + i),
        totalSks: scheduleSks(opt),
        mataKuliah: opt.map((c) => ({
          kode: c['Kode Mata Kuliah'],
          nama: c['Nama Mata Kuliah'],
          hari: c['Hari'],
          jam: `${c['Jam Mulai (Ex : 07:00)']}-${c['Jam Berakhir (Ex: 10:00)']}`,
          dosen: c['Dosen'],
        })),
      })),
      jadwalDigunakan: chosenSchedule
        ? {
            totalSks: chosenSchedule.totalSks,
            disimpanPada: chosenSchedule.savedAt,
            statusTerbaru: chosenValidation ? (chosenValidation.ok ? 'aman' : 'perlu-perhatian') : 'belum-dicek',
            pesan: chosenValidation?.messages || [],
          }
        : null,
    }),
    [uniqueCourseList, selectedCourseCodes, totalSelectedSks, goldlistTags, scheduleOptions, chosenSchedule, chosenValidation],
  );

  return {
    session,
  isMounted,
    // sinkronisasi
    sheetUrl,
    setSheetUrl,
    courses,
    isLoading,
    isLinkLocked,
    updateBadge,
    changeReport,
    setChangeReport,
    droppedSelection,
    fetchSheetFromUrl,
    handleUnlockLink,

    // pilihan mata kuliah & dosen favorit
    uniqueCourseList,
    selectedCourseCodes,
    toggleCourseSelection,
    totalSelectedSks,
    isOverLimit,
    sksPct,
    goldlistTags,
    goldlistInput,
    setGoldlistInput,
    lecturerSuggestions,
    addLecturerTag,
    removeLecturerTag,

    // penyusunan jadwal
    generateBestSchedule,
    conflictAlert,
    scheduleOptions,
    activeOption,
    setActiveOption,
    currentSchedule,
    handleCopyText,
    copyStatus,

    // jadwal yang dipakai
    handleUseSchedule,
    handleClearChosenSchedule,
    chosenSchedule,
    chosenValidation,
    chosenSignature,
    chosenScheduleResolved,

    // fitur: hari libur opsional
    dayOffSettings,
    setDayOffEnabled,
    setPreferredOffDay,

    // fitur: susun KRS manual
    classOptionsByCode,
    customPicks,
    setCustomPick,
    clearCustomPicks,
    customScheduleResolved,
    customConflicts,
    customTotalSks,
    customIsComplete,
    useCustomScheduleAsChosen,

    // fitur: pengecekan realtime & notifikasi email
    realtimeSettings,
    setRealtimeEnabled,
    setRealtimeIntervalMs,
    emailReminder,
    setEmailReminderEnabled,
    setReminderEmail,
    lastCheckedAt,
    isCheckingRealtime,
    checkForUpdatesNow,

    // lain-lain
    step,
    chatContext,
  };
}

export type KrsPlanner = ReturnType<typeof useKrsPlanner>;