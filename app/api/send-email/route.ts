import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// URL website yang akan ditautkan lewat tombol di email.
const SITE_URL = 'https://www.krs.bekarya.com';

// Kunci-kunci field pada objek Course (harus sama persis dengan nama kolom
// spreadsheet), beserta label yang ditampilkan di email.
const FIELD_DEFS: { key: string; label: string }[] = [
  { key: 'Nama Mata Kuliah', label: 'Nama Mata Kuliah' },
  { key: 'Kode Mata Kuliah', label: 'Kode' },
  { key: 'Kelas', label: 'Kelas' },
  { key: 'Hari', label: 'Hari' },
  { key: 'Jam Mulai (Ex : 07:00)', label: 'Jam Mulai' },
  { key: 'Jam Berakhir (Ex: 10:00)', label: 'Jam Selesai' },
  { key: 'Dosen', label: 'Dosen' },
  { key: 'SKS', label: 'SKS' },
];

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Kolom-kolom yang berisi jam. Saat Google Sheets dibaca lewat XLSX, sel jam
// sering terbaca sebagai angka pecahan hari (mis. 0.041666... = 01:00,
// 0.416666... = 10:00) alih-alih string "HH:mm". Kolom ini perlu dikonversi
// dulu sebelum ditampilkan di email.
const TIME_FIELD_KEYS = new Set(['Jam Mulai (Ex : 07:00)', 'Jam Berakhir (Ex: 10:00)']);

