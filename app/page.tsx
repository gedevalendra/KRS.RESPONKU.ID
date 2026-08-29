'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Star,
  BookOpen,
  LogIn,
  LogOut,
  CheckSquare,
  Square,
  Layers,
  Menu,
  X,
  Link2,
  ListChecks,
  Wand2,
  Lock,
  Pencil,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import ScheduleChatbot from './ScheduleChatbot';

// ---------------------------------------------------------------------------
// Tipe data
// ---------------------------------------------------------------------------
interface Course {
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

interface UniqueCourseOption {
  code: string;
  name: string;
  sks: number;
  lecturers: string[];
}

const MAX_SKS = 24;
const STORAGE_URL_KEY = 'papan-jadwal:sheet-url';
const STORAGE_HASH_KEY = 'papan-jadwal:sheet-hash';
const DAY_ORDER = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

// ---------------------------------------------------------------------------
// Helper murni — di luar komponen supaya bisa dipakai algoritma & ekspor teks
// ---------------------------------------------------------------------------
function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.toString().trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

function isOverlap(c1: Course, c2: Course): boolean {
  if (c1['Hari']?.trim().toLowerCase() !== c2['Hari']?.trim().toLowerCase()) return false;
  const start1 = timeToMinutes(c1['Jam Mulai (Ex : 07:00)']);
  const end1 = timeToMinutes(c1['Jam Berakhir (Ex: 10:00)']);
  const start2 = timeToMinutes(c2['Jam Mulai (Ex : 07:00)']);
  const end2 = timeToMinutes(c2['Jam Berakhir (Ex: 10:00)']);
  return start1 < end2 && start2 < end1;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

function scheduleSks(schedule: Course[]): number {
  return schedule.reduce((sum, item) => sum + (parseInt(String(item['SKS'] || '3'), 10) || 3), 0);
}

function buildScheduleText(schedule: Course[]): string {
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

export default function AdvancedScheduleApp() {
  const { data: session } = useSession();
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Link spreadsheet: terkunci setelah sinkron pertama, badge memberi tahu perubahan
  const [isLinkLocked, setIsLinkLocked] = useState<boolean>(false);
  const [updateBadge, setUpdateBadge] = useState<'none' | 'first' | 'same' | 'changed'>('none');

  const [selectedCourseCodes, setSelectedCourseCodes] = useState<string[]>([]);

  // Dosen favorit: tag, bisa dipilih dari daftar atau diketik manual
  const [goldlistTags, setGoldlistTags] = useState<string[]>([]);
  const [goldlistInput, setGoldlistInput] = useState<string>('');

  const [scheduleOptions, setScheduleOptions] = useState<Course[][]>([]);
  const [activeOption, setActiveOption] = useState<number>(0);
  const [conflictAlert, setConflictAlert] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<boolean>(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // Muat link tersimpan saat pertama kali dibuka, lalu sinkron ulang otomatis
  // -------------------------------------------------------------------------
  useEffect(() => {
    const savedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) : null;
    if (savedUrl) {
      setSheetUrl(savedUrl);
      setIsLinkLocked(true);
      fetchSheetFromUrl(savedUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const convertToCsvUrl = (url: string) => {
    if (url.includes('docs.google.com/spreadsheets')) {
      const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (matches && matches[1]) {
        return `https://docs.google.com/spreadsheets/d/${matches[1]}/export?format=csv`;
      }
    }
    return url;
  };

  const fetchSheetFromUrl = async (urlOverride?: string) => {
    const urlToUse = urlOverride ?? sheetUrl;
    if (!urlToUse) return;
    setIsLoading(true);
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

      // Bandingkan hash data baru dengan hash tersimpan untuk mendeteksi perubahan
      const newHash = hashString(JSON.stringify(cleanedData));
      const prevHash = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_HASH_KEY) : null;
      if (prevHash === null) {
        setUpdateBadge('first');
      } else if (prevHash === newHash) {
        setUpdateBadge('same');
      } else {
        setUpdateBadge('changed');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_URL_KEY, urlToUse);
        localStorage.setItem(STORAGE_HASH_KEY, newHash);
      }

      setCourses(cleanedData);
      setSelectedCourseCodes([]);
      setIsLinkLocked(true);
      setIsLoading(false);
    } catch (error) {
      alert('Gagal mengambil data dari link. Pastikan link Google Sheets publik atau Anda sudah login dengan akun berizin.');
      setIsLoading(false);
    }
  };

  const handleUnlockLink = () => {
    setIsLinkLocked(false);
    setUpdateBadge('none');
  };

  // -------------------------------------------------------------------------
  // Turunan data
  // -------------------------------------------------------------------------
  const uniqueCourseList: UniqueCourseOption[] = useMemo(() => {
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
    const list: UniqueCourseOption[] = [];
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
  // Algoritma penyusunan jadwal
  // -------------------------------------------------------------------------
  const buildGroups = (rotateOffset = 0): Record<string, Course[]> => {
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
  };

  const runBacktrack = (groups: Record<string, Course[]>): Course[] | null => {
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
  };

  const generateBestSchedule = () => {
    setConflictAlert('');
    if (selectedCourseCodes.length === 0) {
      alert('Pilih setidaknya satu mata kuliah terlebih dahulu!');
      return;
    }

    if (goldlistTags.length > 0) {
      // Ada preferensi dosen -> satu jadwal terbaik yang memprioritaskan dosen favorit
      const groups = buildGroups();
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
        setScheduleOptions([best]);
        setActiveOption(0);
        setConflictAlert('Sukses: Jadwal optimal berhasil disusun tanpa ada waktu yang bertabrakan.');
      } else {
        const fallback = Object.keys(groups)
          .filter((c) => groups[c].length > 0)
          .map((c) => groups[c][0]);
        setScheduleOptions([fallback]);
        setActiveOption(0);
        setConflictAlert('Peringatan: Tidak ditemukan kombinasi bersih tanpa bentrok total. Menampilkan opsi terbaik yang tersedia.');
      }
      return;
    }

    // Tanpa preferensi dosen -> tawarkan beberapa opsi jadwal berbeda
    const seen = new Set<string>();
    const options: Course[][] = [];
    for (let attempt = 0; attempt < 8 && options.length < 3; attempt++) {
      const groups = buildGroups(attempt);
      const combo = runBacktrack(groups);
      if (combo) {
        const signature = combo
          .map((c) => `${c['Kode Mata Kuliah']}-${c['Kelas']}`)
          .sort()
          .join('|');
        if (!seen.has(signature)) {
          seen.add(signature);
          options.push(combo);
        }
      }
    }

    if (options.length > 0) {
      setScheduleOptions(options);
      setActiveOption(0);
      setConflictAlert(
        `Sukses: ditemukan ${options.length} opsi jadwal tanpa bentrok. Isi "Dosen favorit" di sidebar bila ingin satu rekomendasi terbaik.`,
      );
    } else {
      const groups = buildGroups();
      const fallback = Object.keys(groups)
        .filter((c) => groups[c].length > 0)
        .map((c) => groups[c][0]);
      setScheduleOptions([fallback]);
      setActiveOption(0);
      setConflictAlert('Peringatan: Tidak ditemukan kombinasi bersih tanpa bentrok total. Menampilkan opsi terbaik yang tersedia.');
    }
  };

  const currentSchedule = scheduleOptions[activeOption] || [];

  const handleCopyText = async () => {
    if (currentSchedule.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildScheduleText(currentSchedule));
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    } catch {
      alert('Gagal menyalin teks. Salin manual dari hasil di bawah.');
    }
  };

  // -------------------------------------------------------------------------
  // Turunan kecil untuk tampilan
  // -------------------------------------------------------------------------
  const step = sheetUrl === '' && courses.length === 0 ? 1 : uniqueCourseList.length > 0 && scheduleOptions.length === 0 ? 2 : scheduleOptions.length > 0 ? 3 : 1;
  const sksPct = Math.min(100, Math.round((totalSelectedSks / MAX_SKS) * 100));
  const isOverLimit = totalSelectedSks > MAX_SKS;

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
    }),
    [uniqueCourseList, selectedCourseCodes, totalSelectedSks, goldlistTags, scheduleOptions],
  );

  return (
    <div className="min-h-screen bg-white text-black" style={{ fontFamily: "'Poppins', ui-sans-serif, system-ui" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
      `}</style>

      {/* ===================== NAVBAR ===================== */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-md hover:bg-black/5 cursor-pointer"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="leading-tight">
                <p className="font-bold text-[15px] sm:text-lg tracking-tight">RESPONKU KRS</p>
                <p className="hidden sm:block text-[11px] text-black/50 -mt-0.5">Susun KRS tanpa bentrok</p>
              </div>
            </div>
          </div>

          <div>
            {!session ? (
              <button
                onClick={() => signIn('google')}
                className="bg-black hover:bg-black/80 text-white px-3.5 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> <span className="hidden xs:inline">Masuk Google</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:inline text-sm font-medium text-black/70 max-w-[160px] truncate">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="border border-black/15 hover:bg-black/5 text-black px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* ===================== SIDEBAR (desktop) ===================== */}
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-black/10 px-5 py-8 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <SidebarContent
            step={step}
            totalSelectedSks={totalSelectedSks}
            isOverLimit={isOverLimit}
            sksPct={sksPct}
            selectedCount={selectedCourseCodes.length}
            goldlistTags={goldlistTags}
            goldlistInput={goldlistInput}
            setGoldlistInput={setGoldlistInput}
            lecturerSuggestions={lecturerSuggestions}
            addLecturerTag={addLecturerTag}
            removeLecturerTag={removeLecturerTag}
          />
        </aside>

        {/* ===================== SIDEBAR (mobile drawer) ===================== */}
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
                <SidebarContent
                  step={step}
                  totalSelectedSks={totalSelectedSks}
                  isOverLimit={isOverLimit}
                  sksPct={sksPct}
                  selectedCount={selectedCourseCodes.length}
                  goldlistTags={goldlistTags}
                  goldlistInput={goldlistInput}
                  setGoldlistInput={setGoldlistInput}
                  lecturerSuggestions={lecturerSuggestions}
                  addLecturerTag={addLecturerTag}
                  removeLecturerTag={removeLecturerTag}
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================== MAIN ===================== */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-8 space-y-6">
          {/* Step 1 — Sinkronisasi, terkunci setelah berhasil */}
          <section className="bg-white border border-black/10 rounded-xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4" />
              <h2 className="font-bold text-base">1. Hubungkan Spreadsheet</h2>
            </div>
            <p className="text-sm text-black/50 mb-4">
              Tempel link Google Sheets berisi daftar mata kuliah. Setelah tersinkron, link ini disimpan otomatis agar tidak perlu ditempel ulang.
            </p>

            {isLinkLocked ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 flex items-center gap-2 border border-black/10 bg-black/[0.03] rounded-md px-3 py-2.5 text-sm text-black/60 min-w-0">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{sheetUrl}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => fetchSheetFromUrl()}
                    disabled={isLoading}
                    className="border border-black/15 hover:bg-black/5 px-3.5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Cek Pembaruan
                  </button>
                  <button
                    onClick={handleUnlockLink}
                    className="border border-black/15 hover:bg-black/5 px-3 py-2.5 rounded-md text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" /> Ubah
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="flex-1 border border-black/15 rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <button
                  onClick={() => fetchSheetFromUrl()}
                  disabled={isLoading}
                  className="bg-black text-white px-5 py-2.5 rounded-md hover:bg-black/80 transition flex items-center justify-center gap-2 text-sm font-medium cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Menyinkronkan...' : 'Sinkronkan'}
                </button>
              </div>
            )}

            {/* Badge status pembaruan */}
            {updateBadge === 'first' && (
              <p className="mt-3 text-xs text-black/60 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {courses.length} baris jadwal berhasil dimuat &amp; link disimpan.
              </p>
            )}
            {updateBadge === 'same' && (
              <p className="mt-3 text-xs text-black/60 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Jadwal terkini — tidak ada perubahan sejak terakhir dicek.
              </p>
            )}
            {updateBadge === 'changed' && (
              <p className="mt-3 inline-flex text-xs font-medium text-black bg-black/5 border border-dashed border-black/30 rounded-full px-3 py-1.5 items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Ada perubahan pada spreadsheet — data sudah diperbarui.
              </p>
            )}
          </section>

          {/* Step 2 — Pilih mata kuliah */}
          {uniqueCourseList.length > 0 && (
            <section className="bg-white border border-black/10 rounded-xl p-5 sm:p-6">
              <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ListChecks className="w-4 h-4" />
                    <h2 className="font-bold text-base">2. Pilih Mata Kuliah</h2>
                  </div>
                  <p className="text-sm text-black/50">Centang mata kuliah yang ingin diambil. Maksimal {MAX_SKS} SKS.</p>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-md text-sm font-semibold flex items-center gap-2 border ${
                    isOverLimit ? 'border-black bg-black text-white' : 'border-black/15 bg-black/[0.03]'
                  }`}
                >
                  <Layers className="w-4 h-4" /> {totalSelectedSks}/{MAX_SKS} SKS
                </div>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[26rem] overflow-y-auto p-1">
                {uniqueCourseList.map((course) => {
                  const isChecked = selectedCourseCodes.includes(course.code);
                  const hasNoLecturer = course.lecturers.length === 0;
                  return (
                    <button
                      type="button"
                      key={course.code}
                      onClick={() => toggleCourseSelection(course.code)}
                      className={`relative text-left p-3.5 rounded-lg border transition cursor-pointer ${
                        isChecked ? 'bg-black border-black text-white' : 'bg-white border-black/15 hover:border-black/40'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{course.code}</span>
                        <span className={`flex items-center gap-1 text-[11px] ${isChecked ? 'text-white/80' : 'text-black/50'}`}>
                          {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          {course.sks} SKS
                        </span>
                      </div>
                      <p className="font-semibold text-sm mt-1.5 leading-snug">{course.name}</p>
                      {hasNoLecturer ? (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${isChecked ? 'text-white/70' : 'text-black/40'}`}>
                          <Info className="w-3 h-3" /> Dosen belum tersedia
                        </p>
                      ) : (
                        <p className={`text-xs mt-1 line-clamp-2 ${isChecked ? 'text-white/75' : 'text-black/50'}`}>
                          {course.lecturers.join(', ')}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between border-t border-black/10 pt-4">
                <p className="text-xs text-black/50">
                  {selectedCourseCodes.length} mata kuliah dipilih. Atur dosen favorit di sidebar untuk satu rekomendasi terbaik.
                </p>
                <button
                  onClick={generateBestSchedule}
                  className="bg-black text-white font-medium py-2.5 px-5 rounded-md hover:bg-black/80 transition text-sm flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                >
                  <Wand2 className="w-4 h-4" /> Susun Jadwal Otomatis
                </button>
              </div>
            </section>
          )}

          {/* Status */}
          {conflictAlert && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 text-sm font-medium border ${
                conflictAlert.startsWith('Peringatan') ? 'border-dashed border-black/40 bg-black/[0.02]' : 'border-black/15 bg-black/[0.03]'
              }`}
            >
              {conflictAlert.startsWith('Peringatan') ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{conflictAlert}</span>
            </div>
          )}

          {/* Step 3 — Hasil */}
          {scheduleOptions.length > 0 && (
            <section className="bg-black text-white rounded-xl p-5 sm:p-6 overflow-hidden">
              <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-lg">
                    {scheduleOptions.length > 1 ? `Opsi Jadwal (${scheduleOptions.length})` : 'Jadwal Optimal'}
                  </h2>
                  <p className="text-sm text-white/50 mt-0.5">{currentSchedule.length} mata kuliah · {scheduleSks(currentSchedule)} SKS</p>
                </div>
                <button
                  onClick={handleCopyText}
                  className="border border-white/25 hover:bg-white/10 px-3.5 py-2 rounded-md text-sm flex items-center gap-2 transition cursor-pointer flex-shrink-0"
                >
                  {copyStatus ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copyStatus ? 'Disalin!' : 'Salin sebagai Teks'}
                </button>
              </div>

              {/* Tab opsi, hanya muncul kalau ada lebih dari 1 opsi */}
              {scheduleOptions.length > 1 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {scheduleOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveOption(i)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition cursor-pointer border ${
                        activeOption === i ? 'bg-white text-black border-white' : 'border-white/25 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      Opsi {String.fromCharCode(65 + i)} · {scheduleSks(opt)} SKS
                    </button>
                  ))}
                </div>
              )}

              {/* Tabel — layar >= md */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="text-white/50 text-xs uppercase tracking-wide border-b border-white/15">
                      <th className="py-2.5 pr-3 font-medium">Waktu</th>
                      <th className="py-2.5 pr-3 font-medium">Kode</th>
                      <th className="py-2.5 pr-3 font-medium">Mata Kuliah</th>
                      <th className="py-2.5 pr-3 font-medium">SKS</th>
                      <th className="py-2.5 pr-3 font-medium">Kelas</th>
                      <th className="py-2.5 pr-3 font-medium">Dosen</th>
                      <th className="py-2.5 font-medium">Ruangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSchedule.map((item, idx) => (
                      <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition">
                        <td className="py-3 pr-3 font-mono whitespace-nowrap">
                          {item['Hari']}
                          <br />
                          <span className="text-xs text-white/60">
                            {item['Jam Mulai (Ex : 07:00)']}–{item['Jam Berakhir (Ex: 10:00)']}
                          </span>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs text-white/70">{item['Kode Mata Kuliah']}</td>
                        <td className="py-3 pr-3 font-semibold">{item['Nama Mata Kuliah']}</td>
                        <td className="py-3 pr-3">{item['SKS'] || 3}</td>
                        <td className="py-3 pr-3">
                          <span className="bg-white/10 text-xs px-2 py-0.5 rounded font-mono">{item['Kelas']}</span>
                        </td>
                        <td className="py-3 pr-3 text-xs text-white/70">{item['Dosen'] || 'Belum ditentukan'}</td>
                        <td className="py-3 text-xs text-white/70">{item['Ruangan \n(Diisi Fakultas)'] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Kartu — layar < md */}
              <div className="md:hidden space-y-3">
                {currentSchedule.map((item, idx) => (
                  <div key={idx} className="border border-white/15 rounded-lg p-3.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold text-sm leading-snug">{item['Nama Mata Kuliah']}</p>
                      <span className="bg-white/10 text-[11px] px-2 py-0.5 rounded font-mono flex-shrink-0">{item['Kelas']}</span>
                    </div>
                    <p className="font-mono text-sm mt-2 text-white/80">
                      {item['Hari']} · {item['Jam Mulai (Ex : 07:00)']}–{item['Jam Berakhir (Ex: 10:00)']}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/60">
                      <span>{item['Kode Mata Kuliah']}</span>
                      <span>{item['SKS'] || 3} SKS</span>
                      <span>{item['Dosen'] || 'Dosen belum ditentukan'}</span>
                      <span>{item['Ruangan \n(Diisi Fakultas)'] || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {uniqueCourseList.length === 0 && courses.length === 0 && (
            <div className="text-center py-16 text-black/40">
              <BookOpen className="w-8 h-8 mx-auto mb-3" />
              <p className="text-sm">Belum ada data. Tempel link spreadsheet di atas untuk memulai.</p>
            </div>
          )}
        </main>
      </div>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-black/10 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-black/50">
          <p>© {new Date().getFullYear()} RESPONKU KRS. Dibuat untuk mempermudah penyusunan KRS.</p>
          <p className="font-mono">Batas maksimum: {MAX_SKS} SKS / semester</p>
        </div>
      </footer>

      {/* ===================== CHATBOT (Groq) ===================== */}
      <ScheduleChatbot context={chatContext} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Konten sidebar — dipakai di versi desktop & drawer mobile
// ---------------------------------------------------------------------------
function SidebarContent({
  step,
  totalSelectedSks,
  isOverLimit,
  sksPct,
  selectedCount,
  goldlistTags,
  goldlistInput,
  setGoldlistInput,
  lecturerSuggestions,
  addLecturerTag,
  removeLecturerTag,
}: {
  step: number;
  totalSelectedSks: number;
  isOverLimit: boolean;
  sksPct: number;
  selectedCount: number;
  goldlistTags: string[];
  goldlistInput: string;
  setGoldlistInput: (v: string) => void;
  lecturerSuggestions: string[];
  addLecturerTag: (v: string) => void;
  removeLecturerTag: (v: string) => void;
}) {
  const steps = [
    { n: 1, label: 'Hubungkan spreadsheet' },
    { n: 2, label: 'Pilih mata kuliah' },
    { n: 3, label: 'Lihat jadwal' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-3">Progres</p>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="flex items-center gap-2.5 text-sm">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono flex-shrink-0 ${
                  step >= s.n ? 'bg-black text-white' : 'bg-black/5 text-black/50 border border-black/15'
                }`}
              >
                {s.n}
              </span>
              <span className={step >= s.n ? 'text-black font-medium' : 'text-black/50'}>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-3">Ringkasan SKS</p>
        <div className="h-2 rounded-full bg-black/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-black' : 'bg-black/70'}`}
            style={{ width: `${sksPct}%` }}
          />
        </div>
        <p className="font-mono text-sm mt-2">{totalSelectedSks} / {24} SKS</p>
        <p className="text-xs text-black/50 mt-0.5">{selectedCount} mata kuliah dipilih</p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-2 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5" /> Dosen favorit
        </label>

        {goldlistTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {goldlistTags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 bg-black text-white text-xs px-2.5 py-1 rounded-full">
                {tag}
                <button onClick={() => removeLecturerTag(tag)} className="hover:opacity-70 cursor-pointer" aria-label={`Hapus ${tag}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            placeholder="Pilih dari daftar atau ketik nama"
            value={goldlistInput}
            onChange={(e) => setGoldlistInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLecturerTag(goldlistInput);
              }
            }}
            className="w-full border border-black/15 bg-white rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
          {goldlistInput && lecturerSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-black/15 rounded-md shadow-lg overflow-hidden">
              {lecturerSuggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => addLecturerTag(name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 cursor-pointer"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-black/50 mt-2">
          Ketik lalu tekan Enter untuk menambah manual, atau pilih dari daftar dosen yang ada di spreadsheet. Kosongkan bila ingin melihat beberapa opsi jadwal sekaligus.
        </p>
      </div>
    </div>
  );
}