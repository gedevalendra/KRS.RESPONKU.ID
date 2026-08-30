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
  Calendar 
} from 'lucide-react';
import { useKrs } from '../context/KrsPlannerContext';
import ChosenSchedulePanel from '../components/ChosenSchedulePanel';

const CARDS = [
  { href: '/sync', title: 'Sinkronisasi', desc: 'Hubungkan & perbarui data dari Google Sheets.', icon: Link2 },
  { href: '/pilih', title: 'Pilih Mata Kuliah', desc: 'Centang mata kuliah, lalu susun otomatis.', icon: ListChecks },
  { href: '/manual', title: 'Susun Manual', desc: 'Pilih sendiri kelas untuk tiap mata kuliah.', icon: PenSquare },
  { href: '/jadwal', title: 'Jadwal Saya', desc: 'Lihat, bandingkan, dan simpan hasil jadwal.', icon: CalendarCheck },
  { href: '/pengaturan', title: 'Pengaturan', desc: 'Atur pengecekan realtime & pengingat email.', icon: Settings },
];

export default function BerandaPage() {
  const krs = useKrs();
  const firstName = krs.session?.user?.name ? krs.session.user.name.split(' ')[0] : null;

  // State untuk waktu realtime & progress perkuliahan
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format hari ini dalam bahasa Indonesia
  const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayName = daysMap[currentTime.getDay()];
  const currentHourMins = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Helper untuk mengubah "HH:MM" ke total menit
  const timeToMins = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Cari kelas yang sedang aktif hari ini dari jadwal tersimpan/resolved
  const activeClassesToday = (krs.chosenScheduleResolved || []).filter((item: any) => {
    return item.hari?.toLowerCase() === currentDayName.toLowerCase();
  }).map((item: any) => {
    const startMins = timeToMins(item.jamMulai || item.jam_mulai);
    const endMins = timeToMins(item.jamSelesai || item.jam_selesai);
    
    let progress = 0;
    let isOngoing = false;

    if (currentHourMins >= startMins && currentHourMins <= endMins) {
      isOngoing = true;
      const totalDuration = endMins - startMins;
      const elapsed = currentHourMins - startMins;
      progress = totalDuration > 0 ? Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100) : 0;
    } else if (currentHourMins > endMins) {
      progress = 100;
    }

    return {
      ...item,
      startMins,
      endMins,
      isOngoing,
      progress,
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
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl text-sm border border-white/20 flex items-center gap-2 self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-blue-200" />
            <span>{currentDayName}, {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
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
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
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
                  <h3 className="font-bold text-slate-900 text-base mt-1">{ongoingClass.namaMatkul || ongoingClass.matkul}</h3>
                  <p className="text-xs text-slate-600">Ruangan: {ongoingClass.ruangan || '-'} • Dosen: {ongoingClass.dosen || '-'}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-indigo-700">
                    {ongoingClass.jamMulai || ongoingClass.jam_mulai} - {ongoingClass.jamSelesai || ongoingClass.jam_selesai}
                  </span>
                  <p className="text-xs font-medium text-indigo-600">{Math.round(ongoingClass.progress)}% Selesai</p>
                </div>
              </div>

              {/* Progress Bar Realtime */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-1000 rounded-full"
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
                  <p className="font-semibold text-slate-800 line-clamp-1">{cls.namaMatkul || cls.matkul}</p>
                  <p className="text-xs text-slate-500">{cls.jamMulai || cls.jam_mulai} - {cls.jamSelesai || cls.jam_selesai}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${cls.isOngoing ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                  {cls.isOngoing ? 'Aktif' : (currentHourMins > cls.endMins ? 'Selesai' : 'Akan Datang')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tampilan Panel Jadwal Terpilih Menggunakan ChosenSchedulePanel */}
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