// Ubah pecahan hari ala Excel (0-1, atau serial tanggal+jam) menjadi "HH:mm".
function excelSerialToTime(serial: number): string {
  const frac = serial - Math.floor(serial); // ambil bagian jamnya saja
  const totalMinutes = Math.round(frac * 24 * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
}

// Terima nilai jam dalam bentuk apa pun (angka Excel, string angka, atau
// string jam yang sudah rapi seperti "07:00") dan kembalikan format "HH:mm".
function formatTimeValue(value: unknown): string {
  if (typeof value === 'number') {
    return excelSerialToTime(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // String angka murni (mis. "0.4166666666666667") -> ikut dikonversi.
    if (trimmed !== '' && /^[0-9]*\.?[0-9]+$/.test(trimmed)) {
      return excelSerialToTime(Number(trimmed));
    }
    return value;
  }
  return String(value);
}

function getField(obj: any, key: string): string {
  if (!obj) return '-';
  let val = obj[key];
  if (val === undefined || val === null || val === '') return '-';
  if (TIME_FIELD_KEYS.has(key)) {
    val = formatTimeValue(val);
  }
  return escapeHtml(val);
}

function courseTitle(obj: any): string {
  const nama = getField(obj, 'Nama Mata Kuliah');
  return nama !== '-' ? nama : 'Mata Kuliah';
}

function courseSubtitle(obj: any): string {
  const kode = getField(obj, 'Kode Mata Kuliah');
  const kelas = getField(obj, 'Kelas');
  const parts: string[] = [];
  if (kode !== '-') parts.push(`Kode: ${kode}`);
  if (kelas !== '-') parts.push(`Kelas: ${kelas}`);
  return parts.join(' &bull; ');
}

// Kartu detail LENGKAP untuk mata kuliah yang DITAMBAHKAN / DIHAPUS —
// menampilkan semua field (hari, jam, dosen, kelas, SKS, dll).
function renderCourseDetailCard(course: any, accentColor: string, bgColor: string) {
  const rows = FIELD_DEFS.map(
    ({ key, label }) => `
      <tr>
        <td style="padding: 3px 10px 3px 0; color: #64748b; font-size: 12px; white-space: nowrap;">${label}</td>
        <td style="padding: 3px 0; color: #1e293b; font-size: 12px; font-weight: 600;">${getField(course, key)}</td>
      </tr>`
  ).join('');

  return `
    <div style="border-left: 4px solid ${accentColor}; background: ${bgColor}; border-radius: 6px; padding: 12px 14px; margin-bottom: 10px;">
      <p style="margin: 0 0 6px 0; font-weight: 700; font-size: 14px; color: #0f172a;">${courseTitle(course)}</p>
      <table style="border-collapse: collapse;">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// Kartu detail untuk mata kuliah yang DIUBAH — hanya menampilkan field yang
// benar-benar berbeda antara data lama (before) dan data baru (after),
// dengan format "nilai lama (dicoret) -> nilai baru".
function renderChangedDetailCard(item: any) {
  const before = item.before || item.old || {};
  const after = item.after || item.new || item;
  const titleObj = Object.keys(after || {}).length > 0 ? after : before;

  const diffRows = FIELD_DEFS
    .map(({ key, label }) => {
      const beforeVal = getField(before, key);
      const afterVal = getField(after, key);
      if (beforeVal === afterVal) return null;
      return `
        <tr>
          <td style="padding: 4px 10px 4px 0; color: #64748b; font-size: 12px; white-space: nowrap; vertical-align: top;">${label}</td>
          <td style="padding: 4px 0; font-size: 12px; vertical-align: top;">
            <span style="color: #dc2626; text-decoration: line-through;">${beforeVal}</span>
            <span style="color: #94a3b8; margin: 0 4px;">&rarr;</span>
            <span style="color: #16a34a; font-weight: 700;">${afterVal}</span>
          </td>
        </tr>`;
    })
    .filter(Boolean)
    .join('');

  return `
    <div style="border-left: 4px solid #ca8a04; background: #fefce8; border-radius: 6px; padding: 12px 14px; margin-bottom: 10px;">
      <p style="margin: 0 0 2px 0; font-weight: 700; font-size: 14px; color: #0f172a;">${courseTitle(titleObj)}</p>
      <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8;">${courseSubtitle(titleObj)}</p>
      <table style="border-collapse: collapse;">
        <tbody>${diffRows || '<tr><td style="font-size:12px;color:#94a3b8;">Tidak ada rincian field yang berubah.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function renderSection(title: string, count: number, color: string, contentHtml: string) {
  if (count === 0) return '';
  return `
    <div style="margin-top: 18px;">
      <h4 style="color: ${color}; margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em;">
        ${title} (${count})
      </h4>
      ${contentHtml}
    </div>
  `;
}

function renderVisitButton() {
  return `
    <div style="text-align: center; margin-top: 26px;">
      <a href="${SITE_URL}"
         style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none;
                font-weight: 600; font-size: 13px; padding: 10px 22px; border-radius: 8px;">
        Buka KRS Planner
      </a>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, subject, details, detectedAt, spreadsheetUrl, message } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Data email wajib diisi.' }, { status: 400 });
    }

    let parsedDetails = details;
    if (typeof details === 'string') {
      try {
        parsedDetails = JSON.parse(details);
      } catch {
        parsedDetails = null;
      }
    }

    const added = parsedDetails?.added || parsedDetails?.change_details?.added || [];
    const removed = parsedDetails?.removed || parsedDetails?.change_details?.removed || [];
    const changed = parsedDetails?.changed || parsedDetails?.change_details?.changed || [];

    const hasChanges = added.length > 0 || removed.length > 0 || changed.length > 0;
    let htmlContent = '';

    if (hasChanges) {
      const addedHtml = added.map((c: any) => renderCourseDetailCard(c, '#16a34a', '#f0fdf4')).join('');
      const removedHtml = removed.map((c: any) => renderCourseDetailCard(c, '#dc2626', '#fef2f2')).join('');
      const changedHtml = changed.map((c: any) => renderChangedDetailCard(c)).join('');

      htmlContent = `
        <div style="font-family: sans-serif; padding: 24px; color: #334155; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #2563eb; margin-bottom: 4px;">Laporan Perubahan Jadwal KRS</h2>
          <p style="margin: 0; font-size: 13px;">Dideteksi pada: <strong>${detectedAt ? new Date(detectedAt).toLocaleString('id-ID') : 'Baru saja'}</strong></p>
          <p style="font-size: 12px; color: #64748b; word-break: break-all;">Link Spreadsheet: ${escapeHtml(spreadsheetUrl || '-')}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />

          ${renderSection('Mata Kuliah Ditambahkan', added.length, '#16a34a', addedHtml)}
          ${renderSection('Mata Kuliah Dihapus', removed.length, '#dc2626', removedHtml)}
          ${renderSection('Mata Kuliah Diubah', changed.length, '#ca8a04', changedHtml)}

          <p style="margin-top: 22px; font-size: 13px;">Silakan buka aplikasi KRS Planner untuk melihat detail selengkapnya dan memperbarui jadwalmu.</p>
          ${renderVisitButton()}
        </div>
      `;
    } else {
      htmlContent = `
        <div style="font-family: sans-serif; padding: 24px; color: #334155; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Laporan Jadwal KRS</h2>
          <p style="font-size: 13px;">${escapeHtml(message || 'Tidak ada perubahan mata kuliah yang tercatat dalam riwayat ini (data kosong).')}</p>
          <p style="font-size: 12px; color: #64748b; word-break: break-all;">Spreadsheet: ${escapeHtml(spreadsheetUrl || '-')}</p>
          ${renderVisitButton()}
        </div>
      `;
    }

    const data = await resend.emails.send({
      from: 'Sistem Jadwal Kuliah <noreply@krs.bekarya.com>',
      to: [email],
      subject: subject || 'Laporan Perubahan Jadwal KRS Terbaru',
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal mengirim email.' }, { status: 500 });
  }
}