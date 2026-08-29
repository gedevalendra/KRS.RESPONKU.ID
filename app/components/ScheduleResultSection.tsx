'use client';

import { Bookmark, BookmarkCheck, Copy, Check } from 'lucide-react';
import { Course } from '../lib/types';
import { scheduleSks, scheduleSignature } from '../lib/schedule-utils';

interface ScheduleResultSectionProps {
  scheduleOptions: Course[][];
  activeOption: number;
  setActiveOption: (i: number) => void;
  currentSchedule: Course[];
  chosenSignature: string | null;
  copyStatus: boolean;
  onUseSchedule: (schedule: Course[]) => void;
  onCopyText: (schedule: Course[]) => void;
}

// Step 3 — Hasil penyusunan jadwal: header, tab opsi, tabel (desktop) & kartu (mobile)
export default function ScheduleResultSection({
  scheduleOptions,
  activeOption,
  setActiveOption,
  currentSchedule,
  chosenSignature,
  copyStatus,
  onUseSchedule,
  onCopyText,
}: ScheduleResultSectionProps) {
  const isCurrentChosen = chosenSignature === scheduleSignature(currentSchedule);

  return (
    <section className="bg-black text-white rounded-xl p-5 sm:p-6 overflow-hidden">
      <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-bold text-lg">
            {scheduleOptions.length > 1 ? `Opsi Jadwal (${scheduleOptions.length})` : 'Jadwal Optimal'}
          </h2>
          <p className="text-sm text-white/50 mt-0.5">{currentSchedule.length} mata kuliah · {scheduleSks(currentSchedule)} SKS</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onUseSchedule(currentSchedule)}
            className={`px-3.5 py-2 rounded-md text-sm flex items-center gap-2 transition cursor-pointer border ${
              isCurrentChosen ? 'bg-white text-black border-white' : 'border-white/25 hover:bg-white/10'
            }`}
          >
            {isCurrentChosen ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isCurrentChosen ? 'Sedang Digunakan' : 'Gunakan Jadwal Ini'}
          </button>
          <button
            onClick={() => onCopyText(currentSchedule)}
            className="border border-white/25 hover:bg-white/10 px-3.5 py-2 rounded-md text-sm flex items-center gap-2 transition cursor-pointer"
          >
            {copyStatus ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copyStatus ? 'Disalin!' : 'Salin'}
          </button>
        </div>
      </div>

      {/* Tab opsi, hanya muncul kalau ada lebih dari 1 opsi — bisa dipakai untuk membandingkan */}
      {scheduleOptions.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {scheduleOptions.map((opt, i) => {
            const isChosenOne = chosenSignature === scheduleSignature(opt);
            return (
              <button
                key={i}
                onClick={() => setActiveOption(i)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition cursor-pointer border flex items-center gap-1.5 ${
                  activeOption === i ? 'bg-white text-black border-white' : 'border-white/25 text-white/70 hover:bg-white/10'
                }`}
              >
                {isChosenOne && <BookmarkCheck className="w-3.5 h-3.5" />}
                Opsi {String.fromCharCode(65 + i)} · {scheduleSks(opt)} SKS
              </button>
            );
          })}
        </div>
      )}

      <ScheduleTable schedule={currentSchedule} />
      <ScheduleCards schedule={currentSchedule} />
    </section>
  );
}

// Tabel — dipakai di layar >= md
function ScheduleTable({ schedule }: { schedule: Course[] }) {
  return (
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
          {schedule.map((item, idx) => (
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
  );
}

// Kartu — dipakai di layar < md
function ScheduleCards({ schedule }: { schedule: Course[] }) {
  return (
    <div className="md:hidden space-y-3">
      {schedule.map((item, idx) => (
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
  );
}
