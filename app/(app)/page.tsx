'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Link2, 
  ListChecks, 
  PenSquare, 
  CalendarCheck, 
  Settings, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Coins,
} from 'lucide-react';
import { useKrs } from '../context/KrsPlannerContext';
import ChosenSchedulePanel from '../components/ChosenSchedulePanel';

const CARDS = [
  { href: '/sync', title: 'Sinkronisasi', desc: 'Hubungkan & perbarui data dari Google Sheets.', icon: Link2 },
  { href: '/pilih', title: 'Pilih Mata Kuliah', desc: 'Centang mata kuliah, lalu susun otomatis.', icon: ListChecks },
  { href: '/manual', title: 'Susun Manual', desc: 'Pilih sendiri kelas untuk tiap mata kuliah.', icon: PenSquare },
  { href: '/jadwal', title: 'Jadwal Saya', desc: 'Lihat, bandingkan, dan simpan hasil jadwal.', icon: CalendarCheck },
  { href: '/pengaturan', title: 'Pengaturan', desc: 'Atur pengecekan realtime & pengingat email.', icon: Settings },
  { href: '/dukungan', title: 'Dukungan', desc: 'Bantu kami untuk terus lebih baik', icon: Coins },
];

export default function BerandaPage() {
  const krs = useKrs();
  const firstName = krs.session?.user?.name ? krs.session.user.name.split(' ')[0] : null;

  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer realtime tiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayName = daysMap[currentTime.getDay()];
  
  // Hitung total detik saat ini dalam sehari untuk presisi per detik
  const currentTotalSeconds = 
    currentTime.getHours() * 3600 + 
    currentTime.getMinutes() * 60 + 
    currentTime.getSeconds();

  // Helper konversi waktu (string atau desimal Excel seperti 0.625) ke format string "HH:MM"
  const formatTimeDisplay = (timeInput: any): string => {
    if (timeInput === null || timeInput === undefined) return '-';
    
    let totalMins = 0;
    if (typeof timeInput === 'number') {
      totalMins = Math.round(timeInput * 24 * 60);
    } else {
      const timeStr = String(timeInput).trim();
      if (!timeStr) return '-';
      if (!isNaN(Number(timeStr)) && timeStr.includes('.')) {
        const num = parseFloat(timeStr);
        if (num > 0 && num < 1) {
          totalMins = Math.round(num * 24 * 60);
        }
      } else {
        const cleanStr = timeStr.replace('.', ':');
        const parts = cleanStr.split(':');
        if (parts.length >= 2) {
          const h = parseInt(parts[0], 10) || 0;
          const m = parseInt(parts[1], 10) || 0;
          totalMins = h * 60 + m;
        } else {
          return timeStr;
        }
      }
    }

    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Helper konversi waktu ke total detik dalam sehari
  const timeToSeconds = (timeInput: any) => {
    if (timeInput === null || timeInput === undefined) return 0;
    if (typeof timeInput === 'number') {
      return Math.round(timeInput * 24 * 3600);
    }
    const timeStr = String(timeInput).trim();
    if (!timeStr) return 0;
    if (!isNaN(Number(timeStr)) && timeStr.includes('.')) {
      const num = parseFloat(timeStr);
      if (num > 0 && num < 1) {
        return Math.round(num * 24 * 3600);
      }
    }
    const cleanStr = timeStr.replace('.', ':');
    const parts = cleanStr.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = parts[2] ? parseInt(parts[2], 10) || 0 : 0;
    return h * 3600 + m * 60 + s;
  };

  // Filter kelas hari ini berdasarkan jadwal aktif dengan perhitungan detik
  const activeClassesToday = (krs.chosenScheduleResolved || []).filter((item: any) => {
    const itemDay = (item['Hari'] || item.hari || '').trim().toLowerCase();
    return itemDay === currentDayName.toLowerCase();
  }).map((item: any) => {
    const rawStart = 
      item['Jam Mulai'] || 
      item['Jam Mulai (Ex : 07:00)'] || 
      item.jamMulai || 
      item.jam_mulai || 
      item.jam || 
      '';

    const rawEnd = 
      item['Jam Berakhir'] || 
      item['Jam Berakhir (Ex: 10:00)'] || 
      item['Jam Selesai'] || 
      item.jamSelesai || 
      item.jam_selesai || 
      '';
    
    const startSeconds = timeToSeconds(rawStart);
    const endSeconds = timeToSeconds(rawEnd);
    
    let progress = 0;
    let isOngoing = false;

    if (currentTotalSeconds >= startSeconds && currentTotalSeconds <= endSeconds) {
      isOngoing = true;
      const totalDuration = endSeconds - startSeconds;
      const elapsed = currentTotalSeconds - startSeconds;
      progress = totalDuration > 0 ? Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100) : 0;
    } else if (currentTotalSeconds > endSeconds) {
      progress = 100;
    }

    return {
      ...item,
      namaMatkul: item['Nama Mata Kuliah'] || item.namaMatkul || item.matkul || 'Mata Kuliah',
      dosen: item['Dosen'] || item.dosen || '-',
      ruangan: item['Ruangan'] || item['Ruangan \n(Diisi Fakultas)'] || item.ruangan || '-',
      startSeconds,
      endSeconds,
      isOngoing,
      progress,
      formattedStart: formatTimeDisplay(rawStart),
      formattedEnd: formatTimeDisplay(rawEnd),
    };
  });

  const ongoingClass = activeClassesToday.find((c: any) => c.isOngoing);

  return (
    <div className="space-y-6">
      {/* Banner Sapaan */}
      <section className="bg-blue-600 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Halo{firstName ? `, ${firstName}` : ''} 👋</h1>
            <p className="text-blue-100 mt-1 text-sm sm:text-base">
              {krs.isLinkLocked
                ? `Spreadsheet tersambung · ${krs.courses.length} baris jadwal · ${krs.totalSelectedSks}/24 SKS dipilih.`
                : 'Mulai dengan menyambungkan spreadsheet jadwal kuliahmu di menu Sinkronisasi.'}
            </p>
          </div>
         
        </div>

        {krs.chosenSchedule && (
          <div className="mt-4 pt-4 border-t border-blue-500/50 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm bg-white/20 rounded-full px-3 py-1 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Jadwal Tersimpan Aktif
            </span>
            <span className="text-xs text-blue-100">
              Total SKS: {krs.chosenSchedule.totalSks || krs.totalSelectedSks} SKS
            </span>
          </div>
        )}
      </section>

      {/* Menu Cards */}
      <div className="hidden lg:grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-xl p-5 transition bg-white"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                {card.title}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
              </h3>
              <p className="text-sm text-slate-500 mt-1">{card.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Widget Progres Perkuliahan Realtime Hari Ini */}
      {krs.chosenScheduleResolved && krs.chosenScheduleResolved.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-slate-900">Progres Perkuliahan Hari Ini ({currentDayName})</h2>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {activeClassesToday.length} Kelas Terjadwal
            </span>
          </div>

          {ongoingClass ? (
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded">
                    Sedang Berlangsung
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1">{ongoingClass.namaMatkul}</h3>
                  <p className="text-xs text-slate-600">Ruangan: {ongoingClass.ruangan} • Dosen: {ongoingClass.dosen}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-indigo-700">
                    {ongoingClass.formattedStart} - {ongoingClass.formattedEnd}
                  </span>
                  {/* Menampilkan persentase desimal presisi tinggi */}
                  <p className="text-xs font-medium text-indigo-600">
                    {ongoingClass.progress >= 100 ? '100' : ongoingClass.progress.toFixed(1)}% Selesai
                  </p>
                </div>
              </div>

              {/* Progress Bar Realtime Bergerak Halus Tiap Detik */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${ongoingClass.progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
              Tidak ada kelas yang sedang berlangsung pada jam ini.
            </div>
          )}

          {/* List Singkat Kelas Hari Ini */}
          <div className="grid sm:grid-cols-2 gap-2 pt-2">
            {activeClassesToday.map((cls: any, idx: number) => (
              <div key={idx} className="border border-slate-100 bg-slate-50/50 rounded-xl p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-800 line-clamp-1">{cls.namaMatkul}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500">{cls.formattedStart} - {cls.formattedEnd}</p>
                    <p className="text-xs text-slate-500">{cls.ruangan}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${cls.isOngoing ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                  {cls.isOngoing ? 'Aktif' : (currentTotalSeconds > cls.endSeconds ? 'Selesai' : 'Akan Datang')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tampilan Panel Jadwal Terpilih */}
      {krs.chosenSchedule && (
        <ChosenSchedulePanel
          chosenSchedule={krs.chosenSchedule}
          chosenValidation={krs.chosenValidation}
          chosenScheduleResolved={krs.chosenScheduleResolved}
          onClear={krs.handleClearChosenSchedule}
        />
      )}
    </div>
  );
}