'use client';

import { Star, X } from 'lucide-react';

interface SidebarContentProps {
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
}

const STEPS = [
  { n: 1, label: 'Hubungkan spreadsheet' },
  { n: 2, label: 'Pilih mata kuliah' },
  { n: 3, label: 'Lihat jadwal' },
];

// Konten sidebar — dipakai di versi desktop & drawer mobile (lihat page.tsx)
export default function SidebarContent({
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
}: SidebarContentProps) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-3">Progres</p>
        <ol className="space-y-3">
          {STEPS.map((s) => (
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
