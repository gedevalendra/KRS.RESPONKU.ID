'use client';

import { CalendarOff } from 'lucide-react';
import { DayOffSettings } from '../lib/types';

interface DayOffOptionProps {
  dayOffSettings?: DayOffSettings;
  onToggle: (enabled: boolean) => void;
  onChangePreferredDay: (day: string) => void;
}

const DAY_LABELS: { value: string; label: string }[] = [
  { value: '', label: 'Bebas (cari hari apapun)' },
  { value: 'senin', label: 'Senin' },
  { value: 'selasa', label: 'Selasa' },
  { value: 'rabu', label: 'Rabu' },
  { value: 'kamis', label: 'Kamis' },
  { value: 'jumat', label: 'Jumat' },
  { value: 'sabtu', label: 'Sabtu' },
];

// Opsi tambahan di Step 2 — kalau diaktifkan, algoritma penyusunan otomatis
// akan berusaha menyisakan satu hari kosong penuh (boleh menumpuk mata
// kuliah lain di hari lain, asal tidak bentrok).
export default function DayOffOption({ dayOffSettings, onToggle, onChangePreferredDay }: DayOffOptionProps) {
  const settings = dayOffSettings || { enabled: false, preferredDay: '' };

  return (
    <div className="border border-black/10 bg-black/[0.02] rounded-lg p-3.5">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-black cursor-pointer"
        />
        <span className="text-sm">
          <span className="font-semibold flex items-center gap-1.5">
            <CalendarOff className="w-3.5 h-3.5" /> Sisakan satu hari libur penuh
          </span>
          <span className="block text-black/50 text-xs mt-0.5">
            Mata kuliah boleh menumpuk di hari lain (asal tidak bentrok jamnya), yang penting ada satu hari yang benar-benar kosong.
          </span>
        </span>
      </label>

      {settings.enabled && (
        <div className="mt-3 pl-6">
          <label className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-1.5 block">
            Hari yang diinginkan
          </label>
          <select
            value={settings.preferredDay}
            onChange={(e) => onChangePreferredDay(e.target.value)}
            className="border border-black/15 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
          >
            {DAY_LABELS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}