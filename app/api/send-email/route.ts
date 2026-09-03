import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, subject, message } = await request.json();

    if (!email || !subject || !message) {
      return NextResponse.json({ error: 'Data email, subject, dan message wajib diisi.' }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: 'Sistem Jadwal Kuliah <onboarding@resend.dev>', // Ubah dengan domain terverifikasi Anda di Resend
      to: [email],
      subject: subject,
      html: `<div style="font-family: sans-serif; padding: 20px;"><p>${message}</p></div>`,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengirim email.' }, { status: 500 });
  }
}