'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ConflictAlertProps {
  message: string;
}

// Status hasil penyusunan jadwal (sukses / peringatan bentrok)
export default function ConflictAlert({ message }: ConflictAlertProps) {
  if (!message) return null;
  const isWarning = message.startsWith('Peringatan');

  return (
    <div
      className={`p-4 rounded-xl flex items-start gap-3 text-sm font-medium border ${
        isWarning ? 'border-dashed border-black/40 bg-black/[0.02]' : 'border-black/15 bg-black/[0.03]'
      }`}
    >
      {isWarning ? (
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
      )}
      <span>{message}</span>
    </div>
  );
}
