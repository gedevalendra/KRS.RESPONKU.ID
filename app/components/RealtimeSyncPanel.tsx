'use client';

import { useState, useEffect } from 'react';
import { RadioTower, Mail, Loader2 } from 'lucide-react';
import { RealtimeSettings, EmailReminderSettings } from '../lib/types';
import { MIN_REALTIME_INTERVAL_MS } from '../lib/constants';

interface RealtimeSyncPanelProps {
  isLinkLocked: boolean;
  realtimeSettings?: RealtimeSettings;
  onToggleRealtime: (enabled: boolean) => void;
  onChangeIntervalMs: (ms: number) => void;
  emailReminder?: EmailReminderSettings;
  onToggleEmailReminder: (enabled: boolean) => void;
  onChangeEmail: (email: string) => void;
  lastCheckedAt: string | null;
  isCheckingRealtime: boolean;
}

const PRESET_INTERVALS = [
  { label: '10 menit', ms: 10 * 60 * 1000 },
  { label: '30 menit', ms: 30 * 60 * 1000 },
  { label: '1 jam', ms: 60 * 60 * 1000 },
  { label: 'Custom (detik) — untuk testing', ms: -1 },
];

function isEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RealtimeSyncPanel({
  isLinkLocked,
  realtimeSettings,
  onToggleRealtime = () => {},
  onChangeIntervalMs = () => {},
  emailReminder,
  onToggleEmailReminder = () => {},
  onChangeEmail = () => {},
  lastCheckedAt,
  isCheckingRealtime,
}: RealtimeSyncPanelProps) {
  const settings = realtimeSettings || { enabled: false, intervalMs: 10 * 60 * 1000 };
  const reminder = emailReminder || { enabled: false, email: '' };

  // Cek apakah interval saat ini cocok dengan preset standar atau masuk kategori custom
  const matchedPreset = PRESET_INTERVALS.find((p) => p.ms === settings.intervalMs);
  const [isCustom, setIsCustom] = useState(!matchedPreset);
  const [customSeconds, setCustomSeconds] = useState(Math.round((settings.intervalMs || 60000) / 1000));

  // Sinkronisasi status kustom jika interval diubah dari luar/storage
  useEffect(() => {
    const isMatched = PRESET_INTERVALS.some((p) => p.ms === settings.intervalMs);
    setIsCustom(!isMatched);
    if (!isMatched) {
      setCustomSeconds(Math.round(settings.intervalMs / 1000));
    }
  }, [settings.intervalMs]);

  const emailTouched = reminder.email.length > 0;
  const emailValid = isEmailValid(reminder.email);

  if (!isLinkLocked) return null;

  return (
    <section className="bg-white border border-black/10 rounded-xl p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <RadioTower className="w-4 h-4" />
        <h2 className="font-bold text-base">Pengecekan Realtime &amp; Pengingat Email</h2>
      </div>
      <p className="text-sm text-black/50 mb-4">
        Opsional — cek otomatis kalau ada perubahan di spreadsheet tanpa perlu klik &quot;Cek Pembaruan&quot; manual.
      </p>

      <label className="flex items-center gap-2.5 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onToggleRealtime(e.target.checked)}
          className="w-4 h-4 accent-black cursor-pointer"
        />
        <span className="text-sm font-medium">Aktifkan pengecekan berkala</span>
        {isCheckingRealtime && <Loader2 className="w-3.5 h-3.5 animate-spin text-black/40" />}
      </label>

      {settings.enabled && (
        <div className="pl-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-1.5 block">
              Interval pengecekan
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_INTERVALS.map((p) => {
                const active = p.ms === -1 ? isCustom : !isCustom && p.ms === settings.intervalMs;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      if (p.ms === -1) {
                        setIsCustom(true);
                        onChangeIntervalMs(customSeconds * 1000);
                      } else {
                        setIsCustom(false);
                        onChangeIntervalMs(p.ms);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                      active ? 'bg-black text-white border-black' : 'border-black/15 hover:bg-black/5'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {isCustom && (
              <div className="flex items-center gap-2 mt-2.5">
                <input
                  type="number"
                  min={Math.round(MIN_REALTIME_INTERVAL_MS / 1000)}
                  value={customSeconds}
                  onChange={(e) => {
                    const val = Math.max(Math.round(MIN_REALTIME_INTERVAL_MS / 1000), parseInt(e.target.value, 10) || 5);
                    setCustomSeconds(val);
                    onChangeIntervalMs(val * 1000);
                  }}
                  className="w-24 border border-black/15 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <span className="text-xs text-black/50">
                  detik (minimum {Math.round(MIN_REALTIME_INTERVAL_MS / 1000)} detik — nilai kecil hanya untuk keperluan testing)
                </span>
              </div>
            )}

            {lastCheckedAt && (
              <p className="text-xs text-black/40 mt-2">
                Terakhir dicek: {new Date(lastCheckedAt).toLocaleString('id-ID')}
              </p>
            )}
          </div>

          <div className="border-t border-black/10 pt-3.5">
            <label className="flex items-center gap-2.5 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={reminder.enabled}
                onChange={(e) => onToggleEmailReminder(e.target.checked)}
                className="w-4 h-4 accent-black cursor-pointer"
              />
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Ingatkan lewat email kalau ada perubahan
              </span>
            </label>

            {reminder.enabled && (
              <div className="pl-6">
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={reminder.email}
                  onChange={(e) => onChangeEmail(e.target.value)}
                  className={`w-full sm:w-72 border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent ${
                    emailTouched && !emailValid ? 'border-black' : 'border-black/15'
                  }`}
                />
                {emailTouched && !emailValid && (
                  <p className="text-xs mt-1">Format email belum valid.</p>
                )}
                <p className="text-xs text-black/50 mt-1.5">
                  Email akan dikirim tiap kali pengecekan menemukan perubahan pada spreadsheet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}